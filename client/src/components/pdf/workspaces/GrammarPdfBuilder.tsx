import React from 'react';
import { grammarBooks } from '../../../data/grammar';
import type { GrammarPdfSet } from '../../../data/pdf/grammarPdfGenerator';

interface PdfBuilderProps {
  bookId: string;
  chapterId: string;
  generatedSets: GrammarPdfSet[];
  generateAnswer: boolean;
  linesCount: number;
  pdfMode: 'vi_to_ja' | 'ja_to_vi';
}

export const GrammarPdfBuilder: React.FC<PdfBuilderProps> = ({
  bookId,
  chapterId,
  generatedSets,
  generateAnswer,
  linesCount,
  pdfMode,
}) => {
  const book = grammarBooks.find((b) => b.id === bookId);
  const chapter = book?.chapters.find((c) => c.id === chapterId);

  const getModeTitle = () => {
    return pdfMode === 'vi_to_ja' ? '【VIỆT → NHẬT】' : '【NHẬT → VIỆT】';
  };

  const renderBlankLines = () => {
    return (
      <div className="mt-4 flex w-full flex-col gap-6">
        {Array.from({ length: linesCount }).map((_, i) => (
          <div
            key={i}
            className="w-full border-b border-fg"
            style={{ paddingBottom: '1.5rem' }}
          />
        ))}
      </div>
    );
  };

  return (
    <div id="print-workbook" className="hidden bg-surface p-8 font-sans text-fg print:block">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          html, body {
            height: max-content !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body, #print-workbook {
            background: var(--surface);
            color: var(--fg);
            -webkit-print-color-adjust: exact;
            font-family: 'MPLUS1p', sans-serif;
          }
          #root { display: none !important; }
          #print-workbook {
            display: block !important;
            position: relative !important;
            width: 100%;
            padding: 0 !important;
          }
          .page-break {
            page-break-before: always;
            break-before: page;
          }
          .avoid-break {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          h1, h2, h3, h4, hr {
            page-break-after: avoid;
            break-after: avoid;
          }
        }
      `}</style>

      {/* WORKBOOK PAGES */}
      <h1 className="mb-2 text-center text-3xl font-black uppercase">{book?.title} WORKBOOK</h1>
      <h2 className="mb-4 text-center text-xl font-bold">{chapter?.title}</h2>
      <hr className="mb-8 border-t-2 border-fg" />

      {generatedSets.map((set, setIdx) => {
        const bookChapters = book?.chapters || [];
        const rule = bookChapters.flatMap((c) => c.grammars).find((g) => g.id === set.grammarId);

        return (
          <div key={`set-${set.id}`} className={setIdx > 0 ? 'page-break' : ''}>
            <div className="mb-6 border-b border-fg pb-4">
              <div className="mb-2 flex items-end justify-between">
                <h2 lang="ja" className="text-2xl font-bold">
                  {rule
                    ? `Bài tập: ${rule.name} ${rule.hiragana}`
                    : 'Bài tập: Toàn bộ bài (Tổng hợp)'}
                </h2>
              </div>
              {rule && (rule.meaning || (rule.patterns && rule.patterns.length > 0)) && (
                <div className="avoid-break mt-3 rounded-lg border-l-4 border-primary bg-surface-2 p-4 text-base text-fg">
                  {rule.meaning && (
                    <div className="mb-2">
                      <span className="mr-2 font-bold">Ý nghĩa:</span>
                      <span>{rule.meaning}</span>
                    </div>
                  )}
                  {rule.patterns && rule.patterns.length > 0 && (
                    <div>
                      <span className="mr-2 font-bold">Cấu trúc:</span>
                      <span
                        lang="ja"
                        className="rounded border border-line bg-surface px-2 py-1 font-mono text-sm text-fg"
                      >
                        {rule.patterns.map((p) => p.pattern).join(' / ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {set.questions.length === 0 && (
              <p className="text-muted italic">Không có câu hỏi nào được tạo.</p>
            )}

            {set.questions.length > 0 && (
              <div className="mb-10">
                <h3 className="mb-6 text-xl font-bold tracking-wider">{getModeTitle()}</h3>
                <div className="space-y-12 pl-2">
                  {set.questions.map((q, idx) => (
                    <div key={q.id} className="avoid-break mb-8">
                      <div className="flex gap-3 text-lg">
                        <span className="font-bold">{idx + 1}.</span>
                        <div className="flex-1">
                          <p lang="ja" className="text-xl leading-relaxed">
                            {q.question}
                          </p>
                          {q.hiraganaHint && (
                            <p className="mt-2 text-sm text-muted">
                              Gợi ý đọc:{' '}
                              <span lang="ja" className="italic">
                                {q.hiraganaHint}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 w-full pr-4 pl-8">{renderBlankLines()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* ANSWER KEY PAGES */}
      {generateAnswer && generatedSets.length > 0 && (
        <div className="page-break">
          <h1 className="mb-2 text-center text-3xl font-black uppercase">ANSWER KEY</h1>
          <hr className="mb-8 border-t-2 border-fg" />

          {generatedSets.map((set) => {
            const bookChapters = book?.chapters || [];
            const rule = bookChapters
              .flatMap((c) => c.grammars)
              .find((g) => g.id === set.grammarId);

            return (
              <div key={`ans-set-${set.id}`} className="avoid-break mb-10">
                <h2
                  lang="ja"
                  className="mb-4 border-l-4 border-fg bg-surface-2 p-2 text-xl font-bold text-fg"
                >
                  {rule ? `${rule.name} ${rule.hiragana}` : 'Toàn bộ bài (Tổng hợp)'}
                </h2>
                <div className="grid grid-cols-1 gap-y-6 pl-4">
                  {set.questions.map((q, idx) => (
                    <div key={`ans-${q.id}`} className="mb-2 flex text-lg">
                      <span className="mr-3 font-bold">{idx + 1}.</span>
                      <div>
                        <p lang="ja" className="mb-1 text-muted">
                          {q.question}
                        </p>
                        <p lang="ja" className="font-medium text-primary-fg">
                          → {q.correctAnswer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
