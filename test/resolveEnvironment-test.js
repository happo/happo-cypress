const path = require('path');
const assert = require('assert');
const resolveEnvironment = require('../src/resolveEnvironment');

function testDevEnv() {
  const result = resolveEnvironment({});
  assert.equal(result.beforeSha, '__LATEST__');
  assert.ok(/^dev-[a-z0-9]+$/.test(result.afterSha));
  assert.equal(result.link, undefined);
  assert.equal(result.message, undefined);
}

function testCircleCIEnv() {
  const circleEnv = {
    CI_PULL_REQUEST: 'https://ghe.com/foo/bar/pull/12',
    CIRCLE_PROJECT_USERNAME: 'happo',
    CIRCLE_PROJECT_REPONAME: 'happo-view',
    CIRCLE_SHA1: 'abcdef',
  };
  let result = resolveEnvironment(circleEnv);
  assert.equal(result.beforeSha, undefined);
  assert.equal(result.afterSha, 'abcdef');
  assert.equal(result.link, 'https://ghe.com/foo/bar/pull/12');
  assert.ok(result.message !== undefined);

  // Try with a real commit sha in the repo
  result = resolveEnvironment({
    ...circleEnv,
    CIRCLE_SHA1: '4521c1411c5c0ad19fd72fa31b12363ab54d5eab',
  });

  assert.equal(result.afterSha, '4521c1411c5c0ad19fd72fa31b12363ab54d5eab');
  assert.equal(result.link, 'https://ghe.com/foo/bar/pull/12');
  assert.ok(result.message !== undefined);

  // Try with a non-pr env
  result = resolveEnvironment({
    ...circleEnv,
    CI_PULL_REQUEST: undefined,
  });

  assert.equal(result.beforeSha, undefined);
  assert.equal(result.afterSha, 'abcdef');
  assert.equal(
    result.link,
    'https://github.com/happo/happo-view/commit/abcdef',
  );
  assert.ok(result.message !== undefined);
}

function testGithubActionsEnvironment() {
  const githubEnv = {
    GITHUB_EVENT_PATH: path.resolve(
      __dirname,
      'github_pull_request_event.json',
    ),
  };
  let result = resolveEnvironment(githubEnv);
  assert.equal(result.beforeSha, 'f95f852bd8fca8fcc58a9a2d6c842781e32a215e');
  assert.equal(result.afterSha, 'ec26c3e57ca3a959ca5aad62de7213c562f8c821');
  assert.equal(result.link, 'https://github.com/Codertocat/Hello-World/pull/2');
  assert.equal(result.message, 'Update the README with new information.');

  // Try with a push event
  githubEnv.GITHUB_EVENT_PATH = path.resolve(
    __dirname,
    'github_push_event.json',
  );
  result = resolveEnvironment(githubEnv);
  assert.equal(result.beforeSha, '6113728f27ae82c7b1a177c8d03f9e96e0adf246');
  assert.equal(result.afterSha, '0000000000000000000000000000000000000000');
  assert.equal(
    result.link,
    'https://github.com/foo/bar/commit/0000000000000000000000000000000000000000',
  );
  assert.ok(result.message !== undefined);
}

function testTravisEnv() {
  const travisEnv = {
    HAPPO_GITHUB_BASE: 'http://git.hub',
    TRAVIS_REPO_SLUG: 'owner/repo',
    TRAVIS_PULL_REQUEST: 12,
    TRAVIS_PULL_REQUEST_SHA: 'abcdef',
    TRAVIS_COMMIT_RANGE: 'ttvvb...abcdef',
    TRAVIS_COMMIT: 'xyz',
  };

  let result = resolveEnvironment(travisEnv);
  assert.equal(result.beforeSha, 'ttvvb');
  assert.equal(result.afterSha, 'abcdef');
  assert.equal(result.link, 'http://git.hub/owner/repo/pull/12');
  assert.ok(result.message !== undefined);

  // Try with a real commit sha in the repo
  result = resolveEnvironment({
    ...travisEnv,
    TRAVIS_PULL_REQUEST_SHA: undefined,
    TRAVIS_PULL_REQUEST: undefined,
    TRAVIS_COMMIT_RANGE: undefined,
    TRAVIS_COMMIT: '4521c1411c5c0ad19fd72fa31b12363ab54d5eab',
    HAPPO_FALLBACK_SHAS_COUNT: '5',
  });

  assert.equal(result.afterSha, '4521c1411c5c0ad19fd72fa31b12363ab54d5eab');
  assert.equal(
    result.link,
    'http://git.hub/owner/repo/commit/4521c1411c5c0ad19fd72fa31b12363ab54d5eab',
  );
  assert.equal(
    result.fallbackShas,
    `
62aa0e29b68d0d2e812ad21064b22bf627400ab8
c9698e46a96eb1c695c9ef69e478e78703701f6b
0520795dc6d5f02219c153e9502c3510ead2e1c0
c7729934ee346351747c7af7f4ed570ce6ba3397
bdac2595db20ad2a6bf335b59510aa771125526a
`.trimStart(),
  );
  assert.ok(result.message !== undefined);
}

function testHappoEnv() {
  const happoEnv = {
    HAPPO_CURRENT_SHA: 'bdac2595db20ad2a6bf335b59510aa771125526a',
    HAPPO_PREVIOUS_SHA: 'hhhggg',
    HAPPO_CHANGE_URL: 'link://link',
    HAPPO_NOTIFY: 'foo@bar.com,bar@foo.com',
  };

  let result = resolveEnvironment(happoEnv);
  assert.equal(result.beforeSha, 'hhhggg');
  assert.equal(result.afterSha, 'bdac2595db20ad2a6bf335b59510aa771125526a');
  assert.equal(result.link, 'link://link');
  assert.equal(result.notify, 'foo@bar.com,bar@foo.com');
  assert.ok(result.message !== undefined);

  // Try with legacy overrides
  result = resolveEnvironment({
    CURRENT_SHA: 'foobar',
    PREVIOUS_SHA: 'barfo',
    CHANGE_URL: 'url://link',
  });

  assert.equal(result.beforeSha, 'barfo');
  assert.equal(result.afterSha, 'foobar');
  assert.equal(result.link, 'url://link');
  assert.ok(result.message !== undefined);

  // Try overriding base branch
  result = resolveEnvironment({
    ...happoEnv,
    HAPPO_BASE_BRANCH: 'non-existing',
    HAPPO_PREVIOUS_SHA: undefined,
  });

  assert.ok(result.beforeSha === undefined);
  assert.equal(result.afterSha, 'bdac2595db20ad2a6bf335b59510aa771125526a');
  assert.equal(result.link, 'link://link');
  assert.ok(result.message !== undefined);
}

function runTest() {
  testGithubActionsEnvironment();
  testDevEnv();
  testCircleCIEnv();
  testTravisEnv();
  testHappoEnv();
}
runTest();
console.log('All tests passed');
