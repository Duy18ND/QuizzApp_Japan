import React, { useState, useEffect } from 'react';
import type { StarQuestion, PracticeType } from '../../types/grammar';
import { Star } from 'lucide-react';

interface Props {
  mode: PracticeType;
  question: StarQuestion;
  onSubmit: (answer: string, isCorrect: boolean, feedbackMsg?: string) => void;
}

const NUMBER_CIRCLES = ['①', '②', '③', '④'];

export const StarQuestionComp: React.FC<Props> = ({ mode, question, onSubmit }) => {
  const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedChunkIds([]);
  }, [question]);

  const handleSelectChunk = (chunkId: string) => {
    if (selectedChunkIds.includes(chunkId)) return;
    if (selectedChunkIds.length >= 4) return;
    setSelectedChunkIds([...selectedChunkIds, chunkId]);
  };

  const handleDeselectChunk = (chunkIndex: number) => {
    const newSelected = [...selectedChunkIds];
    newSelected.splice(chunkIndex, 1);
    setSelectedChunkIds(newSelected);
  };

  const handleSubmit = () => {
    if (selectedChunkIds.length < 4) return;
    
    // The chunk ID that ended up in the star position
    const chunkAtStarId = selectedChunkIds[question.starIndex];
    const chunkText = question.chunks.find(c => c.id === chunkAtStarId)?.text || '';
    
    // Compare text instead of ID so the feedback screen shows the actual word
    const isCorrect = chunkText === question.correctAnswer;
    
    onSubmit(chunkText, isCorrect, isCorrect ? undefined : 'Sắp xếp chưa chính xác, hãy xem kỹ lại ngữ pháp nhé!');
  };

  const { prefix, suffix } = question.sentenceParts || { prefix: '', suffix: '' };
  const allChunksSelected = selectedChunkIds.length === 4;

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm min-h-[160px] flex flex-col justify-between">
        <div>
          {question.instruction && (
            <p className="text-sm font-semibold text-orange-500 dark:text-orange-400 mb-6">{question.instruction}</p>
          )}
          {question.question && (
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              {question.question}
            </h3>
          )}
        </div>
        
        {/* Inline Sentence Context with 4 blanks */}
        <div className="mt-auto pt-4 text-2xl font-medium text-gray-900 dark:text-white leading-[3] break-words">
          <span>{prefix}</span>
          
          {[0, 1, 2, 3].map((idx) => {
            const isStar = idx === question.starIndex;
            const chunkId = selectedChunkIds[idx];
            const chunkText = chunkId ? question.chunks.find(c => c.id === chunkId)?.text : '';
            
            return (
              <span 
                key={idx} 
                onClick={() => chunkId && handleDeselectChunk(idx)}
                className={`inline-flex flex-col items-center justify-end align-bottom relative px-3 mx-1 min-w-[3em] h-12 cursor-pointer group`}
              >
                {/* The text inside the blank */}
                <span className={`font-bold mb-1 transition-all ${chunkId ? 'text-blue-600 dark:text-blue-400 transform hover:scale-95' : 'opacity-0'}`}>
                  {chunkId ? chunkText : '＿＿'}
                </span>
                
                {/* The underline */}
                <span className={`w-full border-b-[3px] absolute bottom-1 left-0 transition-colors ${
                  chunkId ? 'border-blue-500' : 'border-gray-400 dark:border-gray-500'
                }`}></span>

                {/* Star indicator */}
                {isStar && (
                  <Star className={`absolute -bottom-4 w-4 h-4 ${chunkId ? 'text-blue-500' : 'text-orange-500'}`} />
                )}
              </span>
            );
          })}

          <span>{suffix}</span>
        </div>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3 px-4 max-w-2xl mx-auto">
        {question.shuffledChunks.map((chunk, idx) => {
          const isSelected = selectedChunkIds.includes(chunk.id);
          return (
            <button
              key={chunk.id}
              onClick={() => handleSelectChunk(chunk.id)}
              disabled={isSelected}
              className={`flex items-center text-left px-6 py-4 rounded-xl border-2 transition-all duration-200 shadow-sm ${
                isSelected 
                  ? 'bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-transparent opacity-50 cursor-not-allowed'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 dark:hover:bg-slate-700 cursor-pointer active:scale-95'
              }`}
            >
              <span className={`font-bold text-xl mr-4 ${isSelected ? 'text-transparent' : 'text-gray-500 dark:text-gray-400'}`}>
                {NUMBER_CIRCLES[idx]}
              </span>
              <span className={`font-semibold text-lg ${isSelected ? 'text-transparent' : ''}`}>
                {chunk.text}
              </span>
            </button>
          );
        })}
      </div>

      <div className="max-w-2xl mx-auto px-4 w-full pt-4">
        <button
          onClick={handleSubmit}
          disabled={!allChunksSelected}
          className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
        >
          Kiểm tra
        </button>
      </div>
    </div>
  );
};
