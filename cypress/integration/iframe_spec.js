describe('iframe tests', () => {
  it('has happo tests', () => {
    cy.visit('/iframed');
    cy.getIframe().happoScreenshot({
      component: 'Start page',
      variant: 'iframed',
    });
    cy.getIframe().find('.button').happoScreenshot({
      component: 'Button',
      variant: 'from iframe',
    });
  });
});
