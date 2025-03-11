import React, { useEffect } from 'react';

export default function ConstructedStylesPage() {
  useEffect(() => {
    const styles = new CSSStyleSheet();
    styles.replaceSync(`
      #with-constructed-styles {
        --font: 50px/1.2 monospace;
        --font-weight: bold;
        font: var(--font);
        font-weight: var(--font-weight);
      }
    `);
    document.adoptedStyleSheets.push(styles);
    document.getElementById('with-constructed-styles').textContent =
      'Constructed styles applied';
  }, []);

  return <div id="with-constructed-styles">Constructed styles</div>;
}
