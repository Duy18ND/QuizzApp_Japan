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
  sentenceText?: string;
  sentenceRubyMap?: Record<string, string>;
  rect: DOMRect;
  source: 'selection' | 'hover' | 'tap';
}

const JAPANESE_RUN_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF々ヶー]+/g;
const PURE_JP_PUNCT_RE = /^[\s。、．，,.!?！？「」『』（）()【】・〜~ー\-—…0-9０-９a-zA-Z]+$/;

type CaretPositionLegacy = {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

let cachedJaSegmenter: Intl.Segmenter | null | undefined;
function getJapaneseWordSegmenter(): Intl.Segmenter | null {
  if (cachedJaSegmenter !== undefined) return cachedJaSegmenter;
  try {
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      cachedJaSegmenter = new Intl.Segmenter('ja', { granularity: 'word' });
    } else {
      cachedJaSegmenter = null;
    }
  } catch {
    cachedJaSegmenter = null;
  }
  return cachedJaSegmenter;
}

function extractElementTextAndRuby(el: Element): {
  text: string;
  rubyMap: Record<string, string>;
} {
  const rubyMap: Record<string, string> = {};
  let text = '';
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const elem = node as Element;
    const tag = elem.tagName;
    if (tag === 'RT' || tag === 'RP' || tag === 'SCRIPT' || tag === 'STYLE') return;
    if (tag === 'RUBY') {
      let base = '';
      let rt = '';
      elem.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          base += child.textContent ?? '';
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          const cTag = (child as Element).tagName;
          if (cTag === 'RT') rt += child.textContent ?? '';
          else if (cTag !== 'RP') base += child.textContent ?? '';
        }
      });
      const cleanBase = base.trim();
      const cleanRt = rt.trim();
      if (cleanBase && cleanRt) rubyMap[cleanBase] = cleanRt;
      text += base;
      return;
    }
    elem.childNodes.forEach(walk);
  };
  walk(el);
  return { text: text.replace(/\s+/g, ' ').trim(), rubyMap };
}

function getCaretPoint(x: number, y: number): { node: Node; offset: number } | null {
  const doc = document as unknown as CaretPositionLegacy;
  if (typeof doc.caretPositionFromPoint === 'function') {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos?.offsetNode) return { node: pos.offsetNode, offset: pos.offset };
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);
    if (range?.startContainer) return { node: range.startContainer, offset: range.startOffset };
  }
  return null;
}

function extractJapaneseTriggerAtPoint(
  clientX: number,
  clientY: number,
  root: HTMLElement,
  source: 'hover' | 'tap',
): SelectionTriggerState | null {
  const elAtPoint = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  if (!elAtPoint || !root.contains(elAtPoint)) return null;

  // Never trigger on lookup UI, already-interactive reading tokens, inputs, or decorative aria-hidden glyphs
  if (
    elAtPoint.closest(
      '[data-lookup-ui], [data-lookup-interactive], [aria-hidden="true"], input, textarea, select, [contenteditable="true"], svg',
    )
  ) {
    return null;
  }

  // On tap/click, never hijack clickable controls (buttons, links, tabs, labels)
  if (
    source === 'tap' &&
    elAtPoint.closest('button, a, label, [role="button"], [role="tab"], [role="option"]')
  ) {
    return null;
  }

  // Skip furigana <rt> annotations directly; handle parent <ruby> cleanly
  const rubyEl = elAtPoint.closest('ruby');
  if (rubyEl && root.contains(rubyEl)) {
    const rubyRect = rubyEl.getBoundingClientRect();
    if (
      clientX < rubyRect.left - 8 ||
      clientX > rubyRect.right + 8 ||
      clientY < rubyRect.top - 8 ||
      clientY > rubyRect.bottom + 8
    ) {
      return null;
    }
    const { text: baseText, rubyMap } = extractElementTextAndRuby(rubyEl);
    if (!baseText || !containsJapanese(baseText) || PURE_JP_PUNCT_RE.test(baseText)) return null;

    const sentenceBlock = rubyEl.closest('p, li, td, h1, h2, h3, h4, dd, blockquote');
    let sentenceText: string | undefined;
    let sentenceRubyMap: Record<string, string> | undefined;
    if (sentenceBlock && root.contains(sentenceBlock)) {
      const extracted = extractElementTextAndRuby(sentenceBlock);
      if (extracted.text.length > baseText.length && extracted.text.length <= 260) {
        sentenceText = extracted.text;
        sentenceRubyMap = extracted.rubyMap;
      }
    }

    return {
      text: baseText,
      rubyMap,
      sentenceText,
      sentenceRubyMap,
      rect: rubyRect,
      source,
    };
  }

  const caret = getCaretPoint(clientX, clientY);
  if (!caret || caret.node.nodeType !== Node.TEXT_NODE) return null;
  const textNode = caret.node as Text;
  const parentEl = textNode.parentElement;
  if (!parentEl || !root.contains(parentEl)) return null;
  if (parentEl.tagName === 'RT' || parentEl.tagName === 'RP') return null;
  if (
    parentEl.closest(
      '[data-lookup-ui], [data-lookup-interactive], [aria-hidden="true"], input, textarea, select',
    )
  ) {
    return null;
  }

  const fullText = textNode.data;
  if (!fullText || !containsJapanese(fullText)) return null;

  // Locate exact character index under pointer (check both offset and offset - 1)
  const candidates = [caret.offset, caret.offset - 1].filter(
    (idx) => idx >= 0 && idx < fullText.length,
  );
  let charIdx = -1;
  for (const idx of candidates) {
    const ch = fullText[idx];
    if (!containsJapanese(ch)) continue;
    const charRange = document.createRange();
    charRange.setStart(textNode, idx);
    charRange.setEnd(textNode, idx + 1);
    const r = charRange.getBoundingClientRect();
    if (
      r.width > 0 &&
      r.height > 0 &&
      clientX >= r.left - 10 &&
      clientX <= r.right + 10 &&
      clientY >= r.top - 10 &&
      clientY <= r.bottom + 10
    ) {
      charIdx = idx;
      break;
    }
  }
  if (charIdx < 0) return null;

  // Segment into a natural Japanese word around charIdx
  let segStart = charIdx;
  let segEnd = charIdx + 1;
  const segmenter = getJapaneseWordSegmenter();
  if (segmenter) {
    for (const seg of segmenter.segment(fullText)) {
      const start = seg.index;
      const end = seg.index + seg.segment.length;
      if (charIdx >= start && charIdx < end) {
        segStart = start;
        segEnd = end;
        break;
      }
    }
  } else {
    JAPANESE_RUN_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = JAPANESE_RUN_RE.exec(fullText)) !== null) {
      if (charIdx >= m.index && charIdx < m.index + m[0].length) {
        segStart = m.index;
        segEnd = m.index + m[0].length;
        break;
      }
    }
  }

  const wordText = fullText.slice(segStart, segEnd).trim();
  if (!wordText || !containsJapanese(wordText) || PURE_JP_PUNCT_RE.test(wordText)) {
    return null;
  }

  const wordRange = document.createRange();
  wordRange.setStart(textNode, segStart);
  wordRange.setEnd(textNode, segEnd);
  const wordRect = wordRange.getBoundingClientRect();
  if (!wordRect || (wordRect.width === 0 && wordRect.height === 0)) return null;

  // Extract surrounding sentence context for optional "Cả câu" tab in the popover
  const sentenceBlock = parentEl.closest('p, li, td, h1, h2, h3, h4, dd, blockquote, button');
  let sentenceText: string | undefined;
  let sentenceRubyMap: Record<string, string> | undefined;
  if (sentenceBlock && root.contains(sentenceBlock)) {
    const extracted = extractElementTextAndRuby(sentenceBlock);
    if (
      extracted.text.length > wordText.length &&
      extracted.text.length <= 260 &&
      containsJapanese(extracted.text)
    ) {
      sentenceText = extracted.text;
      sentenceRubyMap = extracted.rubyMap;
    }
  }

  return {
    text: wordText,
    rubyMap: {},
    sentenceText,
    sentenceRubyMap,
    rect: wordRect,
    source,
  };
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
  const hoverTriggerTimerRef = useRef<number | null>(null);
  const hoverHideTimerRef = useRef<number | null>(null);
  const pointerOverTriggerRef = useRef(false);
  const routeKeyRef = useRef(routeKey);

  const selectionTrigger =
    selectionState?.routeKey === routeKey ? selectionState.trigger : null;
  const activeTarget = activeState?.routeKey === routeKey ? activeState.target : null;

  const selectionTriggerRef = useRef<SelectionTriggerState | null>(selectionTrigger);
  const activeTargetRef = useRef<LookupTarget | null>(activeTarget);

  useEffect(() => {
    routeKeyRef.current = routeKey;
    selectionTriggerRef.current = selectionTrigger;
    activeTargetRef.current = activeTarget;
  }, [routeKey, selectionTrigger, activeTarget]);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current !== null) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  const clearTriggerTimers = useCallback(() => {
    if (hoverTriggerTimerRef.current !== null) {
      window.clearTimeout(hoverTriggerTimerRef.current);
      hoverTriggerTimerRef.current = null;
    }
    if (hoverHideTimerRef.current !== null) {
      window.clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
  }, []);

  const closeLookup = useCallback(() => {
    clearHoverTimer();
    clearTriggerTimers();
    pointerOverTriggerRef.current = false;
    setActiveState(null);
    setSelectionState(null);
  }, [clearHoverTimer, clearTriggerTimers]);

  const openLookup = useCallback(
    (target: LookupTarget) => {
      clearHoverTimer();
      clearTriggerTimers();
      pointerOverTriggerRef.current = false;
      setSelectionState(null);
      setActiveState({ routeKey: routeKeyRef.current, target });
    },
    [clearHoverTimer, clearTriggerTimers],
  );

  const scheduleHoverLookup = useCallback(
    (target: LookupTarget, delayMs = 450) => {
      clearHoverTimer();
      clearTriggerTimers();
      hoverTimerRef.current = window.setTimeout(() => {
        const selText = window.getSelection()?.toString().trim() ?? '';
        if (selText) return;
        setSelectionState(null);
        setActiveState({ routeKey: routeKeyRef.current, target });
      }, delayMs);
    },
    [clearHoverTimer, clearTriggerTimers],
  );

  const cancelHoverLookup = useCallback(() => {
    clearHoverTimer();
  }, [clearHoverTimer]);

  // Global Japanese text-selection, hover (PC mouse), and tap/click (Mobile/iPad/PC) trigger inside <main>
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
          if (selectionTriggerRef.current?.source === 'selection') {
            setSelectionState(null);
          }
          return;
        }

        const anchorNode = selection.anchorNode;
        if (!anchorNode || !root.contains(anchorNode)) {
          return;
        }

        const { text, rubyMap, rect } = extractCleanSelection(selection);
        if (!text || !rect || text.length > 350 || !containsJapanese(text)) {
          if (selectionTriggerRef.current?.source === 'selection') {
            setSelectionState(null);
          }
          return;
        }

        clearTriggerTimers();
        setSelectionState({
          routeKey: routeKeyRef.current,
          trigger: { text, rubyMap, rect, source: 'selection' },
        });
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      if (activeTargetRef.current) return;
      if (pointerOverTriggerRef.current) return;
      const cur = selectionTriggerRef.current;
      if (cur && cur.source !== 'hover') return;
      const selText = window.getSelection()?.toString().trim() ?? '';
      if (selText) return;

      const x = event.clientX;
      const y = event.clientY;

      // Keep current hover pill alive while pointer stays inside the hovered word or corridor to pill
      if (cur && cur.source === 'hover') {
        const r = cur.rect;
        const inWordOrCorridor =
          x >= r.left - 18 && x <= r.right + 18 && y >= r.top - 48 && y <= r.bottom + 14;
        if (!inWordOrCorridor && hoverHideTimerRef.current === null) {
          hoverHideTimerRef.current = window.setTimeout(() => {
            hoverHideTimerRef.current = null;
            if (!pointerOverTriggerRef.current && selectionTriggerRef.current?.source === 'hover') {
              setSelectionState(null);
            }
          }, 420);
        } else if (inWordOrCorridor && hoverHideTimerRef.current !== null) {
          window.clearTimeout(hoverHideTimerRef.current);
          hoverHideTimerRef.current = null;
        }
      }

      if (hoverTriggerTimerRef.current !== null) {
        window.clearTimeout(hoverTriggerTimerRef.current);
      }
      hoverTriggerTimerRef.current = window.setTimeout(() => {
        hoverTriggerTimerRef.current = null;
        if (activeTargetRef.current || pointerOverTriggerRef.current) return;
        const activeSel = window.getSelection()?.toString().trim() ?? '';
        if (activeSel) return;

        const detected = extractJapaneseTriggerAtPoint(x, y, root, 'hover');
        if (detected) {
          if (hoverHideTimerRef.current !== null) {
            window.clearTimeout(hoverHideTimerRef.current);
            hoverHideTimerRef.current = null;
          }
          setSelectionState({
            routeKey: routeKeyRef.current,
            trigger: detected,
          });
        } else if (selectionTriggerRef.current?.source === 'hover' && !pointerOverTriggerRef.current) {
          setSelectionState(null);
        }
      }, 240);
    };

    const handleRootLeave = () => {
      if (hoverTriggerTimerRef.current !== null) {
        window.clearTimeout(hoverTriggerTimerRef.current);
        hoverTriggerTimerRef.current = null;
      }
      if (selectionTriggerRef.current?.source === 'hover' && !pointerOverTriggerRef.current) {
        hoverHideTimerRef.current = window.setTimeout(() => {
          hoverHideTimerRef.current = null;
          if (!pointerOverTriggerRef.current && selectionTriggerRef.current?.source === 'hover') {
            setSelectionState(null);
          }
        }, 380);
      }
    };

    const handleTapOrClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const selText = window.getSelection()?.toString().trim() ?? '';
      if (selText) return;

      const detected = extractJapaneseTriggerAtPoint(event.clientX, event.clientY, root, 'tap');
      if (!detected) return;

      clearTriggerTimers();
      setActiveState(null);
      setSelectionState({
        routeKey: routeKeyRef.current,
        trigger: detected,
      });
    };

    root.addEventListener('mouseup', handleSelectionEnd);
    root.addEventListener('touchend', handleSelectionEnd);
    root.addEventListener('pointermove', handlePointerMove, { passive: true });
    root.addEventListener('pointerleave', handleRootLeave);
    root.addEventListener('click', handleTapOrClick);
    return () => {
      clearTriggerTimers();
      root.removeEventListener('mouseup', handleSelectionEnd);
      root.removeEventListener('touchend', handleSelectionEnd);
      root.removeEventListener('pointermove', handlePointerMove);
      root.removeEventListener('pointerleave', handleRootLeave);
      root.removeEventListener('click', handleTapOrClick);
    };
  }, [clearTriggerTimers, containerRef]);

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
      clearTriggerTimers();
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
  }, [activeTarget, clearTriggerTimers, selectionTrigger, closeLookup]);

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
            title={`Dịch nhanh "${selectionTrigger.text}"`}
            onPointerEnter={() => {
              pointerOverTriggerRef.current = true;
              if (hoverHideTimerRef.current !== null) {
                window.clearTimeout(hoverHideTimerRef.current);
                hoverHideTimerRef.current = null;
              }
            }}
            onPointerLeave={() => {
              pointerOverTriggerRef.current = false;
              if (selectionTriggerRef.current?.source === 'hover') {
                hoverHideTimerRef.current = window.setTimeout(() => {
                  hoverHideTimerRef.current = null;
                  if (!pointerOverTriggerRef.current && selectionTriggerRef.current?.source === 'hover') {
                    setSelectionState(null);
                  }
                }, 320);
              }
            }}
            onClick={() => {
              openLookup({
                text: selectionTrigger.text,
                rubyMap: selectionTrigger.rubyMap,
                sentenceText: selectionTrigger.sentenceText,
                sentenceRubyMap: selectionTrigger.sentenceRubyMap,
                rect: selectionTrigger.rect,
              });
            }}
            style={{ top: triggerPosition.top, left: triggerPosition.left }}
            className="fixed z-50 flex animate-pop-in cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-primary-fg shadow-pop transition-colors hover:border-primary hover:bg-primary-soft active:scale-95"
            aria-label={`Dịch và giải thích "${selectionTrigger.text}"`}
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
