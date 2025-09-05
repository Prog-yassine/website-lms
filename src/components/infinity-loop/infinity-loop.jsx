import React, { useEffect, useRef } from 'react';

export default function InfiniteLoop() {
  const containerRef = useRef(null);

  const items = [
    '/universitys/1.png',
    '/universitys/2.png',
    '/universitys/3.png'
  ];

  useEffect(() => {
    const container = containerRef.current;
    let pos = 0;
    let animationFrame;

    const scroll = () => {
      pos -= 0.7; // Adjust speed
      // If scrolled past one full set, reset
      if (Math.abs(pos) >= container.scrollWidth / 2) {
        pos = 0;
      }
      container.style.transform = `translateX(${pos}px)`;
      animationFrame = requestAnimationFrame(scroll);
    };

    animationFrame = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <div className="relative overflow-hidden py-4 select-none">
      <div className="flex w-max gap-12" ref={containerRef}>
        {/* Repeat the items multiple times to allow smooth looping */}
        {[...items, ...items].map((item, i) => (
          <img key={i} src={item} alt="" className="h-12 w-auto grayscale" />
        ))}
        {[...items, ...items].map((item, i) => (
          <img key={`copy-${i}`} src={item} alt="" className="h-12 w-auto grayscale" />
        ))}
        {[...items, ...items].map((item, i) => (
          <img key={`copy-${i+1}`} src={item} alt="" className="h-12 w-auto grayscale" />
        ))}
      </div>
    </div>
  );
}
