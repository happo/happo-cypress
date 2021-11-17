const Controller = require('happo-e2e/controller');

const controller = new Controller();

const localSnapshotImages = {};

const { HAPPO_DEBUG } = process.env;

const task = {
  register(on) {
    on('task', task);
    on('before:spec', task.handleBeforeSpec);
    on('after:spec', task.handleAfterSpec);
    on('after:screenshot', task.handleAfterScreenshot);
    task.isRegisteredCorrectly = true;
  },

  async handleAfterSpec(spec, results) {
    if (!controller.isActive()) {
      return;
    }
    if (results) {
      for (const test of results.tests) {
        const wasRetried =
          test.attempts.some(t => t.state === 'failed') &&
          test.attempts[test.attempts.length - 1].state === 'passed';
        if (!wasRetried) {
          continue;
        }
        for (const attempt of test.attempts) {
          if (attempt.state === 'failed') {
            const start = new Date(attempt.wallClockStartedAt).getTime();
            controller.removeSnapshotsMadeBetween({
              start,
              end: start + attempt.wallClockDuration,
            });
          }
        }
      }
    }

    await controller.finish();
    return null;
  },

  async happoRegisterSnapshot(snapshot) {
    if (!controller.isActive()) {
      return null;
    }
    await controller.registerSnapshot(snapshot);
    return null;
  },

  happoRegisterLocalSnapshot({ imageId, component, variant, target, targets }) {
    localSnapshotImages[imageId] = { component, variant, targets, target };
    return null;
  },

  async handleAfterScreenshot({ name, path, dimensions }) {
    if (!controller.isActive()) {
      return null;
    }

    const snapshotData = localSnapshotImages[name];
    if (!snapshotData) {
      if (HAPPO_DEBUG) {
        console.log(`[HAPPO] Ignoring unregistered screenshot: ${name}`);
      }
      return;
    }

    await controller.registerLocalSnapshot({
      ...snapshotData,
      ...dimensions,
      path,
    });
    return null;
  },

  async happoRegisterBase64Image({ base64Chunk, src, isFirst, isLast }) {
    if (!controller.isActive()) {
      return null;
    }
    await controller.registerBase64ImageChunk({
      base64Chunk,
      src,
      isFirst,
      isLast,
    });
    return null;
  },

  async handleBeforeSpec() {
    await controller.init();

    if (controller.isActive() && !task.isRegisteredCorrectly) {
      throw new Error(`happo-cypress hasn't been registered correctly. Make sure you call \`happoTask.register\` when you register the plugin:

  const happoTask = require('happo-cypress/task');

  module.exports = (on) => {
    happoTask.register(on);
  };
      `);
    }
    return null;
  },
};

module.exports = task;
