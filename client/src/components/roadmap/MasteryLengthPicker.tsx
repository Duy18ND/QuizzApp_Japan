import React, { useState } from 'react';
import { Play, Trophy } from 'lucide-react';
import { MASTERY_LENGTH_OPTIONS } from '../../utils/stageBriefingBuilder';
import { Button, Card, Chip } from '../ui';

interface MasteryLengthPickerProps {
  stageNumber: number;
  /** Number of questions available for this stage */
  poolSize: number;
  isJumpMode: boolean;
  onStart: (count: number) => void;
}

/** Lets the learner choose 10 / 15 / 20 questions before the "Chốt Màn" test. */
export const MasteryLengthPicker: React.FC<MasteryLengthPickerProps> = ({
  stageNumber,
  poolSize,
  isJumpMode,
  onStart,
}) => {
  const options = MASTERY_LENGTH_OPTIONS.filter((n) => n <= poolSize);
  const [count, setCount] = useState<number>(
    options.includes(15) ? 15 : (options[options.length - 1] ?? poolSize),
  );

  return (
    <Card padding="lg" className="mx-auto max-w-md space-y-5 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-sakura-soft text-sakura">
        <Trophy className="size-6" aria-hidden />
      </span>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-fg">
          {isJumpMode ? `Thi nhảy cóc Màn ${stageNumber}` : `Chốt Màn ${stageNumber}`}
        </h1>
        <p className="text-sm text-muted">
          Trộn từ vựng, chữ Hán và ngữ pháp của Màn. Câu sai sẽ được hỏi lại cho tới khi đúng hết.
        </p>
      </div>

      {options.length > 1 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium text-fg">Chọn số câu</p>
          <div className="flex justify-center gap-2" role="group" aria-label="Số câu hỏi">
            {options.map((n) => (
              <Chip key={n} selected={count === n} onClick={() => setCount(n)}>
                {n} câu
              </Chip>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted">Màn này có {Math.min(poolSize, count)} câu hỏi.</p>
      )}

      <Button
        variant="primary"
        size="lg"
        fullWidth
        leftIcon={<Play className="size-4" aria-hidden />}
        onClick={() => onStart(Math.min(count, poolSize))}
      >
        Bắt đầu
      </Button>
    </Card>
  );
};
