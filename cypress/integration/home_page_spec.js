import '../../';

describe('The Home Page', () => {
  it('successfully loads', () => {
    cy.visit('/');
    cy.get('.card').happoScreenshot();
  });
});
