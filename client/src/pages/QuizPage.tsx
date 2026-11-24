import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QuizSetup } from '../components/quiz/QuizSetup';
import { QuizPlay } from '../components/quiz/QuizPlay';
import { useAuth } from '../context/auth-context';
import { useCurriculumSnapshot } from '../hooks/useCurriculumData';
import {
  findVocabTextbook,
  getUnitsForVocabTextbook,
  getPreferredVocabLevel,
} from '../data/vocabTextbooks';
import { getLiveUnitsForLevel } from '../services/curriculumStore';
import type { CmsSnapshot } from '../services/adminCmsService';
import { getStoredLastPracticeTarget } from '../services/lastPracticeService';
import type { JLPTLevel, QuizConfig, QuizSource } from '../types/quiz';

const VALID_LEVELS = new Set<JLPTLevel>(['N5', 'N4', 'N3', 'N2', 'N1']);
const VALID_SOURCES = new Set<QuizSource>(['all', 'starred', 'wrong']);

function buildAutoStartConfig(
  searchParams: URLSearchParams,
  userId: string | undefined,
  studyLevel: JLPTLevel | null,
  snapshot: CmsSnapshot,
): QuizConfig | null {
  if (searchParams.get('replay') === 'last') {
    const stored = getStoredLastPracticeTarget(userId);
    if (stored?.quizConfig) {
      return stored.quizConfig;
    }
  }

  if (searchParams.get('autoStart') !== '1' && searchParams.get('replay') !== 'last') {
    return null;
  }

  const rawLevel = (searchParams.get('level') || studyLevel || getPreferredVocabLevel(userId) || 'N3').toUpperCase() as JLPTLevel;
  const level: JLPTLevel = VALID_LEVELS.has(rawLevel) ? rawLevel : 'N3';
  const requestedBookId = searchParams.get('book');
  const requestedBook = findVocabTextbook(level, requestedBookId);
  if (requestedBookId && !requestedBook) return null;
  const units = requestedBook
    ? getUnitsForVocabTextbook(snapshot, level, requestedBook)
    : getLiveUnitsForLevel(snapshot, level);
  const requestedDbUnitId = searchParams.get('unitDbId') || undefined;
  const rawUnit = searchParams.get('unit');
  const requestedUnit = requestedDbUnitId
    ? units.find((unit) => unit.dbUnitId === requestedDbUnitId)
    : undefined;
  if (requestedDbUnitId && !requestedUnit) return null;
  let unitId: number | 'all' = requestedUnit?.id ?? units.find((u) => u.totalWords > 0)?.id ?? 1;
  let unitDbId = requestedUnit?.dbUnitId;

  if (rawUnit === 'all') {
    unitId = 'all';
    unitDbId = undefined;
  } else if (rawUnit && Number.isInteger(Number(rawUnit)) && Number(rawUnit) >= 1) {
    unitId = Number(rawUnit);
    unitDbId = requestedUnit?.dbUnitId;
  }

  const totalForUnit =
    unitId === 'all'
      ? units.reduce((sum, u) => sum + u.totalWords, 0)
      : (requestedUnit?.totalWords ?? units.find((u) => u.id === unitId)?.totalWords ?? 0);
  if (totalForUnit === 0) {
    return null;
  }

  const rawSource = searchParams.get('source') as QuizSource | null;
  const source: QuizSource = rawSource && VALID_SOURCES.has(rawSource) ? rawSource : 'all';
  const rawCount = Number(searchParams.get('count'));
  const questionCount: number | 'all' =
    source === 'wrong'
      ? 'all'
      : Number.isInteger(rawCount) && rawCount > 0
        ? rawCount
        : 10;

  const masteryMode = searchParams.get('mastery') === '1';
  const returnStageId = searchParams.get('stage')?.trim() || undefined;

  return {
    level,
    unitId,
    unitDbId,
    textbookId: requestedBook?.id,
    source,
    wordType: 'all',
    rangeType: 'fixed',
    questionCount,
    customRange: { start: 1, end: 20 },
    shuffleQuestions: true,
    shuffleAnswers: true,
    showHanVietHint: true,
    questionType: 'all',
    masteryMode,
    returnStageId,
  };
}

export const QuizPage: React.FC = () => {
  const { studyLevel, user } = useAuth();
  const cmsSnapshot = useCurriculumSnapshot();
  const [searchParams, setSearchParams] = useSearchParams();
  const [manualConfig, setManualConfig] = useState<QuizConfig | null>(null);
  const [dismissedAutoStart, setDismissedAutoStart] = useState(false);

  const retryAttemptId = searchParams.get('retryAttemptId')?.trim() || undefined;

  const autoConfig = useMemo(() => {
    if (dismissedAutoStart) return null;
    return buildAutoStartConfig(searchParams, user?.id, studyLevel, cmsSnapshot);
  }, [cmsSnapshot, dismissedAutoStart, searchParams, studyLevel, user?.id]);

  const activeConfig = manualConfig ?? autoConfig;

  const handleExit = () => {
    setManualConfig(null);
    setDismissedAutoStart(true);
    if (
      searchParams.has('replay') ||
      searchParams.has('autoStart') ||
      searchParams.has('retryAttemptId') ||
      searchParams.has('count')
    ) {
      const next = new URLSearchParams(searchParams);
      next.delete('replay');
      next.delete('autoStart');
      next.delete('retryAttemptId');
      next.delete('count');
      setSearchParams(next, { replace: true });
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {!activeConfig ? (
        <QuizSetup
          onStart={(nextConfig) => {
            setDismissedAutoStart(false);
            setManualConfig(nextConfig);
          }}
        />
      ) : (
        <QuizPlay config={activeConfig} retryAttemptId={retryAttemptId} onExit={handleExit} />
      )}
    </div>
  );
};
