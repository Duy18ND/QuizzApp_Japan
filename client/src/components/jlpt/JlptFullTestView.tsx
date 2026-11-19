import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock, Pause, Play, RotateCcw, Star, XCircle } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Notice,
  ProgressBar,
  Stat,
  Tabs,
  type TabItem,
} from '../ui';
import {
  JLPT_MODULES,
  toStarQuestionShape,
  type JLPTLevelFilter,
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

const DEFAULT_DURATION_SECONDS = 20 * 60;

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

  return (
    <JlptFullTestSession
      key={`${levelFilter}-${attemptKey}`}
      levelFilter={levelFilter}
      attemptKey={attemptKey}
      retryAttemptId={retryAttemptId}
      onNewAttempt={() => setAttemptKey((k) => k + 1)}
      onRecordMistake={onRecordMistake}
    />
  );
};

interface JlptFullTestSessionProps {
  levelFilter: JLPTLevelFilter;
  attemptKey: number;
  retryAttemptId?: string;
  onNewAttempt: () => void;
  onRecordMistake: (payload: JlptMistakePayload) => void;
}

const JlptFullTestSession: React.FC<JlptFullTestSessionProps> = ({
  levelFilter,
  attemptKey,
  retryAttemptId,
  onNewAttempt,
  onRecordMistake,
}) => {
  const { user } = useAuth();
  const cmsSnapshot = useCurriculumSnapshot();
  const [activeSection, setActiveSection] = useState<ExamSectionId>('s1');
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_DURATION_SECONDS);
  const [timerPaused, setTimerPaused] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [mcqAnswers, setMcqAnswers] = useState<Record<string, number>>({});
  const [starAnswers, setStarAnswers] = useState<
    Record<string, { answer: string; isCorrect: boolean }>
  >({});
  const [showListeningTranscript, setShowListeningTranscript] = useState<Record<string, boolean>>({});
  const [showTranscriptFurigana, setShowTranscriptFurigana] = useState(true);

  const examSet = useMemo(() => {
    void attemptKey;
    const kanjiPool = shuffleArray(getLiveJlptMcqQuestions(cmsSnapshot, 'kanji', levelFilter)).slice(0, 4);
    const vocabPool = shuffleArray(getLiveJlptMcqQuestions(cmsSnapshot, 'vocab', levelFilter)).slice(0, 4);
    const grammarPool = shuffleArray(getLiveJlptMcqQuestions(cmsSnapshot, 'grammar', levelFilter)).slice(0, 4);
    const starPool = shuffleArray(getLiveJlptStarQuestions(cmsSnapshot, levelFilter)).slice(0, 2);

    const readingCandidates = [
      ...getLiveJlptReadingPassages(cmsSnapshot, 'reading-short', levelFilter),
      ...getLiveJlptReadingPassages(cmsSnapshot, 'reading-medium', levelFilter),
      ...getLiveJlptReadingPassages(cmsSnapshot, 'reading-long', levelFilter),
    ];
    const readingPassages = shuffleArray(readingCandidates).slice(0, 1);
    const listeningItems = shuffleArray(getLiveJlptListeningItems(cmsSnapshot, levelFilter)).slice(0, 2);

    return {
      s1: [...kanjiPool, ...vocabPool],
      grammarMcqs: grammarPool,
      starItems: starPool,
      readingPassages,
      listeningItems,
    };
  }, [cmsSnapshot, levelFilter, attemptKey]);

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
        durationSeconds: Math.max(1, DEFAULT_DURATION_SECONDS - secondsLeft),
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
                Kết quả thi thử JLPT ({levelFilter === 'ALL' ? 'Tổng hợp' : levelFilter})
              </p>
              <h2 className="mt-1 text-2xl font-bold text-fg tabular">
                {sectionScores.totalCorrect} / {sectionScores.totalQuestions} câu đúng ({accuracyPct}%)
              </h2>
            </div>
            <Badge tone={accuracyPct >= 60 ? 'success' : 'warning'}>
              {accuracyPct >= 60 ? 'Đạt mục tiêu luyện tập' : 'Cần ôn lại các câu sai'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat
              label="Chữ Hán & Từ vựng"
              value={`${sectionScores.s1.correct}/${sectionScores.s1.total}`}
            />
            <Stat
              label="Ngữ pháp & ★"
              value={`${sectionScores.s2.correct}/${sectionScores.s2.total}`}
            />
            <Stat
              label="Đọc hiểu"
              value={`${sectionScores.s3.correct}/${sectionScores.s3.total}`}
            />
            <Stat
              label="Nghe hiểu"
              value={`${sectionScores.s4.correct}/${sectionScores.s4.total}`}
            />
          </div>

          <Notice tone="info" title="Các câu trả lời sai đã được lưu tự động">
            Bạn có thể xem đáp án và giải thích chi tiết ngay bên dưới từng phần, hoặc mở mục Ôn tập lỗi sai từ Trang chủ.
          </Notice>
        </Card>
      )}

      <Tabs
        items={tabItems}
        value={activeSection}
        onChange={setActiveSection}
        aria-label="Các phần trong đề thi JLPT"
      />

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
                <AudioSpeechPlayer key={`${item.id}-${attemptKey}`} dialogue={item.dialogue} />

                {transcriptVisible && (
                  <ListeningTranscriptPanel
                    dialogue={item.dialogue}
                    translation={item.translation}
                    showTranslation={submitted}
                    showFurigana={showTranscriptFurigana}
                    onToggleFurigana={setShowTranscriptFurigana}
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
