import React, { useState } from 'react';
import type { PracticeQuestion, PracticeType } from '../../types/grammar';
import {
  resolveQuestionTargetPatterns,
  validateAnswer,
} from '../../utils/grammarEngine/answerValidator';
import { Button, Field, Textarea } from '../ui';

interface TextEntryProps {
  mode: PracticeType;
  question: PracticeQuestion;
  onSubmit: (answer: string, isCorrect: boolean, feedbackMsg?: string) => void;
}

export const TextEntryQuestion: React.FC<TextEntryProps> = ({ mode, question, onSubmit }) => {
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;
    const expected = (question.correctAnswer ?? '') as string | string[];
    const targetPatterns = resolveQuestionTargetPatterns(question);
    const result = validateAnswer(answer.trim(), expected, mode, targetPatterns);
    onSubmit(answer.trim(), result.isCorrect, result.feedbackMessage);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        {question.instruction && (
          <p className="text-sm font-semibold text-primary-fg">{question.instruction}</p>
        )}
        <h3 lang="ja" className="text-lg leading-relaxed font-medium whitespace-pre-wrap text-fg md:text-xl">
          {question.question}
        </h3>
      </div>

      <Field label="Câu trả lời" htmlFor={`text-entry-${question.id}`}>
        <Textarea
          id={`text-entry-${question.id}`}
          lang="ja"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          rows={3}
          placeholder="Nhập câu trả lời của bạn..."
          autoFocus
        />
      </Field>

      <Button type="submit" variant="primary" size="lg" fullWidth disabled={!answer.trim()}>
        Kiểm tra
      </Button>
    </form>
  );
};
