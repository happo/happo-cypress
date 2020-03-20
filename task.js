let snapshots = [];
let allCssBlocks = [];
let allAssetUrls = new Set();

module.exports = {
  happoRegisterSnapshot({ html, assetUrls, cssBlocks, component, variant }) {
    assetUrls.forEach(url => {
      allAssetUrls.add(url);
    });
    snapshots.push({ html, component, variant });
    cssBlocks.forEach((block) => {
      if (allCssBlocks.some((b) => b.key === block.key)) {
        console.log(`Already seen CSS block ${block.key}`);
        return;
      }
      allCssBlocks.push(block);
    });
    return null;
  },

  happoInit() {
    snapshots = [];
    allCssBlocks = [];
    allAssetUrls = new Set();
    return null;
  },

  async happoTeardown() {
    console.log('teardown', snapshots, allCssBlocks, allAssetUrls);
    return null;
  }
}
