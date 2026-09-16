import React from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import type { JLPTLevel } from '../../types/quiz';

const LEVELS: { id: JLPTLevel; title: string; desc: string; color: string }[] = [
  { id: 'N5', title: 'Trình độ N5', desc: 'Nhập môn tiếng Nhật', color: 'text-blue-400' },
  { id: 'N4', title: 'Trình độ N4', desc: 'Sơ cấp tiếng Nhật', color: 'text-emerald-400' },
  { id: 'N3', title: 'Trình độ N3', desc: 'Trung cấp tiếng Nhật (Mimi kara Oboeru)', color: 'text-indigo-400' },
  { id: 'N2', title: 'Trình độ N2', desc: 'Thượng cấp tiếng Nhật', color: 'text-purple-400' },
  { id: 'N1', title: 'Trình độ N1', desc: 'Cao cấp tiếng Nhật', color: 'text-rose-400' },
];

interface Props {
  basePath?: string;
  title?: string;
  hideTabs?: boolean;
}

export const VocabularyLevelsPage: React.FC<Props> = ({ 
  basePath = '/vocabulary', 
  title = 'Từ vựng',
  hideTabs = false
}) => {
  const navigate = useNavigate();

  return (
    <div className="max-w-5xl mx-auto">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {hideTabs ? `Chọn Trình độ (${title})` : 'Chọn Trình độ (JLPT Level)'}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Vui lòng chọn trình độ bạn muốn học để xem danh sách bài học tương ứng.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LEVELS.map(level => (
          <div 
            key={level.id}
            onClick={() => navigate(`${basePath}/${level.id.toLowerCase()}`)}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 cursor-pointer hover:border-indigo-500/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <GraduationCap className={`w-6 h-6 ${level.color}`} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{level.id}</h3>
                <p className={`text-sm font-medium ${level.color}`}>{level.title}</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{level.desc}</p>
          </div>
        ))}
      </div>

    </div>
  );
};
