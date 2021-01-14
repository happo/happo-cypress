const { URL } = require('url');

module.exports = function makeAbsolute(url, baseUrl) {
  if (url.startsWith('//')) {
    return `${baseUrl.split(':')[0]}:${url}`;
  }
  if (url.startsWith('/')) {
    return `${new URL(baseUrl).origin}${url}`;
  }
  if (url.startsWith('.')) {
    return new URL(`${baseUrl}${url}`).href;
  }
  if (/^https?:/.test(url)) {
    return url;
  }
  return `${baseUrl}/${url}`;
};
