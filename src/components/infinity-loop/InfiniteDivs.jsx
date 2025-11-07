import React, { useEffect, useRef, useMemo } from 'react';

export default function InfiniteDivs({ count = 24, size = 100, speed = 0.6, color = 'rgb(16,185,129)' }) {
  const containerRef = useRef(null);
  const trackRef = useRef(null);

  // create a single set of items
  const items = useMemo(() => Array.from({ length: count }).map((_, i) => i), [count]);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    let pos = 0;
    let raf;

    const update = () => {
      pos -= speed; // pixels per frame (tune speed)
      // when we've moved past one set, reset; track.scrollWidth is double set width
      const resetThreshold = track.scrollWidth / 2;
      if (Math.abs(pos) >= resetThreshold) pos = 0;
      track.style.transform = `translateX(${pos}px)`;
      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [count, speed]);

  // inline styles for blocks
  const blockStyle = {
    width: `${size}px`,
    height: `${size}px`,
    minWidth: `${size}px`,
    minHeight: `${size}px`,
    borderRadius: '6px',
    background: color,
    opacity: 0.85
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* track duplicated once (render two sets) for seamless loop */}
      <div ref={trackRef} className="flex items-center gap-4 will-change-transform" style={{ transform: 'translateX(0)' }}>
        {[...items, ...items].map((i, idx) => (
          <div key={idx} style={blockStyle} />
        ))}
      </div>
    </div>
  );
}