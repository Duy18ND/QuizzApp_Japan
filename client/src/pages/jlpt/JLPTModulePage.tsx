import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Kbd,
  Notice,
  PageContainer,
  PageHeader,
  ProgressBar,
  Stat,
  buttonStyles,
} from '../../components/ui';
import { AudioSpeechPlayer, ListeningTranscriptPanel } from '../../components/jlpt/AudioSpeechPlayer';
import { JlptFullTestView } from '../../components/jlpt/JlptFullTestView';
import { JlptReadingView, type JlptMistakePayload } from '../../components/jlpt/JlptReadingView';
import { McqQuestionBlock } from '../../components/jlpt/McqQuestionBlock';
import { StarQuestionComp } from '../../components/practice/StarQuestionComp';
import {
  getJLPTListeningItems,
  getJLPTMcqQuestions,
  getJLPTReadingPassages,
  getJLPTStarQuestions,
  JLPT_MODULES,
  toStarQuestionShape,
  type JLPTLevelFilter,
  type JLPTModuleId,
  type JLPTModuleMeta,
} from '../../data/jlpt/jlptDataset';
import { useAuth } from '../../context/auth-context';
import { recordQuizAttempt } from '../../services/quizHistoryService';
import { useAppDispatch } from '../../store/hooks';
import { addMistake } from '../../store/slices/mistakeSlice';
import { shuffleArray } from '../../utils/shuffle';

const LEVEL_OPTIONS: Array<{ value: JLPTLevelFilter; label: string }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'N3', label: 'N3' },
];

const COUNT_OPTIONS = [5, 10, 15, 0] as const;

export const JLPTModulePage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();

  const meta =
    moduleId && moduleId in JLPT_MODULES ? JLPT_MODULES[moduleId as JLPTModuleId] : undefined;

  if (!meta) {
    return (
      <PageContainer size="md">
        <ErrorState
          title="Không tìm thấy dạng bài JLPT"
          description="Liên kết luyện đề không tồn tại hoặc đã thay đổi."
          onRetry={() => navigate('/')}
          retryLabel="Quay về Trang chủ"
        />
      </PageContainer>
    );
  }

  return <JLPTModuleContent key={meta.id} meta={meta} />;
};

const JLPTModuleContent: React.FC<{ meta: JLPTModuleMeta }> = ({ meta }) => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const sessionStartRef = useRef<number>(0);

  useEffect(() => {
    sessionStartRef.current = Date.now();
  }, []);

  const [levelFilter, setLevelFilter] = useState<JLPTLevelFilter>('ALL');
  const [questionLimit, setQuestionLimit] = useState<number>(5);
  const [sessionSeed, setSessionSeed] = useState<number>(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const [selectedMcqIdx, setSelectedMcqIdx] = useState<number | null>(null);
  const [starResult, setStarResult] = useState<{
    answer: string;
    isCorrect: boolean;
    feedbackMsg?: string;
  } | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);

  const resetSequentialSession = useCallback(() => {
    sessionStartRef.current = Date.now();
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setFinished(false);
    setSelectedMcqIdx(null);
    setStarResult(null);
    setShowTranscript(false);
  }, []);

  const handleLevelChange = (nextLevel: JLPTLevelFilter) => {
    setLevelFilter(nextLevel);
    resetSequentialSession();
  };

  const handleCountChange = (nextLimit: number) => {
    setQuestionLimit(nextLimit);
    resetSequentialSession();
  };

  const handleReshuffle = () => {
    setSessionSeed((s) => s + 1);
    resetSequentialSession();
  };

  const recordJlptMistake = useCallback(
    (payload: JlptMistakePayload) => {
      dispatch(
        addMistake({
          id: `${payload.grammarId}_${payload.questionId}_${Date.now()}`,
          grammarId: payload.grammarId,
          questionId: payload.questionId,
          userAnswer: payload.userAnswer,
          correctAnswer: payload.correctAnswer,
          errorType: payload.errorType,
          createdAt: new Date().toISOString(),
          prompt: payload.prompt,
          categoryLabel: payload.categoryLabel,
          practicePath: payload.practicePath,
          explanation: payload.explanation,
          level: payload.level,
        }),
      );
    },
    [dispatch],
  );

  const mcqItems = useMemo(() => {
    void sessionSeed;
    if (meta.id !== 'kanji' && meta.id !== 'vocab' && meta.id !== 'grammar') return [];
    const pool = shuffleArray(getJLPTMcqQuestions(meta.id, levelFilter));
    return questionLimit > 0 ? pool.slice(0, questionLimit) : pool;
  }, [meta.id, levelFilter, questionLimit, sessionSeed]);

  const starItems = useMemo(() => {
    void sessionSeed;
    if (meta.id !== 'star') return [];
    const pool = shuffleArray(getJLPTStarQuestions(levelFilter));
    return questionLimit > 0 ? pool.slice(0, questionLimit) : pool;
  }, [meta.id, levelFilter, questionLimit, sessionSeed]);

  const readingPassages = useMemo(() => {
    if (
      meta.id !== 'reading-short' &&
      meta.id !== 'reading-medium' &&
      meta.id !== 'reading-long'
    ) {
      return [];
    }
    return getJLPTReadingPassages(meta.id, levelFilter);
  }, [meta.id, levelFilter]);

  const listeningItems = useMemo(() => {
    void sessionSeed;
    if (meta.id !== 'listening') return [];
    const pool = shuffleArray(getJLPTListeningItems(levelFilter));
    return questionLimit > 0 ? pool.slice(0, questionLimit) : pool;
  }, [meta.id, levelFilter, questionLimit, sessionSeed]);

  const isMcqMode = meta.id === 'kanji' || meta.id === 'vocab' || meta.id === 'grammar';
  const isStarMode = meta.id === 'star';
  const isReadingMode =
    meta.id === 'reading-short' ||
    meta.id === 'reading-medium' ||
    meta.id === 'reading-long';
  const isListeningMode = meta.id === 'listening';
  const isFullTestMode = meta.id === 'full-test';

  const sequentialTotal = isMcqMode
    ? mcqItems.length
    : isStarMode
      ? starItems.length
      : isListeningMode
        ? listeningItems.length
        : 0;

  const hasAnsweredCurrent =
    isMcqMode || isListeningMode
      ? selectedMcqIdx !== null
      : isStarMode
        ? starResult !== null
        : false;

  const handleAdvance = useCallback(() => {
    if (currentIndex >= sequentialTotal - 1) {
      const durationSeconds =
        sessionStartRef.current > 0
          ? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000))
          : 0;
      void recordQuizAttempt(
        {
          quizType: `jlpt-${meta.id}`,
          level: levelFilter,
          score: correctCount,
          totalQuestions: Math.max(1, sequentialTotal),
          durationSeconds,
          mistakesJson: [],
        },
        user?.id,
      );
      setFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
      setSelectedMcqIdx(null);
      setStarResult(null);
      setShowTranscript(false);
    }
  }, [currentIndex, sequentialTotal, meta.id, levelFilter, correctCount, user?.id]);

  useEffect(() => {
    if (!hasAnsweredCurrent || finished) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasAnsweredCurrent, finished, handleAdvance]);

  const containerSize = isReadingMode || isFullTestMode ? 'lg' : 'md';

  return (
    <PageContainer size={containerSize}>
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: meta.title },
        ]}
        title={
          <span className="flex items-center gap-3">
            <span
              lang="ja"
              aria-hidden
              className="grid size-10 place-items-center rounded-xl bg-primary-soft text-lg font-bold text-primary-fg"
            >
              {meta.glyph}
            </span>
            <span>{meta.title}</span>
          </span>
        }
        description={meta.subtitle}
      />

      <Card tone="muted" padding="sm" className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">Cấp độ:</span>
            {LEVEL_OPTIONS.map((opt) => (
              <Chip
                key={opt.value}
                selected={levelFilter === opt.value}
                onClick={() => handleLevelChange(opt.value)}
              >
                {opt.label}
              </Chip>
            ))}
          </div>

          {(isMcqMode || isStarMode || isListeningMode) && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted uppercase">Số câu:</span>
              {COUNT_OPTIONS.map((cnt) => (
                <Chip
                  key={cnt}
                  selected={questionLimit === cnt}
                  onClick={() => handleCountChange(cnt)}
                >
                  {cnt === 0 ? 'Tất cả' : `${cnt} câu`}
                </Chip>
              ))}

              <Button
                variant="secondary"
                size="sm"
                leftIcon={<RotateCcw className="size-3.5" aria-hidden />}
                onClick={handleReshuffle}
              >
                Đổi đề
              </Button>
            </div>
          )}
        </div>
      </Card>

      {isReadingMode && (
        <JlptReadingView
          key={`${meta.id}-${levelFilter}`}
          passages={readingPassages}
          moduleMeta={meta}
          onRecordMistake={recordJlptMistake}
        />
      )}

      {isFullTestMode && (
        <JlptFullTestView
          levelFilter={levelFilter}
          onRecordMistake={recordJlptMistake}
        />
      )}

      {(isMcqMode || isStarMode || isListeningMode) && (
        <>
          {sequentialTotal === 0 ? (
            <EmptyState
              title="Chưa có câu hỏi phù hợp"
              description="Hãy thử đổi cấp độ hoặc chọn 'Tất cả' để luyện tập."
            />
          ) : finished ? (
            <Card padding="lg" className="mx-auto max-w-2xl space-y-6 text-center">
              <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary-fg">
                <Trophy className="size-8" aria-hidden />
              </div>

              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-fg">Hoàn thành {meta.title}!</h2>
                <p className="text-sm text-muted">
                  Bạn đã hoàn thành {sequentialTotal} câu hỏi ({levelFilter === 'ALL' ? 'Tổng hợp' : levelFilter}).
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 rounded-xl border border-line bg-surface-2 p-4 text-left">
                <Stat label="Đúng" value={correctCount} />
                <Stat label="Sai" value={wrongCount} />
                <Stat
                  label="Chính xác"
                  value={`${Math.round((correctCount / Math.max(1, sequentialTotal)) * 100)}%`}
                />
              </div>

              {wrongCount > 0 && (
                <Notice tone="info" title="Câu sai đã được tự động lưu lại">
                  Các câu làm sai đã được lưu vào mục <strong>Câu sai cần ôn</strong> trên Trang chủ để bạn ôn tập lại bất cứ lúc nào.
                </Notice>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  leftIcon={<RotateCcw className="size-4" aria-hidden />}
                  onClick={handleReshuffle}
                >
                  Luyện đề mới
                </Button>
                {wrongCount > 0 && (
                  <Link
                    to="/grammar/mistakes"
                    className={buttonStyles({ variant: 'secondary', size: 'lg' })}
                  >
                    Xem câu sai đã lưu
                  </Link>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-semibold text-fg tabular">
                    Câu {currentIndex + 1} / {sequentialTotal}
                  </span>
                  <div className="flex items-center gap-3 tabular">
                    <span className="font-medium text-success-fg">Đúng: {correctCount}</span>
                    <span className="font-medium text-danger-fg">Sai: {wrongCount}</span>
                  </div>
                </div>
                <ProgressBar
                  value={currentIndex + (hasAnsweredCurrent ? 1 : 0)}
                  max={sequentialTotal}
                  label="Tiến độ luyện tập JLPT"
                  size="sm"
                />
              </div>

              <Card padding="lg" className="space-y-6">
                {isMcqMode && mcqItems[currentIndex] && (() => {
                  const q = mcqItems[currentIndex];
                  return (
                    <McqQuestionBlock
                      prompt={q.prompt}
                      options={q.options}
                      selectedIndex={selectedMcqIdx}
                      correctIndex={q.correctIndex}
                      revealResult={selectedMcqIdx !== null}
                      locked={selectedMcqIdx !== null}
                      explanation={q.explanation}
                      levelLabel={q.level}
                      mondaiLabel={q.mondaiLabel}
                      enableKeyboard
                      onSelect={(optIdx) => {
                        if (selectedMcqIdx !== null) return;
                        setSelectedMcqIdx(optIdx);
                        if (optIdx === q.correctIndex) {
                          setCorrectCount((c) => c + 1);
                        } else {
                          setWrongCount((w) => w + 1);
                          recordJlptMistake({
                            grammarId: meta.mistakeGrammarId,
                            questionId: q.id,
                            userAnswer: q.options[optIdx],
                            correctAnswer: q.options[q.correctIndex],
                            errorType: meta.errorType,
                            prompt: q.prompt,
                            categoryLabel: meta.categoryLabel,
                            practicePath: `/jlpt/${meta.id}`,
                            explanation: q.explanation,
                            level: q.level,
                          });
                        }
                      }}
                    />
                  );
                })()}

                {isStarMode && starItems[currentIndex] && (() => {
                  const item = starItems[currentIndex];
                  const starQuestion = toStarQuestionShape(item);

                  return (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="primary">{item.level}</Badge>
                        <Badge tone="warning">
                          <Sparkles className="size-3" aria-hidden />
                          {item.mondaiLabel}
                        </Badge>
                      </div>

                      {!starResult ? (
                        <StarQuestionComp
                          key={`${item.id}-${sessionSeed}-${currentIndex}`}
                          mode="star_question"
                          question={starQuestion}
                          submitLabel="Kiểm tra đáp án ★"
                          onSubmit={(answer, isCorrect, feedbackMsg) => {
                            setStarResult({ answer, isCorrect, feedbackMsg });
                            if (isCorrect) {
                              setCorrectCount((c) => c + 1);
                            } else {
                              setWrongCount((w) => w + 1);
                              recordJlptMistake({
                                grammarId: meta.mistakeGrammarId,
                                questionId: item.id,
                                userAnswer: answer || '(chưa hoàn thành)',
                                correctAnswer: item.correctAnswer,
                                errorType: 'wrong_word_order',
                                prompt: item.fullSentence,
                                categoryLabel: meta.categoryLabel,
                                practicePath: '/jlpt/star',
                                explanation: item.explanation,
                                level: item.level,
                              });
                            }
                          }}
                        />
                      ) : (
                        <div
                          className={
                            starResult.isCorrect
                              ? 'space-y-3 rounded-xl border border-success-line bg-success-soft p-5'
                              : 'space-y-3 rounded-xl border border-danger-line bg-danger-soft p-5'
                          }
                        >
                          <p className="flex items-center gap-2 font-semibold">
                            {starResult.isCorrect ? (
                              <>
                                <CheckCircle2 className="size-5 text-success-fg" aria-hidden />
                                <span className="text-success-fg">
                                  Chính xác! Đáp án tại vị trí ★ là 「{item.correctAnswer}」
                                </span>
                              </>
                            ) : (
                              <>
                                <XCircle className="size-5 text-danger-fg" aria-hidden />
                                <span className="text-danger-fg">
                                  Chưa chính xác (Bạn chọn: 「{starResult.answer}」 · Đáp án đúng tại ★: 「
                                  {item.correctAnswer}」)
                                </span>
                              </>
                            )}
                          </p>
                          <div className="space-y-1 border-t border-line pt-3 text-sm">
                            <p lang="ja" className="text-base font-bold text-fg">
                              {item.fullSentence}
                            </p>
                            {item.meaning && <p className="text-muted">Dịch: {item.meaning}</p>}
                            <p className="pt-1 leading-relaxed text-fg">{item.explanation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {isListeningMode && listeningItems[currentIndex] && (() => {
                  const item = listeningItems[currentIndex];
                  const transcriptVisible = showTranscript || selectedMcqIdx !== null;

                  return (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="primary">{item.level}</Badge>
                          <Badge tone="neutral">{item.mondaiLabel}</Badge>
                        </div>
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => setShowTranscript((v) => !v)}
                        >
                          {transcriptVisible ? 'Ẩn Transcript' : 'Hiện Transcript'}
                        </Button>
                      </div>

                      <p className="text-sm text-muted">
                        <strong>Tình huống:</strong> {item.situation}
                      </p>

                      <AudioSpeechPlayer
                        key={`${item.id}-${sessionSeed}-${currentIndex}`}
                        dialogue={item.dialogue}
                      />

                      {transcriptVisible && (
                        <ListeningTranscriptPanel
                          dialogue={item.dialogue}
                          translation={item.translation}
                          showTranslation={selectedMcqIdx !== null}
                          showFurigana={showFurigana}
                          onToggleFurigana={setShowFurigana}
                        />
                      )}

                      <McqQuestionBlock
                        prompt={item.questionPrompt}
                        options={item.options}
                        selectedIndex={selectedMcqIdx}
                        correctIndex={item.correctIndex}
                        revealResult={selectedMcqIdx !== null}
                        locked={selectedMcqIdx !== null}
                        explanation={item.explanation}
                        enableKeyboard
                        onSelect={(optIdx) => {
                          if (selectedMcqIdx !== null) return;
                          setSelectedMcqIdx(optIdx);
                          if (optIdx === item.correctIndex) {
                            setCorrectCount((c) => c + 1);
                          } else {
                            setWrongCount((w) => w + 1);
                            recordJlptMistake({
                              grammarId: meta.mistakeGrammarId,
                              questionId: item.id,
                              userAnswer: item.options[optIdx],
                              correctAnswer: item.options[item.correctIndex],
                              errorType: meta.errorType,
                              prompt: `${item.situation} — ${item.questionPrompt}`,
                              categoryLabel: meta.categoryLabel,
                              practicePath: '/jlpt/listening',
                              explanation: item.explanation,
                              level: item.level,
                            });
                          }
                        }}
                      />
                    </div>
                  );
                })()}

                {hasAnsweredCurrent && (
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={handleAdvance}
                    rightIcon={<ArrowRight className="size-4" aria-hidden />}
                  >
                    {currentIndex >= sequentialTotal - 1 ? 'Xem kết quả' : 'Câu tiếp theo'}
                    <Kbd className="hidden border-transparent bg-surface/20 text-on-primary md:inline-flex">
                      Enter
                    </Kbd>
                  </Button>
                )}
              </Card>
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
};
