const nodeFetch = require('node-fetch');

const createAssetPackage = require('./src/createAssetPackage');
const findCSSAssetUrls = require('./src/findCSSAssetUrls');
const loadHappoConfig = require('./src/loadHappoConfig');
const makeAbsolute = require('./src/makeAbsolute');

let snapshots;
let allCssBlocks;
let snapshotAssetUrls;
let baseUrl;
let happoConfig;
let knownComponentVariants = {};

async function downloadCSSContent(blocks, baseUrl) {
  const promises = blocks.map(async block => {
    if (block.href) {
      const res = await nodeFetch(makeAbsolute(block.href, baseUrl));
      if (!res.ok) {
        console.warn(
          `[HAPPO] Failed to fetch CSS file from ${block.href}. This might mean styles are missing in your Happo screenshots`,
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
  }) {
    if (!happoConfig) {
      return null;
    }
    const variant = dedupeVariant(component, rawVariant);
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
    happoConfig = await loadHappoConfig();
    snapshots = [];
    allCssBlocks = [];
    snapshotAssetUrls = new Set();
    baseUrl = options.baseUrl;
    return null;
  },

  async happoTeardown() {
    if (!happoConfig) {
      return null;
    }
    if (!snapshots.length) {
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
    const fetchRes = await nodeFetch('http://localhost:5338/', {
      method: 'POST',
      body: allRequestIds.join('\n'),
    });
    if (!fetchRes.ok) {
      console.error(
        `[HAPPO] Failed to communicate with happo-cypress process — ${fetchRes.statusText}`,
      );
      return;
    }
    return null;
  },
};
