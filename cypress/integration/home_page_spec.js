describe('The Home Page', () => {
  it('successfully loads', () => {
    cy.visit('/');
    cy.wait(100);
    cy.get('body').happoScreenshot({ component: 'Full-page' });
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

    cy.get('canvas').happoScreenshot({ component: 'Canvas' });
  });
});
