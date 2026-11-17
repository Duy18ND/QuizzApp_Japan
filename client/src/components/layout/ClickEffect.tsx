import React, { useEffect, useState } from 'react';

interface BurstPetal {
  tx: string;
  ty: string;
  rot: string;
  size: number;
}

interface ClickBurst {
  id: number;
  x: number;
  y: number;
  petals: BurstPetal[];
}

const PETAL_TEMPLATES: BurstPetal[] = [
  { tx: '0px', ty: '-28px', rot: '25deg', size: 10 },
  { tx: '26px', ty: '-9px', rot: '95deg', size: 9 },
  { tx: '17px', ty: '23px', rot: '165deg', size: 10 },
  { tx: '-17px', ty: '23px', rot: '-155deg', size: 9 },
  { tx: '-26px', ty: '-9px', rot: '-75deg', size: 10 },
];

export const ClickEffect: React.FC = () => {
  const [bursts, setBursts] = useState<ClickBurst[]>([]);

  useEffect(() => {
    let seq = 0;
    const timeouts = new Set<number>();

    const handlePointerDown = (e: PointerEvent) => {
      seq += 1;
      const id = Date.now() * 100 + (seq % 100);

      const burst: ClickBurst = {
        id,
        x: e.clientX,
        y: e.clientY,
        petals: PETAL_TEMPLATES,
      };

      setBursts((prev) => [...prev.slice(-8), burst]);

      const timer = window.setTimeout(() => {
        setBursts((prev) => prev.filter((item) => item.id !== id));
        timeouts.delete(timer);
      }, 700);
      timeouts.add(timer);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden select-none"
    >
      {bursts.map((burst) => (
        <div
          key={burst.id}
          style={{ left: burst.x, top: burst.y }}
          className="pointer-events-none absolute size-0"
        >
          {/* 1. Gentle Water Ripple Ring */}
          <span className="animate-click-ripple pointer-events-none absolute top-0 left-0 size-10 rounded-full border border-primary/55 ring-2 ring-sakura/30" />

          {/* 2. Soft 5-Petal Sakura Flower Emblem Blooming at Click Center */}
          <svg
            viewBox="0 0 40 40"
            width={28}
            height={28}
            className="animate-sakura-bloom pointer-events-none absolute top-0 left-0 text-sakura"
            fill="currentColor"
          >
            {[0, 72, 144, 216, 288].map((deg) => (
              <path
                key={deg}
                transform={`rotate(${deg} 20 20)`}
                d="M20 4 L18.5 7 L16.8 5.2 C14.8 7.8 14.8 12.2 17.2 15.8 C18.4 17.6 19.4 18.6 20 18.8 C20.6 18.6 21.6 17.6 22.8 15.8 C25.2 12.2 25.2 7.8 23.2 5.2 L21.5 7 Z"
                opacity="0.8"
              />
            ))}
            <circle cx="20" cy="20" r="2.6" className="text-sun-disc" fill="currentColor" />
          </svg>

          {/* 3. Gentle Drifting Sakura Petals */}
          {burst.petals.map((p, idx) => (
            <svg
              key={idx}
              viewBox="0 0 24 24"
              width={p.size}
              height={p.size}
              style={
                {
                  '--tx': p.tx,
                  '--ty': p.ty,
                  '--rot': p.rot,
                } as React.CSSProperties
              }
              className="animate-petal-burst pointer-events-none absolute top-0 left-0 text-sakura"
              fill="currentColor"
            >
              <path d="M12 2.2 L9.8 5.8 L7.4 3.4 C4.2 6.8 3.8 13.2 6.6 17.8 C8.5 20.8 10.6 22.2 12 22.5 C13.4 22.2 15.5 20.8 17.4 17.8 C20.2 13.2 19.8 6.8 16.6 3.4 L14.2 5.8 Z" />
            </svg>
          ))}
        </div>
      ))}
    </div>
  );
};
