import React, { useEffect } from 'react';
import Head from 'next/head';

export default function HelloPage() {
  return (
    <div>
      <Head>
        <base href="/" />
      </Head>
      <h1>Hello world. I'm red.</h1>
    </div>
  );
}
