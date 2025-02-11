import globals from 'globals';
import js from '@eslint/js';

export default [
  {
    ignores: ['pages/*'],
  },

  js.configs.recommended,

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha, // Cypress uses mocha
        cy: false,
        Cypress: false,
      },
    },
  },
];
