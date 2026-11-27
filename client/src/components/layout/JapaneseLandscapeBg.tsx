import React from 'react';
import dayLandscapeUrl from '../../assets/bK.webp';
import nightLandscapeUrl from '../../assets/aK.webp';

interface SakuraPetalSpec {
  left: string;
  top: string;
  size: number;
  duration: string;
  delay: string;
  layerClass: string;
}

// 30 3D Sakura petals originating predominantly from the right sakura branches & upper sky (sharp, no blur)
const SAKURA_PETALS: SakuraPetalSpec[] = [
  // Foreground Layer (7 petals: 14px–18px, opacity-80, fast 8s–10s)
  { left: '96%', top: '18%', size: 16, duration: '8.2s', delay: '-1.2s', layerClass: 'opacity-80' },
  { left: '88%', top: '8%', size: 18, duration: '9.4s', delay: '-4.5s', layerClass: 'opacity-80' },
  { left: '92%', top: '34%', size: 15, duration: '7.8s', delay: '-2.8s', layerClass: 'opacity-80' },
  { left: '78%', top: '4%', size: 17, duration: '9.8s', delay: '-6.1s', layerClass: 'opacity-80' },
  { left: '64%', top: '-4%', size: 14, duration: '8.6s', delay: '-3.4s', layerClass: 'opacity-80' },
  { left: '84%', top: '24%', size: 16, duration: '9.1s', delay: '-7.3s', layerClass: 'opacity-80' },
  { left: '52%', top: '-6%', size: 15, duration: '8.4s', delay: '-5.0s', layerClass: 'opacity-80' },

  // Midground Layer (13 petals: 10px–13px, opacity-60, medium 11s–15s)
  { left: '98%', top: '12%', size: 12, duration: '11.5s', delay: '-2.1s', layerClass: 'opacity-60' },
  { left: '91%', top: '28%', size: 13, duration: '13.2s', delay: '-8.4s', layerClass: 'opacity-60' },
  { left: '85%', top: '14%', size: 10, duration: '12.4s', delay: '-5.6s', layerClass: 'opacity-60' },
  { left: '76%', top: '6%', size: 12, duration: '14.6s', delay: '-11.2s', layerClass: 'opacity-60' },
  { left: '94%', top: '42%', size: 11, duration: '11.8s', delay: '-3.9s', layerClass: 'opacity-60' },
  { left: '68%', top: '-2%', size: 13, duration: '13.9s', delay: '-9.7s', layerClass: 'opacity-60' },
  { left: '58%', top: '-4%', size: 10, duration: '12.1s', delay: '-1.5s', layerClass: 'opacity-60' },
  { left: '82%', top: '32%', size: 12, duration: '14.8s', delay: '-6.8s', layerClass: 'opacity-60' },
  { left: '46%', top: '-6%', size: 10, duration: '11.6s', delay: '-10.4s', layerClass: 'opacity-60' },
  { left: '72%', top: '16%', size: 11, duration: '13.5s', delay: '-4.2s', layerClass: 'opacity-60' },
  { left: '36%', top: '-5%', size: 12, duration: '14.2s', delay: '-12.6s', layerClass: 'opacity-60' },
  { left: '89%', top: '6%', size: 10, duration: '11.9s', delay: '-7.1s', layerClass: 'opacity-60' },
  { left: '26%', top: '-4%', size: 11, duration: '13.1s', delay: '-2.9s', layerClass: 'opacity-60' },

  // Background Layer (10 petals: 6px–8px, opacity-35, slow 16s–21s)
  { left: '95%', top: '20%', size: 7, duration: '17.5s', delay: '-3.5s', layerClass: 'opacity-35' },
  { left: '87%', top: '10%', size: 8, duration: '19.8s', delay: '-14.2s', layerClass: 'opacity-35' },
  { left: '79%', top: '2%', size: 6, duration: '16.4s', delay: '-7.8s', layerClass: 'opacity-35' },
  { left: '70%', top: '-3%', size: 8, duration: '20.6s', delay: '-1.9s', layerClass: 'opacity-35' },
  { left: '61%', top: '-5%', size: 6, duration: '18.6s', delay: '-12.1s', layerClass: 'opacity-35' },
  { left: '50%', top: '-4%', size: 7, duration: '20.1s', delay: '-5.4s', layerClass: 'opacity-35' },
  { left: '40%', top: '-6%', size: 6, duration: '16.9s', delay: '-15.7s', layerClass: 'opacity-35' },
  { left: '30%', top: '-5%', size: 8, duration: '21.0s', delay: '-9.3s', layerClass: 'opacity-35' },
  { left: '20%', top: '-4%', size: 7, duration: '18.1s', delay: '-2.6s', layerClass: 'opacity-35' },
  { left: '90%', top: '38%', size: 6, duration: '19.3s', delay: '-13.4s', layerClass: 'opacity-35' },
];

interface BirdSpec {
  top: string;
  scale: number;
  flyDuration: string;
  flyDelay: string;
  flapDelay: string;
}

const DAY_BIRDS: BirdSpec[] = [
  { top: '11%', scale: 0.95, flyDuration: '22s', flyDelay: '-3s', flapDelay: '0s' },
  { top: '9%', scale: 0.78, flyDuration: '22s', flyDelay: '-4.2s', flapDelay: '-0.25s' },
  { top: '13%', scale: 0.72, flyDuration: '22s', flyDelay: '-5.1s', flapDelay: '-0.5s' },
  { top: '16%', scale: 0.85, flyDuration: '26s', flyDelay: '-14s', flapDelay: '-0.15s' },
  { top: '14%', scale: 0.68, flyDuration: '26s', flyDelay: '-15.3s', flapDelay: '-0.4s' },
  { top: '7%', scale: 0.62, flyDuration: '19s', flyDelay: '-9s', flapDelay: '-0.3s' },
];

// 38 Twinkling Stars across the upper night sky
const NIGHT_STARS = [
  { cx: 65, cy: 34, r: 1.5, delay: '0s', duration: '2.8s' },
  { cx: 118, cy: 72, r: 1.2, delay: '-1.1s', duration: '3.6s' },
  { cx: 164, cy: 26, r: 1.9, delay: '-2.3s', duration: '4.2s' },
  { cx: 215, cy: 58, r: 1.3, delay: '-0.6s', duration: '3.1s' },
  { cx: 268, cy: 22, r: 1.7, delay: '-1.9s', duration: '4.6s' },
  { cx: 312, cy: 84, r: 1.4, delay: '-3.2s', duration: '2.5s' },
  { cx: 356, cy: 42, r: 2.0, delay: '-0.4s', duration: '3.9s' },
  { cx: 402, cy: 18, r: 1.2, delay: '-2.7s', duration: '3.3s' },
  { cx: 448, cy: 66, r: 1.6, delay: '-1.4s', duration: '4.4s' },
  { cx: 492, cy: 30, r: 1.8, delay: '-3.6s', duration: '2.9s' },
  { cx: 538, cy: 78, r: 1.3, delay: '-0.8s', duration: '3.7s' },
  { cx: 584, cy: 24, r: 2.1, delay: '-2.1s', duration: '4.8s' },
  { cx: 628, cy: 54, r: 1.4, delay: '-1.6s', duration: '3.0s' },
  { cx: 672, cy: 16, r: 1.7, delay: '-0.2s', duration: '4.1s' },
  { cx: 718, cy: 46, r: 1.5, delay: '-2.9s', duration: '2.7s' },
  { cx: 764, cy: 28, r: 1.9, delay: '-1.3s', duration: '3.5s' },
  { cx: 808, cy: 70, r: 1.2, delay: '-3.4s', duration: '4.3s' },
  { cx: 852, cy: 20, r: 1.6, delay: '-0.7s', duration: '3.2s' },
  { cx: 896, cy: 52, r: 2.0, delay: '-2.5s', duration: '4.7s' },
  { cx: 942, cy: 32, r: 1.3, delay: '-1.8s', duration: '2.6s' },
  { cx: 988, cy: 64, r: 1.7, delay: '-0.5s', duration: '3.8s' },
  { cx: 1032, cy: 22, r: 1.4, delay: '-3.1s', duration: '4.0s' },
  { cx: 1078, cy: 48, r: 1.8, delay: '-1.0s', duration: '3.4s' },
  { cx: 1124, cy: 18, r: 1.5, delay: '-2.2s', duration: '4.5s' },
  { cx: 1168, cy: 60, r: 1.2, delay: '-3.8s', duration: '2.9s' },
  { cx: 1212, cy: 36, r: 1.9, delay: '-0.9s', duration: '3.6s' },
  { cx: 1258, cy: 74, r: 1.4, delay: '-2.6s', duration: '4.2s' },
  { cx: 1304, cy: 26, r: 1.6, delay: '-1.5s', duration: '3.1s' },
  { cx: 1348, cy: 50, r: 2.0, delay: '-3.0s', duration: '4.9s' },
  { cx: 1392, cy: 30, r: 1.3, delay: '-0.3s', duration: '2.8s' },
  { cx: 145, cy: 112, r: 1.3, delay: '-1.7s', duration: '3.7s' },
  { cx: 290, cy: 108, r: 1.5, delay: '-0.5s', duration: '4.1s' },
  { cx: 430, cy: 102, r: 1.2, delay: '-2.8s', duration: '3.3s' },
  { cx: 570, cy: 106, r: 1.6, delay: '-1.2s', duration: '4.6s' },
  { cx: 740, cy: 96, r: 1.4, delay: '-3.5s', duration: '2.9s' },
  { cx: 880, cy: 104, r: 1.7, delay: '-0.9s', duration: '3.8s' },
  { cx: 1020, cy: 98, r: 1.3, delay: '-2.4s', duration: '4.4s' },
  { cx: 1150, cy: 106, r: 1.5, delay: '-1.6s', duration: '3.2s' },
];

// 10 Warm Firefly particles near the 5-tier Pagoda lanterns & above the lake
const FIREFLIES = [
  { left: '78%', bottom: '22%', size: 6, duration: '5.4s', delay: '-0.8s' },
  { left: '83%', bottom: '30%', size: 7, duration: '6.8s', delay: '-2.4s' },
  { left: '87%', bottom: '18%', size: 5, duration: '5.9s', delay: '-4.1s' },
  { left: '74%', bottom: '15%', size: 6, duration: '7.2s', delay: '-1.5s' },
  { left: '91%', bottom: '26%', size: 5, duration: '6.3s', delay: '-3.3s' },
  { left: '81%', bottom: '38%', size: 6, duration: '7.6s', delay: '-5.0s' },
  { left: '42%', bottom: '10%', size: 5, duration: '6.5s', delay: '-1.9s' },
  { left: '51%', bottom: '13%', size: 6, duration: '7.1s', delay: '-3.8s' },
  { left: '59%', bottom: '9%', size: 5, duration: '5.7s', delay: '-2.2s' },
  { left: '67%', bottom: '12%', size: 6, duration: '6.9s', delay: '-4.6s' },
];

const BG_IMAGE_STYLE: React.CSSProperties = {
  imageRendering: 'auto',
  transform: 'translateZ(0)',
  backfaceVisibility: 'hidden',
};

const BG_IMAGE_LAYERS = [
  {
    key: 'day',
    src: dayLandscapeUrl,
    className:
      'bg-day-layer bg-landscape-responsive absolute inset-0 h-full w-full opacity-100 select-none transition-opacity duration-700 ease-in-out',
  },
  {
    key: 'night',
    src: nightLandscapeUrl,
    className:
      'bg-night-layer bg-landscape-responsive absolute inset-0 h-full w-full opacity-0 select-none transition-opacity duration-700 ease-in-out',
  },
] as const;

/**
 * `subdued` veils the illustration on study pages so text stays readable;
 * the home page shows it at full strength.
 */
export const JapaneseLandscapeBg: React.FC<{ subdued?: boolean }> = ({ subdued = false }) => {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-dvh w-screen overflow-hidden select-none print:hidden"
    >
      {subdued && <div className="absolute inset-0 z-10 bg-bg/55" />}
      {/* 1. Primary Dual Japanese Landscape Layers (aspect-preserved panoramic view, zero stretch) */}
      {BG_IMAGE_LAYERS.map((layer) => (
        <img
          key={layer.key}
          src={layer.src}
          alt=""
          decoding="async"
          loading="eager"
          style={BG_IMAGE_STYLE}
          className={layer.className}
        />
      ))}

      {/* 2. Celestial Sun & Moon Rise/Set Layer (Upper Sky below Header) */}
      <svg
        viewBox="0 0 1440 320"
        preserveAspectRatio="xMidYMin slice"
        className="absolute inset-x-0 top-14 h-64 w-full md:top-16 md:h-72"
        fill="none"
      >
        <defs>
          <mask id="crescent-moon-mask">
            <rect x="0" y="0" width="1440" height="320" fill="black" />
            <circle cx="910" cy="78" r="28" fill="white" />
            <circle cx="922" cy="68" r="23" fill="black" />
          </mask>
          <radialGradient id="morning-sun-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--sun-disc)" stopOpacity="0.52" />
            <stop offset="55%" stopColor="var(--sakura)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--sakura)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="crescent-moon-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--sun-disc)" stopOpacity="0.34" />
            <stop offset="60%" stopColor="var(--sun-disc)" stopOpacity="0.10" />
            <stop offset="100%" stopColor="var(--sun-disc)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Morning Sun (Open Upper-Right Sky — Clear of Subpage Titles, Rises in Light Mode) */}
        <g className="celestial-sun">
          <circle
            cx="890"
            cy="74"
            r="60"
            className="animate-sun-pulse"
            fill="url(#morning-sun-glow)"
          />
          <circle
            cx="890"
            cy="74"
            r="27"
            className="text-sun-disc opacity-80"
            fill="currentColor"
          />
          <circle
            cx="890"
            cy="74"
            r="19"
            className="text-on-hero opacity-85"
            fill="currentColor"
          />
        </g>

        {/* Golden Crescent Moon (Upper-Right Sky — Clear on Mobile & Desktop, Rises in Dark Mode) */}
        <g className="celestial-moon">
          <circle
            cx="910"
            cy="78"
            r="58"
            fill="url(#crescent-moon-glow)"
          />
          <circle
            cx="910"
            cy="78"
            r="28"
            mask="url(#crescent-moon-mask)"
            className="text-sun-disc opacity-95"
            fill="currentColor"
          />
        </g>
      </svg>

      {/* 3. Daytime Sky Layer: Drifting Clouds & Animated Flock of Birds */}
      <div className="sky-day-layer absolute inset-0">
        {/* Soft Semi-Transparent Clouds */}
        <svg
          viewBox="0 0 1440 280"
          preserveAspectRatio="xMidYMin slice"
          className="absolute inset-x-0 top-6 h-56 w-full"
          fill="none"
        >
          <g className="animate-cloud-drift text-on-hero opacity-45" fill="currentColor">
            <path d="M250 86 Q268 68 295 74 Q318 56 350 70 Q376 68 388 86 Q404 92 398 106 H242 Q234 94 250 86 Z" />
            <path d="M620 56 Q642 40 668 48 Q694 32 724 46 Q748 44 758 60 H610 Q604 48 620 56 Z" opacity="0.8" />
            <path d="M940 94 Q958 78 984 84 Q1008 70 1034 82 Q1054 82 1062 96 H932 Z" opacity="0.7" />
          </g>
        </svg>

        {/* Animated Flock of 6 Gliding Birds */}
        {DAY_BIRDS.map((bird, idx) => (
          <div
            key={idx}
            style={{
              top: bird.top,
              animationDuration: bird.flyDuration,
              animationDelay: bird.flyDelay,
            }}
            className="animate-bird-fly absolute left-0"
          >
            <svg
              viewBox="0 0 36 20"
              width={Math.round(28 * bird.scale)}
              height={Math.round(16 * bird.scale)}
              style={{ animationDelay: bird.flapDelay }}
              className="animate-wing-flap text-fg opacity-60"
              fill="none"
            >
              <path
                d="M2 12 Q10 3 18 11 Q26 3 34 12"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* 4. Nighttime Sky & Firefly Layer: 38 Twinkling Stars & 10 Glowing Fireflies */}
      <div className="sky-night-layer absolute inset-0">
        <svg
          viewBox="0 0 1440 240"
          preserveAspectRatio="xMidYMin slice"
          className="absolute inset-x-0 top-0 h-56 w-full md:h-64"
          fill="none"
        >
          {NIGHT_STARS.map((star, idx) => (
            <g
              key={idx}
              className="animate-star-twinkle text-sun-disc"
              style={{ animationDelay: star.delay, animationDuration: star.duration }}
              fill="currentColor"
            >
              <circle cx={star.cx} cy={star.cy} r={star.r} />
              {idx % 5 === 0 && (
                <path
                  d={`M${star.cx - 4.5} ${star.cy} H${star.cx + 4.5} M${star.cx} ${star.cy - 4.5} V${star.cy + 4.5}`}
                  stroke="currentColor"
                  strokeWidth="0.75"
                  opacity="0.75"
                />
              )}
            </g>
          ))}
        </svg>

        {/* Warm Amber-Gold Fireflies near the Pagoda Lanterns & Lake */}
        {FIREFLIES.map((fly, idx) => (
          <span
            key={idx}
            style={{
              left: fly.left,
              bottom: fly.bottom,
              width: fly.size,
              height: fly.size,
              animationDuration: fly.duration,
              animationDelay: fly.delay,
            }}
            className="animate-firefly absolute rounded-full bg-sun-disc ring-2 ring-sun-disc/40"
          />
        ))}
      </div>

      {/* 6. All-Day 3D Falling Sakura Petals (30 petals drifting from right branches) */}
      {SAKURA_PETALS.map((petal, idx) => (
        <svg
          key={idx}
          viewBox="0 0 24 24"
          width={petal.size}
          height={petal.size}
          style={{
            left: petal.left,
            top: petal.top,
            animationDuration: petal.duration,
            animationDelay: petal.delay,
          }}
          className={`animate-sakura-3d absolute text-sakura ${petal.layerClass}`}
          fill="currentColor"
        >
          <path d="M12 2.2 L9.8 5.8 L7.4 3.4 C4.2 6.8 3.8 13.2 6.6 17.8 C8.5 20.8 10.6 22.2 12 22.5 C13.4 22.2 15.5 20.8 17.4 17.8 C20.2 13.2 19.8 6.8 16.6 3.4 L14.2 5.8 Z" />
        </svg>
      ))}
    </div>
  );
};
