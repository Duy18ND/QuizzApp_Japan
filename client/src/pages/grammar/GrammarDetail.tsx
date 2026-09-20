import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, PlayCircle, BookOpen, Layers } from 'lucide-react';
import { grammarBooks } from '../../data/grammar';

export const GrammarDetail: React.FC = () => {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const navigate = useNavigate();

  const { book, chapter } = useMemo(() => {
    const b = grammarBooks.find(bk => bk.id === bookId);
    const c = b?.chapters.find(ch => ch.id === chapterId);
    return { book: b, chapter: c };
  }, [bookId, chapterId]);

  if (!book || !chapter) {
    return <div className="p-8 text-center text-gray-500">Không tìm thấy dữ liệu.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/grammar')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors font-medium mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Quay lại danh sách
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center font-black text-xl">
            {chapter.chapterNumber}
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {chapter.title}
            </h1>
            <p className="text-blue-600 dark:text-blue-400 font-medium">{book.title}</p>
          </div>
        </div>

        <div className="flex gap-4 mt-8">
          <button 
            onClick={() => navigate(`/grammar/${book.id}/${chapter.id}/practice?count=20&mode=mixed`)}
            className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-gray-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <PlayCircle className="w-5 h-5" />
            Luyện tập toàn bộ bài
          </button>
          <button 
            onClick={() => navigate(`/pdf?tab=grammar&bookId=${book.id}&chapterId=${chapter.id}`)}
            className="flex-1 py-3 px-6 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <BookOpen className="w-5 h-5" />
            Tạo bài tập PDF
          </button>
        </div>
      </div>

      {/* Grammar List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 text-gray-800 dark:text-gray-200 font-bold">
          <Layers className="w-5 h-5" />
          Danh sách ngữ pháp ({chapter.grammars.length})
        </div>
        
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {chapter.grammars.map((grammar, index) => (
            <div key={grammar.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                    <span className="text-gray-400 text-base">{index + 1}.</span>
                    {grammar.name}
                    {grammar.hiragana && (
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md ml-1">
                        {grammar.hiragana}
                      </span>
                    )}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Ý nghĩa: <span className="font-semibold text-gray-800 dark:text-gray-200">{grammar.meaning}</span>
                  </p>
                </div>
                
                <div className="flex gap-2 shrink-0">
                  <button 
                    onClick={() => navigate(`/grammar/${bookId}/${chapterId}/lesson/${grammar.id}`)}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-xl font-semibold transition-colors whitespace-nowrap text-sm flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" />
                    Học ngay
                  </button>
                </div>
              </div>

              {grammar.templates && grammar.templates.length > 0 && (
                <div className="mt-4 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50">
                  <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Cấu trúc:</div>
                  <ul className="space-y-1">
                    {grammar.templates.map((t, idx) => (
                      <li key={idx} className="text-gray-800 dark:text-gray-200 font-medium">
                        ・ {t.pattern}
                        {t.vietnamesePattern && (
                          <span className="block text-sm text-gray-500 font-normal ml-4">
                            → {t.vietnamesePattern}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
