const path = require('path');
const crypto = require('crypto');

function extractCSSChunks({ doc }) {
  const blocks = [];
  const styleElements = doc.querySelectorAll(
    'style,link[rel="stylesheet"][href]',
  );
  styleElements.forEach(element => {
    if (element.tagName === 'LINK') {
      const href = element.getAttribute('href');
      blocks.push({ key: href, href });
    } else {
      const content =
        element.innerHTML ||
        Array.from(element.sheet.cssRules)
          .map(r => r.cssText)
          .join('\n');
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
  (subject, name, options = {}) => {
    const testTitle = cy.state().ctx.test.title;
    const parentTitle = cy.state().ctx.test.parent.title;
    const runnable = cy.state('runnable');
    //console.log(cy.state())
    cy.document().then(doc => {
      const html = subject.prop('outerHTML');
      const cssBlocks = extractCSSChunks({ doc });
      console.log({ html, cssBlocks })
    });
  },
);
