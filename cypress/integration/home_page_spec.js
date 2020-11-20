describe('The Home Page', () => {
  it('successfully loads', () => {
    cy.visit('/');
    cy.wait(100);
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
        }
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
        }
      },
    });
    cy.get('.card').happoScreenshot({ component: 'Card' });

    cy.visit('/');
    cy.wait(100);
    cy.get('.button').happoScreenshot({
      component: 'Button',
      variant: 'default',
      targets: ['chromeSmall'],
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
