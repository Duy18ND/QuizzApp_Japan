import React from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Kbd } from './ui/Layout';

interface QuizNavigationProps {
  onBack: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  canGoNext: boolean;
}

export const QuizNavigation: React.FC<QuizNavigationProps> = ({
  onBack,
  onNext,
  isFirst,
  isLast,
  canGoNext,
}) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button
        variant="secondary"
        size="lg"
        onClick={onBack}
        disabled={isFirst}
        leftIcon={<ArrowLeft className="size-4" aria-hidden />}
        className="flex-1 md:flex-none"
      >
        Quay lại
        <Kbd className="hidden md:inline-flex">←</Kbd>
      </Button>

      <Button
        variant="primary"
        size="lg"
        onClick={onNext}
        disabled={!canGoNext}
        rightIcon={
          isLast ? <Check className="size-4" aria-hidden /> : <ArrowRight className="size-4" aria-hidden />
        }
        className="flex-1 md:flex-none"
      >
        {isLast ? 'Hoàn thành' : 'Tiếp theo'}
        <Kbd className="hidden border-transparent bg-surface/20 text-on-primary md:inline-flex">Enter</Kbd>
      </Button>
    </div>
  );
};
