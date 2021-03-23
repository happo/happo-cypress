describe('Single page application', () => {
  it('has happo tests', () => {
    cy.visit('/hello');
    cy.contains('Click me').click();
    cy.get('h1').happoScreenshot({ component: 'Header', variant: 'red' });
  });
});
