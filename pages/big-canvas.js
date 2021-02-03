import { useEffect, useRef, useState } from 'react';

export default function BigCanvasPage() {
  const ref = useRef();
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      setLoaded(true);
    };
    img.src = '/storyhotel-breakfast.jpg';
  });

  return (
    <div>
      <canvas
        className={loaded ? 'canvas-loaded' : ''}
        ref={ref}
        width="2000"
        height="1333"
      />
    </div>
  );
}
