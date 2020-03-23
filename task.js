const crypto = require('crypto');
const nodeFetch = require('node-fetch');
const loadUserConfig = require('happo.io/build/loadUserConfig').default;
const makeRequest = require('happo.io/build/makeRequest').default;

const createAssetPackage = require('./src/createAssetPackage');
const findCSSAssetUrls = require('./src/findCSSAssetUrls');
const makeAbsolute = require('./src/makeAbsolute');

const { CURRENT_SHA } = process.env;
const SHA = CURRENT_SHA || `dev-${crypto.randomBytes(4).toString('hex')}`;
console.log(`[HAPPO] Using sha ${SHA}`);

let snapshots = [];
let allCssBlocks = [];
let snapshotAssetUrls = new Set();
let baseUrl;
let happoConfig;
let isEnabled = false;

async function downloadCSSContent(blocks, baseUrl) {
  const promises = blocks.map(async block => {
    if (block.href) {
      const res = await nodeFetch(makeAbsolute(block.href, baseUrl));
      if (!res.ok) {
        console.warn(
          `[HAPPO] Failed to fetch CSS file from ${href}. This might mean styles are missing in your Happo screenshots`,
        );
        return;
      }
      const text = await res.text();
      block.content = text;
      delete block.href;
    }
  });
  await Promise.all(promises);
}

module.exports = {
  happoRegisterSnapshot({ html, assetUrls, cssBlocks, component, variant }) {
    if (!isEnabled) {
      return null;
    }
    assetUrls.forEach(url => snapshotAssetUrls.add(url));
    snapshots.push({ html, component, variant });
    cssBlocks.forEach(block => {
      if (allCssBlocks.some(b => b.key === block.key)) {
        return;
      }
      allCssBlocks.push(block);
    });
    return null;
  },

  async happoInit(options) {
    try {
      happoConfig = await loadUserConfig('./.happo.js');
    } catch (e) {
      if (/You need an.*apiKey/.test(e.message)) {
        isEnabled = false;
        console.warn(
          "[HAPPO] Happo is disabled since we couldn't find an `apiKey` and/or `apiSecret`",
        );
      }
    }
    snapshots = [];
    allCssBlocks = [];
    snapshotAssetUrls = new Set();
    baseUrl = options.baseUrl;
    return null;
  },

  async happoTeardown() {
    if (!isEnabled) {
      return null;
    }
    await downloadCSSContent(allCssBlocks, baseUrl);
    const allUrls = new Set([...snapshotAssetUrls]);
    allCssBlocks.forEach(block => {
      findCSSAssetUrls(block.content).forEach(url => allUrls.add(url));
    });

    const assetsPackage = await createAssetPackage({
      urls: [...allUrls],
      baseUrl,
    });

    const globalCSS = allCssBlocks.map(block => block.content).join('\n');
    const allRequestIds = [];
    await Promise.all(
      Object.keys(happoConfig.targets).map(async name => {
        const requestIds = await happoConfig.targets[name].execute({
          targetName: name,
          asyncResults: true,
          endpoint: happoConfig.endpoint,
          globalCSS,
          assetsPackage,
          snapPayloads: snapshots,
          apiKey: happoConfig.apiKey,
          apiSecret: happoConfig.apiSecret,
        });
        allRequestIds.push(...requestIds);
      }),
    );
    await makeRequest(
      {
        url: `${happoConfig.endpoint}/api/async-reports/${SHA}`,
        method: 'POST',
        json: true,
        body: {
          requestIds: allRequestIds,
          project: happoConfig.project,
        },
      },
      { ...happoConfig, maxTries: 3 },
    );

    return null;
  },
};
