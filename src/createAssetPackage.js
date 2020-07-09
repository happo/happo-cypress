const crypto = require('crypto');
const Archiver = require('archiver');

const { Writable } = require('stream');

const proxiedFetch = require('./fetch');
const makeAbsolute = require('./makeAbsolute');

const { HAPPO_DOWNLOAD_ALL, HAPPO_DEBUG } = process.env;

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

module.exports = function createAssetPackage(urls) {
  if (HAPPO_DEBUG) {
    console.log(`[HAPPO] Creating asset package from urls`, urls);
  }
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async resolve => {
    const seenUrls = new Set();
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
      const hash = crypto.createHash('md5').update(buffer).digest('hex');
      if (HAPPO_DEBUG) {
        console.log(
          `[HAPPO] Done creating asset package, hash=${hash} total bytes=${buffer.length}`,
        );
      }
      resolve({ buffer, hash });
    });
    archive.pipe(stream);

    const promises = urls.map(async item => {
      const { url, baseUrl, base64Url } = item;
      const isExternalUrl = /^https?:/.test(url || '');
      if (!HAPPO_DOWNLOAD_ALL && isExternalUrl) {
        return;
      }
      const name = isExternalUrl
        ? `_external/${crypto.createHash('md5').update(url).digest('hex')}`
        : normalize(stripQueryParams(url), baseUrl);
      if (seenUrls.has(name)) {
        // already processed
        return;
      }
      seenUrls.add(name);
      if (base64Url) {
        const data = base64Url.split(',')[1];
        archive.append(Buffer.from(data, 'base64'), {
          name,
          date: FILE_CREATION_DATE,
        });
      } else {
        const fetchUrl = makeAbsolute(url, baseUrl);
        if (HAPPO_DEBUG) {
          console.log(
            `[HAPPO] Fetching asset from ${fetchUrl} — storing as ${name}`,
          );
        }
        const fetchRes = await proxiedFetch(fetchUrl);
        if (!fetchRes.ok) {
          console.log(
            `[HAPPO] Failed to fetch url ${fetchUrl} — ${fetchRes.statusText}`,
          );
          return;
        }
        archive.append(fetchRes.body, {
          name,
          date: FILE_CREATION_DATE,
        });
        item.name = `/${name}`;
      }
    });

    await Promise.all(promises);
    archive.finalize();
  });
};
