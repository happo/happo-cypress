const assert = require('assert');

const makeAbsolute = require('../src/makeAbsolute');

const baseUrl = 'https://base.url';

function runTest() {
  assert.equal(makeAbsolute('/foo.png', baseUrl), 'https://base.url/foo.png');
  assert.equal(
    makeAbsolute('http://elsewhere.com/bar.png', baseUrl),
    'http://elsewhere.com/bar.png',
  );
  assert.equal(
    makeAbsolute('//elsewhere.com/bar.png', baseUrl),
    'https://elsewhere.com/bar.png',
  );
  assert.equal(
    makeAbsolute('/bar/foo.png', baseUrl),
    'https://base.url/bar/foo.png',
  );
  assert.equal(
    makeAbsolute('bar/foo.png', baseUrl),
    'https://base.url/bar/foo.png',
  );
  assert.equal(
    makeAbsolute('../bar/foo.png', 'http://goo.bar/foo/'),
    'http://goo.bar/bar/foo.png',
  );
  assert.equal(
    makeAbsolute('/bar/foo.png', 'http://goo.bar/foo/'),
    'http://goo.bar/bar/foo.png',
  );
}

runTest();
console.log('All makeAbsolute tests passed');
