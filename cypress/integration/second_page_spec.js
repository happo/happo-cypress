describe('A different page', () => {
  it('has happo tests', () => {
    cy.visit('/');
    cy.get('body').should('have.class', 'nope');
    cy.get('.card').happoScreenshot({ component: 'Card', variant: 'from page' });
  });
});
