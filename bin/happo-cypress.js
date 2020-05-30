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
  console.error('Missing command. Usage: `happo-cypress -- cypress run`');
  process.exit(1);
}

function parsePort(argv) {
  const i = argv.indexOf('--port');
  if (i === -1) {
    return 5338;
  }
  const port = argv[i + 1];
  return parseInt(port, 10);
}

function requestHandler(req, res) {
  req.on('data', chunk => {
    chunk
      .toString()
      .split('\n')
      .filter(Boolean)
      .forEach(requestId => allRequestIds.add(parseInt(requestId, 10)));
  });
  req.on('end', () => {
    res.writeHead(200);
    res.end('');
  });
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

  const { beforeSha, afterSha, link, message } = resolveEnvironment();
  const reportResult = await makeRequest(
    {
      url: `${happoConfig.endpoint}/api/async-reports/${afterSha}`,
      method: 'POST',
      json: true,
      body: {
        requestIds: [...allRequestIds],
        project: happoConfig.project,
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
    if (beforeSha !== afterSha) {
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
  });

  child.on('error', e => {
    console.error(e);
    process.exit(1);
  });

  child.on('close', async code => {
    if (code === 0) {
      await finalizeHappoReport();
    }

    process.exit(code);
  });
}

init(process.argv);