const fs = require('fs');

const { Base64Decode } = require('base64-stream');

module.exports = async function convertBase64FileToReal(filenameB64, filename) {
  const readStream = fs.createReadStream(filenameB64);
  const outStream = fs.createWriteStream(filename, { encoding: null });
  const readyPromise = new Promise((resolve, reject) => {
    outStream.on('finish', resolve);
    outStream.on('error', reject);
  });
  readStream.pipe(new Base64Decode()).pipe(outStream);
  await readyPromise;
  await new Promise((resolve, reject) =>
    fs.unlink(filenameB64, e => {
      if (e) {
        reject(e);
      } else {
        resolve();
      }
    }),
  );
};
