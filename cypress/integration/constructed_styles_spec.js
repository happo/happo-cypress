describe('Constructed styles', () => {
  it('has happo tests', () => {
    cy.visit('/constructed-styles');
    cy.contains('Constructed styles applied');
    cy.get('body').happoScreenshot({
      component: 'Constructed styles',
      variant: 'default',
    });
  });
});
