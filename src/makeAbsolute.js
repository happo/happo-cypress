const { URL } = require('url');

module.exports = function makeAbsolute(url, baseUrl) {
  if (url.startsWith('//')) {
    return `${baseUrl.split(':')[0]}:${url}`;
  }
  if (url.startsWith('/')) {
    return `${new URL(baseUrl).origin}${url}`;
  }
  if (/^https?:/.test(url)) {
    return url;
  }

  const parts = [baseUrl];
  if (!/\/$/.test(baseUrl)) {
    parts.push('/');
  }
  parts.push(url);
  return new URL(parts.join('')).href;
};
