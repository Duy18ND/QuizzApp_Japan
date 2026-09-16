import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { VocabularyTabs } from '../../components/vocabulary/VocabularyTabs';
import { ExportPDFModal } from '../../components/pdf/ExportPDFModal';
import { BookOpen, ChevronRight, Home } from 'lucide-react';
import { UNIT_DATA } from '../../data/unitData';
import type { JLPTLevel } from '../../types/quiz';

export const VocabularyUnitsPage: React.FC = () => {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const [isExportOpen, setIsExportOpen] = useState(false);

  const levelKey = (level?.toUpperCase() || 'N3') as JLPTLevel;
  const units = UNIT_DATA[levelKey] || [];

  return (
    <div className="max-w-5xl mx-auto">
      <VocabularyTabs onExportPDF={() => setIsExportOpen(true)} />

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
        <Link to="/vocabulary" className="hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" /> Từ vựng
        </Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-indigo-400 font-medium">Trình độ {levelKey}</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Chọn Bài Học ({levelKey})</h1>
        <p className="text-gray-600 dark:text-gray-400">Danh sách các Unit thuộc trình độ {levelKey}.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {units.length === 0 ? (
          <div className="col-span-full p-8 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl">
            Đang cập nhật dữ liệu cho trình độ này...
          </div>
        ) : (
          units.map(unit => (
            <div 
              key={unit.id}
              onClick={() => navigate(`/vocabulary/${level}/${unit.id}`)}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 cursor-pointer hover:border-indigo-500/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex justify-between items-center group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{unit.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{unit.totalWords} từ vựng</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
            </div>
          ))
        )}
      </div>

      {isExportOpen && <ExportPDFModal onClose={() => setIsExportOpen(false)} />}
    </div>
  );
};
