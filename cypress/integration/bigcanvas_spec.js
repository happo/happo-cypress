describe('Big canvas', () => {
  it('has screenshots', () => {
    cy.visit('/big-canvas');
    cy.get('.canvas-loaded');
    cy.get('body').happoScreenshot({
      component: 'Big canvas',
      variant: 'default',
    });
  });
});
