import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { JLPTLevel } from '../../types/grammar';
import { Filter, FileText, Book, LayoutList, ChevronRight } from 'lucide-react';
import { grammarBooks } from '../../data/grammar';

export const GrammarDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedLevel, setSelectedLevel] = useState<JLPTLevel | 'All'>('All');
  
  const levels: (JLPTLevel | 'All')[] = ['All', 'N5', 'N4', 'N3', 'N2', 'N1'];

  const filteredBooks = grammarBooks.filter(
    book => selectedLevel === 'All' || book.level === selectedLevel
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">
            Ngữ pháp
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Hệ thống học ngữ pháp theo giáo trình chuẩn
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            to="/grammar/pdf" 
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Xuất PDF
          </Link>
          <Link 
            to="/grammar/mistakes" 
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
          >
            Ôn tập lỗi sai
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <Filter className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-700 dark:text-gray-300">Cấp độ</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => setSelectedLevel(level)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedLevel === level
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Books & Chapters List */}
      <div className="space-y-6">
        {filteredBooks.map((book) => (
          <div key={book.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                <Book className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">
                  {book.title}
                </h2>
                <p className="text-sm text-gray-500 font-medium mt-1">Level {book.level}</p>
              </div>
            </div>
            
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {book.chapters.map(chapter => (
                <div key={chapter.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold text-sm">
                      {chapter.chapterNumber}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {chapter.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <LayoutList className="w-4 h-4" />
                        {chapter.grammars.length} ngữ pháp
                      </p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => navigate(`/grammar/${book.id}/${chapter.id}`)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"
                  >
                    Học ngay
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredBooks.length === 0 && (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            Chưa có giáo trình nào cho cấp độ này.
          </div>
        )}
      </div>
    </div>
  );
};
