import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, Pause, Play, RotateCcw, Star, XCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Chip,
  Notice,
  ProgressBar,
  Stat,
  Tabs,
  type TabItem,
} from '../ui';
import {
  JLPT_MODULES,
  REAL_JLPT_EXAM_PRESETS,
  toStarQuestionShape,
  type JLPTLevelFilter,
  type RealJlptExamPreset,
} from '../../data/jlpt/jlptDataset';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import {
  getLiveJlptListeningItems,
  getLiveJlptMcqQuestions,
  getLiveJlptReadingPassages,
  getLiveJlptStarQuestions,
} from '../../services/curriculumStore';
import { useAuth } from '../../context/auth-context';
import { clearAttemptMistakeGroup } from '../../services/attemptMistakeService';
import { recordQuizAttempt } from '../../services/quizHistoryService';
import { shuffleArray } from '../../utils/shuffle';
import { StarQuestionComp } from '../practice/StarQuestionComp';
import { AudioSpeechPlayer, ListeningTranscriptPanel } from './AudioSpeechPlayer';
import { JlptReadingView, type JlptMistakePayload } from './JlptReadingView';
import { McqQuestionBlock } from './McqQuestionBlock';

type ExamSectionId = 's1' | 's2' | 's3' | 's4';

interface JlptFullTestViewProps {
  levelFilter: JLPTLevelFilter;
  retryAttemptId?: string;
  onRecordMistake: (payload: JlptMistakePayload) => void;
}

const DEFAULT_DURATION_SECONDS = 35 * 60;

function pickDeterministicSlice<T>(items: T[], count: number, seedOffset: number): T[] {
  if (items.length === 0 || count <= 0) return [];
  const start = (seedOffset * count) % items.length;
  const picked: T[] = [];
  const limit = Math.min(count, items.length);
  for (let i = 0; i < limit; i += 1) {
    picked.push(items[(start + i) % items.length]);
  }
  return picked;
}

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const JlptFullTestView: React.FC<JlptFullTestViewProps> = ({
  levelFilter,
  retryAttemptId,
  onRecordMistake,
}) => {
  const [attemptKey, setAttemptKey] = useState(0);
  const availablePresets = useMemo(
    () =>
      levelFilter === 'ALL'
        ? REAL_JLPT_EXAM_PRESETS
        : REAL_JLPT_EXAM_PRESETS.filter((p) => p.level === levelFilter),
    [levelFilter],
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>('auto');
  const activePreset: RealJlptExamPreset | null = useMemo(() => {
    if (selectedPresetId === 'random') return null;
    const explicit = availablePresets.find((p) => p.id === selectedPresetId);
    return explicit ?? availablePresets[0] ?? null;
  }, [availablePresets, selectedPresetId]);

  return (
    <div className="space-y-4">
      {/* Official Real-Format JLPT Exam Selector */}
      <Card padding="md" className="space-y-3 border-primary/40">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold tracking-wide text-primary-fg uppercase">
              🏆 Bộ Đề Thi JLPT Chuẩn Cấu Trúc Thật ({levelFilter === 'ALL' ? 'N5 · N4 · N3' : levelFilter})
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {activePreset
                ? activePreset.description
                : 'Chế độ đề trộn ngẫu nhiên: rút mới toàn bộ 4 phần thi mỗi khi bấm Tạo đề mới.'}
            </p>
          </div>
          {activePreset && (
            <Badge tone="sakura">
              Đậu ≥ {activePreset.passScore}/180 điểm · {activePreset.durationMinutes} phút
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {availablePresets.map((preset) => (
            <Chip
              key={preset.id}
              selected={activePreset?.id === preset.id}
              onClick={() => {
                setSelectedPresetId(preset.id);
                setAttemptKey((k) => k + 1);
              }}
            >
              {preset.level} · {preset.sessionLabel}
            </Chip>
          ))}
          <Chip
            selected={activePreset === null}
            onClick={() => {
              setSelectedPresetId('random');
              setAttemptKey((k) => k + 1);
            }}
          >
            🔀 Đề trộn ngẫu nhiên
          </Chip>
        </div>
      </Card>

      <JlptFullTestSession
        key={`${levelFilter}-${activePreset?.id ?? 'random'}-${attemptKey}`}
        levelFilter={activePreset ? activePreset.level : levelFilter}
        preset={activePreset}
        attemptKey={attemptKey}
        retryAttemptId={retryAttemptId}
        onNewAttempt={() => setAttemptKey((k) => k + 1)}
        onRecordMistake={onRecordMistake}
      />
    </div>
  );
};

interface JlptFullTestSessionProps {
  levelFilter: JLPTLevelFilter;
  preset: RealJlptExamPreset | null;
  attemptKey: number;
  retryAttemptId?: string;
  onNewAttempt: () => void;
  onRecordMistake: (payload: JlptMistakePayload) => void;
}

const JlptFullTestSession: React.FC<JlptFullTestSessionProps> = ({
  levelFilter,
  preset,
  attemptKey,
  retryAttemptId,
  onNewAttempt,
  onRecordMistake,
}) => {
  const { user } = useAuth();
  const cmsSnapshot = useCurriculumSnapshot();
  const initialDurationSeconds = preset ? preset.durationMinutes * 60 : DEFAULT_DURATION_SECONDS;
  const [activeSection, setActiveSection] = useState<ExamSectionId>('s1');
  const [secondsLeft, setSecondsLeft] = useState(initialDurationSeconds);
  const [timerPaused, setTimerPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [starAnswers, setStarAnswers] = useState<
    Record<string, { answer: string; isCorrect: boolean }>
  >({});
  const [showListeningTranscript, setShowListeningTranscript] = useState<Record<string, boolean>>({});
  const [showTranscriptFurigana, setShowTranscriptFurigana] = useState(true);
  const [activeListeningLines, setActiveListeningLines] = useState<Record<string, number | null>>({});
  const [playLineRequests, setPlayLineRequests] = useState<
    Record<string, { idx: number; nonce: number }>
  >({});

  const examSet = useMemo(() => {
    void attemptKey;
    const allKanji = getLiveJlptMcqQuestions(cmsSnapshot, 'kanji', levelFilter);
    const allVocab = getLiveJlptMcqQuestions(cmsSnapshot, 'vocab', levelFilter);
    const allGrammar = getLiveJlptMcqQuestions(cmsSnapshot, 'grammar', levelFilter);
    const allStar = getLiveJlptStarQuestions(cmsSnapshot, levelFilter);
    const shortReadings = getLiveJlptReadingPassages(cmsSnapshot, 'reading-short', levelFilter);
    const mediumReadings = getLiveJlptReadingPassages(cmsSnapshot, 'reading-medium', levelFilter);
    const longReadings = getLiveJlptReadingPassages(cmsSnapshot, 'reading-long', levelFilter);
    const allListening = getLiveJlptListeningItems(cmsSnapshot, levelFilter);

    if (preset) {
      const seed = preset.seedOffset;
      const kanjiPool = pickDeterministicSlice(allKanji, 5, seed);
      const vocabPool = pickDeterministicSlice(allVocab, 5, seed);
      const grammarPool = pickDeterministicSlice(allGrammar, 5, seed);
      const starPool = pickDeterministicSlice(allStar, 3, seed);
      const readingPassages = [
        ...pickDeterministicSlice(shortReadings, 1, seed),
        ...pickDeterministicSlice(mediumReadings, 1, seed),
        ...pickDeterministicSlice(longReadings, 1, seed),
      ];
      const listeningItems = pickDeterministicSlice(allListening, 5, seed);

      return {
        s1: [...kanjiPool, ...vocabPool],
        grammarMcqs: grammarPool,
        starItems: starPool,
        readingPassages,
        listeningItems,
      };
    }

    const kanjiPool = shuffleArray(allKanji).slice(0, 5);
    const vocabPool = shuffleArray(allVocab).slice(0, 5);
    const grammarPool = shuffleArray(allGrammar).slice(0, 5);
    const starPool = shuffleArray(allStar).slice(0, 3);
    const readingPassages = [
      ...shuffleArray(shortReadings).slice(0, 1),
      ...shuffleArray(mediumReadings).slice(0, 1),
      ...shuffleArray(longReadings).slice(0, 1),
    ];
    const listeningItems = shuffleArray(allListening).slice(0, 5);

    return {
      s1: [...kanjiPool, ...vocabPool],
      grammarMcqs: grammarPool,
      starItems: starPool,
      readingPassages,
      listeningItems,
    };
  }, [cmsSnapshot, levelFilter, preset, attemptKey]);

  const readingQuestions = useMemo(
    () => examSet.readingPassages.flatMap((p) => p.questions.map((q) => ({ passage: p, question: q }))),
    [examSet.readingPassages],
  );

  const totalQuestions =
    examSet.s1.length +
    examSet.grammarMcqs.length +
    examSet.starItems.length +
    readingQuestions.length +
    examSet.listeningItems.length;

  const answeredCount =
    examSet.s1.filter((q) => mcqAnswers[q.id] !== undefined).length +
    examSet.grammarMcqs.filter((q) => mcqAnswers[q.id] !== undefined).length +
    examSet.starItems.filter((q) => starAnswers[q.id] !== undefined).length +
    readingQuestions.filter(({ question }) => mcqAnswers[question.id] !== undefined).length +
    examSet.listeningItems.filter((q) => mcqAnswers[q.id] !== undefined).length;

  const handleSubmitExam = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    setTimerPaused(true);

    const meta = JLPT_MODULES['full-test'];
    const sessionMistakeSummary: Array<Record<string, unknown>> = [];
    const fullTestPath = `/jlpt/full-test${levelFilter !== 'ALL' ? `?level=${levelFilter}` : ''}`;

    [...examSet.s1, ...examSet.grammarMcqs].forEach((q, idx) => {
      const chosen = mcqAnswers[q.id];
      if (chosen !== undefined && chosen !== q.correctIndex) {
        const entry = {
          id: `${meta.mistakeGrammarId}_${q.id}_${idx}`,
          grammarId: meta.mistakeGrammarId,
          questionId: q.id,
          prompt: q.prompt,
          userAnswer: q.options[chosen],
          correctAnswer: q.options[q.correctIndex],
          explanation: q.explanation,
          options: [...q.options],
          level: q.level,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
        };
        sessionMistakeSummary.push(entry);
        onRecordMistake({
          grammarId: meta.mistakeGrammarId,
          questionId: q.id,
          userAnswer: q.options[chosen],
          correctAnswer: q.options[q.correctIndex],
          errorType: meta.errorType,
          prompt: q.prompt,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
          explanation: q.explanation,
          level: q.level,
          options: [...q.options],
        });
      }
    });

    examSet.starItems.forEach((item, idx) => {
      const chosen = starAnswers[item.id];
      if (chosen && !chosen.isCorrect) {
        const entry = {
          id: `${meta.mistakeGrammarId}_star_${item.id}_${idx}`,
          grammarId: meta.mistakeGrammarId,
          questionId: item.id,
          prompt: item.fullSentence,
          userAnswer: chosen.answer || '(chưa hoàn thành)',
          correctAnswer: item.correctAnswer,
          explanation: item.explanation,
          level: item.level,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
        };
        sessionMistakeSummary.push(entry);
        onRecordMistake({
          grammarId: meta.mistakeGrammarId,
          questionId: item.id,
          userAnswer: chosen.answer || '(chưa hoàn thành)',
          correctAnswer: item.correctAnswer,
          errorType: 'wrong_word_order',
          prompt: item.fullSentence,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
          explanation: item.explanation,
          level: item.level,
        });
      }
    });

    readingQuestions.forEach(({ passage, question }, idx) => {
      const chosen = mcqAnswers[question.id];
      if (chosen !== undefined && chosen !== question.correctIndex) {
        const entry = {
          id: `${meta.mistakeGrammarId}_read_${question.id}_${idx}`,
          grammarId: meta.mistakeGrammarId,
          questionId: question.id,
          prompt: `[${passage.title}] ${question.prompt}`,
          userAnswer: question.options[chosen],
          correctAnswer: question.options[question.correctIndex],
          explanation: question.explanation,
          options: [...question.options],
          level: passage.level,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
        };
        sessionMistakeSummary.push(entry);
        onRecordMistake({
          grammarId: meta.mistakeGrammarId,
          questionId: question.id,
          userAnswer: question.options[chosen],
          correctAnswer: question.options[question.correctIndex],
          errorType: meta.errorType,
          prompt: `[${passage.title}] ${question.prompt}`,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
          explanation: question.explanation,
          level: passage.level,
          options: [...question.options],
        });
      }
    });

    examSet.listeningItems.forEach((item, idx) => {
      const chosen = mcqAnswers[item.id];
      if (chosen !== undefined && chosen !== item.correctIndex) {
        const entry = {
          id: `${meta.mistakeGrammarId}_lis_${item.id}_${idx}`,
          grammarId: meta.mistakeGrammarId,
          questionId: item.id,
          prompt: `${item.situation} — ${item.questionPrompt}`,
          userAnswer: item.options[chosen],
          correctAnswer: item.options[item.correctIndex],
          explanation: item.explanation,
          options: [...item.options],
          level: item.level,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
        };
        sessionMistakeSummary.push(entry);
        onRecordMistake({
          grammarId: meta.mistakeGrammarId,
          questionId: item.id,
          userAnswer: item.options[chosen],
          correctAnswer: item.options[item.correctIndex],
          errorType: meta.errorType,
          prompt: `${item.situation} — ${item.questionPrompt}`,
          categoryLabel: meta.categoryLabel,
          practicePath: fullTestPath,
          explanation: item.explanation,
          level: item.level,
          options: [...item.options],
        });
      }
    });

    const totalCorrect =
      examSet.s1.filter((q) => mcqAnswers[q.id] === q.correctIndex).length +
      examSet.grammarMcqs.filter((q) => mcqAnswers[q.id] === q.correctIndex).length +
      examSet.starItems.filter((item) => starAnswers[item.id]?.isCorrect).length +
      readingQuestions.filter(({ question }) => mcqAnswers[question.id] === question.correctIndex).length +
      examSet.listeningItems.filter((item) => mcqAnswers[item.id] === item.correctIndex).length;

    void recordQuizAttempt(
      {
        quizType: 'jlpt-full',
        level: levelFilter,
        score: totalCorrect,
        totalQuestions: Math.max(1, totalQuestions),
        durationSeconds: Math.max(1, initialDurationSeconds - secondsLeft),
        mistakesJson: sessionMistakeSummary,
      },
      user?.id,
    ).then(() => {
      if (retryAttemptId) {
        clearAttemptMistakeGroup(retryAttemptId, user?.id);
      }
    });
  }, [
    examSet,
    initialDurationSeconds,
    levelFilter,
    mcqAnswers,
    onRecordMistake,
    readingQuestions,
    retryAttemptId,
    secondsLeft,
    starAnswers,
    submitted,
    totalQuestions,
    user?.id,
  ]);

  const submitRef = useRef(handleSubmitExam);
  useEffect(() => {
    submitRef.current = handleSubmitExam;
  }, [handleSubmitExam]);

  useEffect(() => {
    if (submitted || timerPaused) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.setTimeout(() => submitRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [submitted, timerPaused]);

  const sectionScores = useMemo(() => {
    const s1Correct = examSet.s1.filter((q) => mcqAnswers[q.id] === q.correctIndex).length;
    const s2GrammarCorrect = examSet.grammarMcqs.filter((q) => mcqAnswers[q.id] === q.correctIndex).length;
    const s2StarCorrect = examSet.starItems.filter((item) => starAnswers[item.id]?.isCorrect).length;
    const s2Correct = s2GrammarCorrect + s2StarCorrect;
    const s2Total = examSet.grammarMcqs.length + examSet.starItems.length;
    const s3Correct = readingQuestions.filter(({ question }) => mcqAnswers[question.id] === question.correctIndex).length;
    const s4Correct = examSet.listeningItems.filter((item) => mcqAnswers[item.id] === item.correctIndex).length;

    const totalCorrect = s1Correct + s2Correct + s3Correct + s4Correct;
    return {
      s1: { correct: s1Correct, total: examSet.s1.length },
      s2: { correct: s2Correct, total: s2Total },
      s3: { correct: s3Correct, total: readingQuestions.length },
      s4: { correct: s4Correct, total: examSet.listeningItems.length },
      totalCorrect,
      totalQuestions,
    };
  }, [examSet, mcqAnswers, readingQuestions, starAnswers, totalQuestions]);

  const tabItems: TabItem<ExamSectionId>[] = [
    { value: 's1', label: `1. Chữ Hán & Từ vựng (${examSet.s1.length})` },
    { value: 's2', label: `2. Ngữ pháp & Hái sao (${examSet.grammarMcqs.length + examSet.starItems.length})` },
    { value: 's3', label: `3. Đọc hiểu (${readingQuestions.length})` },
    { value: 's4', label: `4. Nghe hiểu (${examSet.listeningItems.length})` },
  ];

  const accuracyPct =
    totalQuestions > 0 ? Math.round((sectionScores.totalCorrect / totalQuestions) * 100) : 0;

  // Official JLPT 180-point scaled score calculation
  const jlptScaled = useMemo(() => {
    const langTotal = Math.max(1, sectionScores.s1.total + sectionScores.s2.total);
    const langCorrect = sectionScores.s1.correct + sectionScores.s2.correct;
    const langScore = Math.round((langCorrect / langTotal) * 60);
    const readScore =
      sectionScores.s3.total > 0
        ? Math.round((sectionScores.s3.correct / sectionScores.s3.total) * 60)
        : 0;
    const listenScore =
      sectionScores.s4.total > 0
        ? Math.round((sectionScores.s4.correct / sectionScores.s4.total) * 60)
        : 0;
    const total180 = langScore + readScore + listenScore;
    const passThreshold = preset?.passScore ?? (levelFilter === 'N5' ? 80 : levelFilter === 'N4' ? 90 : 95);
    const passedCutoffs =
      levelFilter === 'N3'
        ? langScore >= 19 && readScore >= 19 && listenScore >= 19
        : langScore + readScore >= 38 && listenScore >= 19;
    const isPassed = total180 >= passThreshold && passedCutoffs;
    return { langScore, readScore, listenScore, total180, passThreshold, passedCutoffs, isPassed };
  }, [levelFilter, preset?.passScore, sectionScores]);

  return (
    <div className="space-y-6">
      <Card padding="md" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-line bg-surface-2 px-3 py-1.5">
              <Clock
                className={secondsLeft <= 120 ? 'size-4 text-danger-fg' : 'size-4 text-primary-fg'}
                aria-hidden
              />
              <span
                className={
                  secondsLeft <= 120
                    ? 'tabular font-mono text-base font-bold text-danger-fg'
                    : 'tabular font-mono text-base font-bold text-fg'
                }
              >
                {formatTimer(secondsLeft)}
              </span>
            </div>

            {!submitted && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={timerPaused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
                onClick={() => setTimerPaused((p) => !p)}
              >
                {timerPaused ? 'Tiếp tục giờ' : 'Tạm dừng'}
              </Button>
            )}

            <p className="text-sm text-muted tabular">
              Đã làm: <span className="font-semibold text-fg">{answeredCount}/{totalQuestions}</span> câu
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="size-4" aria-hidden />}
              onClick={onNewAttempt}
            >
              Tạo đề mới
            </Button>

            {!submitted && (
              <Button variant="primary" size="md" onClick={handleSubmitExam}>
                Nộp bài & Chấm điểm
              </Button>
            )}
          </div>
        </div>

        <ProgressBar
          value={submitted ? sectionScores.totalCorrect : answeredCount}
          max={totalQuestions}
          tone={submitted ? (accuracyPct >= 60 ? 'success' : 'danger') : 'primary'}
          label="Tiến độ bài thi JLPT"
          size="sm"
        />
      </Card>

      {submitted && (
        <Card padding="lg" className="space-y-5 border-primary">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wide text-primary-fg uppercase">
                Kết quả {preset ? preset.title : `thi thử JLPT (${levelFilter === 'ALL' ? 'Tổng hợp' : levelFilter})`}
              </p>
              <h2 className="mt-1 text-2xl font-bold text-fg tabular">
                {jlptScaled.total180} / 180 điểm · ({sectionScores.totalCorrect}/{sectionScores.totalQuestions} câu đúng · {accuracyPct}%)
              </h2>
              <p className="mt-0.5 text-xs text-muted">
                Ngưỡng đậu chuẩn JLPT: ≥ {jlptScaled.passThreshold}/180 điểm &amp; không dính điểm liệt phần Nghe (≥ 19/60).
              </p>
            </div>
            <Badge tone={jlptScaled.isPassed ? 'success' : 'warning'}>
              {jlptScaled.isPassed ? '🎉 ĐẠT CHUẨN JLPT (合格)' : 'Chưa đạt (不合格) — Cần ôn lại'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat
              label="Kiến thức ngôn ngữ"
              value={`${jlptScaled.langScore}/60đ`}
              hint={`${sectionScores.s1.correct + sectionScores.s2.correct}/${sectionScores.s1.total + sectionScores.s2.total} câu`}
            />
            <Stat
              label="Đọc hiểu (Dokkai)"
              value={`${jlptScaled.readScore}/60đ`}
              hint={`${sectionScores.s3.correct}/${sectionScores.s3.total} câu`}
            />
            <Stat
              label="Nghe hiểu (Choukai)"
              value={`${jlptScaled.listenScore}/60đ`}
              hint={`${sectionScores.s4.correct}/${sectionScores.s4.total} câu`}
            />
            <Stat
              label="Tổng điểm quy đổi"
              value={`${jlptScaled.total180}/180`}
              hint={`Cần ≥ ${jlptScaled.passThreshold}đ`}
            />
          </div>

          <Notice tone="info" title="Các câu trả lời sai đã được lưu tự động">
            Bạn có thể xem đáp án và giải thích chi tiết ngay bên dưới từng phần, hoặc mở mục Ôn tập lỗi sai từ Trang chủ.
          </Notice>
        </Card>
      )}

      <div className="rounded-xl border border-line bg-glass px-3 py-1.5 shadow-card backdrop-blur-md">
        <Tabs
          items={tabItems}
          value={activeSection}
          onChange={setActiveSection}
          variant="pill"
          aria-label="Các phần trong đề thi JLPT"
          className="gap-1.5"
        />
      </div>

      {activeSection === 's1' && (
        <div className="space-y-4">
          {examSet.s1.map((q, idx) => (
            <Card key={q.id} padding="lg" className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge tone="neutral">Câu {idx + 1}</Badge>
              </div>
              <McqQuestionBlock
                prompt={q.prompt}
                options={q.options}
                selectedIndex={mcqAnswers[q.id] ?? null}
                correctIndex={q.correctIndex}
                revealResult={submitted}
                locked={submitted}
                explanation={q.explanation}
                levelLabel={q.level}
                mondaiLabel={q.mondaiLabel}
                onSelect={(optIdx) => {
                  if (submitted) return;
                  setMcqAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                }}
              />
            </Card>
          ))}
        </div>
      )}

      {activeSection === 's2' && (
        <div className="space-y-5">
          {examSet.grammarMcqs.map((q, idx) => (
            <Card key={q.id} padding="lg" className="space-y-3">
              <Badge tone="neutral">Câu {idx + 1}</Badge>
              <McqQuestionBlock
                prompt={q.prompt}
                options={q.options}
                selectedIndex={mcqAnswers[q.id] ?? null}
                correctIndex={q.correctIndex}
                revealResult={submitted}
                locked={submitted}
                explanation={q.explanation}
                levelLabel={q.level}
                mondaiLabel={q.mondaiLabel}
                onSelect={(optIdx) => {
                  if (submitted) return;
                  setMcqAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
                }}
              />
            </Card>
          ))}

          {examSet.starItems.map((item, idx) => {
            const saved = starAnswers[item.id];
            return (
              <Card key={item.id} padding="lg" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">Câu {examSet.grammarMcqs.length + idx + 1}</Badge>
                    <Badge tone="primary">{item.level}</Badge>
                    <Badge tone="warning">
                      <Star className="size-3 fill-current" aria-hidden />
                      Mondai ★
                    </Badge>
                  </div>

                  {saved && !submitted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setStarAnswers((prev) => {
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        })
                      }
                    >
                      Xếp lại
                    </Button>
                  )}
                </div>

                {!saved && !submitted ? (
                  <StarQuestionComp
                    key={`${item.id}-${attemptKey}`}
                    mode="star_question"
                    question={toStarQuestionShape(item)}
                    submitLabel="Chốt đáp án ★"
                    onSubmit={(answer, isCorrect) => {
                      setStarAnswers((prev) => ({
                        ...prev,
                        [item.id]: { answer, isCorrect },
                      }));
                    }}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-line bg-surface-2 p-4">
                      <p className="text-xs font-semibold text-muted uppercase">Đáp án ★ bạn đã chọn</p>
                      <p lang="ja" className="mt-1 text-lg font-bold text-primary-fg">
                        {saved?.answer || '(Chưa chọn)'}
                      </p>
                    </div>

                    {submitted && (
                      <div
                        className={
                          saved?.isCorrect
                            ? 'rounded-xl border border-success-line bg-success-soft p-4 text-sm'
                            : 'rounded-xl border border-danger-line bg-danger-soft p-4 text-sm'
                        }
                      >
                        <p className="mb-1 flex items-center gap-1.5 font-semibold">
                          {saved?.isCorrect ? (
                            <>
                              <CheckCircle2 className="size-4 text-success-fg" aria-hidden />
                              <span className="text-success-fg">Chính xác!</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="size-4 text-danger-fg" aria-hidden />
                              <span className="text-danger-fg">
                                Chưa đúng — Đáp án đúng tại ★ là 「{item.correctAnswer}」
                              </span>
                            </>
                          )}
                        </p>
                        <p lang="ja" className="font-semibold text-fg">
                          {item.fullSentence}
                        </p>
                        <p className="mt-1 text-muted">{item.explanation}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {activeSection === 's3' && (
        <JlptReadingView
          key={`fulltest-reading-${levelFilter}-${attemptKey}`}
          passages={examSet.readingPassages}
          moduleMeta={JLPT_MODULES['reading-short']}
          onRecordMistake={onRecordMistake}
          controlledAnswers={mcqAnswers}
          revealAll={submitted}
          onControlledAnswer={(questionId, optIdx) => {
            if (submitted) return;
            setMcqAnswers((prev) => ({ ...prev, [questionId]: optIdx }));
          }}
        />
      )}

      {activeSection === 's4' && (
        <div className="space-y-5">
          {examSet.listeningItems.map((item, idx) => {
            const transcriptVisible = showListeningTranscript[item.id] ?? submitted;
            return (
              <Card key={item.id} padding="lg" className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">Bài nghe {idx + 1}</Badge>
                    <Badge tone="primary">{item.level}</Badge>
                    <Badge tone="neutral">{item.mondaiLabel}</Badge>
                  </div>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() =>
                      setShowListeningTranscript((prev) => ({
                        ...prev,
                        [item.id]: !transcriptVisible,
                      }))
                    }
                  >
                    {transcriptVisible ? 'Ẩn Transcript' : 'Hiện Transcript'}
                  </Button>
                </div>

                <p className="text-sm text-muted">{item.situation}</p>
                <AudioSpeechPlayer
                  key={`${item.id}-${attemptKey}`}
                  dialogue={item.dialogue}
                  situation={item.situation}
                  questionPrompt={item.questionPrompt}
                  onActiveLineChange={(lineIdx) =>
                    setActiveListeningLines((prev) => ({ ...prev, [item.id]: lineIdx }))
                  }
                  playLineRequest={playLineRequests[item.id] ?? null}
                />

                {transcriptVisible && (
                  <ListeningTranscriptPanel
                    dialogue={item.dialogue}
                    translation={item.translation}
                    showTranslation={submitted}
                    showFurigana={showTranscriptFurigana}
                    onToggleFurigana={setShowTranscriptFurigana}
                    situation={item.situation}
                    questionPrompt={item.questionPrompt}
                    activeLineIdx={activeListeningLines[item.id] ?? null}
                    onPlayLine={(lineIdx) =>
                      setPlayLineRequests((prev) => ({
                        ...prev,
                        [item.id]: {
                          idx: lineIdx,
                          nonce: (prev[item.id]?.nonce ?? 0) + 1,
                        },
                      }))
                    }
                  />
                )}

                <McqQuestionBlock
                  prompt={item.questionPrompt}
                  options={item.options}
                  selectedIndex={mcqAnswers[item.id] ?? null}
                  correctIndex={item.correctIndex}
                  revealResult={submitted}
                  locked={submitted}
                  explanation={item.explanation}
                  onSelect={(optIdx) => {
                    if (submitted) return;
                    setMcqAnswers((prev) => ({ ...prev, [item.id]: optIdx }));
                  }}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
