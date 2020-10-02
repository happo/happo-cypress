const replaceAll = require('string.prototype.replaceall');

const findCSSAssetUrls = require('./findCSSAssetUrls');

module.exports = function makeExternalUrlsAbsolute(text, baseUrl) {
  return replaceAll(text, findCSSAssetUrls.URL_PATTERN, (full, pre, url, post) => {
    if (url.startsWith('data:')) {
      return full;
    }
    return `${pre}${baseUrl}${url}${post}`;
  });
};
