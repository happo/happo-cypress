const happoTask = require('../../task');

module.exports = (on, config) => {
  happoTask.register(on);

  if (process.env.CYPRESS_RETRY_FAIL_ONCE) {
    console.log('Adjusting config to allow one retry');
    config.retries = {
      runMode: 1,
    };
  }

  return config;
};
