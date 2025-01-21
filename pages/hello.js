import Link from 'next/link';
import React, { useEffect } from 'react';

export default function InitialHelloPage() {
  useEffect(() => {
    const el = document.createElement('link');
    el.setAttribute('rel', 'stylesheet');
    el.setAttribute('href', 'subfolder/hello.css');
    document.head.appendChild(el);
  }, []);

  return (
    <div>
      <Link href="/subfolder/hello">
        <a>Click me</a>
      </Link>
    </div>
  );
}
