const { defineConfig } = require('cypress');
const happoTask = require('./task');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:7654',
    projectId: 'w56536',
    supportFile: 'cypress/support/index.js',
    specPattern: 'cypress/integration/**/*spec.js',
    setupNodeEvents(on, config) {
      happoTask.register(on);

      if (process.env.CYPRESS_RETRY_FAIL_ONCE) {
        console.log('Adjusting config to allow one retry');
        config.retries = {
          runMode: 1,
        };
      }

      return config;
    },
  },
});
