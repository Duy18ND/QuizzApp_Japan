import React from 'react';
import type { KanjiItem } from '../../../types/kanji';

interface KanjiPdfBuilderProps {
  kanjiList: KanjiItem[];
  mode: 'mode1' | 'mode2' | 'mode3';
  isGenerating: boolean;
}

export const KanjiPdfBuilder: React.FC<KanjiPdfBuilderProps> = ({
  kanjiList,
  mode,
  isGenerating,
}) => {
  if (!isGenerating || kanjiList.length === 0) return null;

  return (
    <div id="print-kanji" className="hidden bg-surface font-sans text-fg print:block print:w-full">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          html, body {
            height: max-content !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            background: var(--surface) !important;
            color: var(--fg) !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            break-inside: avoid;
          }
          .kanji-page {
            page-break-after: always;
          }
        }
      `}</style>

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold uppercase">Luyện Viết Kanji</h1>
        <p className="mt-2 text-muted">Tổng số: {kanjiList.length} chữ</p>
      </div>

      <div className="space-y-12">
        {kanjiList.map((kanji) => (
          <div key={kanji.id} className="rounded-xl border border-line-strong p-6">
            <div className="mb-6 flex gap-6">
              {mode !== 'mode3' && (
                <div className="relative flex size-24 items-center justify-center rounded-lg border-2 border-fg sm:size-32">
                  <div className="absolute inset-0 top-1/2 border-b border-dashed border-line" />
                  <div className="absolute inset-0 left-1/2 border-r border-dashed border-line" />
                  <span lang="ja" className="relative z-10 text-6xl font-bold sm:text-7xl">
                    {kanji.kanji}
                  </span>
                </div>
              )}
              {mode === 'mode3' && (
                <div className="relative flex size-24 items-center justify-center rounded-lg border-2 border-fg bg-surface-2 sm:size-32">
                  <div className="absolute inset-0 top-1/2 border-b border-dashed border-line" />
                  <div className="absolute inset-0 left-1/2 border-r border-dashed border-line" />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-24 font-bold text-muted">Hán Việt:</span>
                  <span className="text-lg font-bold uppercase">{kanji.hanViet || '___'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-24 font-bold text-muted">Ý Nghĩa:</span>
                  <span className="text-lg">{kanji.meanings.join(', ')}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-24 font-bold text-muted">Âm ON:</span>
                  <div className="flex flex-wrap gap-1">
                    {kanji.onReadings.length > 0 ? (
                      kanji.onReadings.map((r) => (
                        <span
                          key={r}
                          lang="ja"
                          className="rounded bg-surface-2 px-2 py-0.5 text-sm"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-subtle">---</span>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="w-24 font-bold text-muted">Âm KUN:</span>
                  <div className="flex flex-wrap gap-1">
                    {kanji.kunReadings.length > 0 ? (
                      kanji.kunReadings.map((r) => (
                        <span
                          key={r}
                          lang="ja"
                          className="rounded bg-surface-2 px-2 py-0.5 text-sm"
                        >
                          {r}
                        </span>
                      ))
                    ) : (
                      <span className="text-subtle">---</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {(mode === 'mode1' || mode === 'mode2') && (
              <div>
                <h3 className="mb-2 font-bold">Luyện viết:</h3>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 md:grid-cols-10">
                  <div className="relative flex aspect-square items-center justify-center border border-line-strong">
                    <div className="absolute inset-0 top-1/2 border-b border-dashed border-line" />
                    <div className="absolute inset-0 left-1/2 border-r border-dashed border-line" />
                    <span lang="ja" className="relative z-10 text-4xl text-subtle opacity-35">
                      {kanji.kanji}
                    </span>
                  </div>
                  <div className="relative flex aspect-square items-center justify-center border border-line-strong">
                    <div className="absolute inset-0 top-1/2 border-b border-dashed border-line" />
                    <div className="absolute inset-0 left-1/2 border-r border-dashed border-line" />
                    <span lang="ja" className="relative z-10 text-4xl text-subtle opacity-35">
                      {kanji.kanji}
                    </span>
                  </div>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="relative flex aspect-square items-center justify-center border border-line-strong"
                    >
                      <div className="absolute inset-0 top-1/2 border-b border-dashed border-line" />
                      <div className="absolute inset-0 left-1/2 border-r border-dashed border-line" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === 'mode1' && kanji.examples && kanji.examples.length > 0 && (
              <div className="mt-4 border-t border-line pt-4">
                <h3 className="mb-2 text-sm font-bold text-muted">Từ vựng mẫu:</h3>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {kanji.examples.slice(0, 3).map((ex, i) => (
                    <div key={i} className="text-sm">
                      <span lang="ja" className="mr-2 font-bold">
                        {ex.word}
                      </span>
                      <span lang="ja" className="text-muted">
                        ({ex.hiragana})
                      </span>
                      <div className="text-xs text-muted">{ex.meaning}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {mode === 'mode3' && (
              <div className="mt-4 border-t border-line pt-4">
                <h3 className="mb-2 text-sm font-bold text-muted">
                  Viết 3 từ vựng chứa Kanji này:
                </h3>
                <div className="space-y-4">
                  <div className="h-6 border-b border-line-strong">1.</div>
                  <div className="h-6 border-b border-line-strong">2.</div>
                  <div className="h-6 border-b border-line-strong">3.</div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
