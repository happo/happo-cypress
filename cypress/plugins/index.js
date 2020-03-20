const happoTask = require('../../task');

module.exports = (on, config) => {
  on('task', happoTask);
};
