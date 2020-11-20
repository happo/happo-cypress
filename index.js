const md5 = require('crypto-js/md5');

const parseSrcset = require('parse-srcset');

const findCSSAssetUrls = require('./src/findCSSAssetUrls');

before(() => {
  cy.task('happoInit');
});

after(() => {
  cy.task('happoTeardown');
});

const COMMENT_PATTERN = /^\/\*.+\*\/$/;

let config = {
  responsiveInlinedCanvases: false,
};

module.exports = {
  configure: userConfig => {
    config = { ...config, ...(userConfig || {}) };
  },
};

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
      const key = md5(content).toString();
      blocks.push({ content, key, baseUrl });
    }
  });
  return blocks;
}

function getSubjectAssetUrls(subject, doc) {
  const allUrls = [];
  const allElements = [subject].concat(
    Array.from(subject.querySelectorAll('*')),
  );
  const baseUrl = doc.location.origin;
  allElements.forEach(element => {
    if (element.tagName === 'SCRIPT') {
      // skip script elements
      return;
    }
    const srcset = element.getAttribute('srcset');
    const src = element.getAttribute('src');
    const style = element.getAttribute('style');
    const base64Url = element._base64Url;
    if (base64Url) {
      cy.task('happoRegisterBase64Image', { base64Url, src });
    }
    if (src) {
      allUrls.push({ url: src, baseUrl });
    }
    if (srcset) {
      allUrls.push(...parseSrcset(srcset).map(p => ({ url: p.url, baseUrl })));
    }
    if (style) {
      allUrls.push(...findCSSAssetUrls(style).map(url => ({ url, baseUrl })));
    }
  });
  return allUrls;
}

function inlineCanvases(doc, subject, options) {
  const canvases = [];
  if (subject.tagName === 'CANVAS') {
    canvases.push(subject);
  }
  canvases.push(...Array.from(subject.querySelectorAll('canvas')));

  const responsive =
    typeof options.responsiveInlinedCanvases === 'boolean'
      ? options.responsiveInlinedCanvases
      : config.responsiveInlinedCanvases;

  let newSubject = subject;
  const replacements = [];
  for (const canvas of canvases) {
    try {
      const canvasImageBase64 = canvas.toDataURL('image/png');
      if (canvasImageBase64 === 'data:,') {
        continue;
      }
      const image = doc.createElement('img');

      const url = `/.happo-tmp/_inlined/${md5(
        canvasImageBase64,
      ).toString()}.png`;
      image.src = url;
      image._base64Url = canvasImageBase64;
      const style = canvas.getAttribute('style');
      if (style) {
        image.setAttribute('style', style);
      }
      const className = canvas.getAttribute('class');
      if (className) {
        image.setAttribute('class', className);
      }
      if (responsive) {
        image.style.width = '100%';
        image.style.height = 'auto';
      } else {
        const width = canvas.getAttribute('width');
        const height = canvas.getAttribute('height');
        image.setAttribute('width', width);
        image.setAttribute('height', height);
      }
      canvas.replaceWith(image);
      if (canvas === subject) {
        // We're inlining the subject (the `cy.get('canvas')` element). Make sure
        // we return the modified subject.
        newSubject = image;
      }
      replacements.push({ from: canvas, to: image });
    } catch (e) {
      if (e.name === 'SecurityError') {
        console.warn('[HAPPO] Failed to convert tainted canvas to PNG image');
        console.warn(e);
      } else {
        throw e;
      }
    }
  }

  function cleanup() {
    for (const { from, to } of replacements) {
      to.replaceWith(from);
    }
  }
  return { subject: newSubject, cleanup };
}

function transformDOM({ doc, selector, transform, subject }) {
  const elements = Array.from(subject.querySelectorAll(selector));
  if (!elements.length) {
    return;
  }
  const replacements = [];
  for (const element of elements) {
    const replacement = transform(element, doc);
    replacements.push({ from: element, to: replacement });
    element.replaceWith(replacement);
  }
  return () => {
    for (const { from, to } of replacements) {
      to.replaceWith(from);
    }
  };
}

Cypress.Commands.add(
  'happoScreenshot',
  { prevSubject: true },
  (originalSubject, options = {}) => {
    const component = options.component || cy.state('runnable').fullTitle();
    const variant = options.variant || 'default';
    cy.document().then(doc => {
      const { subject, cleanup: canvasCleanup } = inlineCanvases(
        doc,
        originalSubject[0],
        options,
      );

      const transformCleanup = options.transformDOM
        ? transformDOM({
            doc,
            subject,
            ...options.transformDOM,
          })
        : undefined;

      const html = subject.outerHTML;
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
      if (transformCleanup) {
        transformCleanup();
      }
      canvasCleanup();
    });
  },
);
