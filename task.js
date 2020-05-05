const nodeFetch = require('node-fetch');
const loadUserConfig = require('happo.io/build/loadUserConfig').default;
const makeRequest = require('happo.io/build/makeRequest').default;
const compareReports = require('happo.io/build/commands/compareReports')
  .default;

const createAssetPackage = require('./src/createAssetPackage');
const findCSSAssetUrls = require('./src/findCSSAssetUrls');
const makeAbsolute = require('./src/makeAbsolute');
const resolveEnvironment = require('./src/resolveEnvironment');

let snapshots;
let allCssBlocks;
let snapshotAssetUrls;
let baseUrl;
let happoConfig;
let isEnabled;
let knownComponentVariants;

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
    if (!isEnabled) {
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
    try {
      happoConfig = await loadUserConfig('./.happo.js');
      isEnabled = true;
    } catch (e) {
      if (/You need an.*apiKey/.test(e.message)) {
        isEnabled = false;
        console.warn(
          "[HAPPO] Happo is disabled since we couldn't find an `apiKey` and/or `apiSecret`",
        );
      } else {
        throw e;
      }
    }
    snapshots = [];
    allCssBlocks = [];
    snapshotAssetUrls = new Set();
    baseUrl = options.baseUrl;
    knownComponentVariants = {};
    return null;
  },

  async happoTeardown() {
    if (!isEnabled) {
      return null;
    }
    if (!snapshots.length) {
      console.log(`[HAPPO] No snapshots were recorded. Ignoring.`);
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
    const { beforeSha, afterSha, link, message } = resolveEnvironment();
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

    return null;
  },
};
