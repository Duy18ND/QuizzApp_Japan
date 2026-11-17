import React from 'react';
import { JapaneseLookupButton } from './common/JapaneseLookupPopover';
import { Card } from './ui/Layout';

interface QuestionCardProps {
  question: string;
  hanViet?: string;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, hanViet }) => {
  return (
    <Card padding="lg" className="relative mb-4 text-center">
      <div className="absolute top-3 right-3">
        <JapaneseLookupButton text={question} />
      </div>
      <h2 lang="ja" className="jp px-6 text-2xl leading-snug font-bold break-words text-fg md:text-4xl">
        {question}
      </h2>
      {hanViet && (
        <p className="mt-2 text-xs font-semibold tracking-widest text-muted uppercase md:text-sm">
          {hanViet}
        </p>
      )}
    </Card>
  );
};
