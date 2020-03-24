describe('The Home Page', () => {
  it('successfully loads', () => {
    cy.visit('/');
    cy.get('body').happoScreenshot({ component: 'Full-page' });
    cy.get('.card').happoScreenshot({ component: 'Card' });

    cy.visit('/');
    cy.get('.button').happoScreenshot({
      component: 'Button',
      variant: 'default',
    });

    cy.get('.images').happoScreenshot({
      component: 'Images',
      variant: 'multiple',
    });


    cy.get('.button').happoScreenshot();
    cy.get('.button').happoScreenshot();
    cy.get('.button').happoScreenshot();
  });
});
