'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // Start
    setVisible(true);
    setWidth(0);

    // Animate to ~85% quickly
    rafRef.current = requestAnimationFrame(() => {
      setWidth(30);
      timerRef.current = setTimeout(() => setWidth(70), 100);
    });

    // Finish after a short delay (page has rendered)
    const finishTimer = setTimeout(() => {
      setWidth(100);
      setTimeout(() => {
        setVisible(false);
        setWidth(0);
      }, 300);
    }, 250);

    return () => {
      clearTimeout(finishTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: 'linear-gradient(90deg, #7C3AED, #8B5CF6)',
          transition: width === 100
            ? 'width 0.2s ease-out'
            : 'width 0.4s ease-out',
          boxShadow: '0 0 8px rgba(139, 92, 246, 0.6)',
        }}
      />
    </div>
  );
}
