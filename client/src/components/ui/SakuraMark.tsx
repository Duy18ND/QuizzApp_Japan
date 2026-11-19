import React from 'react';
import { cn } from '../../lib/cn';

interface SakuraMarkProps {
  className?: string;
}

/**
 * 5-petal Japanese cherry blossom (桜) rendered strictly via semantic tokens
 * (`text-sakura` petals + `text-sun-disc` stamen core) so Light/Dark themes match seamlessly.
 */
export const SakuraBlossomIcon: React.FC<SakuraMarkProps> = ({ className }) => {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={cn('text-sakura', className)}
      fill="none"
    >
      {[0, 72, 144, 216, 288].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 24 24)`}>
          <path
            d="M24 3.5 L21.4 8.2 L18.3 5.2 C14.5 9.2 14.8 16.4 19.3 20.6 C21.1 22.3 22.8 23.2 24 23.4 C25.2 23.2 26.9 22.3 28.7 20.6 C33.2 16.4 33.5 9.2 29.7 5.2 L26.6 8.2 Z"
            fill="currentColor"
            fillOpacity="0.88"
            stroke="currentColor"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
          <path
            d="M24 22.2 V14.6"
            stroke="var(--bg)"
            strokeWidth="1.15"
            strokeLinecap="round"
            strokeOpacity="0.65"
          />
        </g>
      ))}
      <circle cx="24" cy="24" r="4.2" fill="var(--bg)" fillOpacity="0.9" />
      <circle cx="24" cy="24" r="2.9" className="text-sun-disc" fill="currentColor" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <circle
          key={deg}
          cx="24"
          cy="18.2"
          r="0.9"
          transform={`rotate(${deg} 24 24)`}
          className="text-sun-disc"
          fill="currentColor"
        />
      ))}
    </svg>
  );
};

export const SakuraSpinner: React.FC<SakuraMarkProps> = ({ className }) => {
  return <SakuraBlossomIcon className={cn('animate-sakura-spin size-10 drop-shadow-sm', className)} />;
};
