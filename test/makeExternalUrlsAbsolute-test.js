const assert = require('assert');

const makeExternalUrlsAbsolute = require('../src/makeExternalUrlsAbsolute');

const resourceUrl = 'https://base.url/styles/styles.min.css';

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
    .relative {
      background: url(../one.png);
      background-image: url(two.png);
    }
  `.trim(),
      resourceUrl,
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
    .relative {
      background: url(https://base.url/one.png);
      background-image: url(https://base.url/styles/two.png);
    }
  `.trim(),
  );
  // can deal with empty input
  assert.equal(makeExternalUrlsAbsolute('', resourceUrl), '');
}

runTest();
console.log('All makeExternalUrlsAbsolute tests passed');
