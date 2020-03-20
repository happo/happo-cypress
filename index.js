const path = require('path');
const crypto = require('crypto');

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

      blocks.push({ content, key });
    }
  });
  return blocks;
}

Cypress.Commands.add(
  'happoScreenshot',
  { prevSubject: 'optional' },
  (subject, happoOptions = {}, options = {}) => {
    const component = happoOptions.component || cy.state('runnable').fullTitle();
    const variant = happoOptions.variant || 'default';

    cy.document().then(doc => {
      const html = subject.prop('outerHTML');
      const cssBlocks = extractCSSChunks({ doc });
      cy.task('happoRegisterSnapshot', { html, cssBlocks, component, variant });
    });
  },
);
