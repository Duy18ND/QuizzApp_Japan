import React from 'react';
import type { VocabularyItem } from '../../../types/vocabulary';
import { getVocabularyDisplay } from '../../../utils/vocabularyHelpers';

export type FlashcardPdfLayout = 'foldable' | 'double-sided';

interface FlashcardPdfBuilderProps {
  cards: VocabularyItem[];
  layout: FlashcardPdfLayout;
  isGenerating: boolean;
}

const CARDS_PER_PAGE = 8;

function renderFrontFace(card: VocabularyItem) {
  const display = getVocabularyDisplay(card);
  return (
    <div className="flex h-full flex-col justify-between p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded border border-line-strong bg-surface-2 px-2 py-0.5 text-xs font-bold">
          {card.level}
        </span>
        <span className="text-xs text-muted">{card.wordType}</span>
      </div>
      <div className="my-auto py-3 text-center">
        <p lang="ja" className="text-3xl font-bold text-fg">
          {display.primaryText}
        </p>
      </div>
      <p className="text-right text-[11px] text-subtle">#{card.wordNumber}</p>
    </div>
  );
}

function renderBackFace(card: VocabularyItem) {
  const display = getVocabularyDisplay(card);
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 p-4 text-center">
      {display.hasKanji && (
        <p lang="ja" className="text-lg font-bold text-primary-fg">
          {display.hiragana}
        </p>
      )}
      {!display.hasKanji && (
        <p lang="ja" className="text-base font-semibold text-primary-fg">
          {display.hiragana}
        </p>
      )}
      {display.hasKanji && display.hanViet && (
        <p className="text-xs font-bold tracking-wider text-muted uppercase">{display.hanViet}</p>
      )}
      <p className="mt-1 text-sm font-semibold text-fg">{card.meaning}</p>
    </div>
  );
}

export const FlashcardPdfBuilder: React.FC<FlashcardPdfBuilderProps> = ({
  cards,
  layout,
  isGenerating,
}) => {
  if (!isGenerating || cards.length === 0) return null;

  const pageChunks: VocabularyItem[][] = [];
  for (let i = 0; i < cards.length; i += CARDS_PER_PAGE) {
    pageChunks.push(cards.slice(i, i + CARDS_PER_PAGE));
  }

  return (
    <div id="print-flashcard" className="hidden bg-surface font-sans text-fg print:block print:w-full">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body {
            height: max-content !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: var(--surface) !important;
            color: var(--fg) !important;
          }
          body, #print-flashcard {
            background: var(--surface);
            color: var(--fg);
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'MPLUS1p', sans-serif;
          }
          #root { display: none !important; }
          #print-flashcard {
            display: block !important;
            position: relative !important;
            width: 100%;
          }
          .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .page-break-after {
            page-break-after: always;
            break-after: page;
          }
        }
      `}</style>

      {layout === 'foldable' ? (
        <div className="space-y-4">
          <div className="mb-4 text-center">
            <h1 className="text-xl font-bold uppercase">Flashcard Gập Đôi ({cards.length} thẻ)</h1>
            <p className="text-xs text-muted">Cắt theo viền ngoài, gập đôi theo đường nét đứt ở giữa.</p>
          </div>

          <div className="space-y-3">
            {cards.map((card) => (
              <div
                key={card.id}
                className="break-inside-avoid grid min-h-36 grid-cols-2 overflow-hidden rounded-lg border border-line-strong"
              >
                <div className="border-r border-dashed border-line-strong">{renderFrontFace(card)}</div>
                <div className="bg-surface-2/40">{renderBackFace(card)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          {pageChunks.map((chunk, chunkIdx) => {
            const rows: VocabularyItem[][] = [];
            for (let r = 0; r < chunk.length; r += 2) {
              rows.push(chunk.slice(r, r + 2));
            }

            return (
              <React.Fragment key={chunkIdx}>
                {/* Front Sheet */}
                <div className="page-break-after">
                  <div className="mb-3 flex items-center justify-between text-xs text-muted">
                    <span className="font-bold uppercase">Flashcard — Mặt trước (Trang {chunkIdx + 1})</span>
                    <span>In 2 mặt lật cạnh dài (Duplex Long Edge)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {chunk.map((card) => (
                      <div
                        key={`f-${card.id}`}
                        className="break-inside-avoid h-52 rounded-lg border border-line-strong"
                      >
                        {renderFrontFace(card)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mirrored Back Sheet for Duplex Alignment */}
                <div className={chunkIdx < pageChunks.length - 1 ? 'page-break-after' : ''}>
                  <div className="mb-3 flex items-center justify-between text-xs text-muted">
                    <span className="font-bold uppercase">Flashcard — Mặt sau (Trang {chunkIdx + 1})</span>
                    <span>Thứ tự đảo cột tự động để khớp mặt trước</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {rows.map((row, rIdx) => {
                      const leftCard = row[1];
                      const rightCard = row[0];
                      return (
                        <React.Fragment key={`r-${rIdx}`}>
                          {leftCard ? (
                            <div className="break-inside-avoid h-52 rounded-lg border border-line-strong">
                              {renderBackFace(leftCard)}
                            </div>
                          ) : (
                            <div className="h-52 rounded-lg border border-dashed border-line opacity-30" />
                          )}
                          <div className="break-inside-avoid h-52 rounded-lg border border-line-strong">
                            {renderBackFace(rightCard)}
                          </div>
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};
