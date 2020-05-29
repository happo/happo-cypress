const crypto = require('crypto');

const parseSrcset = require('parse-srcset');

const findCSSAssetUrls = require('./src/findCSSAssetUrls');

before(() => {
  cy.task('happoInit');
});

after(() => {
  cy.task('happoTeardown');
});

const COMMENT_PATTERN = /^\/\*.+\*\/$/;

function extractCSSBlocks({ doc }) {
  const blocks = [];
  const styleElements = doc.querySelectorAll(
    'style,link[rel="stylesheet"][href]',
  );
  const baseUrl = doc.location.origin;
  styleElements.forEach(element => {
    if (element.tagName === 'LINK') {
      // <link href>
      const href = element.getAttribute('href');
      blocks.push({ key: href, href, baseUrl });
    } else {
      // <style>
      const lines = Array.from(element.sheet.cssRules).map(r => r.cssText);

      // Filter out those lines that are comments (these are often source
      // mappings)
      const content = lines
        .filter(line => !COMMENT_PATTERN.test(line))
        .join('\n');

      // Create a hash so that we can dedupe equal styles
      const key = crypto.createHash('md5').update(content).digest('hex');

      blocks.push({ content, key, baseUrl });
    }
  });
  return blocks;
}

function getSubjectAssetUrls(subject, doc) {
  const allUrls = [];
  const allElements = [subject[0]].concat(
    Array.from(subject[0].querySelectorAll('*')),
  );
  allElements.forEach(element => {
    const srcset = element.getAttribute('srcset');
    const src = element.getAttribute('src');
    const style = element.getAttribute('style');
    if (src) {
      allUrls.push(src);
    }
    if (srcset) {
      allUrls.push(...parseSrcset(srcset).map(p => p.url));
    }
    if (style) {
      allUrls.push(...findCSSAssetUrls(style));
    }
  });
  const baseUrl = doc.location.origin;
  return allUrls.map(url => ({ url, baseUrl }));
}

Cypress.Commands.add(
  'happoScreenshot',
  { prevSubject: true },
  (subject, options = {}) => {
    const component = options.component || cy.state('runnable').fullTitle();
    const variant = options.variant || 'default';
    cy.document().then(doc => {
      const html = subject.prop('outerHTML');
      const assetUrls = getSubjectAssetUrls(subject, doc);
      const cssBlocks = extractCSSBlocks({ doc });
      cy.task('happoRegisterSnapshot', {
        html,
        cssBlocks,
        assetUrls,
        component,
        variant,
        targets: options.targets,
      });
    });
  },
);
