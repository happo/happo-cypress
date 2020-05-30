describe('A different page', () => {
  it('has happo tests', () => {
    cy.visit('/');
    cy.get('.card').happoScreenshot({ component: 'Card', variant: 'from page' });
  });
});
