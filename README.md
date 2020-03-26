# Cypress integration for Happo

The `happo-cypress` module adds [Happo.io](https://happo.io) cross-browser
screenshots to your [Cypress.io](https://cypress.io) test suite.

Check out the
[`happo-cypress-example-todomvc`](https://github.com/happo/happo-cypress-example-todomvc)
for a demo of how this module is used.

## Pre-requisites

Before you start following the instructions here, you'll need [a working
Cypress test
suite](https://docs.cypress.io/guides/getting-started/installing-cypress.html)
and a [Happo account](https://happo.io/signup).

## Installation

In your project, install the `happo-cypress` and the `happo.io` npm modules.

```sh
npm install --save-dev happo-cypress happo.io
```

## Setup

Import the `happo-cypress` module in your `cypress/support/commands.js` file:

```js
// At the top of cypress/support/commands.js
import 'happo-cypress';
```

Then, add the provided `happoTask` in your `cypress/plugins/index.js` file:

```js
// In cypress/plugins/index.js
const happoTask = require('happo-cypress/task');

module.exports = (on, config) => {
  on('task', happoTask);
};
```

Add a `.happo.js` file with some minimal/required configuration:

```js
// .happo.js
const { RemoteBrowserTarget } = require('happo.io');

module.exports = {
  apiKey: <your api key>,
  apiSecret: <your api secret>,
  targets: {
    chrome: new RemoteBrowserTarget('chrome', {
      viewport: '1024x768',
    }),
  },
};
```

See https://github.com/happo/happo.io#targets for more configuration options.

NOTE: For security reasons, you'll most likely want to pass in `apiKey` and
`apiSecret` via environment variables:

```js
// .happo.js
module.exports = {
  apiKey: process.env.HAPPO_API_KEY,
  apiSecret: process.env.HAPPO_API_SECRET,
  // ... more config
};
```

## Usage

To record Happo screenshots in your test suite, use `happoScreenshot`:

```js
describe('Home page', function() {
  it('loads properly', function() {
    cy.visit('/');
    cy.get('.header').happoScreenshot();
  });
});
```

Happo focuses more on component screenshots as opposed to full-page
screenshots. Because of that, you always need to select a child before you
call `happoScreenshot`. If you still need a full-page screenshot you can use
the `<body>` element:

```js
cy.get('body').happoScreenshot();
```

Happo identifies screenshots by `component` and `variant`. By default, the
component name and variant are inferred from the current test case. If you want
more control, you can provide these in an options argument:

```js
// Full control, pass in both component and variant:
cy.get('.header').happoScreenshot({ component: 'Header', variant: 'large' });

// Control the component name, but let variant be auto-assigned
cy.get('.footer').happoScreenshot({ component: 'Footer' });

// Control variant, but let component name be inferred
cy.get('.footer').happoScreenshot({ variant: 'dark' });

// No control, infer component and variant from current test
cy.get('.footer').happoScreenshot();
```

## Continuous Integration

If you run the test suite in a CI environment, the `happo-cypress` module will
do its best to auto-detect your environment and adapt its behavior accordingly:

- On PR builds, compare the screenshots against the master branch
- On master builds, simply create the Happo report

To get the results of the Happo jobs back to your PRs/commits, you need to
install and configure the Happo GitHub app. Instructions are available [in the
`happo.io`
README](https://github.com/happo/happo.io#posting-statuses-back-to-prscommits).

Happo auto-detects the following CI environments:

- Circle CI
- Travis CI

If you are using a different CI service, you'll have to set a few environment
variables before invoking the test suite:

- `HAPPO_PREVIOUS_SHA` the commit sha that the branch/PR is based on (usually a
  commit on master). Only set this for PR builds.
- `HAPPO_CURRENT_SHA` the sha of the commit currently under test. Always set this.
- `HAPPO_BASE_BRANCH` the default/base branch you use. Defaults to "master", so
  you only need to set this if you are using a different base branch.
- `HAPPO_CHANGE_URL` a url to the PR/commit. Optional.

## Troubleshooting

### I need support!

We're here to help — send an email to support@happo.io and we'll assist you.

### Happo isn't producing any screenshots

The `happo-cypress` module will disable itself if it can't detect any api
tokens (`apiKey` and `apiSecret` in config). Check to make sure your
`.happo.js` config is properly set up. There might also be more information in
the console logs from Cypress. Look for lines starting with `[HAPPO]`.

### Where are my screenshots?

During test suite execution, Happo will only record information. All
screenshots are taken asynchronously outside of the test run. This means that
your test suite will finish sooner than the Happo job is done. To follow along
the progress, look for a url logged by Happo:

```bash
[HAPPO] https://happo.io/a/284/async-reports/34
```

### Styles are missing from my screenshots

Styles and assets are collected automatically during your test suite. If you
notice styles/images/fonts etc are missing, one of a few things might have happened:

- CSS selectors depend on context that is missing to Happo. If you e.g. have
  something like `#start-page .header { color: red }` and screenshoot
  `.header`, the red color will be missing. This is because Happo only sees the
  `.header` element, never the surrounding page.
- There could be a bug in how `happo-cypress` collects styles and assets. Reach
  out to support@happo.io and we'll triage.
