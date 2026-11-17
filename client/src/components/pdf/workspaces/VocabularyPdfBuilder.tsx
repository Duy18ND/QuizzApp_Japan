import React from 'react';
import type { ColumnOption } from '../DraggableColumnList';

interface PrintWordRow {
  kanji?: string;
  hanViet?: string;
  hanviet?: string;
  hiragana?: string;
  meaning?: string;
}

interface VocabularyPdfBuilderProps {
  words: PrintWordRow[];
  columns: ColumnOption[];
  isGenerating: boolean;
}

export const VocabularyPdfBuilder: React.FC<VocabularyPdfBuilderProps> = ({
  words,
  columns,
  isGenerating,
}) => {
  if (!isGenerating || words.length === 0) return null;

  const sttWidth = 8;
  const colWidth = (100 - sttWidth) / columns.length;

  return (
    <div id="print-vocabulary" className="hidden bg-surface p-8 font-sans text-fg print:block print:w-full">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          html, body {
            height: max-content !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          body, #print-vocabulary {
            background: var(--surface);
            color: var(--fg);
            -webkit-print-color-adjust: exact;
            font-family: 'MPLUS1p', sans-serif;
          }
          #root { display: none !important; }
          #print-vocabulary {
            display: block !important;
            position: relative !important;
            width: 100%;
            padding: 0 !important;
          }
          .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          th {
            background-color: var(--surface-2) !important;
            color: var(--fg) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <h1 className="mb-6 text-center text-2xl font-bold text-fg">
        Danh sách từ vựng luyện viết
      </h1>

      <table className="w-full table-fixed border-collapse border border-line-strong">
        <thead>
          <tr className="bg-surface-2 text-fg">
            <th className="w-[8%] border border-line-strong p-2 text-sm font-bold">STT</th>
            {columns.map((col) => (
              <th
                key={col.id}
                className="border border-line-strong p-2 text-sm font-bold"
                style={{ width: `${colWidth}%` }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {words.map((word, index) => (
            <tr key={index} className="break-inside-avoid">
              <td className="border border-line-strong p-2 text-center text-sm font-medium text-fg">
                {index + 1}
              </td>

              {columns.map((col) => {
                let text = '';
                if (col.showContent) {
                  switch (col.id) {
                    case 'kanji':
                      text = word.kanji || '';
                      break;
                    case 'hanviet':
                      text = word.hanViet || word.hanviet || '';
                      break;
                    case 'hiragana':
                      text = word.hiragana || '';
                      break;
                    case 'meaning':
                      text = word.meaning || '';
                      break;
                  }
                }

                return (
                  <td
                    key={col.id}
                    lang={col.id === 'kanji' || col.id === 'hiragana' ? 'ja' : undefined}
                    className="h-12 border border-line-strong p-2 align-middle text-sm text-fg"
                  >
                    {text}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
