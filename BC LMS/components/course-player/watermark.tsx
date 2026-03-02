'use client';

// Watermark — floating email+timestamp overlay for DRM protection
// Repositions randomly every 30s; pointer-events: none so it doesn't block interaction

import { useState, useEffect } from 'react';

interface WatermarkProps {
  userEmail: string;
}

function getRandomPosition() {
  // Keep watermark within 10%-80% range to avoid clipping edges
  return {
    top: `${10 + Math.random() * 70}%`,
    left: `${10 + Math.random() * 70}%`,
  };
}

function getInitialTimestamp() {
  if (typeof window === 'undefined') return '';
  return new Date().toLocaleString('vi-VN');
}

export function Watermark({ userEmail }: WatermarkProps) {
  const [position, setPosition] = useState(getRandomPosition);
  const [timestamp, setTimestamp] = useState(getInitialTimestamp);

  useEffect(() => {
    const interval = setInterval(() => {
      setPosition(getRandomPosition());
      setTimestamp(new Date().toLocaleString('vi-VN'));
    }, 30_000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        pointerEvents: 'none',
        opacity: 0.15,
        zIndex: 20,
        userSelect: 'none',
        transform: 'rotate(-15deg)',
      }}
      className="text-xs font-mono text-neutral-900 whitespace-nowrap"
    >
      <div>{userEmail}</div>
      <div>{timestamp}</div>
    </div>
  );
}

