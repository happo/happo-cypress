const crypto = require('crypto');
const fs = require('fs');

const mkdirp = require('mkdirp');
const nodeFetch = require('node-fetch');

const makeRequest = require('happo.io/build/makeRequest').default;
const { RemoteBrowserTarget } = require('happo.io');

const createAssetPackage = require('./src/createAssetPackage');
const convertBase64FileToReal = require('./src/convertBase64FileToReal');
const proxiedFetch = require('./src/fetch');
const findCSSAssetUrls = require('./src/findCSSAssetUrls');
const loadHappoConfig = require('./src/loadHappoConfig');
const makeAbsolute = require('./src/makeAbsolute');
const makeExternalUrlsAbsolute = require('./src/makeExternalUrlsAbsolute');
const resolveEnvironment = require('./src/resolveEnvironment');

const { HAPPO_CYPRESS_PORT, HAPPO_DEBUG, HAPPO_ENABLED } = process.env;

let snapshots;
let localSnapshots;
let localSnapshotImages;
let allCssBlocks;
let snapshotAssetUrls;
let happoConfig;
let knownComponentVariants = {};

function getUniqueUrls(urls) {
  const seenKeys = new Set();
  const result = [];
  urls.forEach(url => {
    const key = [url.url, url.baseUrl].join('||');
    if (!seenKeys.has(key)) {
      result.push(url);
      seenKeys.add(key);
    }
  });
  return urls;
}

async function downloadCSSContent(blocks) {
  const promises = blocks.map(async block => {
    if (block.href) {
      const absUrl = makeAbsolute(block.href, block.baseUrl);
      if (HAPPO_DEBUG) {
        console.log(`[HAPPO] Downloading CSS file from ${absUrl}`);
      }
      const res = await proxiedFetch(absUrl);
      if (!res.ok) {
        console.warn(
          `[HAPPO] Failed to fetch CSS file from ${block.href}. This might mean styles are missing in your Happo screenshots`,
        );
        return;
      }
      let text = await res.text();
      if (HAPPO_DEBUG) {
        console.log(
          `[HAPPO] Done downloading CSS file from ${absUrl}. Got ${text.length} chars back.`,
        );
      }
      if (!absUrl.startsWith(block.baseUrl)) {
        text = makeExternalUrlsAbsolute(text, absUrl);
      }
      block.content = text;
      block.assetsBaseUrl = absUrl.replace(/\/[^/]*$/, '/');
      delete block.href;
    }
  });
  await Promise.all(promises);
}

function dedupeVariant(component, variant) {
  knownComponentVariants[component] = knownComponentVariants[component] || {};
  const comp = knownComponentVariants[component];
  comp[variant] = comp[variant] || 0;
  comp[variant]++;
  if (comp[variant] === 1) {
    return variant;
  }
  return `${variant}-${comp[variant]}`;
}

function dedupeSnapshots() {
  for (const snapshot of snapshots) {
    snapshot.variant = dedupeVariant(snapshot.component, snapshot.variant);
  }
}

function handleDynamicTargets(targets) {
  const result = [];
  if (typeof targets === 'undefined') {
    // return non-dynamic targets from .happo.js
    return Object.keys(happoConfig.targets).filter(
      targetName => !happoConfig.targets[targetName].__dynamic,
    );
  }
  for (const target of targets) {
    if (typeof target === 'string') {
      result.push(target);
    }
    if (
      typeof target === 'object' &&
      target.name &&
      target.viewport &&
      target.browser
    ) {
      if (happoConfig.targets[target.name]) {
        // already added
      } else {
        // add dynamic target
        happoConfig.targets[target.name] = new RemoteBrowserTarget(
          target.browser,
          target,
        );
        happoConfig.targets[target.name].__dynamic = true;
      }
      result.push(target.name);
    }
  }
  return result;
}

async function uploadLocalSnapshots() {
  const reportResult = await makeRequest(
    {
      url: `${happoConfig.endpoint}/api/snap-requests/with-results`,
      method: 'POST',
      json: true,
      body: {
        snaps: localSnapshots,
      },
    },
    { ...happoConfig, maxTries: 3 },
  );
  return reportResult.requestId;
}

async function uploadImage(pathToFile) {
  if (HAPPO_DEBUG) {
    console.log(`[HAPPO] Uploading image: ${pathToFile}`);
  }
  const buffer = await fs.promises.readFile(pathToFile);
  const hash = crypto.createHash('md5').update(buffer).digest('hex');

  const uploadUrlResult = await makeRequest(
    {
      url: `${happoConfig.endpoint}/api/images/${hash}/upload-url`,
      method: 'GET',
      json: true,
    },
    { ...happoConfig, maxTries: 2 },
  );

  if (!uploadUrlResult.uploadUrl) {
    // image has already been uploaded
    if (HAPPO_DEBUG) {
      console.log(
        `[HAPPO] Image has already been uploaded: ${uploadUrlResult.url}`,
      );
    }
    return uploadUrlResult.url;
  }

  const uploadResult = await makeRequest(
    {
      url: uploadUrlResult.uploadUrl,
      method: 'POST',
      json: true,
      formData: {
        file: {
          options: {
            filename: 'image.png',
            contentType: 'image/png',
          },
          value: buffer,
        },
      },
    },
    { ...happoConfig, maxTries: 2 },
  );
  if (HAPPO_DEBUG) {
    console.log(`[HAPPO] Uploaded image: ${uploadUrlResult.url}`);
  }
  return uploadResult.url;
}

async function processSnapRequestIds(allRequestIds) {
  if (HAPPO_CYPRESS_PORT) {
    // We're running with `happo-cypress --`
    const fetchRes = await nodeFetch(
      `http://localhost:${HAPPO_CYPRESS_PORT}/`,
      {
        method: 'POST',
        body: allRequestIds.join('\n'),
      },
    );
    if (!fetchRes.ok) {
      throw new Error('Failed to communicate with happo-cypress server');
    }
  } else {
    // We're not running with `happo-cypress --`. We'll create a report
    // despite the fact that it might not contain all the snapshots. This is
    // still helpful when running `cypress open` locally.
    const { afterSha } = resolveEnvironment();
    const reportResult = await makeRequest(
      {
        url: `${happoConfig.endpoint}/api/async-reports/${afterSha}`,
        method: 'POST',
        json: true,
        body: {
          requestIds: allRequestIds,
          project: happoConfig.project,
        },
      },
      { ...happoConfig, maxTries: 3 },
    );
    console.log(`[HAPPO] ${reportResult.url}`);

    // Reset the component variants so that we can run the test again while
    // cypress is still open.
    knownComponentVariants = {};
    return null;
  }
}

function removeSnapshotsMadeBetween({ start, end }) {
  if (HAPPO_DEBUG) {
    console.log(
      `[HAPPO] Removing snapshots made between ${new Date(
        start,
      )} and ${new Date(end)}`,
    );
  }
  snapshots = snapshots.filter(({ timestamp }) => {
    if (!timestamp) {
      return true;
    }
    return timestamp < start || timestamp > end;
  });
}

const task = {
  register(on) {
    on('task', task);
    on('after:screenshot', task.handleAfterScreenshot);
    on('after:spec', task.handleAfterSpec);
    on('before:spec', task.happoInit);
    task.isRegisteredCorrectly = true;
  },

  async handleAfterSpec(spec, results) {
    if (!happoConfig) {
      return;
    }
    if (HAPPO_DEBUG) {
      console.log('[HAPPO] Running after:spec hook');
    }
    for (const test of results.tests) {
      const wasRetried =
        test.attempts.some(t => t.state === 'failed') &&
        test.attempts[test.attempts.length - 1].state === 'passed';
      if (!wasRetried) {
        continue;
      }
      for (const attempt of test.attempts) {
        if (attempt.state === 'failed') {
          const start = new Date(attempt.wallClockStartedAt).getTime();
          removeSnapshotsMadeBetween({
            start,
            end: start + attempt.wallClockDuration,
          });
        }
      }
    }

    await task.happoTeardown();
    return null;
  },

  happoRegisterSnapshot({
    timestamp,
    html,
    assetUrls,
    cssBlocks,
    component,
    variant,
    targets: rawTargets,
    htmlElementAttrs,
    bodyElementAttrs,
  }) {
    if (!happoConfig) {
      return null;
    }
    snapshotAssetUrls.push(...assetUrls);
    const targets = handleDynamicTargets(rawTargets);
    snapshots.push({
      timestamp,
      html,
      component,
      variant,
      targets,
      htmlElementAttrs,
      bodyElementAttrs,
    });
    cssBlocks.forEach(block => {
      if (allCssBlocks.some(b => b.key === block.key)) {
        return;
      }
      allCssBlocks.push(block);
    });
    return null;
  },

  happoRegisterLocalSnapshot({
    imageId,
    component,
    variant: rawVariant,
    targets,
    target,
  }) {
    if (!happoConfig) {
      return null;
    }
    const variant = dedupeVariant(component, rawVariant);
    localSnapshotImages[imageId] = { component, variant, targets, target };
    return null;
  },

  async handleAfterScreenshot({ name, path, dimensions }) {
    if (!happoConfig) {
      return null;
    }
    const snapshotData = localSnapshotImages[name];
    if (!snapshotData) {
      if (HAPPO_DEBUG) {
        console.log(`[HAPPO] Ignoring unregistered screenshot: ${name}`);
      }
      return;
    }

    const { component, variant, target } = snapshotData;
    localSnapshots.push({
      component,
      variant,
      target,
      url: await uploadImage(path),
      ...dimensions,
    });
    return null;
  },

  async happoRegisterBase64Image({ base64Chunk, src, isFirst, isLast }) {
    const filename = src.slice(1);
    const filenameB64 = `${filename}.b64`;
    if (isFirst) {
      await mkdirp('.happo-tmp/_inlined');
      await new Promise((resolve, reject) =>
        fs.writeFile(filenameB64, base64Chunk, e => {
          if (e) {
            reject(e);
          } else {
            resolve();
          }
        }),
      );
    } else {
      await new Promise((resolve, reject) =>
        fs.appendFile(filenameB64, base64Chunk, e => {
          if (e) {
            reject(e);
          } else {
            resolve();
          }
        }),
      );
    }

    if (isLast) {
      await convertBase64FileToReal(filenameB64, filename);
    }
    return null;
  },

  async happoInit() {
    snapshots = [];
    allCssBlocks = [];
    snapshotAssetUrls = [];
    localSnapshots = [];
    localSnapshotImages = {};
    if (!(HAPPO_CYPRESS_PORT || HAPPO_ENABLED)) {
      console.log(
        `
[HAPPO] Happo is disabled. Here's how to enable it:
  - Use the \`happo-cypress\` wrapper when running \`cypress run\`.
  - Set \`HAPPO_ENABLED=true\` when running \`cypress open\`.

Docs:
  https://docs.happo.io/docs/cypress#usage-with-cypress-run
  https://docs.happo.io/docs/cypress#usage-with-cypress-open
      `.trim(),
      );
      return null;
    }
    if (HAPPO_DEBUG) {
      console.log('[HAPPO] Running happoInit');
    }
    happoConfig = await loadHappoConfig();
    if (happoConfig && !task.isRegisteredCorrectly) {
      throw new Error(`happo-cypress hasn't been registered correctly. Make sure you call \`happoTask.register\` when you register the plugin:

  const happoTask = require('happo-cypress/task');

  module.exports = (on) => {
    happoTask.register(on);
  };
      `);
    }
    return null;
  },

  async happoTeardown() {
    if (!happoConfig) {
      return null;
    }
    if (HAPPO_DEBUG) {
      console.log('[HAPPO] Running happoTeardown');
    }
    if (localSnapshots.length) {
      await processSnapRequestIds([await uploadLocalSnapshots()]);
      return null;
    }
    if (!snapshots.length) {
      return null;
    }
    dedupeSnapshots();
    await downloadCSSContent(allCssBlocks);
    const allUrls = [...snapshotAssetUrls];
    allCssBlocks.forEach(block => {
      findCSSAssetUrls(block.content).forEach(url =>
        allUrls.push({ url, baseUrl: block.assetsBaseUrl || block.baseUrl }),
      );
    });

    const uniqueUrls = getUniqueUrls(allUrls);
    const { buffer, hash } = await createAssetPackage(uniqueUrls);

    if (HAPPO_DEBUG) {
      console.log(`[HAPPO] Uploading assets package`);
    }
    const assetsRes = await makeRequest(
      {
        url: `${happoConfig.endpoint}/api/snap-requests/assets/${hash}`,
        method: 'POST',
        json: true,
        formData: {
          payload: {
            options: {
              filename: 'payload.zip',
              contentType: 'application/zip',
            },
            value: buffer,
          },
        },
      },
      { ...happoConfig, maxTries: 3 },
    );
    if (HAPPO_DEBUG) {
      console.log('[HAPPO] Done uploading assets package, got', assetsRes);
    }

    let globalCSS = allCssBlocks.map(block => block.content).join('\n');
    for (const url of uniqueUrls) {
      if (/^\/_external\//.test(url.name) && url.name !== url.url) {
        globalCSS = globalCSS.split(url.url).join(url.name);
        snapshots.forEach(snapshot => {
          snapshot.html = snapshot.html.split(url.url).join(url.name);
        });
      }
    }
    const allRequestIds = [];
    for (const name of Object.keys(happoConfig.targets)) {
      if (HAPPO_DEBUG) {
        console.log(`[HAPPO] Sending snap-request(s) for target=${name}`);
      }
      const snapshotsForTarget = snapshots.filter(
        ({ targets }) => !targets || targets.includes(name),
      );
      const requestIds = await happoConfig.targets[name].execute({
        targetName: name,
        asyncResults: true,
        endpoint: happoConfig.endpoint,
        globalCSS,
        assetsPackage: assetsRes.path,
        snapPayloads: snapshotsForTarget,
        apiKey: happoConfig.apiKey,
        apiSecret: happoConfig.apiSecret,
      });
      if (HAPPO_DEBUG) {
        console.log(
          `[HAPPO] Snap-request(s) for target=${name} created with ID(s)=${requestIds.join(
            ',',
          )}`,
        );
      }
      allRequestIds.push(...requestIds);
    }

    await processSnapRequestIds(allRequestIds);
    return null;
  },
};

module.exports = task;
