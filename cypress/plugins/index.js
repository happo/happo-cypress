const happoTask = require('../../task');

module.exports = (on) => {
  on('task', happoTask);
  on('after:screenshot', happoTask.handleAfterScreenshot);
};
