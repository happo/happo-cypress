const nodeFetch = require('node-fetch');
const HttpsProxyAgent = require('https-proxy-agent');

const { HTTP_PROXY, HAPPO_DEBUG } = process.env;

const fetchOptions = {};
if (HTTP_PROXY) {
  fetchOptions.agent = new HttpsProxyAgent(HTTP_PROXY);
}
if (HAPPO_DEBUG) {
  console.log(`[HAPPO] using the following node-fetch options`, fetchOptions);
}

module.exports = async function fetch(url) {
  const fetchRes = await nodeFetch(url, fetchOptions);
  return fetchRes;
};
