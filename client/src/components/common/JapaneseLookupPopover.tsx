import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { BookOpen, Languages, LoaderCircle, Sparkles, Volume2, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge, IconButton } from '../ui';
import {
  analyzeJapaneseText,
  containsJapanese,
  extractCleanSelection,
  translateJapaneseToVietnamese,
  type TranslationResult,
} from '../../utils/japaneseLookup';
import {
  JapaneseLookupContext,
  useJapaneseLookup,
  type JapaneseLookupContextValue,
  type LookupTarget,
} from './japanese-lookup-context';

export type { LookupTarget };

interface SelectionTriggerState {
  text: string;
  rubyMap: Record<string, string>;
  rect: DOMRect;
}

const SOURCE_LABELS: Record<TranslationResult['source'], string> = {
  passage: 'Theo ngữ cảnh bài đọc',
  curriculum: 'Giáo trình N3',
  dictionary: 'Từ điển tích hợp',
  google: 'Google Dịch',
  fallback: 'Ngoại tuyến',
};

function computeClampedRect(
  anchor: DOMRect,
  boxWidth: number,
  boxHeight: number,
  preferAbove = false,
): { top: number; left: number } {
  const pad = 12;
  const gap = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const centerX = anchor.left + anchor.width / 2;
  const left = Math.max(pad, Math.min(centerX - boxWidth / 2, vw - boxWidth - pad));

  let top: number;
  const spaceBelow = vh - anchor.bottom - pad;
  const spaceAbove = anchor.top - pad;

  if (preferAbove && spaceAbove >= boxHeight + gap) {
    top = anchor.top - boxHeight - gap;
  } else if (!preferAbove && spaceBelow >= boxHeight + gap) {
    top = anchor.bottom + gap;
  } else if (spaceAbove >= boxHeight + gap) {
    top = anchor.top - boxHeight - gap;
  } else {
    top = anchor.bottom + gap;
  }

  top = Math.max(pad, Math.min(top, vh - boxHeight - pad));
  return { top, left };
}

interface PopoverViewProps {
  target: LookupTarget;
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

export const JapaneseLookupPopover: React.FC<PopoverViewProps> = ({
  target,
  onClose,
  onPointerEnter,
  onPointerLeave,
}) => {
  const hasDistinctSentence = Boolean(
    target.sentenceText && target.sentenceText.trim() !== target.text.trim(),
  );
  const [scope, setScope] = useState<'phrase' | 'sentence'>(
    target.initialScope === 'sentence' && hasDistinctSentence ? 'sentence' : 'phrase',
  );
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [translationState, setTranslationState] = useState<{
    key: string;
    result: TranslationResult;
  } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

  const activeText =
    scope === 'sentence' && target.sentenceText ? target.sentenceText : target.text;
  const activeRubyMap = useMemo(
    () =>
      scope === 'sentence' && target.sentenceRubyMap
        ? target.sentenceRubyMap
        : { ...(target.sentenceRubyMap || {}), ...(target.rubyMap || {}) },
    [scope, target.sentenceRubyMap, target.rubyMap],
  );

  const analysis = useMemo(
    () =>
      analyzeJapaneseText(activeText, {
        rubyMap: activeRubyMap,
        sentenceContext: target.sentenceText || activeText,
        passageVocab: target.passageVocab,
      }),
    [activeText, activeRubyMap, target.sentenceText, target.passageVocab],
  );

  const requestKey = `${scope}:${activeText}`;
  const translation = translationState?.key === requestKey ? translationState.result : null;
  const isTranslating = !translation;

  useEffect(() => {
    const controller = new AbortController();

    const sentenceHint =
      scope === 'sentence'
        ? target.sentenceTranslation
        : activeText === target.sentenceText
          ? target.sentenceTranslation
          : undefined;

    void translateJapaneseToVietnamese(activeText, {
      sentenceTranslation: sentenceHint,
      passageVocab: target.passageVocab,
      signal: controller.signal,
    }).then((res) => {
      if (!controller.signal.aborted) {
        setTranslationState({ key: requestKey, result: res });
      }
    });

    return () => controller.abort();
  }, [activeText, scope, requestKey, target.sentenceText, target.sentenceTranslation, target.passageVocab]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const updatePosition = useCallback(() => {
    const el = popoverRef.current;
    if (!el) return;
    const width = el.offsetWidth || el.getBoundingClientRect().width;
    const height = el.offsetHeight || el.getBoundingClientRect().height;
    setCoords(computeClampedRect(target.rect, width, height, false));
  }, [target.rect]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, activeText, translation, isTranslating]);

  useEffect(() => {
    const el = popoverRef.current;
    window.addEventListener('resize', updatePosition);
    const observer =
      el && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => updatePosition())
        : null;
    if (el && observer) observer.observe(el);
    return () => {
      window.removeEventListener('resize', updatePosition);
      observer?.disconnect();
    };
  }, [updatePosition]);

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(activeText);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.9;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const supportsSpeech =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined';

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Tra cứu & giải thích tiếng Nhật"
      data-lookup-ui="popover"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      style={{ top: coords.top, left: coords.left }}
      className={cn(
        'fixed z-50 max-w-sm md:max-w-md w-[min(calc(100vw-1.5rem),27rem)] max-h-[min(74dvh,32rem)] overflow-y-auto',
        'animate-pop-in rounded-2xl border border-line bg-surface p-4 text-fg shadow-pop',
      )}
    >
      {/* Top Toolbar: Scope Switcher & Close */}
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary-soft text-xs font-bold text-primary-fg">
            訳
          </span>
          {hasDistinctSentence ? (
            <div className="inline-flex rounded-lg border border-line bg-surface-2 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setScope('phrase')}
                className={cn(
                  'rounded-md px-2 py-0.5 font-medium transition-colors',
                  scope === 'phrase'
                    ? 'bg-primary-soft text-primary-fg'
                    : 'text-muted hover:text-fg',
                )}
              >
                Từ / Cụm
              </button>
              <button
                type="button"
                onClick={() => setScope('sentence')}
                className={cn(
                  'rounded-md px-2 py-0.5 font-medium transition-colors',
                  scope === 'sentence'
                    ? 'bg-primary-soft text-primary-fg'
                    : 'text-muted hover:text-fg',
                )}
              >
                Cả câu
              </button>
            </div>
          ) : (
            <span className="text-xs font-semibold text-muted">Giải thích & Dịch nhanh</span>
          )}
        </div>

        <IconButton variant="ghost" size="sm" aria-label="Đóng cửa sổ dịch" onClick={onClose}>
          <X className="size-4" aria-hidden />
        </IconButton>
      </div>

      {/* 1. Header — Original Japanese + Reading/Romaji + Speaker TTS */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p lang="ja" className="text-lg leading-snug font-bold break-words text-fg">
            {analysis.surface}
          </p>
          {analysis.reading && (
            <p lang="ja" className="text-sm font-medium text-primary-fg">
              {analysis.reading}
            </p>
          )}
          {analysis.romaji && (
            <p className="text-xs tracking-wide text-muted">{analysis.romaji}</p>
          )}
        </div>

        {supportsSpeech && (
          <IconButton
            variant={isSpeaking ? 'primary' : 'soft'}
            size="sm"
            aria-label="Phát âm tiếng Nhật"
            onClick={handleSpeak}
            className="shrink-0"
          >
            <Volume2 className={cn('size-4', isSpeaking && 'animate-pulse')} aria-hidden />
          </IconButton>
        )}
      </div>

      {/* 2. Vietnamese Translation */}
      <div className="mt-3.5 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
            <Languages className="size-3.5 text-primary-fg" aria-hidden />
            Vietnamese
          </span>
          {translation && (
            <Badge tone="neutral" className="text-[10px]">
              {SOURCE_LABELS[translation.source]}
            </Badge>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm leading-relaxed text-fg">
          {isTranslating ? (
            <span className="inline-flex items-center gap-2 text-muted">
              <LoaderCircle className="size-3.5 animate-spin text-primary-fg" aria-hidden />
              Đang dịch sang tiếng Việt...
            </span>
          ) : (
            translation?.text
          )}
        </div>
      </div>

      {/* 3. Vocabulary, Kanji & Grammar Explanation */}
      <div className="mt-4 space-y-3 border-t border-line pt-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase">
          <BookOpen className="size-3.5 text-primary-fg" aria-hidden />
          Giải thích từ vựng & ngữ pháp
        </div>

        {analysis.vocabMatches.length > 0 && (
          <div className="space-y-1.5">
            {analysis.vocabMatches.map((item) => (
              <div
                key={`${item.word}-${item.reading}`}
                className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <span lang="ja" className="text-sm font-semibold text-fg">
                    {item.word}
                  </span>
                  {item.reading && item.reading !== item.word && (
                    <span lang="ja" className="text-muted">
                      （{item.reading}）
                    </span>
                  )}
                  {item.hanViet && <Badge tone="primary">{item.hanViet}</Badge>}
                </div>
                <p className="mt-0.5 text-fg">{item.meaning}</p>
              </div>
            ))}
          </div>
        )}

        {analysis.kanjiMatches.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted">Chi tiết Chữ Hán</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {analysis.kanjiMatches.map((k) => (
                <div
                  key={k.kanji}
                  className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-2.5 py-2 text-xs"
                >
                  <span
                    lang="ja"
                    className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-base font-bold text-primary-fg"
                  >
                    {k.kanji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      {k.hanViet && (
                        <span className="font-semibold text-primary-fg">{k.hanViet}</span>
                      )}
                      <span className="text-muted">— {k.meaning}</span>
                    </div>
                    {(k.onReadings.length > 0 || k.kunReadings.length > 0) && (
                      <p lang="ja" className="mt-0.5 truncate text-[11px] text-subtle">
                        {[k.onReadings[0], k.kunReadings[0]].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {analysis.grammarMatches.length > 0 && (
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1 text-[11px] font-medium text-muted">
              <Sparkles className="size-3 text-sakura" aria-hidden />
              Cấu trúc ngữ pháp & trợ từ
            </p>
            {analysis.grammarMatches.map((g) => (
              <div
                key={g.pattern}
                className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-sakura-soft px-2 py-0.5 font-semibold text-sakura">
                    {g.pattern}
                  </span>
                  <span className="font-semibold text-fg">{g.meaning}</span>
                </div>
                <p className="mt-1 text-muted">{g.usage}</p>
              </div>
            ))}
          </div>
        )}

        {analysis.vocabMatches.length === 0 &&
          analysis.kanjiMatches.length === 0 &&
          analysis.grammarMatches.length === 0 && (
            <p className="rounded-xl border border-line bg-surface-2 px-3 py-2 text-xs text-muted">
              Chưa có mục từ điển khớp trực tiếp trong dữ liệu N5–N3 nội bộ; hãy dùng bản dịch tiếng Việt phía trên.
            </p>
          )}
      </div>
    </div>,
    document.body,
  );
};

interface JapaneseLookupProviderProps {
  containerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

export const JapaneseLookupProvider: React.FC<JapaneseLookupProviderProps> = ({
  containerRef,
  children,
}) => {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;
  const [selectionState, setSelectionState] = useState<{
    routeKey: string;
    trigger: SelectionTriggerState;
  } | null>(null);
  const [activeState, setActiveState] = useState<{
    routeKey: string;
    target: LookupTarget;
  } | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const routeKeyRef = useRef(routeKey);

  useEffect(() => {
    routeKeyRef.current = routeKey;
  }, [routeKey]);

  const selectionTrigger =
    selectionState?.routeKey === routeKey ? selectionState.trigger : null;
  const activeTarget = activeState?.routeKey === routeKey ? activeState.target : null;

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const closeLookup = useCallback(() => {
    clearHoverTimer();
    setActiveState(null);
    setSelectionState(null);
  }, [clearHoverTimer]);

  const openLookup = useCallback(
    (target: LookupTarget) => {
      clearHoverTimer();
      setSelectionState(null);
      setActiveState({ routeKey: routeKeyRef.current, target });
    },
    [clearHoverTimer],
  );

  const scheduleHoverLookup = useCallback(
    (target: LookupTarget, delayMs = 450) => {
      clearHoverTimer();
      hoverTimerRef.current = window.setTimeout(() => {
        const selText = window.getSelection()?.toString().trim() ?? '';
        if (selText) return;
        setSelectionState(null);
        setActiveState({ routeKey: routeKeyRef.current, target });
      }, delayMs);
    },
    [clearHoverTimer],
  );

  const cancelHoverLookup = useCallback(() => {
    clearHoverTimer();
  }, [clearHoverTimer]);

  // Global Japanese text-selection trigger (mouseup / touchend) inside <main>
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const handleSelectionEnd = (event: MouseEvent | TouchEvent) => {
      const evTarget = event.target as HTMLElement | null;
      if (!evTarget) return;
      if (evTarget.closest('[data-lookup-ui]')) return;
      if (
        evTarget.tagName === 'INPUT' ||
        evTarget.tagName === 'TEXTAREA' ||
        evTarget.tagName === 'SELECT' ||
        evTarget.isContentEditable
      ) {
        return;
      }

      window.requestAnimationFrame(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
          setSelectionState(null);
          return;
        }

        const anchorNode = selection.anchorNode;
        if (!anchorNode || !root.contains(anchorNode)) {
          return;
        }

        const { text, rubyMap, rect } = extractCleanSelection(selection);
        if (!text || !rect || text.length > 350 || !containsJapanese(text)) {
          setSelectionState(null);
          return;
        }

        setSelectionState({
          routeKey: routeKeyRef.current,
          trigger: { text, rubyMap, rect },
        });
      });
    };

    root.addEventListener('mouseup', handleSelectionEnd);
    root.addEventListener('touchend', handleSelectionEnd);
    return () => {
      root.removeEventListener('mouseup', handleSelectionEnd);
      root.removeEventListener('touchend', handleSelectionEnd);
    };
  }, [containerRef]);

  // Close trigger/popover on Escape, outside pointerdown, or external scroll
  useEffect(() => {
    if (!activeTarget && !selectionTrigger) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLookup();
    };

    const handlePointerDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest('[data-lookup-ui]')) return;
      if (el.closest('[data-lookup-interactive]')) return;
      setActiveState(null);
      const sel = window.getSelection()?.toString().trim();
      if (!sel) setSelectionState(null);
    };

    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target && typeof target.closest === 'function' && target.closest('[data-lookup-ui="popover"]')) {
        return;
      }
      setSelectionState(null);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeTarget, selectionTrigger, closeLookup]);

  const contextValue = useMemo<JapaneseLookupContextValue>(
    () => ({
      openLookup,
      closeLookup,
      scheduleHoverLookup,
      cancelHoverLookup,
      activeTokenId: activeTarget?.activeTokenId ?? null,
      activeSentenceId: activeTarget?.activeSentenceId ?? null,
    }),
    [openLookup, closeLookup, scheduleHoverLookup, cancelHoverLookup, activeTarget],
  );

  const triggerPosition = useMemo(() => {
    if (!selectionTrigger) return null;
    return computeClampedRect(selectionTrigger.rect, 84, 34, true);
  }, [selectionTrigger]);

  return (
    <JapaneseLookupContext.Provider value={contextValue}>
      {children}

      {selectionTrigger &&
        triggerPosition &&
        createPortal(
          <button
            type="button"
            data-lookup-ui="trigger"
            onClick={() => {
              openLookup({
                text: selectionTrigger.text,
                rubyMap: selectionTrigger.rubyMap,
                rect: selectionTrigger.rect,
              });
            }}
            style={{ top: triggerPosition.top, left: triggerPosition.left }}
            className="fixed z-50 flex animate-pop-in items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-primary-fg shadow-pop transition-colors hover:border-primary hover:bg-primary-soft active:scale-95"
            aria-label="Dịch và giải thích đoạn tiếng Nhật đã chọn"
          >
            <span className="rounded bg-primary-soft px-1 font-bold text-primary-fg">訳</span>
            <span>Dịch</span>
          </button>,
          document.body,
        )}

      {activeTarget && (
        <JapaneseLookupPopover
          key={`${activeTarget.activeTokenId ?? activeTarget.text}-${activeTarget.rect.top}-${activeTarget.rect.left}`}
          target={activeTarget}
          onClose={closeLookup}
          onPointerEnter={cancelHoverLookup}
          onPointerLeave={cancelHoverLookup}
        />
      )}
    </JapaneseLookupContext.Provider>
  );
};

interface JapaneseLookupButtonProps {
  text: string;
  sentenceTranslation?: string;
  className?: string;
}

/** Discreet trigger icon to look up a Japanese prompt or example sentence cleanly. */
export const JapaneseLookupButton: React.FC<JapaneseLookupButtonProps> = ({
  text,
  sentenceTranslation,
  className,
}) => {
  const { openLookup } = useJapaneseLookup();

  if (!text || !containsJapanese(text)) return null;

  return (
    <IconButton
      variant="ghost"
      size="sm"
      data-lookup-interactive="button"
      aria-label="Dịch & giải thích câu tiếng Nhật"
      onClick={(e) => {
        e.stopPropagation();
        openLookup({
          text: text.trim(),
          rect: e.currentTarget.getBoundingClientRect(),
          sentenceTranslation,
        });
      }}
      className={cn('shrink-0 text-muted hover:text-primary-fg', className)}
    >
      <Languages className="size-4" aria-hidden />
    </IconButton>
  );
};
