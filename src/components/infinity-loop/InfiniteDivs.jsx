import React, { useEffect, useRef, useMemo } from 'react';

export default function InfiniteDivs({
  count = 24,
  size = 100,
  speed = 0.6,
  color = 'rgb(16,185,129)',
  icons = []
}) {
  const containerRef = useRef(null);
  const trackRef = useRef(null);

  // ✅ fix dependency
  const items = useMemo(() => Array.from({ length: count }).map((_, i) => i), [count]);

  useEffect(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;

    let pos = 0;
    let raf;

    const update = () => {
      pos -= speed;
      const resetThreshold = track.scrollWidth / 2;
      if (Math.abs(pos) >= resetThreshold) pos = 0;
      track.style.transform = `translateX(${pos}px)`;
      raf = requestAnimationFrame(update);
    };

    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [count, speed]);

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
      <div
        ref={trackRef}
        className="flex items-center gap-4 will-change-transform"
        style={{ transform: 'translateX(0)' }}
      >
        {items.map((_, idx) => (
          <div key={idx} style={blockStyle} className="flex items-center justify-center">
            <img
              src={icons[idx % icons.length]}
              alt={`icon-${idx}`}
              className="w-14 h-14 object-contain"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
