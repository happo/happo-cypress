module.exports = {
  aliases: {
    Link: 'next/link',
    Head: 'next/head',
    Router: 'next/router',
  },
  namedExports: {
    'react': ['useEffect', 'useState', 'useRef'],
  },
  excludes: ['./next/**'],
  importDevDependencies: true,
};
