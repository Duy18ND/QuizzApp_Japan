import React from 'react';
import { ProgressBar as UiProgressBar } from './ui/Feedback';

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  return <UiProgressBar value={current} max={total} label="Tiến độ bài làm" className="mb-4" />;
};
