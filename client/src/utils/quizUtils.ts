import type { Question, QuestionAnswer } from '../types/quiz';

export function validateQuizData(questions: Question[], answers: QuestionAnswer[]) {
  const questionIds = new Set<string>();
  
  for (const q of questions) {
    if (questionIds.has(q.id)) {
      throw new Error(`Duplicate question id found: ${q.id}`);
    }
    questionIds.add(q.id);

    if (q.answers.length < 2) {
      throw new Error(`Question ${q.id} must have at least 2 answers`);
    }

    const answerIds = new Set<string>();
    for (const a of q.answers) {
      if (answerIds.has(a.id)) {
        throw new Error(`Duplicate answer id ${a.id} in question ${q.id}`);
      }
      answerIds.add(a.id);
    }
  }

  for (const a of answers) {
    if (!questionIds.has(a.questionId)) {
      throw new Error(`Answer references unknown questionId: ${a.questionId}`);
    }

    const question = questions.find(q => q.id === a.questionId);
    if (question) {
      const validAnswerIds = question.answers.map(ans => ans.id);
      if (!validAnswerIds.includes(a.correctAnswerId)) {
        throw new Error(`correctAnswerId "${a.correctAnswerId}" does not exist in question ${a.questionId}`);
      }
    }
  }

  // Ensure all questions have corresponding answers
  for (const q of questions) {
    const hasAnswer = answers.some(a => a.questionId === q.id);
    if (!hasAnswer) {
      throw new Error(`Question ${q.id} is missing answer data in answers.json`);
    }
  }
}

export type MergedQuestion = Question & {
  answerData: QuestionAnswer;
};

export function mergeQuizData(questions: Question[], answers: QuestionAnswer[]): MergedQuestion[] {
  return questions.map(q => {
    const answerData = answers.find(a => a.questionId === q.id);
    if (!answerData) {
      throw new Error(`Missing answer for question ${q.id}`);
    }
    return {
      ...q,
      answerData
    };
  });
}
