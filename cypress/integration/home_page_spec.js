describe('The Home Page', () => {
  it('successfully loads', () => {
    cy.visit('/');
    cy.get('.card').happoScreenshot({ component: 'Card', variant: 'default' });

    cy.visit('/');
    cy.get('.button').happoScreenshot({
      component: 'Button',
      variant: 'default',
    });

    cy.get('.images').happoScreenshot({
      component: 'Images',
      variant: 'multiple',
    });
  });
});
