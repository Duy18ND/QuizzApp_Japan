import { generateSmartQuestionSet } from './client/src/utils/grammarEngine/questionGenerator';
import { shinkanzenN3Lesson01 } from './client/src/data/grammar/shinkanzen-n3/lesson01';
import { shuffleArray } from './client/src/utils/shuffle';
import { unit1Data } from './client/src/data/n3/unit1';

const rulesToPractice = shinkanzenN3Lesson01;
const questionCount = 20;
let allQuestions = [];
const currentSeed = Date.now();
const mode = 'mixed';

rulesToPractice.forEach((rule, index) => {
  const countPerRule = Math.max(4, Math.ceil(questionCount / rulesToPractice.length));
  const questionSet = generateSmartQuestionSet({
    grammarRule: rule,
    count: countPerRule,
    seed: currentSeed + index,
    rawVocabulary: unit1Data,
    requestedPracticeTypes: ['sentence_ordering', 'star_question', 'fill_blank', 'multiple_choice'],
  });
  allQuestions = [...allQuestions, ...questionSet.questions];
});

let shuffled = shuffleArray([...allQuestions]);
shuffled = shuffled.slice(0, 20);

console.log("Total generated:", allQuestions.length);
console.log("Sliced length:", shuffled.length);

const counts = {};
shuffled.forEach(q => {
  counts[q.grammarId] = (counts[q.grammarId] || 0) + 1;
});
console.log("Grammar distribution in final 20:", counts);
