import type { GrammarRule, PracticeQuestion, PracticeType } from '../../types/grammar';
import { getTemplatesForGrammar } from './sentenceTemplates';
import { adaptVocabulary } from './vocabularyAdapter';
import type { GrammarVocabulary } from './vocabularyAdapter';
import { conjugateVerb } from './conjugator';

// Simple seeded random number generator (LCG)
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
  choice<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  shuffle<T>(arr: T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}

export interface GeneratorOptions {
  grammarRule: GrammarRule;
  count: number;
  seed: number;
  rawVocabulary: any[];
  practiceTypes: PracticeType[];
}

export interface QuestionSet {
  id: string;
  seed: number;
  grammarId: string;
  questions: PracticeQuestion[];
}

// Generate distractor options for multiple choice
const generateDistractors = (verb: GrammarVocabulary, type: string, rng: SeededRandom): string[] => {
  const distractors = new Set<string>();
  distractors.add(conjugateVerb(verb.hiragana, type, verb.verbGroup));
  distractors.add(conjugateVerb(verb.hiragana, 'te', verb.verbGroup));
  distractors.add(conjugateVerb(verb.hiragana, 'ta', verb.verbGroup));
  distractors.add(conjugateVerb(verb.hiragana, 'negative', verb.verbGroup));
  distractors.add(verb.hiragana);
  
  const arr = Array.from(distractors);
  return rng.shuffle(arr).slice(0, 4);
};

export const generateQuestionSet = (options: GeneratorOptions): QuestionSet => {
  const { grammarRule, count, seed, rawVocabulary, practiceTypes } = options;
  const rng = new SeededRandom(seed);
  const vocabList = adaptVocabulary(rawVocabulary);
  const templates = getTemplatesForGrammar(grammarRule.id);
  
  const questions: PracticeQuestion[] = [];
  const usedFingerprints = new Set<string>();
  
  let attempts = 0;
  const MAX_ATTEMPTS = count * 20;

  while (questions.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    
    // Choose practice type
    const pType = rng.choice(practiceTypes);
    
    // Generate based on type
    if (pType === 'conjugation' && grammarRule.target === 'verb') {
      const verbs = vocabList.filter(v => v.wordType === 'verb');
      if (verbs.length === 0) continue;
      const verb = rng.choice(verbs);
      
      const transformType = grammarRule.transformation?.type || 'passive';
      const correctAnswer = conjugateVerb(verb.hiragana, transformType, verb.verbGroup);
      
      const fingerprint = `conj_${verb.id}_${transformType}`;
      if (usedFingerprints.has(fingerprint)) continue;
      usedFingerprints.add(fingerprint);
      
      questions.push({
        id: `${grammarRule.id}-${seed}-${questions.length}`,
        grammarId: grammarRule.id,
        type: 'conjugation',
        question: `Hãy chia động từ sau sang ${grammarRule.meaning}:\n\n${verb.kanji || verb.hiragana} (${verb.hiragana})`,
        correctAnswer: correctAnswer,
        explanation: `Từ gốc: ${verb.hiragana} (Group ${verb.verbGroup})\nQuy tắc: -> ${correctAnswer}`,
      });
    } else if (templates.length > 0) {
      // Sentence based generation
      const template = rng.choice(templates);
      
      // Fill slots
      const slotValues: Record<string, GrammarVocabulary> = {};
      let valid = true;
      for (const slot of template.slots) {
        const matchingVocab = vocabList.filter(v => v.tags.includes(slot.type));
        if (matchingVocab.length === 0) {
          valid = false;
          break;
        }
        slotValues[slot.name] = rng.choice(matchingVocab);
      }
      if (!valid) continue;
      
      const fingerprint = `sent_${template.id}_${Object.values(slotValues).map(v => v.id).join('_')}_${pType}`;
      if (usedFingerprints.has(fingerprint)) continue;
      usedFingerprints.add(fingerprint);
      
      let sentence = template.pattern;
      for (const slot of template.slots) {
        let text = slotValues[slot.name].kanji || slotValues[slot.name].hiragana;
        if (slot.name === 'verbPassive') {
           text = conjugateVerb(slotValues[slot.name].hiragana, 'passive', slotValues[slot.name].verbGroup);
        } else if (slot.name === 'verbNagara') {
           text = conjugateVerb(slotValues[slot.name].hiragana, 'nagara', slotValues[slot.name].verbGroup);
        }
        sentence = sentence.replace(`{${slot.name}}`, text);
      }
      
      if (pType === 'recognition') {
        const verbSlot = template.slots.find(s => s.name.startsWith('verb'));
        if (!verbSlot) continue; // fallback
        const verb = slotValues[verbSlot.name];
        const correctForm = conjugateVerb(verb.hiragana, grammarRule.transformation?.type || 'passive', verb.verbGroup);
        const blankSentence = sentence.replace(correctForm, '＿＿＿＿＿');
        
        const distractors = generateDistractors(verb, grammarRule.transformation?.type || 'passive', rng);
        if (!distractors.includes(correctForm)) distractors[0] = correctForm;
        const shuffledOptions = rng.shuffle(distractors);
        
        questions.push({
          id: `${grammarRule.id}-${seed}-${questions.length}`,
          grammarId: grammarRule.id,
          type: 'recognition',
          question: blankSentence + '\n\n' + shuffledOptions.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n'),
          correctAnswer: correctForm,
        });
      } else if (pType === 'word_order') {
        // Tokenize sentence roughly by particles
        const tokens = sentence.split(/(?=[はをにがでと])|(?<=[はをにがでと])/).filter(t => t.trim().length > 0 && t !== '。');
        // Group particles with previous words if possible
        const mergedTokens: string[] = [];
        for (let i = 0; i < tokens.length; i++) {
          if (['は','を','に','が','で','と'].includes(tokens[i]) && mergedTokens.length > 0) {
            mergedTokens[mergedTokens.length - 1] += tokens[i];
          } else {
            mergedTokens.push(tokens[i]);
          }
        }
        if (mergedTokens.length < 3) continue; // too simple
        
        questions.push({
          id: `${grammarRule.id}-${seed}-${questions.length}`,
          grammarId: grammarRule.id,
          type: 'word_order',
          question: 'Hãy sắp xếp các từ sau thành câu đúng:',
          correctAnswer: sentence,
          metadata: {
            tokens: rng.shuffle(mergedTokens), // shuffled tokens for UI
            correctOrder: Array.from({length: mergedTokens.length}, (_, i) => i) // will be used by UI to verify if needed, but simple string comparison works too
          }
        });
      } else if (pType === 'sentence_transformation') {
         // Create active sentence
         let activeSentence = template.pattern;
         const p = slotValues['person']?.kanji || slotValues['person']?.hiragana;
         const a = slotValues['agent']?.kanji || slotValues['agent']?.hiragana;
         const v = slotValues['verbPassive']?.kanji || slotValues['verbPassive']?.hiragana;
         
         if (grammarRule.transformation?.type === 'passive' && p && a && v) {
            activeSentence = `${a}は${p}を${conjugateVerb(slotValues['verbPassive'].hiragana, 'ta', slotValues['verbPassive'].verbGroup)}。`;
            questions.push({
              id: `${grammarRule.id}-${seed}-${questions.length}`,
              grammarId: grammarRule.id,
              type: 'sentence_transformation',
              question: `${activeSentence}\n\n↓ ${grammarRule.name}に変えてください。`,
              correctAnswer: sentence,
              metadata: {
                originalSentence: activeSentence,
                targetGrammar: grammarRule.name
              }
            });
         }
      } else if (pType === 'translation') {
        // Mock simple translation
         questions.push({
          id: `${grammarRule.id}-${seed}-${questions.length}`,
          grammarId: grammarRule.id,
          type: 'translation',
          question: `Hãy dịch câu sau sang tiếng Nhật sử dụng ${grammarRule.name}:\n\n(Context: Dựa vào từ vựng đã học)`,
          correctAnswer: sentence,
        });
      } else if (pType === 'free_writing') {
        const hints = Object.values(slotValues).map(v => v.kanji || v.hiragana).join(' / ');
        questions.push({
          id: `${grammarRule.id}-${seed}-${questions.length}`,
          grammarId: grammarRule.id,
          type: 'free_writing',
          question: `Hãy tự đặt một câu sử dụng ${grammarRule.name}.\n\nTừ gợi ý: ${hints}`,
          correctAnswer: sentence, // example answer
        });
      } else if (pType === 'fill_blank') {
         const verbSlot = template.slots.find(s => s.name.startsWith('verb'));
         if (!verbSlot) continue;
         const verb = slotValues[verbSlot.name];
         const correctForm = conjugateVerb(verb.hiragana, grammarRule.transformation?.type || 'passive', verb.verbGroup);
         const blankSentence = sentence.replace(correctForm, '＿＿＿＿＿');
         questions.push({
          id: `${grammarRule.id}-${seed}-${questions.length}`,
          grammarId: grammarRule.id,
          type: 'fill_blank',
          question: `${blankSentence}\n（${verb.kanji || verb.hiragana}）`,
          correctAnswer: correctForm,
        });
      }
    }
  }

  return {
    id: `set-${seed}-${Date.now()}`,
    seed,
    grammarId: grammarRule.id,
    questions
  };
};
