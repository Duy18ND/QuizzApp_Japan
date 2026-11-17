import React from 'react';
import type {
  MultipleChoiceQuestion,
  PracticeQuestion,
  PracticeType,
  StarQuestion,
  WordOrderQuestion,
} from '../../types/grammar';
import { MultipleChoiceQuestionComp } from './MultipleChoiceQuestion';
import { WordOrderQuestionComp } from './WordOrderQuestion';
import { StarQuestionComp } from './StarQuestionComp';
import { TextEntryQuestion } from './TextEntryQuestion';

interface Props {
  mode: PracticeType;
  question: PracticeQuestion;
  onSubmit: (answer: string, isCorrect: boolean, feedbackMsg?: string) => void;
}

export const PracticeQuestionRenderer: React.FC<Props> = ({ mode, question, onSubmit }) => {
  const pType = question.type;

  switch (pType) {
    case 'multiple_choice':
    case 'grammar_selection':
      return (
        <MultipleChoiceQuestionComp
          key={question.id}
          mode={mode}
          question={question as MultipleChoiceQuestion}
          onSubmit={onSubmit}
        />
      );

    case 'sentence_ordering':
      return (
        <WordOrderQuestionComp
          key={question.id}
          mode={mode}
          question={question as WordOrderQuestion}
          onSubmit={onSubmit}
        />
      );

    case 'star_question':
      return (
        <StarQuestionComp
          key={question.id}
          mode={mode}
          question={question as StarQuestion}
          onSubmit={onSubmit}
        />
      );

    case 'example':
      return (
        <div className="rounded-xl border border-line bg-primary-soft p-5 text-fg">
          <p lang="ja" className="text-lg font-medium">
            {question.question}
          </p>
          <p lang="ja" className="mt-2 text-sm text-muted">
            {question.correctAnswer}
          </p>
        </div>
      );

    case 'fill_blank':
    case 'conjugation':
    case 'ja_to_vi':
    case 'vi_to_ja':
    case 'sentence_transformation':
    case 'free_writing':
    case 'text_input':
    default:
      return (
        <TextEntryQuestion
          key={question.id}
          mode={mode}
          question={question}
          onSubmit={onSubmit}
        />
      );
  }
};
