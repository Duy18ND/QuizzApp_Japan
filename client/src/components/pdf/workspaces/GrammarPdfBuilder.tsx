import React from 'react';
import { grammarBooks } from '../../../data/grammar';


interface PdfBuilderProps {
  bookId: string;
  generatedSets: any[];
  generateAnswer: boolean;
}

export const GrammarPdfBuilder: React.FC<PdfBuilderProps> = ({ bookId, generatedSets, generateAnswer }) => {
  const book = grammarBooks.find(b => b.id === bookId);

  // Group questions by practice type
  const groupQuestionsByType = (questions: any[]) => {
    const grouped = questions.reduce((acc: Record<string, any[]>, q) => {
      const type = q.type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(q);
      return acc;
    }, {});
    return grouped;
  };

  const getCategoryHeader = (type: string) => {
    switch (type) {
      case 'ja_to_vi': return '【NHẬT → VIỆT】';
      case 'vi_to_ja': return '【VIỆT → NHẬT】';
      case 'fill_blank': return '【ĐIỀN TỪ VÀO CHỖ TRỐNG】';
      case 'sentence_ordering': return '【SẮP XẾP CÂU】';
      case 'sentence_transformation': return '【BIẾN ĐỔI CÂU】';
      case 'conjugation': return '【CHIA ĐỘNG TỪ】';
      case 'free_writing': return '【TỰ ĐẶT CÂU】';
      case 'multiple_choice': return '【TRẮC NGHIỆM】';
      case 'grammar_selection': return '【CHỌN NGỮ PHÁP】';
      default: return '【LUYỆN TẬP】';
    }
  };

  const renderBlankLines = (type: string) => {
    switch (type) {
      case 'vi_to_ja':
      case 'ja_to_vi':
      case 'sentence_transformation':
        return (
          <>
            <div className="border-b border-black w-full mt-8"></div>
            <div className="border-b border-black w-full mt-8"></div>
          </>
        );
      case 'free_writing':
        return (
          <>
            <div className="border-b border-black w-full mt-8"></div>
            <div className="border-b border-black w-full mt-8"></div>
            <div className="border-b border-black w-full mt-8"></div>
          </>
        );
      case 'multiple_choice':
      case 'grammar_selection':
        return <div className="border-b border-black w-1/3 mt-8"></div>;
      default:
        return <div className="border-b border-black w-full mt-8"></div>; // 1 line for fill blank, word order
    }
  };

  return (
    <div id="print-workbook" className="hidden print:block text-black font-sans bg-white p-8">
      {/* Print-only CSS style */}
      <style>{`
        @media print {
          @page { size: A4; margin: 20mm; }
          body, #print-workbook { 
            background: white; 
            -webkit-print-color-adjust: exact;
            font-family: 'Inter', 'Noto Sans JP', Arial, sans-serif;
          }
          #root { display: none !important; }
          #print-workbook {
            display: block !important;
            position: relative !important;
            width: 100%;
          }
          .page-break { page-break-before: always; }
          .avoid-break { page-break-inside: avoid; }
        }
      `}</style>
      
      {/* WORKBOOK PAGES */}
      <h1 className="text-3xl font-black text-center mb-2 uppercase">{book?.title} WORKBOOK</h1>
      <hr className="border-t-2 border-black mb-8" />
      
      {generatedSets.map((set, setIdx) => {
        const bookChapters = book?.chapters || [];
        const rule = bookChapters.flatMap(c => c.grammars).find(g => g.id === set.grammarId);
        const grouped = groupQuestionsByType(set.questions);
        
        let globalQuestionIndex = 1;

        return (
          <div key={`set-${set.id}`} className={setIdx > 0 ? 'page-break' : ''}>
            <div className="mb-6 flex justify-between items-end border-b border-black pb-2">
              <h2 className="text-2xl font-bold">Bài tập: {rule?.name} {rule?.hiragana}</h2>
              <span className="text-gray-500 italic">Level: {rule?.level}</span>
            </div>

            {Object.keys(grouped).length === 0 && (
              <p className="italic text-gray-500">Không có câu hỏi nào được tạo.</p>
            )}

            {Object.keys(grouped).map(type => (
              <div key={type} className="mb-10">
                <h3 className="text-xl font-bold mb-6 tracking-wider">{getCategoryHeader(type)}</h3>
                <div className="space-y-10 pl-2">
                  {grouped[type].map((q: any) => (
                    <div key={q.id} className="avoid-break mb-8">
                      {/* Question Content */}
                      <div className="flex gap-3 text-lg">
                        <span className="font-bold">{globalQuestionIndex++}.</span>
                        <div className="flex-1">
                          {type === 'sentence_ordering' ? (
                            <div className="flex flex-wrap gap-4 mt-1">
                              {q.parts.map((p: string, i: number) => (
                                <span key={i} className="border border-black px-3 py-1 rounded">
                                  {p}
                                </span>
                              ))}
                            </div>
                          ) : type === 'multiple_choice' || type === 'grammar_selection' ? (
                            <div>
                              <p className="mb-4">{q.question}</p>
                              <div className="grid grid-cols-2 gap-4">
                                {q.answers?.map((ans: string, i: number) => (
                                  <div key={i}>
                                    {String.fromCharCode(65 + i)}. {ans}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="leading-relaxed">{q.question}</p>
                          )}
                        </div>
                      </div>
                      
                      {/* Blank Lines */}
                      <div className="pl-8 w-full pr-4">
                        {renderBlankLines(type)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
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
             const grouped = groupQuestionsByType(set.questions);
             let globalAnswerIndex = 1;

             return (
               <div key={`ans-set-${set.id}`} className="mb-10 avoid-break">
                 <h2 className="text-xl font-bold mb-4 bg-gray-100 p-2 border-l-4 border-black">
                   {rule?.name} {rule?.hiragana}
                 </h2>
                 <div className="pl-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                   {Object.keys(grouped).map(type => (
                     grouped[type].map((q: any) => (
                       <div key={`ans-${q.id}`} className="text-base mb-2">
                         <span className="font-bold mr-2">{globalAnswerIndex++}.</span>
                         <span>
                           {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' / ') : q.correctAnswer}
                         </span>
                         {(type === 'free_writing' || type === 'vi_to_ja' || type === 'sentence_transformation') && (
                           <span className="text-gray-500 italic ml-2">(Ví dụ)</span>
                         )}
                       </div>
                     ))
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
