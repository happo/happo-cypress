const { URL } = require('url');

const findCSSAssetUrls = require('./findCSSAssetUrls');

module.exports = function makeExternalUrlsAbsolute(text, absUrl) {
  const assetUrls = findCSSAssetUrls(text);
  let result = text;
  for (const url of assetUrls) {
    const fullUrl = new URL(url, absUrl);
    result = result.split(url).join(fullUrl.href);
  }
  return result;
};
