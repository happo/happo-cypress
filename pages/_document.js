import Document, { Html, Head, Main, NextScript } from 'next/document';
import NextHead from 'next/head';
import React from 'react';

class MyDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps };
  }

  render() {
    return (
      <Html lang="en">
        <Head>
          <link
            href="https://unpkg.com/reset-css@5.0.1/reset.css"
            rel="stylesheet"
          />
          <link
            href="/global.css"
            rel="stylesheet"
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
