describe('The Home Page', () => {
  it('successfully loads', () => {
    cy.visit('/', { log: false });
    cy.wait(100, { log: false });
    cy.scrollTo('bottom', { duration: 100, log: false });
    cy.scrollTo('top', { log: false });

    cy.happoHideDynamicElements({ selectors: ['.hide-me'], log: false });

    cy.get('body', { log: false }).happoScreenshot({
      component: 'Full-page',
      log: false,
    });
    cy.get('body', { log: false }).happoScreenshot({
      component: 'Full-page',
      variant: 'replaced-card',
      transformDOM: {
        selector: '.card',
        transform: (element, doc) => {
          const div = doc.createElement('div');
          div.innerHTML = 'Hello world!';
          return div;
        },
      },
      log: false,
    });
    cy.get('body', { log: false }).happoScreenshot({
      component: 'Full-page',
      variant: 'replaced-images',
      transformDOM: {
        selector: '.images img',
        transform: (element, doc) => {
          const div = doc.createElement('div');
          div.innerHTML = `Hello ${element.src}`;
          return div;
        },
      },
      log: false,
    });
    cy.get('.card', { log: false }).happoScreenshot({
      component: 'Card',
      log: false,
    });
    cy.get('.card,.button', { log: false }).happoScreenshot({
      includeAllElements: true,
      component: 'Card + Button',
      log: false,
    });

    cy.happoHideDynamicElements({ selectors: ['.hide-me'], log: false });
    cy.get('.dynamic-text', { log: false }).happoScreenshot({
      component: 'Dynamic text',
      log: false,
    });

    cy.happoHideDynamicElements({ replace: true, log: false });
    cy.get('.dynamic-text', { log: false }).happoScreenshot({
      component: 'Dynamic text',
      variant: 'replaced',
      log: false,
    });

    cy.get('.scrollcontainer', { log: false })
      .scrollTo('center', { log: false })
      .happoScreenshot({
        component: 'Scrollcontainer',
        variant: 'center',
        log: false,
      });

    cy.visit('/', { log: false });
    cy.happoHideDynamicElements({
      replace: true,
      selectors: ['.hide-me'],
      log: false,
    });
    cy.wait(100, { log: false });
    cy.get('.button', { log: false }).happoScreenshot({
      component: 'Button',
      variant: 'default',
      targets: [
        'chromeSmall',
        { name: 'firefoxSmall', browser: 'firefox', viewport: '400x800' },
      ],
      log: false,
    });
    cy.get('.card', { log: false }).happoScreenshot({
      component: 'Card',
      variant: 'firefox-only',
      targets: [{ name: 'firefoxSmall', browser: 'firefox', viewport: '400x800' }],
      log: false,
    });

    cy.get('.images', { log: false }).happoScreenshot({
      component: 'Images',
      variant: 'multiple',
      log: false,
    });

    cy.get('.button', { log: false }).happoScreenshot({ log: false });
    cy.get('.button', { log: false }).happoScreenshot({ log: false });
    cy.get('.button', { log: false }).happoScreenshot();

    cy.get('[data-test="untainted-canvas"]', { log: false }).happoScreenshot({
      component: 'Canvas',
      variant: 'untainted',
      log: false,
    });
    cy.get('.responsive-canvas-wrapper', { log: false }).happoScreenshot({
      component: 'Canvas',
      variant: 'wrapped, responsive',
      responsiveInlinedCanvases: true,
      log: false,
    });
    cy.get('[data-test="tainted-canvas"]', { log: false }).happoScreenshot({
      component: 'Canvas',
      variant: 'tainted',
      log: false,
    });
    cy.get('[data-test="empty-canvas"]', { log: false }).happoScreenshot({
      component: 'Canvas',
      variant: 'empty',
      log: false,
    });

    cy.get('#stretch-to-parent', { log: false }).happoScreenshot({
      component: 'Stretch to parent',
      variant: 'snapshotStrategy hoist',
      log: false,
      snapshotStrategy: 'hoist',
    });
    cy.get('#stretch-to-parent', { log: false }).happoScreenshot({
      component: 'Stretch to parent',
      variant: 'snapshotStrategy clip',
      log: false,
      snapshotStrategy: 'clip',
    });
  });
});
