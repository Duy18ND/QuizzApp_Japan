import React from 'react';
import type { FuriganaSegment } from '../../data/jlpt/jlptDataset';

interface FuriganaTextProps {
  segments: FuriganaSegment[];
  showFurigana: boolean;
  className?: string;
}

export const FuriganaText: React.FC<FuriganaTextProps> = ({
  segments,
  showFurigana,
  className,
}) => {
  return (
    <span lang="ja" className={className}>
      {segments.map((seg, idx) =>
        seg.furigana && showFurigana ? (
          <ruby key={idx} className="mx-[0.5px]">
            {seg.text}
            <rt className="text-[0.55em] font-normal tracking-tight text-muted select-none">
              {seg.furigana}
            </rt>
          </ruby>
        ) : (
          <React.Fragment key={idx}>{seg.text}</React.Fragment>
        ),
      )}
    </span>
  );
};
