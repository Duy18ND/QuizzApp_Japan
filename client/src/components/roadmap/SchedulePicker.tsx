import React from 'react';
import { Chip, Field, Input } from '../ui';
import { cn } from '../../lib/cn';
import { ALL_DAYS_ORDERED } from '../../services/notificationService';
import { DAILY_PACE_PRESETS, type DailyMinutesTarget } from '../../services/stageRoadmapService';

const DAY_PRESETS = [
  { label: 'Cả tuần', days: [1, 2, 3, 4, 5, 6, 0] },
  { label: 'T2–T6', days: [1, 2, 3, 4, 5] },
  { label: 'T2·T4·T6', days: [1, 3, 5] },
];

const sameDays = (a: number[], b: number[]) => a.length === b.length && a.every((d) => b.includes(d));

interface SchedulePickerProps {
  /** Prefix for input ids (two pickers may exist on one page) */
  idPrefix: string;
  minutes: DailyMinutesTarget;
  onMinutesChange: (minutes: DailyMinutesTarget, recommendedStages: number) => void;
  /** Show "N buổi" under each pace; off for hand-built plans whose session count is fixed */
  showStageCount?: boolean;
  startDate: string;
  onStartDateChange: (date: string) => void;
  weekdays: number[];
  onWeekdaysChange: (days: number[]) => void;
}

/** Minutes per day, start date and study days — shared by roadmap creation and settings. */
export const SchedulePicker: React.FC<SchedulePickerProps> = ({
  idPrefix,
  minutes,
  onMinutesChange,
  showStageCount = true,
  startDate,
  onStartDateChange,
  weekdays,
  onWeekdaysChange,
}) => (
  <div className="space-y-4">
    <div className="space-y-1.5">
      <span className="text-sm font-semibold text-fg">Phút mỗi ngày</span>
      <div className="grid grid-cols-5 gap-1.5">
        {DAILY_PACE_PRESETS.map((preset) => {
          const selected = minutes === preset.minutes;
          return (
            <button
              key={preset.minutes}
              type="button"
              aria-pressed={selected}
              onClick={() => onMinutesChange(preset.minutes, preset.stages)}
              className={cn(
                'flex cursor-pointer flex-col items-center rounded-lg border py-2 transition-colors',
                selected
                  ? 'border-primary bg-primary-soft text-primary-fg'
                  : 'border-line bg-surface-2/60 text-fg hover:border-primary/60',
              )}
            >
              <span className="text-sm font-bold tabular">{preset.minutes}p</span>
              {showStageCount && <span className="text-[11px] text-muted tabular">{preset.stages} buổi</span>}
            </button>
          );
        })}
      </div>
    </div>

    <Field label="Ngày bắt đầu" htmlFor={`${idPrefix}-start`}>
      <Input
        id={`${idPrefix}-start`}
        type="date"
        value={startDate}
        onChange={(e) => e.target.value && onStartDateChange(e.target.value)}
      />
    </Field>

    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-fg">Ngày học</span>
        <div className="flex gap-1">
          {DAY_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              aria-pressed={sameDays(preset.days, weekdays)}
              onClick={() => onWeekdaysChange([...preset.days])}
              className={cn(
                'cursor-pointer rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
                sameDays(preset.days, weekdays)
                  ? 'bg-primary-soft text-primary-fg'
                  : 'text-muted hover:text-primary-fg',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {ALL_DAYS_ORDERED.map((d) => {
          const active = weekdays.includes(d.day);
          return (
            <Chip
              key={d.day}
              selected={active}
              className="justify-center px-0"
              onClick={() => {
                const next = active ? weekdays.filter((x) => x !== d.day) : [...weekdays, d.day];
                // at least one study day must stay selected
                if (next.length > 0) onWeekdaysChange(next);
              }}
            >
              {d.shortLabel}
            </Chip>
          );
        })}
      </div>
    </div>
  </div>
);
