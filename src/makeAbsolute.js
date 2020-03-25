module.exports = function makeAbsolute(url, baseUrl) {
  if (url.startsWith('//')) {
    return `${baseUrl.split(':')[0]}:${url}`;
  }
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  if (/^https?:/.test(url)) {
    return url;
  }
  return `${baseUrl}/${url}`;
};
