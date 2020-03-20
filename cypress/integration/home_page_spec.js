describe('The Home Page', () => {
  it('successfully loads', () => {
    cy.visit('/');
    cy.get('.card').happoScreenshot();

    cy.visit('/');
    cy.get('.button').happoScreenshot();
  });
});
