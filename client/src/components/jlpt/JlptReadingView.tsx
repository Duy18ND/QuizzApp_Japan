import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpenText, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/auth-context';
import { cn } from '../../lib/cn';
import { clearAttemptMistakeGroup } from '../../services/attemptMistakeService';
import { recordQuizAttempt } from '../../services/quizHistoryService';
import { Badge, Button, Card, Chip, EmptyState, Switch } from '../ui';
import type { JLPTModuleMeta, JLPTReadingPassage } from '../../data/jlpt/jlptDataset';
import {
  buildPassageInteractiveParagraphs,
  registerPassageSentences,
} from '../../utils/japaneseLookup';
import { useJapaneseLookup } from '../common/japanese-lookup-context';
import { FuriganaText } from './FuriganaText';
import { McqQuestionBlock } from './McqQuestionBlock';

export interface JlptMistakePayload {
  grammarId: string;
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  errorType: JLPTModuleMeta['errorType'];
  prompt: string;
  categoryLabel: string;
  practicePath: string;
  explanation?: string;
  level?: string;
  options?: string[];
}

interface JlptReadingViewProps {
  passages: JLPTReadingPassage[];
  moduleMeta: JLPTModuleMeta;
  retryAttemptId?: string;
  onRecordMistake: (payload: JlptMistakePayload) => void;
  controlledAnswers?: Record<string, number>;
  revealAll?: boolean;
  onControlledAnswer?: (questionId: string, optionIdx: number) => void;
}

export const JlptReadingView: React.FC<JlptReadingViewProps> = ({
  passages,
  moduleMeta,
  retryAttemptId,
  onRecordMistake,
  controlledAnswers,
  revealAll = false,
  onControlledAnswer,
}) => {
  const isControlled = controlledAnswers !== undefined && onControlledAnswer !== undefined;
  const { user } = useAuth();
  const [activePassageIdx, setActivePassageIdx] = useState(0);
  const [showFurigana, setShowFurigana] = useState(true);
  const [hoverTranslate, setHoverTranslate] = useState(true);
  const [showSupport, setShowSupport] = useState(false);
  const [localAnswers, setLocalAnswers] = useState<Record<string, number>>({});
  const passageStartRef = useRef<number>(0);
  const recordedPassagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    passageStartRef.current = Date.now();
  }, [activePassageIdx]);
  const {
    openLookup,
    scheduleHoverLookup,
    cancelHoverLookup,
    activeTokenId,
    activeSentenceId,
  } = useJapaneseLookup();

  const safeIdx = passages.length > 0 ? Math.min(activePassageIdx, passages.length - 1) : 0;
  const currentPassage = passages[safeIdx];
  const interactiveParagraphs = useMemo(
    () => (currentPassage ? buildPassageInteractiveParagraphs(currentPassage) : []),
    [currentPassage],
  );

  useEffect(() => {
    registerPassageSentences(interactiveParagraphs);
  }, [interactiveParagraphs]);

  if (passages.length === 0 || !currentPassage) {
    return (
      <EmptyState
        icon={<BookOpenText className="size-6 text-muted" aria-hidden />}
        title="Chưa có bài đọc cho bộ lọc này"
        description="Hãy thử chọn cấp độ khác hoặc 'Tất cả' để luyện các bài đọc có sẵn."
      />
    );
  }

  const passage = currentPassage;
  const answers = isControlled ? controlledAnswers : localAnswers;

  const answeredCount = passage.questions.filter((q) => answers[q.id] !== undefined).length;
  const correctCount = passage.questions.filter((q) => answers[q.id] === q.correctIndex).length;

  const handleSelectOption = (qIndex: number, optIdx: number) => {
    const q = passage.questions[qIndex];
    if (!q) return;

    if (isControlled) {
      if (revealAll) return;
      onControlledAnswer(q.id, optIdx);
      return;
    }

    if (localAnswers[q.id] !== undefined) return;
    const nextAnswers = { ...localAnswers, [q.id]: optIdx };
    setLocalAnswers(nextAnswers);

    if (optIdx !== q.correctIndex) {
      onRecordMistake({
        grammarId: moduleMeta.mistakeGrammarId,
        questionId: q.id,
        userAnswer: q.options[optIdx],
        correctAnswer: q.options[q.correctIndex],
        errorType: moduleMeta.errorType,
        prompt: `[${passage.title}] ${q.prompt}`,
        categoryLabel: moduleMeta.categoryLabel,
        practicePath: `/jlpt/${moduleMeta.id}?level=${passage.level}`,
        explanation: q.explanation,
        level: passage.level,
        options: [...q.options],
      });
    }

    const allAnswered = passage.questions.every((item) => nextAnswers[item.id] !== undefined);
    if (allAnswered && !recordedPassagesRef.current.has(passage.id)) {
      recordedPassagesRef.current.add(passage.id);
      const durationSeconds =
        passageStartRef.current > 0
          ? Math.max(1, Math.round((Date.now() - passageStartRef.current) / 1000))
          : 0;
      const scoreCount = passage.questions.filter(
        (item) => nextAnswers[item.id] === item.correctIndex,
      ).length;
      const passageMistakes = passage.questions
        .map((item, idx) => {
          const picked = nextAnswers[item.id];
          if (picked === undefined || picked === item.correctIndex) return null;
          return {
            id: `${moduleMeta.mistakeGrammarId}_${item.id}_${idx}`,
            grammarId: moduleMeta.mistakeGrammarId,
            questionId: item.id,
            prompt: `[${passage.title}] ${item.prompt}`,
            userAnswer: item.options[picked],
            correctAnswer: item.options[item.correctIndex],
            explanation: item.explanation,
            options: [...item.options],
            level: passage.level,
            categoryLabel: `${moduleMeta.categoryLabel} · ${passage.title}`,
            practicePath: `/jlpt/${moduleMeta.id}?level=${passage.level}`,
          };
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);

      void recordQuizAttempt(
        {
          quizType: `jlpt-${moduleMeta.id}`,
          level: passage.level,
          score: scoreCount,
          totalQuestions: Math.max(1, passage.questions.length),
          durationSeconds,
          mistakesJson: passageMistakes,
        },
        user?.id,
      ).then(() => {
        if (retryAttemptId) {
          clearAttemptMistakeGroup(retryAttemptId, user?.id);
        }
      });
    }
  };

  const handleResetPassage = () => {
    recordedPassagesRef.current.delete(passage.id);
    passageStartRef.current = Date.now();
    setLocalAnswers((prev) => {
      const next = { ...prev };
      passage.questions.forEach((q) => {
        delete next[q.id];
      });
      return next;
    });
    setShowSupport(false);
  };

  return (
    <div className="space-y-4">
      {passages.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">Chọn bài đọc:</span>
          {passages.map((p, idx) => (
            <Chip
              key={p.id}
              selected={idx === activePassageIdx}
              onClick={() => {
                setActivePassageIdx(idx);
                setShowSupport(false);
              }}
            >
              <span>Bài {idx + 1}</span>
              <span className="text-xs text-muted">({p.level})</span>
            </Chip>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Passage with independent scroll & Furigana toggle */}
        <div className="lg:col-span-7">
          <Card
            padding="lg"
            className="space-y-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-11rem)] lg:overflow-y-auto"
          >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{passage.level}</Badge>
                  <Badge tone="neutral">{passage.genre}</Badge>
                </div>
                <h2 className="text-lg font-bold text-fg">{passage.title}</h2>
                <p className="text-xs text-muted">
                  Bấm, rê chuột hoặc bôi đen từ/câu bất kỳ để xem nghĩa & phân tích ngữ pháp.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Switch
                  checked={hoverTranslate}
                  onChange={setHoverTranslate}
                  label="Rê để dịch"
                />
                <Switch
                  checked={showFurigana}
                  onChange={setShowFurigana}
                  label="Furigana"
                />
              </div>
            </div>

            <div className="space-y-4 text-base leading-[2.1] text-fg md:text-lg">
              {interactiveParagraphs.map((sentences, pIdx) => (
                <p key={pIdx} lang="ja" className="leading-[2.15]">
                  {sentences.map((sentence) => (
                    <span
                      key={sentence.id}
                      className={cn(
                        'rounded transition-colors',
                        activeSentenceId === sentence.id && 'bg-primary-soft/25',
                      )}
                    >
                      {sentence.tokens.map((token) =>
                        token.isPunctuation ? (
                          <FuriganaText
                            key={token.id}
                            segments={token.segments}
                            showFurigana={showFurigana}
                          />
                        ) : (
                          <span
                            key={token.id}
                            role="button"
                            tabIndex={0}
                            data-lookup-interactive="token"
                            onClick={(e) => {
                              const selected = window.getSelection()?.toString().trim() ?? '';
                              if (selected.length > 0) return;
                              openLookup({
                                text: token.text,
                                rect: e.currentTarget.getBoundingClientRect(),
                                rubyMap: token.rubyMap,
                                sentenceText: sentence.text,
                                sentenceTranslation: sentence.translationHint,
                                sentenceRubyMap: sentence.rubyMap,
                                passageVocab: passage.vocabNotes,
                                activeTokenId: token.id,
                                activeSentenceId: sentence.id,
                                initialScope: 'phrase',
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openLookup({
                                  text: token.text,
                                  rect: e.currentTarget.getBoundingClientRect(),
                                  rubyMap: token.rubyMap,
                                  sentenceText: sentence.text,
                                  sentenceTranslation: sentence.translationHint,
                                  sentenceRubyMap: sentence.rubyMap,
                                  passageVocab: passage.vocabNotes,
                                  activeTokenId: token.id,
                                  activeSentenceId: sentence.id,
                                  initialScope: 'phrase',
                                });
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (!hoverTranslate) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              scheduleHoverLookup({
                                text: token.text,
                                rect,
                                rubyMap: token.rubyMap,
                                sentenceText: sentence.text,
                                sentenceTranslation: sentence.translationHint,
                                sentenceRubyMap: sentence.rubyMap,
                                passageVocab: passage.vocabNotes,
                                activeTokenId: token.id,
                                activeSentenceId: sentence.id,
                                initialScope: 'phrase',
                              });
                            }}
                            onMouseLeave={cancelHoverLookup}
                            className={cn(
                              'cursor-pointer rounded px-0.5 transition-colors hover:bg-primary-soft/60',
                              activeTokenId === token.id &&
                                'bg-primary-soft/60 text-primary-fg ring-1 ring-primary/35',
                            )}
                          >
                            <FuriganaText segments={token.segments} showFurigana={showFurigana} />
                          </span>
                        ),
                      )}
                    </span>
                  ))}
                </p>
              ))}
            </div>

            {(!isControlled || revealAll) && (
              <div className="border-t border-line pt-4">
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() => setShowSupport((prev) => !prev)}
                >
                  {showSupport ? 'Ẩn dịch nghĩa & từ vựng' : 'Xem dịch nghĩa & từ vựng hỗ trợ'}
                </Button>

                {showSupport && (
                  <div className="mt-4 space-y-4 rounded-xl border border-line bg-surface-2 p-4 text-sm">
                    {passage.vocabNotes.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-semibold tracking-wide text-primary-fg uppercase">
                          Từ vựng gợi ý
                        </p>
                        <ul className="space-y-1.5">
                          {passage.vocabNotes.map((v, idx) => (
                            <li key={idx} className="flex flex-wrap items-baseline gap-2">
                              <span lang="ja" className="font-semibold text-fg">
                                {v.word}
                              </span>
                              <span lang="ja" className="text-xs text-muted">
                                （{v.reading}）
                              </span>
                              <span className="text-muted">— {v.meaning}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="border-t border-line pt-3">
                      <p className="mb-1.5 text-xs font-semibold tracking-wide text-primary-fg uppercase">
                        Bản dịch tham khảo
                      </p>
                      <p className="leading-relaxed whitespace-pre-line text-fg">{passage.translation}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Comprehension Questions */}
        <div className="space-y-4 lg:col-span-5">
          {!isControlled && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3">
              <p className="text-sm font-medium text-fg tabular">
                Đã làm <span className="font-bold text-primary-fg">{answeredCount}/{passage.questions.length}</span> câu · Đúng{' '}
                <span className="font-bold text-success-fg">{correctCount}</span>
              </p>
              {answeredCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw className="size-3.5" aria-hidden />}
                  onClick={handleResetPassage}
                >
                  Làm lại bài
                </Button>
              )}
            </div>
          )}

          {passage.questions.map((q, qIdx) => {
            const selected = answers[q.id] ?? null;
            const reveal = isControlled ? revealAll : selected !== null;
            const locked = isControlled ? revealAll : selected !== null;

            return (
              <Card key={q.id} padding="md" className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="neutral">Câu {qIdx + 1}</Badge>
                </div>
                <McqQuestionBlock
                  compact
                  prompt={q.prompt}
                  options={q.options}
                  selectedIndex={selected}
                  correctIndex={q.correctIndex}
                  revealResult={reveal}
                  locked={locked}
                  explanation={q.explanation}
                  onSelect={(optIdx) => handleSelectOption(qIdx, optIdx)}
                />
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
