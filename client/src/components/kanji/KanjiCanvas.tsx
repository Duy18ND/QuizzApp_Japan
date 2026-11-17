import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import HanziWriter from 'hanzi-writer';
import { useTheme } from '../../hooks/useTheme';
import { Spinner } from '../ui';
import { cn } from '../../lib/cn';

interface KanjiCanvasProps {
  kanji: string;
  size?: number;
  mode?: 'show' | 'trace' | 'test';
  onCorrect?: () => void;
  onMistake?: () => void;
  onComplete?: () => void;
}

export interface KanjiCanvasRef {
  animate: () => void;
  clear: () => void;
  undo: () => void;
}

function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || 'currentColor';
}

export const KanjiCanvas = forwardRef<KanjiCanvasRef, KanjiCanvasProps>(
  ({ kanji, size = 300, mode = 'show', onCorrect, onMistake, onComplete }, ref) => {
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const writerRef = useRef<HanziWriter | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const callbacksRef = useRef({ onCorrect, onMistake, onComplete });
    callbacksRef.current = { onCorrect, onMistake, onComplete };

    const setupMode = useCallback(
      (writer: HanziWriter, currentMode: string) => {
        writer.cancelQuiz();
        writer.hideCharacter();

        if (currentMode === 'show') {
          writer.showCharacter();
          writer.updateDimensions({ width: size, height: size });
        } else if (currentMode === 'trace') {
          writer.quiz({
            onMistake: () => callbacksRef.current.onMistake?.(),
            onCorrectStroke: () => callbacksRef.current.onCorrect?.(),
            onComplete: () => callbacksRef.current.onComplete?.(),
          });
        } else if (currentMode === 'test') {
          writer.quiz({
            showHintAfterMisses: 3,
            onMistake: () => callbacksRef.current.onMistake?.(),
            onCorrectStroke: () => callbacksRef.current.onCorrect?.(),
            onComplete: () => callbacksRef.current.onComplete?.(),
          });
        }
      },
      [size],
    );

    useEffect(() => {
      if (!containerRef.current || !kanji) return;

      containerRef.current.replaceChildren();
      setIsLoading(true);

      const primaryColor = readToken('--primary');
      const outlineColor = readToken('--line');
      const dangerColor = readToken('--danger');
      const drawingColor = readToken('--fg');

      const writer = HanziWriter.create(containerRef.current, kanji, {
        width: size,
        height: size,
        padding: size * 0.1,
        showOutline: true,
        strokeAnimationSpeed: 1,
        strokeFadeDuration: 400,
        strokeWidth: 2,
        outlineColor,
        strokeColor: primaryColor,
        radicalColor: primaryColor,
        highlightColor: dangerColor,
        drawingColor,
        showCharacter: mode === 'show',
        leniency: 1.5,
      });

      writerRef.current = writer;

      const timer = window.setTimeout(() => setIsLoading(false), 500);
      setupMode(writer, mode);

      return () => {
        window.clearTimeout(timer);
        writer.cancelQuiz();
      };
      // Re-initialize only when kanji, size or theme changes; mode updates use the second effect.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kanji, size, theme]);

    useEffect(() => {
      if (writerRef.current) {
        setupMode(writerRef.current, mode);
      }
    }, [mode, setupMode]);

    useImperativeHandle(
      ref,
      () => ({
        animate: () => {
          if (writerRef.current) {
            writerRef.current.cancelQuiz();
            writerRef.current.animateCharacter();
            window.setTimeout(() => {
              if (writerRef.current) setupMode(writerRef.current, mode);
            }, 3000);
          }
        },
        clear: () => {
          if (writerRef.current) {
            setupMode(writerRef.current, mode);
          }
        },
        undo: () => {
          if (writerRef.current) {
            setupMode(writerRef.current, mode);
          }
        },
      }),
      [mode, setupMode],
    );

    return (
      <div
        className="relative mx-auto aspect-square w-full max-w-[300px] touch-none"
        style={{ width: size, height: size }}
      >
        {/* Grid Lines (Ô li) */}
        <div className="pointer-events-none absolute inset-0 rounded-lg border border-line-strong">
          <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-line" />
          <div className="absolute inset-y-0 left-1/2 border-r border-dashed border-line" />

          <svg className="absolute inset-0 size-full text-line opacity-60" xmlns="http://www.w3.org/2000/svg">
            <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        </div>

        <div
          ref={containerRef}
          className={cn(
            'absolute inset-0 z-10 transition-opacity duration-200',
            isLoading ? 'opacity-0' : 'opacity-100',
          )}
          style={{ touchAction: 'none' }}
        />

        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-surface/60">
            <Spinner className="size-7" />
          </div>
        )}
      </div>
    );
  },
);

KanjiCanvas.displayName = 'KanjiCanvas';
