import React from 'react';

export default function IndexPage() {
  return (
    <div>
      <div className="card">
        <h1>I'm a card</h1>
        <img src='/hotel.jpg'/>
      </div>
      <style jsx>{`
        .card {
          max-width: 400px;
          border-radius: 5px;
          padding: 20px;
          border: 1px solid blue;
          text-align: center;
        }
        .card h1 {
          font-size: 30px;
          font-family: sans-serif;
          margin-bottom: 10px;
        }
        img {
          width: 100%;
        }
      `}</style>
    </div>
  );
}
