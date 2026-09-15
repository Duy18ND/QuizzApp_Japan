import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ExplanationProps {
  isCorrect: boolean;
  correctAnswerText?: string;
  title: string;
  kanji: string;
  hanViet?: string;
  hiragana: string;
  meaning: string;
}

export const Explanation: React.FC<ExplanationProps> = ({ isCorrect, correctAnswerText, title, kanji, hanViet, hiragana, meaning }) => {
  return (
    <div className={`mt-6 p-5 rounded-xl border ${isCorrect ? 'bg-green-900/20 border-green-800' : 'bg-red-900/20 border-red-800'}`}>
      <div className={`flex items-center font-bold mb-4 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
        {isCorrect ? (
          <>
            <CheckCircle2 className="w-5 h-5 mr-2" />
            ✓ Chính xác
          </>
        ) : (
          <>
            <XCircle className="w-5 h-5 mr-2" />
            ✗ Chưa chính xác
          </>
        )}
      </div>
      
      <div className="space-y-4">
        {!isCorrect && correctAnswerText && (
          <div className="text-gray-200 font-medium text-lg">
            Đáp án đúng: <span className="text-green-400">{correctAnswerText}</span>
          </div>
        )}
        
        {isCorrect && title && (
          <div className="text-gray-200 font-medium text-lg">
            {title}
          </div>
        )}

        <div className="bg-black/20 p-4 rounded-lg space-y-2">
          {kanji && <div className="text-gray-300"><span className="text-gray-400 font-semibold w-24 inline-block">Kanji:</span><span className="text-white text-lg">{kanji}</span></div>}
          {hanViet && <div className="text-gray-300"><span className="text-gray-400 font-semibold w-24 inline-block">Hán Việt:</span><span className="text-white text-lg">{hanViet}</span></div>}
          {hiragana && <div className="text-gray-300"><span className="text-gray-400 font-semibold w-24 inline-block">Hiragana:</span><span className="text-white text-lg">{hiragana}</span></div>}
          {meaning && <div className="text-gray-300"><span className="text-gray-400 font-semibold w-24 inline-block">Nghĩa:</span><span className="text-white text-lg">{meaning}</span></div>}
        </div>
      </div>
    </div>
  );
};
