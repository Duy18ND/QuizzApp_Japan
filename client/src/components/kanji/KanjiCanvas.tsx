import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import HanziWriter from 'hanzi-writer';
import { useTheme } from '../../hooks/useTheme';
import { ErrorState, Spinner } from '../ui';
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

function normalizeColorForHanzi(raw: string, fallback: string): string {
  const val = raw.trim();
  if (!val) return fallback;

  // HanziWriter's color parser rejects 8-digit (#RRGGBBAA) and 4-digit (#RGBA) hex produced by CSS minifiers.
  if (/^#[0-9a-f]{8}$/i.test(val)) {
    const r = parseInt(val.slice(1, 3), 16);
    const g = parseInt(val.slice(3, 5), 16);
    const b = parseInt(val.slice(5, 7), 16);
    const a = Number((parseInt(val.slice(7, 9), 16) / 255).toFixed(3));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  if (/^#[0-9a-f]{4}$/i.test(val)) {
    const r = parseInt(val[1] + val[1], 16);
    const g = parseInt(val[2] + val[2], 16);
    const b = parseInt(val[3] + val[3], 16);
    const a = Number((parseInt(val[4] + val[4], 16) / 255).toFixed(3));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  // Also normalize CSS Color 4 space-separated rgb(r g b / a) to comma-separated rgba(r, g, b, a).
  const spaceRgb = val.match(/^rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i);
  if (spaceRgb) {
    const [, r, g, b, rawAlpha] = spaceRgb;
    if (!rawAlpha) return `rgb(${r}, ${g}, ${b})`;
    const a = rawAlpha.endsWith('%') ? Number(parseFloat(rawAlpha) / 100) : parseFloat(rawAlpha);
    return `rgba(${r}, ${g}, ${b}, ${Number.isFinite(a) ? a : 1})`;
  }
  return val;
}

function readToken(name: string, fallback = '#000000'): string {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name);
  return normalizeColorForHanzi(raw, fallback);
}

export const KanjiCanvas = forwardRef<KanjiCanvasRef, KanjiCanvasProps>(
  ({ kanji, size = 300, mode = 'show', onCorrect, onMistake, onComplete }, ref) => {
    const { theme } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const writerRef = useRef<HanziWriter | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [retryKey, setRetryKey] = useState(0);

    const modeRef = useRef(mode);
    modeRef.current = mode;

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

      let cancelled = false;
      containerRef.current.replaceChildren();
      setIsLoading(true);
      setLoadError(false);

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
        showCharacter: modeRef.current === 'show',
        leniency: 1.5,
        onLoadCharDataSuccess: () => {
          if (cancelled) return;
          setIsLoading(false);
          setLoadError(false);
          setupMode(writer, modeRef.current);
        },
        onLoadCharDataError: () => {
          if (cancelled) return;
          setIsLoading(false);
          setLoadError(true);
        },
      });

      writerRef.current = writer;

      return () => {
        cancelled = true;
        writer.cancelQuiz();
      };
      // Re-initialize when kanji, size, theme, or retry changes; mode updates use the second effect.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [kanji, size, theme, retryKey]);

    useEffect(() => {
      if (writerRef.current && !isLoading && !loadError) {
        setupMode(writerRef.current, mode);
      }
    }, [mode, isLoading, loadError, setupMode]);

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
            isLoading || loadError ? 'pointer-events-none opacity-0' : 'opacity-100',
          )}
          style={{ touchAction: 'none' }}
        />

        {isLoading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-surface/60">
            <Spinner className="size-7" />
          </div>
        )}

        {loadError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-lg">
            <ErrorState
              title="Không tải được nét chữ"
              description="Kiểm tra kết nối mạng hoặc thử tải lại."
              onRetry={() => {
                setLoadError(false);
                setIsLoading(true);
                setRetryKey((k) => k + 1);
              }}
              retryLabel="Thử lại"
              className="h-full w-full justify-center px-3 py-3"
            />
          </div>
        )}
      </div>
    );
  },
);

KanjiCanvas.displayName = 'KanjiCanvas';
