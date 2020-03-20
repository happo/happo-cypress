let snapshots = [];
let allCssBlocks = [];

module.exports = {
  happoRegisterSnapshot({ html, cssBlocks, component, variant }) {
    snapshots.push({ html, component, variant });
    cssBlocks.forEach(({ key, href, content }) => {
      if (allCssBlocks.some((b) => b.key === key)) {
        console.log(`Already seen block ${key}`);
        return;
      }
      allCssBlocks.push({ key, href, content });
    });
    return null;
  },
  happoInit() {
    snapshots = [];
    allCssBlocks = [];
    return null;
  },
  happoTeardown() {
    console.log('teardown', snapshots, allCssBlocks);
    return null;
  }
}
