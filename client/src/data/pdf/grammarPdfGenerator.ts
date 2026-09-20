import { lesson01Sentences } from '../grammar/shinkanzen-n3/lesson01Sentences';
import { lesson02Sentences } from '../grammar/shinkanzen-n3/lesson02Sentences';
import { shuffleArray } from '../../utils/shuffle';

const allGrammarSentences = [...lesson01Sentences, ...lesson02Sentences];

export type PdfMode = 'vi_to_ja' | 'ja_to_vi';
export type PdfScope = 'grammar' | 'lesson';

export interface GrammarPdfConfig {
  mode: PdfMode;
  scope: PdfScope;
  count: number | 'all'; // count per grammar, or count for the whole lesson if scope='lesson'
  grammarIds: string[];
  showHiragana: boolean;
}

export interface GrammarPdfQuestion {
  id: string;
  question: string;
  correctAnswer: string;
  hiraganaHint?: string;
}

export interface GrammarPdfSet {
  id: string;
  grammarId: string;
  questions: GrammarPdfQuestion[];
}

export const generateGrammarPdfDataset = (config: GrammarPdfConfig): GrammarPdfSet[] => {
  // Use lesson01Sentences as the central bank for now. 
  // In a real scenario with more books, this would dynamically load based on bookId/chapterId.
  const allSentences = allGrammarSentences;
  
  if (config.scope === 'lesson') {
    // Collect sentences for all requested grammars
    let availableSentences = allSentences.filter(s => config.grammarIds.includes(s.grammarId));
    availableSentences = shuffleArray(availableSentences);
    
    if (config.count !== 'all') {
      availableSentences = availableSentences.slice(0, config.count);
    }
    
    const questions: GrammarPdfQuestion[] = availableSentences.map(s => {
      const q: GrammarPdfQuestion = {
        id: s.id,
        question: config.mode === 'vi_to_ja' ? s.vietnamese : s.japanese,
        correctAnswer: config.mode === 'vi_to_ja' ? s.japanese : s.vietnamese,
      };
      if (config.showHiragana && config.mode === 'vi_to_ja') {
        q.hiraganaHint = s.hiragana;
      }
      return q;
    });

    return [
      {
        id: 'lesson-mixed-set',
        grammarId: 'mixed', // We will handle 'mixed' in the Builder
        questions
      }
    ];
  } else {
    // Scope is 'grammar', we generate a set for each grammarId independently
    return config.grammarIds.map(gId => {
      let sentences = allSentences.filter(s => s.grammarId === gId);
      sentences = shuffleArray(sentences);
      
      if (config.count !== 'all') {
        sentences = sentences.slice(0, config.count);
      }
      
      const questions: GrammarPdfQuestion[] = sentences.map(s => {
        const q: GrammarPdfQuestion = {
          id: s.id,
          question: config.mode === 'vi_to_ja' ? s.vietnamese : s.japanese,
          correctAnswer: config.mode === 'vi_to_ja' ? s.japanese : s.vietnamese,
        };
        if (config.showHiragana && config.mode === 'vi_to_ja') {
          q.hiraganaHint = s.hiragana;
        }
        return q;
      });

      return {
        id: `set-${gId}-${Date.now()}`,
        grammarId: gId,
        questions
      };
    }).filter(set => set.questions.length > 0);
  }
};
