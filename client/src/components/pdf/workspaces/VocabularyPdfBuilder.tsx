import React from 'react';
import type { ColumnOption } from '../DraggableColumnList';

interface VocabularyPdfBuilderProps {
  words: any[];
  columns: ColumnOption[];
  isGenerating: boolean;
}

export const VocabularyPdfBuilder: React.FC<VocabularyPdfBuilderProps> = ({ words, columns, isGenerating }) => {
  if (!isGenerating || words.length === 0) return null;

  const sttWidth = 8;
  const colWidth = (100 - sttWidth) / columns.length;

  return (
    <div id="print-vocabulary" className="hidden print:block print:w-full bg-white text-black font-sans p-8">
      {/* Print-only CSS style */}
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
            background: white; 
            -webkit-print-color-adjust: exact;
            font-family: 'Inter', 'Noto Sans JP', Arial, sans-serif;
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
            background-color: #4f46e5 !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      `}</style>
      
      <h1 className="text-2xl font-bold text-center mb-6 text-black">Danh sách từ vựng luyện viết</h1>
      
      <table className="w-full border-collapse border border-gray-400 table-fixed">
        <thead>
          <tr className="bg-indigo-600 text-white">
            <th className="border border-gray-400 p-2 text-sm font-bold w-[8%] print:bg-indigo-600 print:text-white" style={{ WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>STT</th>
            {columns.map((col) => (
              <th key={col.id} className="border border-gray-400 p-2 text-sm font-bold print:bg-indigo-600 print:text-white" style={{ width: `${colWidth}%`, WebkitPrintColorAdjust: 'exact', colorAdjust: 'exact' }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {words.map((word, index) => (
            <tr key={index} className="break-inside-avoid">
              <td className="border border-gray-400 p-2 text-center text-sm font-medium text-black">{index + 1}</td>
              
              {columns.map((col) => {
                let text = '';
                if (col.showContent) {
                  switch (col.id) {
                    case 'kanji': text = word.kanji || ''; break;
                    case 'hanviet': text = word.hanViet || word.hanviet || ''; break;
                    case 'hiragana': text = word.hiragana || ''; break;
                    case 'meaning': text = word.meaning || ''; break;
                  }
                }
                
                return (
                  <td key={col.id} className="border border-gray-400 p-2 text-sm h-12 align-middle text-black font-japanese">
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
