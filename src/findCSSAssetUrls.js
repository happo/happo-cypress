const URL_PATTERN = /(url\(['"]?)(.*?)(['"]?\))/g;

function findCSSAssetUrls(string) {
  const result = [];
  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = URL_PATTERN.exec(string))) {
    const url = match[2];
    if (!url.startsWith('data:')) {
      result.push(url);
    }
  }
  return result;
}

findCSSAssetUrls.URL_PATTERN = URL_PATTERN;
module.exports = findCSSAssetUrls;
