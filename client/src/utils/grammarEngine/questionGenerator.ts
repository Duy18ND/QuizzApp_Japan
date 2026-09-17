import type { SmartGrammarRule, VerbForm } from '../../types/grammarEngine';
import type { PracticeType } from '../../types/grammar';
import { adaptVocabulary } from './vocabularyAdapter';
import type { GrammarVocabulary } from './vocabularyAdapter';
import { conjugateVerb } from './conjugator';
import { verbCollocations } from '../../data/grammar/grammarConfig';
import {
  generateMultipleChoiceQuestion,
  generateFillBlankQuestion,
  generateConjugationQuestion,
  generateWordOrderQuestion,
  generateJaToViQuestion,
  generateViToJaQuestion,
  generateTransformationQuestion,
  generateGrammarSelectionQuestion,
  generateFreeWritingQuestion,
  generateExampleQuestion
} from './questionTypes';
import { SemanticEngine } from './semanticEngine';

import { tekaraDenaitoScenarios } from '../../data/grammar/scenarios/tekara-denaito';
import { uchiniStateScenarios, uchiniChangeScenarios } from '../../data/grammar/scenarios/uchini';

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

export interface SmartGeneratorOptions {
  grammarRule: SmartGrammarRule;
  count: number;
  seed: number;
  rawVocabulary: any[];
  topicScope?: string[];
  requestedPracticeTypes?: PracticeType[]; // Array of types to generate
}

export interface QuestionSet {
  id: string;
  seed: number;
  grammarId: string;
  questions: any[];
}

const applyConjugation = (vocab: GrammarVocabulary, form: VerbForm): string => {
  if (vocab.wordType !== 'verb') return vocab.kanji || vocab.hiragana;
  
  const h = vocab.hiragana;
  const g = vocab.verbGroup || 1;

  switch (form) {
    case 'Vる': return vocab.kanji || vocab.hiragana;
    case 'Vている': return conjugateVerb(h, 'te', g) + 'いる';
    case 'Vた': return conjugateVerb(h, 'ta', g);
    case 'Vない': return conjugateVerb(h, 'negative', g);
    case 'Vて': return conjugateVerb(h, 'te', g);
    default: return vocab.kanji || vocab.hiragana;
  }
};

const applyConjugationHiragana = (vocab: GrammarVocabulary, form: VerbForm): string => {
  if (vocab.wordType !== 'verb') return vocab.hiragana;
  
  const h = vocab.hiragana;
  const g = vocab.verbGroup || 1;

  switch (form) {
    case 'Vる': return h;
    case 'Vている': return conjugateVerb(h, 'te', g) + 'いる';
    case 'Vた': return conjugateVerb(h, 'ta', g);
    case 'Vない': return conjugateVerb(h, 'negative', g);
    case 'Vて': return conjugateVerb(h, 'te', g);
    default: return h;
  }
};

const generateWrongAnswers = (correct: string, vocab: GrammarVocabulary, _rule: SmartGrammarRule, _rng: SeededRandom): string[] => {
  if (vocab.wordType === 'verb') {
    const h = vocab.hiragana;
    const g = vocab.verbGroup || 1;
    const distractors = new Set<string>();
    distractors.add(conjugateVerb(h, 'ta', g));
    distractors.add(conjugateVerb(h, 'te', g));
    distractors.add(vocab.kanji || vocab.hiragana);
    distractors.add(conjugateVerb(h, 'negative', g));
    distractors.delete(correct);
    return Array.from(distractors).slice(0, 3);
  }
  return ['Dummy 1', 'Dummy 2', 'Dummy 3'];
};

export const generateSmartQuestionSet = (options: SmartGeneratorOptions): QuestionSet => {
  const { grammarRule, count, seed, rawVocabulary, topicScope, requestedPracticeTypes } = options;
  const rng = new SeededRandom(seed);
  const vocabList = adaptVocabulary(rawVocabulary);
  
  const questions: any[] = [];
  const usedFingerprints = new Set<string>();
  
  let attempts = 0;
  const MAX_ATTEMPTS = count * 50;

  if (!grammarRule.templates || grammarRule.templates.length === 0) {
    return { id: `set-${seed}`, seed, grammarId: grammarRule.id, questions: [] };
  }

  // Determine distribution of practice types
  let typesToUse = requestedPracticeTypes && requestedPracticeTypes.length > 0 
      ? requestedPracticeTypes 
      : grammarRule.practiceTypes.filter(t => t !== 'mixed' && t !== 'text_input');

  if (typesToUse.includes('mixed')) {
    typesToUse = grammarRule.practiceTypes.filter(t => t !== 'mixed' && t !== 'text_input');
  }

  // Create an array of types matched to target count
  const typeDistribution: PracticeType[] = [];
  const baseCount = Math.floor(count / typesToUse.length);
  const remainder = count % typesToUse.length;

  typesToUse.forEach((t, i) => {
    const c = baseCount + (i < remainder ? 1 : 0);
    for (let j = 0; j < c; j++) typeDistribution.push(t);
  });

  const shuffledTypes = rng.shuffle(typeDistribution);

  while (questions.length < count && attempts < MAX_ATTEMPTS) {
    attempts++;
    
    const template = rng.choice(grammarRule.templates);
    const allowedTopics = topicScope && topicScope.length > 0 
      ? topicScope.filter(t => template.supportedTopics?.includes(t))
      : template.supportedTopics || [];
      
    const selectedTopic = allowedTopics.length > 0 ? rng.choice(allowedTopics) : null;
    const slotValues: Record<string, GrammarVocabulary> = {};
    const conjugatedSlotValues: Record<string, string> = {};
    const chosenForms: Record<string, string> = {};
    
    let valid = true;
    let chosenVerb: GrammarVocabulary | null = null;
    let chosenObject: GrammarVocabulary | null = null;
    let targetSlotName = '';

    for (const slot of template.slots) {
      let candidateVocab = vocabList.filter(v => {
        if (slot.allowedTypes && !slot.allowedTypes.includes(v.wordType as any)) return false;
        if (slot.allowedSemanticRoles && slot.allowedSemanticRoles.length > 0) {
          const hasRole = slot.allowedSemanticRoles.some(role => v.tags.includes(role));
          if (!hasRole) return false;
        }
        if (selectedTopic && !v.tags.includes(selectedTopic)) {
          if (!v.tags.includes(selectedTopic) && slot.allowedSemanticRoles && slot.allowedSemanticRoles.length === 0) {
              return false; 
          }
        }
        return true;
      });

      if (slot.allowedTypes?.includes('noun') && chosenVerb) {
        const allowedObjects = verbCollocations[chosenVerb.kanji] || verbCollocations[chosenVerb.hiragana] || [];
        if (allowedObjects.length > 0) {
          candidateVocab = candidateVocab.filter(v => allowedObjects.includes(v.kanji) || allowedObjects.includes(v.hiragana));
        }
      }

      if (slot.allowedTypes?.includes('verb') && chosenObject) {
         const objName = chosenObject.kanji || chosenObject.hiragana;
         candidateVocab = candidateVocab.filter(v => {
            const allowed = verbCollocations[v.kanji] || verbCollocations[v.hiragana] || [];
            return allowed.length === 0 || allowed.includes(objName);
         });
      }

      if (candidateVocab.length === 0) {
        valid = false;
        break;
      }

      const selected = rng.choice(candidateVocab);
      slotValues[slot.name] = selected;
      
      if (!targetSlotName && slot.allowedTypes?.includes('verb')) {
        targetSlotName = slot.name;
      }

      if (selected.wordType === 'verb') chosenVerb = selected;
      if (selected.wordType === 'noun') chosenObject = selected;

      const form = slot.allowedForms && slot.allowedForms.length > 0 ? rng.choice(slot.allowedForms) : 'Vる';
      chosenForms[slot.name] = form;
      conjugatedSlotValues[slot.name] = applyConjugation(selected, form);
    }

    if (!valid) continue;
    if (!targetSlotName && template.slots.length > 0) targetSlotName = template.slots[0].name;

    // Load specific scenarios based on grammar ID or semanticFunction
    let ruleScenarios: any[] = [];
    if (grammarRule.id === 'N3-SKZ-L01-UCHINI-01') {
      ruleScenarios = uchiniStateScenarios;
    } else if (grammarRule.id === 'N3-SKZ-L01-UCHINI-02') {
      ruleScenarios = uchiniChangeScenarios;
    } else if (grammarRule.id === 'N3-SKZ-L01-TEKARA-DENAITO') {
      ruleScenarios = tekaraDenaitoScenarios;
    }
    
    // Evaluate semantics
    let isSemanticallyValid = true;
    if (ruleScenarios.length > 0) {
      // Pick a random scenario to validate against, or find one that matches our selected topic
      const matchingScenarios = SemanticEngine.getValidScenarios(grammarRule, ruleScenarios, selectedTopic || undefined);
      if (matchingScenarios.length > 0) {
        const scenario = matchingScenarios[0];
        const scores = SemanticEngine.evaluateCandidate(slotValues, scenario);
        
        // Threshold check
        if (scores.semanticScore < 1.0 || scores.collocationScore < 1.0) {
          isSemanticallyValid = false;
        }
      } else {
        // If no matching scenario found for the topic, reject to be safe
        isSemanticallyValid = false;
      }
    }

    if (!isSemanticallyValid) {
      continue;
    }

    let sentence = template.pattern;
    let hiraganaSentence = template.pattern;
    let vietnameseSentence = template.vietnamesePattern || '';
    
    for (const slot of template.slots) {
      sentence = sentence.replace(`{${slot.name}}`, conjugatedSlotValues[slot.name]);
      hiraganaSentence = hiraganaSentence.replace(`{${slot.name}}`, applyConjugationHiragana(slotValues[slot.name], chosenForms[slot.name] as VerbForm));
      if (vietnameseSentence) {
        vietnameseSentence = vietnameseSentence.replace(`{${slot.name}}`, slotValues[slot.name].meaning.split(',')[0].trim());
      }
    }

    const targetVocab = slotValues[targetSlotName];
    const targetConjugated = conjugatedSlotValues[targetSlotName];
    const targetHint = targetVocab.kanji || targetVocab.hiragana;
    const blankedSentence = sentence.replace(targetConjugated, '＿＿＿＿＿');

    if (!valid || !targetVocab || !targetSlotName) continue;

    // Duplicate Check Fingerprint
    const pType = shuffledTypes[questions.length % shuffledTypes.length] || 'fill_blank';
    const fingerprint = `${pType}-${sentence}`;
    if (usedFingerprints.has(fingerprint)) {
      continue;
    }
    usedFingerprints.add(fingerprint);

    const baseQuestion = {
      id: `${grammarRule.id}-${seed}-${questions.length}`,
      grammarId: grammarRule.id,
      explanation: `Dịch: ${vietnameseSentence}\nNgữ pháp: ${grammarRule.name}`
    };

    const generatorCtx = {
      baseQuestion,
      sentence,
      hiraganaSentence,
      vietnameseSentence,
      targetVocab,
      targetConjugated,
      targetHint,
      blankedSentence,
      grammarRule,
      rng,
      slotValues,
      conjugatedSlotValues,
      chosenForms,
      targetSlotName,
      template
    };

    switch (pType) {
      case 'multiple_choice': {
        const distractors = generateWrongAnswers(targetConjugated, targetVocab, grammarRule, rng);
        questions.push(generateMultipleChoiceQuestion(generatorCtx, distractors));
        break;
      }
      case 'fill_blank':
        questions.push(generateFillBlankQuestion(generatorCtx));
        break;
      case 'conjugation':
        questions.push(generateConjugationQuestion(generatorCtx));
        break;
      case 'sentence_ordering':
        questions.push(generateWordOrderQuestion(generatorCtx));
        break;
      case 'ja_to_vi':
        questions.push(generateJaToViQuestion(generatorCtx));
        break;
      case 'vi_to_ja':
        questions.push(generateViToJaQuestion(generatorCtx));
        break;
      case 'sentence_transformation':
        questions.push(generateTransformationQuestion(generatorCtx));
        break;
      case 'grammar_selection':
        questions.push(generateGrammarSelectionQuestion(generatorCtx));
        break;
      case 'free_writing':
        questions.push(generateFreeWritingQuestion(generatorCtx));
        break;
      case 'example':
        questions.push(generateExampleQuestion(generatorCtx));
        break;
      default:
        questions.push(generateFillBlankQuestion(generatorCtx));
    }
  }

  return {
    id: `set-${seed}-${Date.now()}`,
    seed,
    grammarId: grammarRule.id,
    questions
  };
};
