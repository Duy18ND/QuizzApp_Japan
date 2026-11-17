import React from 'react';

interface SakuraPetalSpec {
  left: string;
  size: number;
  duration: string;
  delay: string;
  layerClass: string;
}

const SAKURA_PETALS: SakuraPetalSpec[] = [
  // Foreground Layer (8 petals: 14px–18px, opacity-75, blur-[0.5px], fast 7s–10s)
  { left: '4%', size: 16, duration: '7.6s', delay: '-1.2s', layerClass: 'opacity-75 blur-[0.5px]' },
  { left: '17%', size: 18, duration: '8.8s', delay: '-4.5s', layerClass: 'opacity-75 blur-[0.5px]' },
  { left: '29%', size: 15, duration: '7.2s', delay: '-2.8s', layerClass: 'opacity-75 blur-[0.5px]' },
  { left: '43%', size: 17, duration: '9.4s', delay: '-6.1s', layerClass: 'opacity-75 blur-[0.5px]' },
  { left: '56%', size: 14, duration: '8.1s', delay: '-3.4s', layerClass: 'opacity-75 blur-[0.5px]' },
  { left: '69%', size: 18, duration: '9.8s', delay: '-7.3s', layerClass: 'opacity-75 blur-[0.5px]' },
  { left: '82%', size: 15, duration: '7.9s', delay: '-5.0s', layerClass: 'opacity-75 blur-[0.5px]' },
  { left: '94%', size: 16, duration: '8.5s', delay: '-0.8s', layerClass: 'opacity-75 blur-[0.5px]' },

  // Midground Layer (18 petals: 9px–13px, opacity-55, medium 11s–15s)
  { left: '2%', size: 11, duration: '11.5s', delay: '-2.1s', layerClass: 'opacity-55' },
  { left: '8%', size: 13, duration: '13.2s', delay: '-8.4s', layerClass: 'opacity-55' },
  { left: '13%', size: 10, duration: '12.4s', delay: '-5.6s', layerClass: 'opacity-55' },
  { left: '21%', size: 12, duration: '14.6s', delay: '-11.2s', layerClass: 'opacity-55' },
  { left: '26%', size: 9, duration: '11.8s', delay: '-3.9s', layerClass: 'opacity-55' },
  { left: '33%', size: 13, duration: '13.9s', delay: '-9.7s', layerClass: 'opacity-55' },
  { left: '38%', size: 10, duration: '12.1s', delay: '-1.5s', layerClass: 'opacity-55' },
  { left: '45%', size: 12, duration: '14.8s', delay: '-6.8s', layerClass: 'opacity-55' },
  { left: '51%', size: 9, duration: '11.2s', delay: '-10.4s', layerClass: 'opacity-55' },
  { left: '58%', size: 11, duration: '13.5s', delay: '-4.2s', layerClass: 'opacity-55' },
  { left: '63%', size: 13, duration: '14.2s', delay: '-12.6s', layerClass: 'opacity-55' },
  { left: '67%', size: 10, duration: '11.9s', delay: '-7.1s', layerClass: 'opacity-55' },
  { left: '73%', size: 12, duration: '13.1s', delay: '-2.9s', layerClass: 'opacity-55' },
  { left: '78%', size: 9, duration: '14.9s', delay: '-9.0s', layerClass: 'opacity-55' },
  { left: '84%', size: 11, duration: '12.7s', delay: '-5.3s', layerClass: 'opacity-55' },
  { left: '89%', size: 13, duration: '13.8s', delay: '-11.8s', layerClass: 'opacity-55' },
  { left: '92%', size: 10, duration: '11.4s', delay: '-3.1s', layerClass: 'opacity-55' },
  { left: '97%', size: 12, duration: '14.4s', delay: '-8.0s', layerClass: 'opacity-55' },

  // Background Layer (15 petals: 5px–8px, opacity-30, slow 16s–22s)
  { left: '1%', size: 6, duration: '17.5s', delay: '-3.5s', layerClass: 'opacity-30' },
  { left: '9%', size: 7, duration: '19.8s', delay: '-14.2s', layerClass: 'opacity-30' },
  { left: '16%', size: 5, duration: '16.4s', delay: '-7.8s', layerClass: 'opacity-30' },
  { left: '23%', size: 8, duration: '21.2s', delay: '-1.9s', layerClass: 'opacity-30' },
  { left: '31%', size: 6, duration: '18.6s', delay: '-12.1s', layerClass: 'opacity-30' },
  { left: '37%', size: 7, duration: '20.4s', delay: '-5.4s', layerClass: 'opacity-30' },
  { left: '44%', size: 5, duration: '16.9s', delay: '-15.7s', layerClass: 'opacity-30' },
  { left: '52%', size: 8, duration: '21.8s', delay: '-9.3s', layerClass: 'opacity-30' },
  { left: '59%', size: 6, duration: '18.1s', delay: '-2.6s', layerClass: 'opacity-30' },
  { left: '65%', size: 7, duration: '19.3s', delay: '-13.4s', layerClass: 'opacity-30' },
  { left: '72%', size: 5, duration: '16.2s', delay: '-6.5s', layerClass: 'opacity-30' },
  { left: '79%', size: 8, duration: '20.9s', delay: '-17.1s', layerClass: 'opacity-30' },
  { left: '86%', size: 6, duration: '17.8s', delay: '-4.7s', layerClass: 'opacity-30' },
  { left: '91%', size: 7, duration: '21.5s', delay: '-10.9s', layerClass: 'opacity-30' },
  { left: '98%', size: 5, duration: '18.9s', delay: '-8.2s', layerClass: 'opacity-30' },
];

const NIGHT_STARS = [
  { cx: 110, cy: 48, r: 1.8, delay: '0s', duration: '3.2s' },
  { cx: 195, cy: 82, r: 1.4, delay: '-1.2s', duration: '4.1s' },
  { cx: 280, cy: 36, r: 2.1, delay: '-2.4s', duration: '3.5s' },
  { cx: 375, cy: 68, r: 1.5, delay: '-0.7s', duration: '4.4s' },
  { cx: 465, cy: 30, r: 1.9, delay: '-1.8s', duration: '3.0s' },
  { cx: 560, cy: 62, r: 1.4, delay: '-2.9s', duration: '3.9s' },
  { cx: 645, cy: 26, r: 2.2, delay: '-0.4s', duration: '3.4s' },
  { cx: 795, cy: 32, r: 1.7, delay: '-1.5s', duration: '4.2s' },
  { cx: 885, cy: 58, r: 2.0, delay: '-2.1s', duration: '3.1s' },
  { cx: 980, cy: 28, r: 1.5, delay: '-0.9s', duration: '3.8s' },
  { cx: 1075, cy: 66, r: 2.1, delay: '-3.1s', duration: '3.6s' },
  { cx: 1165, cy: 38, r: 1.4, delay: '-1.1s', duration: '4.5s' },
  { cx: 1260, cy: 54, r: 1.9, delay: '-2.6s', duration: '3.3s' },
  { cx: 1355, cy: 34, r: 1.6, delay: '-0.3s', duration: '4.0s' },
];

function JapaneseCrane({
  x,
  y,
  scale,
  wingDelay,
}: {
  x: number;
  y: number;
  scale: number;
  wingDelay: string;
}) {
  return (
    <g transform={`translate(${x}, ${y}) scale(${scale})`}>
      <g className="animate-crane-wing" style={{ animationDelay: wingDelay }}>
        {/* Graceful outstretched left & right wings */}
        <path
          d="M0 0 Q-18 -18 -40 -10 Q-24 -2 -4 2 Z"
          className="text-primary opacity-55"
          fill="currentColor"
        />
        <path
          d="M2 0 Q20 -20 42 -12 Q26 -3 6 2 Z"
          className="text-primary opacity-40"
          fill="currentColor"
        />
      </g>
      {/* Slender neck, beak & trailing legs of Tsuru (鶴) */}
      <path
        d="M-14 4 L-4 1 L8 0 L24 -5 L17 -1 L6 3 L-16 6 Z"
        className="text-fg opacity-55"
        fill="currentColor"
      />
      {/* Signature red crown accent on Japanese crane head */}
      <circle cx="17" cy="-3" r="1.6" className="text-sakura opacity-85" fill="currentColor" />
    </g>
  );
}

export const JapaneseLandscapeBg: React.FC = () => {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* 1. Multi-layer 3D Sakura Petal Rain (41 notched petals) */}
      {SAKURA_PETALS.map((petal, idx) => (
        <svg
          key={idx}
          viewBox="0 0 24 24"
          width={petal.size}
          height={petal.size}
          style={{
            left: petal.left,
            animationDuration: petal.duration,
            animationDelay: petal.delay,
          }}
          className={`animate-sakura-3d absolute top-0 text-sakura ${petal.layerClass}`}
          fill="currentColor"
        >
          <path d="M12 2.2 L9.8 5.8 L7.4 3.4 C4.2 6.8 3.8 13.2 6.6 17.8 C8.5 20.8 10.6 22.2 12 22.5 C13.4 22.2 15.5 20.8 17.4 17.8 C20.2 13.2 19.8 6.8 16.6 3.4 L14.2 5.8 Z" />
        </svg>
      ))}

      {/* 2. Top Sky Layer: Morning Sun, Clouds & Flying Japanese Cranes (Light Mode) vs. Night Stars, Crescent Moon & Shooting Stars (Dark Mode) */}
      <svg
        viewBox="0 0 1440 260"
        preserveAspectRatio="xMidYMin slice"
        className=" day-scene absolute inset-x-0 top-12 h-56 w-full md:h-64"
        fill="none"
      >
        {/* Morning Rising Sun (Hinomaru) & Soft Halo in Upper Sky */}
        <circle cx="240" cy="78" r="56" className="text-sakura opacity-15" fill="currentColor" />
        <circle cx="240" cy="78" r="38" className="text-sun-disc opacity-60" fill="currentColor" />

        {/* Morning Japanese Kasumi Clouds */}
        <g className="animate-cloud-drift text-primary opacity-15" fill="currentColor">
          <path d="M140 88 H230 A8 8 0 0 1 230 104 H160 A8 8 0 0 1 140 88 Z" />
          <path d="M265 62 H345 A7 7 0 0 1 345 76 H265 A7 7 0 0 1 265 62 Z" />
          <path d="M980 54 H1110 A9 9 0 0 1 1110 72 H1025 A8 8 0 0 0 1025 88 H1085 A7 7 0 0 1 1085 102 H965 A7 7 0 0 1 965 88 H995 A8 8 0 0 0 995 72 H980 A9 9 0 0 1 980 54 Z" />
        </g>

        {/* Flock of Japanese Cranes (Tsuru — 鶴) gliding across the morning sky */}
        <g className="animate-crane-glide">
          <JapaneseCrane x={390} y={74} scale={0.95} wingDelay="0s" />
          <JapaneseCrane x={445} y={56} scale={0.78} wingDelay="-0.6s" />
          <JapaneseCrane x={492} y={82} scale={0.7} wingDelay="-1.2s" />
          <JapaneseCrane x={538} y={64} scale={0.6} wingDelay="-1.8s" />
          <JapaneseCrane x={920} y={68} scale={0.82} wingDelay="-0.9s" />
          <JapaneseCrane x={968} y={52} scale={0.65} wingDelay="-1.5s" />
        </g>
      </svg>

      {/* Night Sky Layer (Dark Mode Only): Twinkling Stars, Crescent Moon & Shooting Stars */}
      <svg
        viewBox="0 0 1440 260"
        preserveAspectRatio="xMidYMin slice"
        className="night-scene absolute inset-x-0 top-12 h-60 w-full md:h-72"
        fill="none"
      >
        {/* Twinkling Night Stars */}
        {NIGHT_STARS.map((star, idx) => (
          <g
            key={idx}
            className="animate-star-twinkle text-sun-disc"
            style={{ animationDelay: star.delay, animationDuration: star.duration }}
            fill="currentColor"
          >
            <circle cx={star.cx} cy={star.cy} r={star.r} />
            {idx % 3 === 0 && (
              <path
                d={`M${star.cx - 5} ${star.cy} H${star.cx + 5} M${star.cx} ${star.cy - 5} V${star.cy + 5}`}
                stroke="currentColor"
                strokeWidth="0.8"
                 opacity="0.7"
              />
            )}
          </g>
        ))}

        {/* Serene Japanese Crescent Moon (Mikazuki — 三日月) in Upper Night Sky */}
        <path
          d="M1145 42 A34 34 0 1 0 1185 94 A27 27 0 1 1 1145 42 Z"
          className="text-sun-disc opacity-80"
          fill="currentColor"
        />

        {/* Shooting Stars (Nagareboshi — 流れ星) */}
        <g
          className="animate-shooting-star"
          style={{ animationDelay: '-1.5s', animationDuration: '6.5s' }}
        >
          <line
            x1="540"
            y1="28"
            x2="635"
            y2="28"
            className="text-sun-disc"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="540" cy="28" r="2.5" className="text-on-hero" fill="currentColor" />
        </g>
        <g
          className="animate-shooting-star"
          style={{ animationDelay: '-4.8s', animationDuration: '8.5s' }}
        >
          <line
            x1="1020"
            y1="44"
            x2="1110"
            y2="44"
            className="text-wave"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <circle cx="1020" cy="44" r="2.2" className="text-on-hero" fill="currentColor" />
        </g>
      </svg>

      {/* 3. Scenic Japanese Horizon: Mount Fuji, Torii Gate, 5-Story Pagoda & Ocean Waves */}
      <svg
        viewBox="0 0 1440 420"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 h-72 w-full md:h-96"
        fill="none"
      >
        {/* Horizon Rising Sun (Light Mode) */}
        <g className="day-scene">
          <circle
            cx="720"
            cy="176"
            r="92"
            className="text-sun-disc opacity-45"
            fill="currentColor"
          />
          <circle
            cx="720"
            cy="176"
            r="114"
            className="text-sakura opacity-15"
            fill="currentColor"
          />
        </g>

        {/* Horizon Soft Moon Glow (Dark Mode) */}
        <g className="night-scene">
          <circle
            cx="720"
            cy="182"
            r="84"
            className="text-primary opacity-20"
            fill="currentColor"
          />
        </g>

        {/* Drifting Traditional Japanese Clouds around Mount Fuji */}
        <g className="animate-cloud-drift text-primary opacity-20" fill="currentColor">
          <path d="M460 128 H570 A10 10 0 0 1 570 148 H490 A10 10 0 0 0 490 164 H545 A8 8 0 0 1 545 180 H445 A8 8 0 0 1 445 164 H465 A10 10 0 0 0 465 148 H460 A10 10 0 0 1 460 128 Z" />
          <path d="M865 108 H975 A10 10 0 0 1 975 128 H910 A9 9 0 0 0 910 144 H960 A8 8 0 0 1 960 160 H855 A8 8 0 0 1 855 144 H880 A9 9 0 0 0 880 128 H865 A10 10 0 0 1 865 108 Z" />
          <path d="M210 145 H300 A8 8 0 0 1 300 161 H225 A8 8 0 0 1 210 145 Z" />
        </g>

        {/* Distant Misty Mountain Range */}
        <path
          d="M0 360 L190 265 L350 325 L540 245 L720 315 L915 240 L1120 320 L1310 250 L1440 310 V420 H0 Z"
          className="text-primary-soft opacity-65"
          fill="currentColor"
        />

        {/* Mount Fuji (Center Horizon) */}
        <path
          d="M370 370 Q585 335 678 148 H762 Q855 335 1070 370 Z"
          className="text-primary opacity-25"
          fill="currentColor"
        />
        {/* Mount Fuji Snow Cap */}
        <path
          d="M678 148 H762 Q782 188 796 212 L768 196 L748 220 L728 194 L710 220 L692 195 L666 214 Q672 184 678 148 Z"
          className="text-surface opacity-85"
          fill="currentColor"
        />

        {/* Left Rocky Sea Cliff & Traditional Torii Gate */}
        <path
          d="M0 375 L85 305 L185 318 L265 365 L310 385 H0 Z"
          className="text-primary opacity-25"
          fill="currentColor"
        />
        <g className="text-sakura opacity-45" fill="currentColor">
          <path d="M92 226 Q140 235 188 226 L184 235 Q140 242 96 235 Z" />
          <rect x="102" y="246" width="76" height="6" rx="2" />
          <rect x="137" y="235" width="6" height="12" />
          <path d="M112 234 H120 L117 314 H109 Z" />
          <path d="M160 234 H168 L165 314 H157 Z" />
        </g>

        {/* Right Hillside, Chureito 5-Story Pagoda & Overhanging Sakura Branch */}
        <path
          d="M1110 385 L1190 320 L1315 288 L1440 302 V420 H1110 Z"
          className="text-primary opacity-25"
          fill="currentColor"
        />
        <g className="text-primary opacity-35" fill="currentColor">
          <rect x="1268" y="140" width="4" height="24" />
          <path d="M1240 174 Q1270 163 1300 174 L1294 179 H1246 Z" />
          <rect x="1254" y="179" width="32" height="10" />
          <path d="M1236 196 Q1270 185 1304 196 L1298 201 H1242 Z" />
          <rect x="1251" y="201" width="38" height="11" />
          <path d="M1231 219 Q1270 207 1309 219 L1302 225 H1238 Z" />
          <rect x="1248" y="225" width="44" height="12" />
          <path d="M1226 244 Q1270 231 1314 244 L1306 250 H1234 Z" />
          <rect x="1244" y="250" width="52" height="13" />
          <path d="M1220 270 Q1270 256 1320 270 L1312 277 H1228 Z" />
          <rect x="1240" y="277" width="60" height="24" />
        </g>
        {/* Warm Pagoda Windows in Night Mode */}
        <g className="night-scene text-sun-disc opacity-75" fill="currentColor">
          <rect x="1266" y="182" width="8" height="5" rx="1" />
          <rect x="1266" y="204" width="8" height="5" rx="1" />
          <rect x="1265" y="228" width="10" height="6" rx="1" />
          <rect x="1265" y="253" width="10" height="6" rx="1" />
          <rect x="1264" y="282" width="12" height="8" rx="1" />
        </g>

        {/* Overhanging Sakura Branch & Blossoms on Right */}
        <path
          d="M1440 96 Q1375 112 1325 142 Q1295 158 1265 152 M1365 118 Q1340 155 1310 172"
          className="text-primary opacity-30"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <g className="text-sakura opacity-55" fill="currentColor">
          <circle cx="1325" cy="142" r="9" />
          <circle cx="1348" cy="126" r="11" />
          <circle cx="1295" cy="154" r="8" />
          <circle cx="1268" cy="150" r="6" />
          <circle cx="1312" cy="172" r="7" />
          <circle cx="1388" cy="108" r="12" />
          <circle cx="1415" cy="122" r="9" />
        </g>

        {/* 4. Multi-layer Animated Ocean Waves at Bottom */}
        <g className="animate-wave-slow text-primary-soft opacity-80" fill="currentColor">
          <path d="M-80 352 Q100 318 280 352 T640 352 T1000 352 T1360 352 T1600 352 V420 H-80 Z" />
        </g>
        <g className="animate-wave-mid text-wave opacity-20" fill="currentColor">
          <path d="M-80 372 Q120 338 320 372 T720 372 T1120 372 T1520 372 V420 H-80 Z" />
        </g>
        <g className="animate-wave-fast text-primary opacity-22" fill="currentColor">
          <path d="M-80 390 Q90 364 260 390 T600 390 T940 390 T1280 390 T1600 390 V420 H-80 Z" />
          <path
            d="M-80 390 Q90 364 260 390 T600 390 T940 390 T1280 390 T1600 390"
            className="text-sakura opacity-45"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </g>
      </svg>
    </div>
  );
};
