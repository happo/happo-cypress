const chunked = require('./src/chunked.js');
const md5 = require('crypto-js/md5');
const parseSrcset = require('parse-srcset');

const findCSSAssetUrls = require('./src/findCSSAssetUrls');

const CSS_ELEMENTS_SELECTOR = 'style,link[rel="stylesheet"][href]';

function getBaseUrlWithPath(doc) {
  return doc.location.href.slice(0, doc.location.href.lastIndexOf('/') + 1);
}

before(() => {
  cy.task('happoInit');
  cy.on('window:load', window => {
    const styleElements = window.document.querySelectorAll(
      CSS_ELEMENTS_SELECTOR,
    );
    const baseUrl = getBaseUrlWithPath(window.document);
    for (const element of styleElements) {
      element.baseUrl = baseUrl;
    }
  });
});

after(() => {
  cy.task('happoTeardown');
});

const COMMENT_PATTERN = /^\/\*.+\*\/$/;

let config = {
  responsiveInlinedCanvases: false,
  canvasChunkSize: 200000, // 800 Kb per chunk
};

module.exports = {
  configure: userConfig => {
    config = { ...config, ...(userConfig || {}) };
  },
};

function extractCSSBlocks({ doc }) {
  const blocks = [];
  const styleElements = doc.querySelectorAll(CSS_ELEMENTS_SELECTOR);
  const baseUrl = getBaseUrlWithPath(doc);

  styleElements.forEach(element => {
    if (element.tagName === 'LINK') {
      // <link href>
      const href = element.getAttribute('href');
      blocks.push({ key: href, href, baseUrl: element.baseUrl || baseUrl });
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
      blocks.push({ content, key, baseUrl: element.baseUrl || baseUrl });
    }
  });
  return blocks;
}

function getSubjectAssetUrls(subject, doc) {
  const allUrls = [];
  const allElements = [subject].concat(
    Array.from(subject.querySelectorAll('*')),
  );
  const baseUrl = getBaseUrlWithPath(doc);
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
      const rawBase64 = base64Url.replace(/^data:image\/png;base64,/, '');
      const chunks = chunked(rawBase64, config.canvasChunkSize);
      for (let i = 0; i < chunks.length; i++) {
        const base64Chunk = chunks[i];
        const isFirst = i === 0;
        const isLast = i === chunks.length - 1;
        cy.task('happoRegisterBase64Image', {
          base64Chunk,
          src,
          isFirst,
          isLast,
        });
      }
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
  return allUrls.filter(({ url }) => !url.startsWith('data:'));
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

function registerScrollPositions(doc) {
  const elements = doc.body.querySelectorAll('*');
  for (const node of elements) {
    if (node.scrollTop !== 0 || node.scrollLeft !== 0) {
      node.setAttribute(
        'data-happo-scrollposition',
        `${node.scrollTop},${node.scrollLeft}`,
      );
    }
  }
}

function extractAttributes(el) {
  const result = {};
  [...el.attributes].forEach(item => {
    result[item.name] = item.value;
  });
  return result;
}

Cypress.Commands.add(
  'happoScreenshot',
  { prevSubject: true },
  (originalSubject, options = {}) => {
    const component = options.component || cy.state('runnable').fullTitle();
    const variant = options.variant || 'default';

    const doc = originalSubject[0].ownerDocument;
    const { subject, cleanup: canvasCleanup } = inlineCanvases(
      doc,
      originalSubject[0],
      options,
    );
    registerScrollPositions(doc);

    const transformCleanup = options.transformDOM
      ? transformDOM({
          doc,
          subject,
          ...options.transformDOM,
        })
      : undefined;

    subject.querySelectorAll('script').forEach(scriptEl => {
      scriptEl.parentNode.removeChild(scriptEl);
    });
    const html = subject.outerHTML;
    const assetUrls = getSubjectAssetUrls(subject, doc);
    const cssBlocks = extractCSSBlocks({ doc });
    cy.task('happoRegisterSnapshot', {
      html,
      cssBlocks,
      assetUrls,
      component,
      variant,
      htmlElementAttrs: extractAttributes(subject.ownerDocument.documentElement),
      bodyElementAttrs: extractAttributes(subject.ownerDocument.body),
      targets: options.targets,
    });
    if (transformCleanup) {
      transformCleanup();
    }
    canvasCleanup();
  },
);

Cypress.Commands.add('happoHideDynamicElements', (options = {}) => {
  const {
    defaultMatchers = [
      /[0-9]+\sdays?\sago/,
      /[0-9]+\sminutes?\sago/,
      /[0-9]{1,2}:[0-9]{2}/,
    ],
    matchers = [],
    defaultSelectors = ['time'],
    selectors = [],
    replace = false,
  } = options;
  const allMatchers = defaultMatchers.concat(matchers);
  const allSelectors = defaultSelectors.concat(selectors);
  cy.document().then(doc => {
    const elementsToHide = [];
    doc.body.querySelectorAll('*').forEach(e => {
      if (e.firstElementChild) {
        return; // this is not a leaf element
      }
      const text = e.textContent;
      if (allMatchers.some(regex => regex.test(text))) {
        elementsToHide.push(e);
      }
    });

    for (const selector of allSelectors) {
      doc.body.querySelectorAll(selector).forEach(e => {
        elementsToHide.push(e);
      });
    }
    if (replace) {
      const styleElement = doc.createElement('style');
      styleElement.innerHTML = `
          [data-happo-replaced] {
            position: relative;
          }
          [data-happo-replaced]:after {
            content: ' ';'
            display: block;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: black;
          }
        `;
      doc.head.appendChild(styleElement);

      for (const e of elementsToHide) {
        console.log('Replacing', e);
        e.setAttribute('data-happo-replaced', 'true');
        e.removeAttribute('data-happo-hide');
      }
    } else {
      for (const e of elementsToHide) {
        console.log('Hiding', e);
        e.setAttribute('data-happo-hide', 'true');
        e.removeAttribute('data-happo-replaced');
      }
    }
  });
});
