const { URL } = require('url');
const nodeFetch = require('node-fetch');
const makeRequest = require('happo.io/build/makeRequest').default;

const createAssetPackage = require('./src/createAssetPackage');
const proxiedFetch = require('./src/fetch');
const findCSSAssetUrls = require('./src/findCSSAssetUrls');
const loadHappoConfig = require('./src/loadHappoConfig');
const makeAbsolute = require('./src/makeAbsolute');
const resolveEnvironment = require('./src/resolveEnvironment');

const { HAPPO_CYPRESS_PORT, HAPPO_DEBUG } = process.env;

let snapshots;
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

function makeExternalUrlsAbsolute(text, absUrl) {
  const assetUrls = findCSSAssetUrls(text);
  let result = text;
  for (const url of assetUrls) {
    const fullUrl = new URL(url, absUrl);
    result = result.split(url).join(fullUrl.href);
  }
  return result;
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

module.exports = {
  happoRegisterSnapshot({
    html,
    assetUrls,
    cssBlocks,
    component,
    variant: rawVariant,
    targets,
  }) {
    if (!happoConfig) {
      return null;
    }
    const variant = dedupeVariant(component, rawVariant);
    snapshotAssetUrls.push(...assetUrls);
    snapshots.push({ html, component, variant, targets });
    cssBlocks.forEach(block => {
      if (allCssBlocks.some(b => b.key === block.key)) {
        return;
      }
      allCssBlocks.push(block);
    });
    return null;
  },

  async happoInit() {
    happoConfig = await loadHappoConfig();
    snapshots = [];
    allCssBlocks = [];
    snapshotAssetUrls = [];
    return null;
  },

  async happoTeardown() {
    if (!happoConfig) {
      return null;
    }
    if (!snapshots.length) {
      return null;
    }
    await downloadCSSContent(allCssBlocks);
    const allUrls = [...snapshotAssetUrls];
    allCssBlocks.forEach(block => {
      findCSSAssetUrls(block.content).forEach(url =>
        allUrls.push({ url, baseUrl: block.baseUrl }),
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
    await Promise.all(
      Object.keys(happoConfig.targets).map(async name => {
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
      }),
    );
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
      return null;
    }
    return null;
  },
};
