import { conjugateVerb } from './conjugator';
import type { VerbGroup } from './conjugator';
import type { GrammarRule } from '../../types/grammar';

// Simplistic mock vocabulary for the generator fallback
interface VocabItem {
  kanji: string;
  hiragana: string;
  meaning: string;
  wordType: string;
  verbGroup?: VerbGroup;
}

/**
 * Given a template string like "{person}は{agent}に{verbPassive}。" and a context dictionary,
 * generates a concrete sentence.
 */
export const generateSentenceFromTemplate = (template: string, context: Record<string, string>): string => {
  let sentence = template;
  for (const [key, value] of Object.entries(context)) {
    sentence = sentence.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return sentence;
};

/**
 * Higher-level function to generate a specific practice question based on a grammar rule.
 * In a real application, this would sample from a rich database of vocabulary 
 * based on user weakness (mastery level).
 */
export const generateConjugationQuestion = (rule: GrammarRule, vocabPool: VocabItem[]): { prompt: string, answer: string, hint?: string } | null => {
  if (rule.category !== 'conjugation' || !rule.transformation) return null;

  // Filter pool for verbs if it's a verb conjugation
  const targetVocab = vocabPool.filter(v => v.wordType === 'Động từ' || v.wordType === 'verb' || v.wordType === 'Danh từ'); // Naive check
  if (targetVocab.length === 0) return null;

  const randomVocab = targetVocab[Math.floor(Math.random() * targetVocab.length)];
  const transformationType = rule.transformation.type; // 'passive', 'nagara', etc.

  // Use the kanji if available, otherwise hiragana
  const baseForm = randomVocab.kanji || randomVocab.hiragana;
  // Ensure we pass the dictionary form (hiragana) to the conjugator logic
  const dictFormHiragana = randomVocab.hiragana;
  
  // NOTE: since conjugator works on strings, it primarily expects hiragana for processing
  // If we pass kanji, we might need a more advanced conjugator that splits Kanji stem from okurigana
  // For simplicity, we conjugate the hiragana form. 
  // In a robust system, we would have { kanjiStem, okurigana } for verbs.
  
  // Actually, we can conjugate the hiragana, and if kanji is provided, we can attempt to replace the stem.
  const conjugatedHiragana = conjugateVerb(dictFormHiragana, transformationType, randomVocab.verbGroup);
  
  // Basic Kanji okurigana replacement (very naive)
  if (randomVocab.kanji) {
     // This is complex in JS without mecab. Let's just use Hiragana for the answer for now, or assume the user types hiragana.
     // For a real app, they would type kanji or hiragana.
  }

  return {
    prompt: baseForm,
    answer: conjugatedHiragana, // We expect them to know the hiragana or we can accept multiple
    hint: `Group ${randomVocab.verbGroup || '?'}`
  };
};

