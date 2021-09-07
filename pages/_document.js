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
      <Html lang="en" className="html-wrapper">
        <Head>
          <link
            href="https://fonts.googleapis.com/css?family=Lobster&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.13.1/css/all.min.css"
            rel="stylesheet"
          />
          <link
            href="https://unpkg.com/reset-css@5.0.1/reset.css"
            rel="stylesheet"
          />
          <link href="/global.css" rel="stylesheet" />
          <link href="/fonts/fonts.css" rel="stylesheet" />
          <link href="/subfolder/styles.css" rel="stylesheet" />
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
