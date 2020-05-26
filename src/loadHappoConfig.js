const loadUserConfig = require('happo.io/build/loadUserConfig').default;

module.exports = async function loadHappoConfig() {
  try {
    const happoConfig = await loadUserConfig('./.happo.js');
    return happoConfig;
  } catch (e) {
    if (/You need an.*apiKey/.test(e.message)) {
      console.warn(
        "[HAPPO] Happo is disabled since we couldn't find an `apiKey` and/or `apiSecret`",
      );
      return;
    } else {
      throw e;
    }
  }
}
