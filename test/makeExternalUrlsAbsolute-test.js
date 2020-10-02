const assert = require('assert');

const makeExternalUrlsAbsolute = require('../src/makeExternalUrlsAbsolute');

const baseUrl = 'https://base.url';

function runTest() {
  // updates urls
  assert.equal(
    makeExternalUrlsAbsolute(
      `
    .foo {
      background-image: url("/bar.png");
    }
    @font-face {
      font-family: "MyFont";
      src: url('/fonts/myfont.woff2') format("woff2"),
             url(/fonts/myfont.woff) format("woff");
    }
    .ignore {
      background: url(data:image/png;base64,asdf);
    }
  `.trim(),
      baseUrl,
    ),
    `
    .foo {
      background-image: url("https://base.url/bar.png");
    }
    @font-face {
      font-family: "MyFont";
      src: url('https://base.url/fonts/myfont.woff2') format("woff2"),
             url(https://base.url/fonts/myfont.woff) format("woff");
    }
    .ignore {
      background: url(data:image/png;base64,asdf);
    }
  `.trim(),
  );
  // can deal with empty input
  assert.equal(makeExternalUrlsAbsolute('', baseUrl), '');
}

runTest();
console.log('All makeExternalUrlsAbsolute tests passed');
