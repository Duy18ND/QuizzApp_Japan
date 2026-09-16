import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

interface HintProps {
  kanji?: string;
  hiragana?: string;
  meaning?: string;
}

export const Hint: React.FC<HintProps> = ({ kanji, hiragana, meaning }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mt-4 mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center text-yellow-600 hover:text-yellow-500 dark:text-yellow-500 dark:hover:text-yellow-400 font-medium text-sm transition-colors"
      >
        <Lightbulb className="w-4 h-4 mr-1.5" />
        Gợi ý {isOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
      </button>
      
      {isOpen && (
        <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 text-yellow-900 dark:bg-yellow-900/20 dark:border-yellow-700/50 rounded-lg dark:text-yellow-100/90 text-sm space-y-1 transition-colors">
          {kanji && <div className="text-base"><span className="text-yellow-700 dark:text-yellow-600 font-semibold mr-2">Kanji:</span>{kanji}</div>}
          {hiragana && <div className="text-base"><span className="text-yellow-700 dark:text-yellow-600 font-semibold mr-2">Hiragana:</span>{hiragana}</div>}
          {meaning && <div className="text-base"><span className="text-yellow-700 dark:text-yellow-600 font-semibold mr-2">Nghĩa:</span>{meaning}</div>}
        </div>
      )}
    </div>
  );
};
