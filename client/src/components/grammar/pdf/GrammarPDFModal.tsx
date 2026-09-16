import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../store';
import { FileText, Download, ArrowLeft, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateQuestionSet } from '../../../utils/grammarEngine/questionGenerator';
import type { QuestionSet } from '../../../utils/grammarEngine/questionGenerator';
import { unit1Data } from '../../../data/n3/unit1';

export const GrammarPDFModal: React.FC = () => {
  const navigate = useNavigate();
  const rules = useSelector((state: RootState) => state.grammar.availableRules);
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState('normal');
  const [questionCount, setQuestionCount] = useState(20);
  const [generateAnswer, setGenerateAnswer] = useState(true);
  const [generatedSets, setGeneratedSets] = useState<QuestionSet[]>([]);

  const handleToggleRule = (id: string) => {
    setSelectedRules(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    const seed = Date.now();
    const sets = selectedRules.map(id => {
      const rule = rules.find(r => r.id === id)!;
      return generateQuestionSet({
        grammarRule: rule,
        count: Math.max(5, Math.floor(questionCount / selectedRules.length)),
        seed,
        rawVocabulary: unit1Data as any[],
        practiceTypes: rule.practiceTypes
      });
    });
    setGeneratedSets(sets);
    
    // Give react time to render the hidden DOM
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <button 
        onClick={() => navigate('/grammar')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors font-medium mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        Quay lại
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2 flex items-center gap-3">
          <FileText className="w-8 h-8 text-indigo-500" />
          Xuất PDF Workbook
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Tạo tài liệu luyện tập ngữ pháp để in ra giấy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Col: Grammar Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-gray-400" />
              Chọn ngữ pháp
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-2 border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/50">
              {rules.map(rule => (
                <label key={rule.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-800 rounded-lg cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={selectedRules.includes(rule.id)}
                    onChange={() => handleToggleRule(rule.id)}
                    className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">{rule.name}</div>
                    <div className="text-xs text-gray-500">{rule.meaning}</div>
                  </div>
                </label>
              ))}
            </div>
            <button 
              onClick={() => setSelectedRules(rules.map(r => r.id))}
              className="text-sm text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
            >
              Chọn tất cả
            </button>
          </div>

          {/* Right Col: Settings */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Độ khó</label>
              <select 
                value={difficulty}
                onChange={e => setDifficulty(e.target.value)}
                className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="easy">Dễ (Có gợi ý từ vựng)</option>
                <option value="normal">Bình thường</option>
                <option value="hard">Khó (Chỉ cho ngữ cảnh)</option>
                <option value="mixed">Trộn lẫn</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Số lượng câu hỏi</label>
              <div className="flex gap-2">
                {[10, 20, 30, 50].map(num => (
                  <button
                    key={num}
                    onClick={() => setQuestionCount(num)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      questionCount === num 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer">
              <input 
                type="checkbox"
                checked={generateAnswer}
                onChange={e => setGenerateAnswer(e.target.checked)}
                className="w-5 h-5 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="font-semibold text-gray-900 dark:text-white text-sm">Tạo kèm Answer Key (Đáp án)</span>
            </label>

            <button 
              onClick={handleGenerate}
              disabled={selectedRules.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl font-bold transition-colors shadow-sm"
            >
              <Download className="w-5 h-5" />
              Tạo PDF
            </button>
          </div>
        </div>
      </div>
      
      {/* Print-only CSS style to hide the UI and show the workbook when printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-workbook, #print-workbook * {
            visibility: visible;
          }
          #print-workbook {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
      
      {/* Hidden Print Container */}
      <div id="print-workbook" className="hidden">
        <h1 style={{ textAlign: 'center', fontSize: '24pt', fontWeight: 'bold' }}>N4 GRAMMAR WORKBOOK</h1>
        <hr style={{ margin: '20px 0' }} />
        {generatedSets.map(set => {
          const r = rules.find(x => x.id === set.grammarId);
          return (
            <div key={set.id} style={{ marginBottom: '40px' }}>
              <h2 style={{ fontSize: '18pt', marginBottom: '20px' }}>【{r?.name}】</h2>
              <div style={{ padding: '0 20px', lineHeight: '2' }}>
                {set.questions.map((q, idx) => (
                  <div key={q.id} style={{ marginBottom: '30px' }}>
                    <p style={{ fontWeight: 'bold' }}>{idx + 1}. {q.question}</p>
                    <p>→ ___________________________________________________________</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
        {generateAnswer && generatedSets.length > 0 && (
          <div style={{ pageBreakBefore: 'always' }}>
            <h1 style={{ textAlign: 'center', fontSize: '24pt', fontWeight: 'bold' }}>ANSWER KEY</h1>
            <hr style={{ margin: '20px 0' }} />
            {generatedSets.map(set => (
              <div key={`ans-${set.id}`} style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '14pt', marginBottom: '10px' }}>【{rules.find(x => x.id === set.grammarId)?.name}】</h3>
                <div style={{ padding: '0 20px', lineHeight: '1.5' }}>
                  {set.questions.map((q, idx) => (
                    <div key={`a-${q.id}`} style={{ marginBottom: '10px' }}>
                      <p><strong>{idx + 1}.</strong> {Array.isArray(q.correctAnswer) ? q.correctAnswer.join(' / ') : q.correctAnswer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
