const { RemoteBrowserTarget } = require('happo.io');

module.exports = {
  project: process.env.HAPPO_PROJECT,
  endpoint: process.env.HAPPO_ENDPOINT || 'https://happo.io',
  targets: {
    chrome: new RemoteBrowserTarget('chrome', {
      viewport: '1024x768',
    }),
    chromeSmall: new RemoteBrowserTarget('chrome', {
      viewport: '375x640',
    }),
  },
};
