import React, { useEffect, useRef } from 'react';

function CanvasImage({ responsive }) {
  const ref = useRef();
  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    ctx.moveTo(0, 0);
    ctx.lineTo(200, 100);
    ctx.stroke();
    ctx.font = '30px Arial';
    ctx.rotate(0.25);
    ctx.fillText('Hello World', 20, 50);
  });

  return (
    <canvas
      className="canvas"
      data-test="untainted-canvas"
      style={{
        padding: 20,
        width: responsive ? 'calc(100% - 40px)' : undefined,
      }}
      ref={ref}
      width={responsive ? undefined : '200'}
      height={responsive ? undefined : '100'}
    />
  );
}

function TaintedCanvasImage() {
  const ref = useRef();
  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    const img = new Image();
    img.addEventListener('load', () => {
      ctx.drawImage(img, 0, 0);
    });
    img.src = 'https://placekitten.com/100/100';
  });

  return (
    <canvas
      className="canvas"
      data-test="tainted-canvas"
      style={{ padding: 20 }}
      ref={ref}
      width="200"
      height="100"
    />
  );
}

function EmptyCanvasImage() {
  // 0x0 canvases will return `data:,` as the base64data
  return (
    <div style={{ width: 100, height: 50 }} data-test="empty-canvas">
      <canvas
        style={{ width: '100%', height: '100%', background: 'red' }}
        width="0"
        height="0"
      />
    </div>
  );
}

export default function IndexPage() {
  useEffect(() => {
    const style = document.createElement('style');
    document.head.appendChild(style);
    style.sheet.insertRule('.card { padding: 20px; }');
    return () => document.head.removeChild(styleEl);
  }, []);

  return (
    <div>
      <div className="scrollcontainer">
        <div className="scrollinner">
          <div style={{ backgroundColor: 'red', height: 100 }} />
          <div style={{ backgroundColor: 'white', height: 100 }} />
          <div style={{ backgroundColor: 'blue', height: 100 }} />
          <div style={{ backgroundColor: 'yellow', height: 100 }} />
        </div>
      </div>
      <CanvasImage />
      <TaintedCanvasImage />
      <EmptyCanvasImage />
      <div style={{ background: 'url(#shadow)' }} />
      <div
        className="dynamic-text"
        style={{ border: '1px solid gray', padding: 10, marginBottom: 20 }}
      >
        <h3>Hello</h3>
        <p>
          Created <span>5 days ago</span> by Tom Dooner. Updated
          <i>
            13 minutes ago
          </i>
          .
        </p>
        <p>
          The time is now <span>2:54pm</span>. One minute ago was <i>2:53 PM</i>
          .
        </p>
        <p>
          In Sweden however, it's <time>54 minutes past 14</time>.
        </p>

        <p>
          Here's some content that you can{' '}
          <b className="hide-me">manually hide</b>.
        </p>
      </div>
      <div className="card">
        <h1>I'm a card</h1>
        <img
          className="reddot"
          src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="
          alt="Red dot"
        />
        <i
          className="fas fa-camera"
          style={{ marginBottom: 20, fontSize: '40px' }}
        />
        <img src="/hotel.jpg" />
        <CanvasImage responsive />
        <div className="responsive-canvas-wrapper" style={{ width: 400 }}>
          <CanvasImage />
        </div>
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
        <div
          className="image background-from-subfolder"
          style={{
            paddingTop: '33%',
          }}
        />
        <div
          style={{
            backgroundImage: 'url()',
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
        .scrollcontainer {
          display: block;
          width: 100px;
          height: 100px;
          overflow: auto;
        }
        .scrollinner {
          display: grid;
          grid-template-columns: 100px 100px;
        }
        img {
          width: 100%;
        }
        img.reddot {
          display: block;
          width: auto;
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
