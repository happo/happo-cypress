const { URL } = require('url');
const replaceAll = require('string.prototype.replaceall');

const findCSSAssetUrls = require('./findCSSAssetUrls');

module.exports = function makeExternalUrlsAbsolute(text, absUrl) {
  return replaceAll(
    text,
    findCSSAssetUrls.URL_PATTERN,
    (full, pre, url, post) => {
      if (url.startsWith('data:')) {
        return full;
      }
      const fullUrl = new URL(url, absUrl);
      return `${pre}${fullUrl.href}${post}`;
    },
  );
};
