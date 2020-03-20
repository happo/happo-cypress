const path = require('path');
const crypto = require('crypto');

const parseSrcset = require('parse-srcset');

const findBackgroundImageUrls = require('./src/findBackgroundImageUrls');

before(() => {
  cy.task('happoInit');
});

after(() => {
  cy.task('happoTeardown');
});

const COMMENT_PATTERN = /^\/\*.+\*\/$/;

function extractCSSChunks({ doc }) {
  const blocks = [];
  const styleElements = doc.querySelectorAll(
    'style,link[rel="stylesheet"][href]',
  );
  styleElements.forEach(element => {
    if (element.tagName === 'LINK') {
      // <link href>
      const href = element.getAttribute('href');
      blocks.push({ key: href, href });
    } else {
      // <style>
      const lines = content
        ? content.split('\n')
        : Array.from(element.sheet.cssRules).map(r => r.cssText);

      // Filter out those lines that are comments (these are often source
      // mappings)
      const content = lines
        .filter(line => !COMMENT_PATTERN.test(line))
        .join('\n');

      // Create a hash so that we can dedupe equal styles
      const key = crypto
        .createHash('md5')
        .update(content)
        .digest('hex');

      const assetUrls = findBackgroundImageUrls(content);
      blocks.push({ content, key, assetUrls });
    }
  });
  return blocks;
}

function getAssetUrls(subject, win) {
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
      allUrls.push(...findBackgroundImageUrls(style));
    }
  });
  return allUrls;
}

Cypress.Commands.add(
  'happoScreenshot',
  { prevSubject: 'optional' },
  (subject, options = {}) => {
    const component = options.component || cy.state('runnable').fullTitle();
    const variant = options.variant || 'default';
    cy.document().then(doc => {
      const html = subject.prop('outerHTML');
      const assetUrls = getAssetUrls(subject, doc.window);
      const cssBlocks = extractCSSChunks({ doc });
      cy.task('happoRegisterSnapshot', {
        html,
        cssBlocks,
        assetUrls,
        component,
        variant,
      });
    });
  },
);
