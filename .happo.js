const { RemoteBrowserTarget } = require('happo.io');

module.exports = {
  targets: {
    chrome: new RemoteBrowserTarget('chrome', {
      viewport: '1024x768',
    }),
    chromeSmall: new RemoteBrowserTarget('chrome', {
      viewport: '375x640',
    }),
  },
};
