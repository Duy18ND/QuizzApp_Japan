import React from 'react';
import type { PracticeQuestion, PracticeType } from '../../types/grammar';
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
  // We use question.type to determine which component to render, 
  // overriding the generic page mode. This ensures correct rendering
  // in 'mixed' mode or when types are dynamically selected.
  const pType = question.type;

  switch (pType) {
    case 'multiple_choice':
    case 'grammar_selection':
      return (
        <MultipleChoiceQuestionComp 
          mode={mode} 
          question={question as any} 
          onSubmit={onSubmit} 
        />
      );
    
    case 'sentence_ordering':
      return (
        <WordOrderQuestionComp 
          mode={mode} 
          question={question as any} 
          onSubmit={onSubmit} 
        />
      );

    case 'star_question':
      return (
        <StarQuestionComp 
          mode={mode} 
          question={question as any} 
          onSubmit={onSubmit} 
        />
      );
    
    case 'example':
      // Example questions are generally handled by GrammarLesson, but in case they fall through:
      return (
        <div className="p-6 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-lg">
          <p className="font-medium text-lg">{question.question}</p>
          <p className="text-sm mt-2">{question.correctAnswer}</p>
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
          mode={mode} 
          question={question} 
          onSubmit={onSubmit} 
        />
      );
  }
};
