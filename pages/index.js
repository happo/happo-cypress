import React, { useEffect } from 'react';

export default function IndexPage() {
  useEffect(() => {
    const style = document.createElement('style');
    document.head.appendChild(style);
    style.sheet.insertRule('.card { padding: 20px; }');
    return () => document.head.removeChild(styleEl);
  }, []);

  return (
    <div>
      <div className="card">
        <h1>I'm a card</h1>
        <img src="/hotel.jpg" />
      </div>
      <button className="button">
        Click me
      </button>
      <style jsx>{`
        .card {
          max-width: 400px;
          border-radius: 5px;
          border: 1px solid blue;
          text-align: center;
          margin-bottom: 20px;
        }
        .card h1 {
          font-size: 30px;
          font-family: sans-serif;
          margin-bottom: 10px;
        }
        img {
          width: 100%;
        }
        button {
          background-color: #333;
          color: #fff;
          padding: 10px 20px;
          min-width: 200px;
          text-align: center;
          font-size: 14px;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
