describe('The Home Page', () => {
  it('successfully loads', () => {
    cy.visit('/');
    cy.wait(100);
    cy.scrollTo('bottom', { duration: 100 });
    cy.scrollTo('top');

    cy.happoHideDynamicElements({ selectors: ['.hide-me'] });

    cy.get('body').happoScreenshot({ component: 'Full-page' });
    cy.get('body').happoScreenshot({
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
    });
    cy.get('body').happoScreenshot({
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
    });
    cy.get('.card').happoScreenshot({ component: 'Card' });

    cy.happoHideDynamicElements({ selectors: ['.hide-me'] });
    cy.get('.dynamic-text').happoScreenshot({
      component: 'Dynamic text',
    });

    cy.happoHideDynamicElements({ replace: true });
    cy.get('.dynamic-text').happoScreenshot({
      component: 'Dynamic text',
      variant: 'replaced',
    });

    cy.get('.scrollcontainer')
      .scrollTo('center')
      .happoScreenshot({ component: 'Scrollcontainer', variant: 'center' });

    cy.visit('/');
    cy.happoHideDynamicElements({ replace: true, selectors: ['.hide-me'] });
    cy.wait(100);
    cy.get('.button').happoScreenshot({
      component: 'Button',
      variant: 'default',
      targets: [
        'chromeSmall',
        { name: 'firefoxSmall', browser: 'firefox', viewport: '400x800' },
      ],
    });
    cy.get('.card').happoScreenshot({
      component: 'Card',
      variant: 'firefox-only',
      targets: [
        { name: 'firefoxSmall', browser: 'firefox', viewport: '400x800' },
      ],
    });

    cy.get('.images').happoScreenshot({
      component: 'Images',
      variant: 'multiple',
    });

    cy.get('.button').happoScreenshot();
    cy.get('.button').happoScreenshot();
    cy.get('.button').happoScreenshot();

    cy.get('[data-test="untainted-canvas"]').happoScreenshot({
      component: 'Canvas',
      variant: 'untainted',
    });
    cy.get('.responsive-canvas-wrapper').happoScreenshot({
      component: 'Canvas',
      variant: 'wrapped, responsive',
      responsiveInlinedCanvases: true,
    });
    cy.get('[data-test="tainted-canvas"]').happoScreenshot({
      component: 'Canvas',
      variant: 'tainted',
    });
    cy.get('[data-test="empty-canvas"]').happoScreenshot({
      component: 'Canvas',
      variant: 'empty',
    });
  });
});
