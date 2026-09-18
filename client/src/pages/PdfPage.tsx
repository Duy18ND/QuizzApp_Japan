import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, BookOpen, Layers, Type, Hammer } from 'lucide-react';
import { VocabularyPdfWorkspace } from '../components/pdf/workspaces/VocabularyPdfWorkspace';
import { GrammarPdfWorkspace } from '../components/pdf/workspaces/GrammarPdfWorkspace';

type PdfType = 'vocabulary' | 'grammar' | 'kanji' | 'flashcard';

export const PdfPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as PdfType) || 'vocabulary';
  const [activeType, setActiveType] = useState<PdfType>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab') as PdfType;
    if (tab) setActiveType(tab);
  }, [searchParams]);

  const types = [
    { id: 'vocabulary', label: 'Từ vựng', icon: FileText, desc: 'Luyện viết & học nghĩa' },
    { id: 'grammar', label: 'Ngữ pháp', icon: BookOpen, desc: 'Làm bài tập ngữ pháp' },
    { id: 'kanji', label: 'Kanji', icon: Type, desc: 'Luyện nét & nhớ chữ' },
    { id: 'flashcard', label: 'Flashcard', icon: Layers, desc: 'Thẻ in hai mặt' }
  ];

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-500" />
          Xuất tài liệu PDF
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Tạo tài liệu luyện tập để học trên giấy. Chọn loại tài liệu bên dưới để bắt đầu.
        </p>
      </div>

      {/* Type Selection */}
      <div className="flex flex-wrap gap-3">
        {types.map(t => {
          const isActive = activeType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveType(t.id as PdfType)}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-blue-200 dark:hover:border-blue-800'
              }`}
            >
              <t.icon className={`w-5 h-5 ${isActive ? 'text-blue-500' : ''}`} />
              <div className="text-left">
                <div className="font-bold text-sm">{t.label}</div>
                <div className="text-xs opacity-70 hidden sm:block">{t.desc}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Workspace Area */}
      <div className="flex-1 min-h-0 bg-white dark:bg-gray-800/30 rounded-3xl p-6 border border-gray-200 dark:border-gray-700/50">
        {activeType === 'vocabulary' && <VocabularyPdfWorkspace />}
        {activeType === 'grammar' && <GrammarPdfWorkspace />}
        
        {/* Placeholders for unimplemented features */}
        {(activeType === 'kanji' || activeType === 'flashcard') && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Hammer className="w-10 h-10 text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Đang phát triển</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                Tính năng xuất PDF cho {activeType === 'kanji' ? 'Kanji' : 'Flashcard'} hiện đang được xây dựng và sẽ sớm ra mắt trong phiên bản tới.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
