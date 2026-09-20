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
  pdfMode
}) => {
  const book = grammarBooks.find(b => b.id === bookId);
  const chapter = book?.chapters.find(c => c.id === chapterId);

  const getModeTitle = () => {
    return pdfMode === 'vi_to_ja' ? '【VIỆT → NHẬT】' : '【NHẬT → VIỆT】';
  };

  const renderBlankLines = () => {
    return (
      <div className="w-full mt-4 flex flex-col gap-6">
        {Array.from({ length: linesCount }).map((_, i) => (
          <div key={i} className="border-b border-black w-full" style={{ paddingBottom: '1.5rem' }}></div>
        ))}
      </div>
    );
  };

  return (
    <div id="print-workbook" className="hidden print:block text-black font-sans bg-white p-8">
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
          body, #print-workbook { 
            background: white; 
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
      <h1 className="text-3xl font-black text-center mb-2 uppercase">{book?.title} WORKBOOK</h1>
      <h2 className="text-xl font-bold text-center mb-4">{chapter?.title}</h2>
      <hr className="border-t-2 border-black mb-8" />
      
      {generatedSets.map((set, setIdx) => {
        const bookChapters = book?.chapters || [];
        const rule = bookChapters.flatMap(c => c.grammars).find(g => g.id === set.grammarId);
        
        return (
          <div key={`set-${set.id}`} className={setIdx > 0 ? 'page-break' : ''}>
            <div className="mb-6 border-b border-black pb-4">
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-2xl font-bold">
                  {rule ? `Bài tập: ${rule.name} ${rule.hiragana}` : 'Bài tập: Toàn bộ bài (Tổng hợp)'}
                </h2>
              </div>
              {rule && (rule.meaning || (rule.patterns && rule.patterns.length > 0)) && (
                <div className="text-base text-[#1f2937] bg-[#f3f4f6] p-4 rounded-lg border-l-4 border-[#3b82f6] mt-3 avoid-break">
                  {rule.meaning && (
                    <div className="mb-2">
                      <span className="font-bold mr-2">Ý nghĩa:</span> 
                      <span>{rule.meaning}</span>
                    </div>
                  )}
                  {rule.patterns && rule.patterns.length > 0 && (
                    <div>
                      <span className="font-bold mr-2">Cấu trúc:</span>
                      <span className="font-mono bg-white text-black px-2 py-1 border border-gray-300 rounded text-sm">
                        {rule.patterns.map(p => p.pattern).join(' / ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {set.questions.length === 0 && (
              <p className="italic text-gray-500">Không có câu hỏi nào được tạo.</p>
            )}

            {set.questions.length > 0 && (
              <div className="mb-10">
                <h3 className="text-xl font-bold mb-6 tracking-wider">{getModeTitle()}</h3>
                <div className="space-y-12 pl-2">
                  {set.questions.map((q, idx) => (
                    <div key={q.id} className="avoid-break mb-8">
                      {/* Question Content */}
                      <div className="flex gap-3 text-lg">
                        <span className="font-bold">{idx + 1}.</span>
                        <div className="flex-1">
                          <p className="leading-relaxed text-xl">{q.question}</p>
                          {q.hiraganaHint && (
                            <p className="text-sm text-gray-600 mt-2">
                              Gợi ý đọc: <span className="italic">{q.hiraganaHint}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Blank Lines */}
                      <div className="pl-8 w-full pr-4 mt-2">
                        {renderBlankLines()}
                      </div>
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
          <h1 className="text-3xl font-black text-center mb-2 uppercase">ANSWER KEY</h1>
          <hr className="border-t-2 border-black mb-8" />
          
          {generatedSets.map(set => {
             const bookChapters = book?.chapters || [];
             const rule = bookChapters.flatMap(c => c.grammars).find(g => g.id === set.grammarId);

             return (
               <div key={`ans-set-${set.id}`} className="mb-10 avoid-break">
                 <h2 className="text-xl font-bold mb-4 bg-[#f3f4f6] text-black p-2 border-l-4 border-black">
                   {rule ? `${rule.name} ${rule.hiragana}` : 'Toàn bộ bài (Tổng hợp)'}
                 </h2>
                 <div className="pl-4 grid grid-cols-1 gap-y-6">
                   {set.questions.map((q, idx) => (
                     <div key={`ans-${q.id}`} className="text-lg mb-2 flex">
                       <span className="font-bold mr-3">{idx + 1}.</span>
                       <div>
                         <p className="text-gray-600 mb-1">{q.question}</p>
                         <p className="font-medium text-blue-800">→ {q.correctAnswer}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               </div>
             )
          })}
        </div>
      )}
    </div>
  );
};
