describe('A different page', () => {
  it('has happo tests', () => {
    cy.visit('/');

    cy.get('.non-existant').should('be.visible');
    cy.get('.card').happoScreenshot({ component: 'Card', variant: 'from page' });
  });
});
