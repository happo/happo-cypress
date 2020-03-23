const { spawnSync } = require('child_process');
const crypto = require('crypto');

function resolveLink(env) {
  const {
    CHANGE_URL,
    HAPPO_CHANGE_URL,
    CI_PULL_REQUEST,
    HAPPO_GITHUB_BASE,
    GITHUB_BASE,
    TRAVIS_REPO_SLUG,
    TRAVIS_PULL_REQUEST,
    TRAVIS_COMMIT,
    CIRCLE_PROJECT_USERNAME,
    CIRCLE_PROJECT_REPONAME,
    CIRCLE_SHA1,
  } = env;

  if (HAPPO_CHANGE_URL) {
    // new happo env
    return HAPPO_CHANGE_URL;
  }
  if (CHANGE_URL) {
    // legacy happo env
    return CHANGE_URL;
  }
  if (CI_PULL_REQUEST) {
    // Circle CI
    return CI_PULL_REQUEST;
  }

  const githubBase = HAPPO_GITHUB_BASE || GITHUB_BASE || 'https://github.com';

  if (TRAVIS_REPO_SLUG && TRAVIS_PULL_REQUEST) {
    return `${githubBase}/${TRAVIS_REPO_SLUG}/pull/${TRAVIS_PULL_REQUEST}`;
  }

  if (TRAVIS_REPO_SLUG && TRAVIS_COMMIT) {
    return `${githubBase}/${TRAVIS_REPO_SLUG}/commit/${TRAVIS_COMMIT}`;
  }

  if (CIRCLE_PROJECT_USERNAME && CIRCLE_PROJECT_REPONAME && CIRCLE_SHA1) {
    return `${githubBase}/${CIRCLE_PROJECT_USERNAME}/${CIRCLE_PROJECT_REPONAME}/commit/${CIRCLE_SHA1}`;
  }

  return undefined;
}

function resolveMessage(env) {
  const res = spawnSync('git', ['log', '-1', '--pretty=%s'], {
    encoding: 'utf-8',
  });
  if (res.status !== 0) {
    return undefined;
  }
  return res.stdout.split('\n')[0];
}

function resolveBeforeSha(env, afterSha) {
  const {
    HAPPO_PREVIOUS_SHA,
    PREVIOUS_SHA,
    HAPPO_BASE_BRANCH,

    // legacy
    BASE_BRANCH,
  } = env;

  if (HAPPO_PREVIOUS_SHA) {
    return HAPPO_PREVIOUS_SHA;
  }

  if (PREVIOUS_SHA) {
    return PREVIOUS_SHA;
  }

  if (/^dev-/.test(afterSha)) {
    // The afterSha has been auto-generated. Don't use a base commit in this
    // scenario
    return undefined;
  }

  const baseBranch = HAPPO_BASE_BRANCH || BASE_BRANCH || 'origin/master';
  const res = spawnSync('git', ['merge-base', baseBranch, afterSha], {
    encoding: 'utf-8',
  });
  if (res.status !== 0) {
    if (/Not a valid object name/.test(res.stderr)) {
      return undefined;
    }
    console.error(
      `[HAPPO] Ignored error when resolving base commit: ${res.stderr}`,
    );
    return undefined;
  }
  return res.stdout.split('\n')[0];
}

function resolveAfterSha(env) {
  const {
    HAPPO_CURRENT_SHA,
    CURRENT_SHA,
    CIRCLE_SHA1,
    TRAVIS_PULL_REQUEST_SHA,
    TRAVIS_COMMIT,
  } = env;
  const sha =
    HAPPO_CURRENT_SHA ||
    CURRENT_SHA ||
    CIRCLE_SHA1 ||
    TRAVIS_PULL_REQUEST_SHA ||
    TRAVIS_COMMIT;
  if (sha) {
    return sha;
  }
  return `dev-${crypto.randomBytes(4).toString('hex')}`;
}

module.exports = function resolveEnvironment(env = process.env) {
  const afterSha = resolveAfterSha(env);
  return {
    link: resolveLink(env),
    message: /^dev-/.test(afterSha) ? undefined : resolveMessage(env),
    beforeSha: resolveBeforeSha(env, afterSha),
    afterSha,
  };
};
