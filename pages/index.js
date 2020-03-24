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
      <button className="button">Click me</button>
      <div className="images">
        <img
          className="image"
          srcSet="/storyhotel-small.jpg 480w, /storyhotel-large.jpg 800w"
          sizes="(max-width: 600px) 480px, 800px"
          src="/storyhotel-large.jpg"
        />
        <img
          className="image"
          src="http://localhost:7654/storyhotel-small.jpg?foobar=ignore"
        />
        <div
          className="image"
          style={{
            backgroundImage: 'url(/storyhotel-chairs.jpg)',
            paddingTop: '33%',
          }}
        />
        <div
          className="image background"
          style={{
            paddingTop: '33%',
          }}
        />
        <picture>
          <source
            srcSet="/storyhotel-breakfast.jpg"
            media="(max-width: 1800px)"
          />
          <img className="image" src="/broken-image.jpg" />
        </picture>
        <img
          className="image"
          src="https://q-xx.bstatic.com/xdata/images/hotel/max1000/133065887.jpg?k=4d2f546ba33c456afeceed92d808a48de95f92c65a235c9cf399a6e2f6c67c34&o="
        />
      </div>
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
          margin-bottom: 10px;
          font-family: 'Lobster';
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
        .images .image {
          display: block;
          max-width: 500px;
          background-size: cover;
          background-repeat: no-repeat;
        }
        .image.background {
          background: url('/storyhotel-bathroom.jpg');
        }
      `}</style>
    </div>
  );
}
