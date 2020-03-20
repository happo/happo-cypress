const URL_PATTERN = /(?:url\(['"]?)(.*?)(?:['"]?)\)/g;

module.exports = function findBackgroundImageUrls(string) {
  const result = [];
  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = URL_PATTERN.exec(string))) {
    const url = match[1];
    if (!url.startsWith('data:')) {
      result.push(url);
    }
  }
  return result;
}

