const crypto = require('crypto');
const nodeFetch = require('node-fetch');

const createAssetPackage = require('./src/createAssetPackage');
const findCSSAssetUrls = require('./src/findCSSAssetUrls');
const makeAbsolute = require('./src/makeAbsolute');

const { HAPPO_API_SECRET, HAPPO_API_KEY } = process.env;

let snapshots = [];
let allCssBlocks = [];
let snapshotAssetUrls = new Set();
let baseUrl;

async function downloadCSSContent(blocks, baseUrl) {
  const promises = blocks.map(async block => {
    if (block.href) {
      const res = await nodeFetch(makeAbsolute(block.href, baseUrl));
      if (!res.ok) {
        console.warn(
          `Failed to fetch CSS file from ${href}. This might mean styles are missing in your Happo screenshots`,
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
    assetUrls.forEach(url => snapshotAssetUrls.add(url));
    snapshots.push({ html, component, variant });
    cssBlocks.forEach(block => {
      if (allCssBlocks.some(b => b.key === block.key)) {
        console.log(`Already seen CSS block ${block.key}`);
        return;
      }
      allCssBlocks.push(block);
    });
    return null;
  },

  happoInit(options) {
    snapshots = [];
    allCssBlocks = [];
    snapshotAssetUrls = new Set();
    baseUrl = options.baseUrl;
    return null;
  },

  async happoTeardown() {
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
    const payload = {
      viewport: '1024x768',
      globalCSS,
      snapPayloads: snapshots,
      assetsPackage,
    };

    const payloadHash = crypto
      .createHash('md5')
      .update(JSON.stringify(payload))
      .digest('hex');

    const headers = {
      Authorization: `Basic ${Buffer.from(
        HAPPO_API_KEY + ':' + HAPPO_API_SECRET,
      ).toString('base64')}`,
      'Content-Type': 'application/json',
    };

    const snapRes = await nodeFetch('https://happo.io/api/snap-requests', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'browser-chrome',
        payloadHash,
        payload,
      }),
    });
    if (!snapRes.ok) {
      throw new Error(
        `Failed to post payload to happo.io API — ${
          snapRes.statusText
        }. Response:\n${await snapRes.text()}`,
      );
    }
    const json = await snapRes.json();
    console.log(json);
    return null;
  },
};
