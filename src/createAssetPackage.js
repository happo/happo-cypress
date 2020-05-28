const { Writable } = require('stream');
const nodeFetch = require('node-fetch');
const Archiver = require('archiver');

const makeAbsolute = require('./makeAbsolute');

const FILE_CREATION_DATE = new Date(
  'Fri March 20 2020 13:44:55 GMT+0100 (CET)',
);

function stripQueryParams(url) {
  const i = url.indexOf('?');
  if (i > -1) {
    return url.slice(0, i);
  }
  return url;
}

function normalize(url, baseUrl) {
  if (url.startsWith(baseUrl)) {
    return url.slice(baseUrl.length);
  }
  if (url.startsWith('/')) {
    return url.slice(1);
  }
}

module.exports = function createAssetPackage({ urls, baseUrl }) {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const archive = new Archiver('zip');
    archive.on('error', e => console.error(e));

    // Create an in-memory stream
    const stream = new Writable();
    const data = [];
    stream._write = (chunk, enc, done) => {
      data.push(...chunk);
      done();
    };
    stream.on('error', e => console.error(e));
    stream.on('finish', () => {
      const buffer = Buffer.from(data);
      resolve(buffer);
    });
    archive.pipe(stream);

    const promises = urls
      .filter(url => url.startsWith('/') || url.startsWith(baseUrl))
      .map(async url => {
        const fetchRes = await nodeFetch(makeAbsolute(url, baseUrl));
        if (!fetchRes.ok) {
          console.log(`[HAPPO] Failed to fetch url ${url} — ${fetchRes.statusText}`);
          return;
        }
        archive.append(fetchRes.body, {
          name: normalize(stripQueryParams(url), baseUrl),
          date: FILE_CREATION_DATE,
        });
      });

    await Promise.all(promises);
    archive.finalize();
  });
};
