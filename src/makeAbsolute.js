module.exports = function makeAbsolute(url, baseUrl) {
  if (url.startsWith('//')) {
    return `${baseUrl.split(':')[0]}:${url}`;
  }
  if (url.startsWith('/')) {
    return `${baseUrl}${url}`;
  }
  return url;
};
