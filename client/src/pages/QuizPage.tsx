import React, { useState } from 'react';
import { QuizSetup } from '../components/quiz/QuizSetup';
import type { QuizConfig } from '../types/quiz';
import { QuizPlay } from '../components/quiz/QuizPlay';

export const QuizPage: React.FC = () => {
  const [config, setConfig] = useState<QuizConfig | null>(null);

  return (
    <div className="w-full h-full flex flex-col">
      {!config ? (
        <QuizSetup onStart={setConfig} />
      ) : (
        <QuizPlay config={config} onExit={() => setConfig(null)} />
      )}
    </div>
  );
};
