#!/usr/bin/env node

const http = require('http');
const { spawn } = require('child_process');

const makeRequest = require('happo.io/build/makeRequest').default;
const compareReports = require('happo.io/build/commands/compareReports')
  .default;

const loadHappoConfig = require('../src/loadHappoConfig');
const resolveEnvironment = require('../src/resolveEnvironment');

const allRequestIds = new Set();

function failWithMissingCommand() {
  console.error(`Missing command. Usage examples:\n
  happo-cypress -- cypress run
  happo-cypress finalize
  `);
  process.exit(1);
}

function parsePort(argv) {
  const i = argv.indexOf('--port');
  if (i === -1) {
    return 5339;
  }
  const port = argv[i + 1];
  return parseInt(port, 10);
}

function requestHandler(req, res) {
  const bodyParts = [];
  req.on('data', chunk => {
    bodyParts.push(chunk.toString());
  });
  req.on('end', () => {
    const potentialIds = bodyParts
      .join('')
      .split('\n')
      .filter(Boolean)
      .map(requestId => parseInt(requestId, 10));

    if (potentialIds.some(id => isNaN(id))) {
      res.writeHead(400);
      res.end('invalid payload');
      return;
    }

    potentialIds.forEach(requestId => {
      allRequestIds.add(parseInt(requestId, 10));
    });
    res.writeHead(200);
    res.end('');
  });
}

async function finalizeAll() {
  const happoConfig = await loadHappoConfig();
  if (!happoConfig) {
    return;
  }

  const { beforeSha, afterSha, link, message, nonce } = resolveEnvironment();
  if (!nonce) {
    throw new Error('[HAPPO] Missing HAPPO_NONCE environment variable');
  }
  await makeRequest(
    {
      url: `${happoConfig.endpoint}/api/async-reports/${afterSha}/finalize`,
      method: 'POST',
      json: true,
      body: {
        project: happoConfig.project,
        nonce,
      },
    },
    { ...happoConfig, maxTries: 3 },
  );

  if (beforeSha && beforeSha !== afterSha) {
    await compareReports(beforeSha, afterSha, happoConfig, {
      link,
      message,
      isAsync: true,
    });
  }
}

async function finalizeHappoReport() {
  const happoConfig = await loadHappoConfig();
  if (!happoConfig) {
    return;
  }

  if (!allRequestIds.size) {
    console.log(`[HAPPO] No snapshots were recorded. Ignoring.`);
    return;
  }

  const { beforeSha, afterSha, link, message, nonce } = resolveEnvironment();
  const reportResult = await makeRequest(
    {
      url: `${happoConfig.endpoint}/api/async-reports/${afterSha}`,
      method: 'POST',
      json: true,
      body: {
        requestIds: [...allRequestIds],
        project: happoConfig.project,
        nonce,
      },
    },
    { ...happoConfig, maxTries: 3 },
  );

  if (beforeSha) {
    const jobResult = await makeRequest(
      {
        url: `${happoConfig.endpoint}/api/jobs/${beforeSha}/${afterSha}`,
        method: 'POST',
        json: true,
        body: {
          project: happoConfig.project,
          link,
          message,
        },
      },
      { ...happoConfig, maxTries: 3 },
    );
    if (beforeSha !== afterSha && !nonce) {
      await compareReports(beforeSha, afterSha, happoConfig, {
        link,
        message,
        isAsync: true,
      });
    }
    console.log(`[HAPPO] ${jobResult.url}`);
  } else {
    console.log(`[HAPPO] ${reportResult.url}`);
  }
}

function startServer(port) {
  const server = http.createServer(requestHandler);
  return new Promise(resolve => {
    server.listen(port, resolve);
  });
}

async function init(argv) {
  const dashdashIndex = argv.indexOf('--');
  if (dashdashIndex === -1) {
    const isFinalizeCommand = argv[argv.length - 1] === 'finalize';
    if (isFinalizeCommand) {
      await finalizeAll();
      return;
    }
    failWithMissingCommand();
  }

  const commandParts = argv.slice(dashdashIndex + 1);

  if (!commandParts.length) {
    failWithMissingCommand();
  }

  const serverPort = parsePort(argv.slice(0, dashdashIndex));
  await startServer(serverPort);
  console.log(`[HAPPO] Listening on port ${serverPort}`);

  const child = spawn(commandParts[0], commandParts.slice(1), {
    stdio: 'inherit',
    env: { ...process.env, HAPPO_CYPRESS_PORT: serverPort },
    shell: process.platform == 'win32',
  });

  child.on('error', e => {
    console.error(e);
    process.exit(1);
  });

  child.on('close', async code => {
    if (code === 0) {
      try {
        await finalizeHappoReport();
      } catch (e) {
        console.error('Failed to finalize Happo report', e);
        process.exit(1);
      }
    }
    process.exit(code);
  });
}

init(process.argv).catch(e => {
  console.error(e);
  process.exit(1);
});
