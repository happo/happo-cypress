describe('A different page', () => {
  it('has happo tests', () => {
    cy.visit('/');
    cy.happoHideDynamicElements();
    cy.get('.card').happoScreenshot({ component: 'Card', variant: 'from page' });

    if (Cypress.env('INTRODUCE_FAILING_ASSERTION')) {
      cy.get('body').should('have.class', 'nope');
    }
    if (Cypress.env('RETRY_FAIL_ONCE')) {
      if (!global.hasFailedOnce) {
        cy.get('body').should('have.class', 'nope');
        global.hasFailedOnce = true;
      }
    }
  });
});
