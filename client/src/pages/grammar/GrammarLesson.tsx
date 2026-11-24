import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileDown,
  Lightbulb,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Volume2,
  XCircle,
} from 'lucide-react';
import { JapaneseLookupButton } from '../../components/common/JapaneseLookupPopover';
import { useAuth } from '../../context/auth-context';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { cn } from '../../lib/cn';
import { getLiveAllVocabulary, getLiveGrammarBooks } from '../../services/curriculumStore';
import { recordDailyGrammarInteraction } from '../../services/stageRoadmapService';
import { buildGrammarDeepInsight } from '../../utils/grammarEngine/grammarInsightEngine';
import { generateSmartQuestionSet } from '../../utils/grammarEngine/questionGenerator';
import { speakJapanese } from '../../utils/tts';
import type { ExampleQuestion } from '../../types/grammar';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Notice,
  PageContainer,
  PageHeader,
  buttonStyles,
} from '../../components/ui';

interface ExampleVocabularyItem {
  kanji?: string;
  hiragana?: string;
  meaning?: string;
}

export const GrammarLesson: React.FC = () => {
  const { bookId, chapterId, grammarId } = useParams<{
    bookId: string;
    chapterId: string;
    grammarId: string;
  }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const cmsSnapshot = useCurriculumSnapshot();

  const { chapter, rule, allLevelRules } = useMemo(() => {
    const books = getLiveGrammarBooks(cmsSnapshot);
    const book = books.find((b) => b.id === bookId);
    const ch = book?.chapters.find((c) => c.id === chapterId);
    const gr = ch?.grammars.find((g) => g.id === grammarId);
    const levelRules = books
      .filter((b) => b.level === (gr?.level ?? book?.level ?? 'N3'))
      .flatMap((b) => b.chapters.flatMap((c) => c.grammars));
    return { chapter: ch, rule: gr, allLevelRules: levelRules };
  }, [cmsSnapshot, bookId, chapterId, grammarId]);

  const deepInsight = useMemo(
    () =>
      rule
        ? buildGrammarDeepInsight(rule, chapter?.grammars ?? [], allLevelRules)
        : null,
    [allLevelRules, chapter?.grammars, rule],
  );

  const [microQuizAnswer, setMicroQuizAnswer] = useState<{
    grammarId?: string;
    selected: string | null;
  }>({ grammarId, selected: null });
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [markedUnderstoodIds, setMarkedUnderstoodIds] = useState<string[]>([]);

  const activeMicroChoice =
    microQuizAnswer.grammarId === grammarId ? microQuizAnswer.selected : null;
  const isRuleUnderstood = Boolean(grammarId && markedUnderstoodIds.includes(grammarId));

  const confirmGrammarUnderstood = () => {
    if (!grammarId) return;
    setMarkedUnderstoodIds((prev) => (prev.includes(grammarId) ? prev : [...prev, grammarId]));
    recordDailyGrammarInteraction(grammarId, user?.id);
  };

  const liveVocab = useMemo(
    () => getLiveAllVocabulary(cmsSnapshot).filter((v) => v.level === (rule?.level ?? 'N3')),
    [cmsSnapshot, rule?.level],
  );

  const [customExamples, setCustomExamples] = useState<{
    grammarId?: string;
    list: ExampleQuestion[];
  } | null>(null);
  const [expandedState, setExpandedState] = useState<{
    grammarId?: string;
    index: number | null;
  }>({ grammarId, index: null });

  const expandedExample = expandedState.grammarId === grammarId ? expandedState.index : null;
  const setExpandedExample = (index: number | null) =>
    setExpandedState({ grammarId, index });

  const defaultExamples = useMemo<ExampleQuestion[]>(() => {
    if (!rule) return [];
    const qs = generateSmartQuestionSet({
      grammarRule: rule,
      count: 3,
      seed: 101,
      rawVocabulary: liveVocab as unknown as Record<string, unknown>[],
      requestedPracticeTypes: ['example'],
    });
    return qs.questions as ExampleQuestion[];
  }, [rule, liveVocab]);

  const examples =
    customExamples && customExamples.grammarId === grammarId
      ? customExamples.list
      : defaultExamples;

  const handleGenerateExamples = () => {
    if (!rule) return;
    const qs = generateSmartQuestionSet({
      grammarRule: rule,
      count: 3,
      seed: Date.now() + Math.random(),
      rawVocabulary: liveVocab as unknown as Record<string, unknown>[],
      requestedPracticeTypes: ['example'],
    });
    setCustomExamples({ grammarId, list: qs.questions as ExampleQuestion[] });
    setExpandedState({ grammarId, index: null });
  };

  if (!rule) {
    return (
      <PageContainer size="md">
        <EmptyState
          title="Không tìm thấy bài học ngữ pháp"
          action={
            <Link to="/grammar" className={buttonStyles({ variant: 'secondary' })}>
              Quay lại Ngữ pháp
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: 'Ngữ pháp', to: '/grammar' },
          { label: chapter?.title || 'Bài học', to: `/grammar/${bookId}/${chapterId}` },
          { label: rule.name },
        ]}
        title={<span lang="ja">{rule.name}</span>}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {rule.hiragana && <span lang="ja">{rule.hiragana}</span>}
            <Badge tone="primary">{rule.level}</Badge>
            {rule.category && <Badge tone="neutral">{rule.category}</Badge>}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Lý thuyết chuyên sâu + 5 phương pháp ghi nhớ & Ví dụ */}
        <div className="space-y-6 lg:col-span-2">
          <Card padding="none" className="divide-y divide-line overflow-hidden">
            {/* 1. Ý nghĩa & Thẻ Sắc thái */}
            <section className="bg-primary-soft p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold tracking-wide text-primary-fg uppercase">
                  1. Ý nghĩa &amp; Sắc thái cốt lõi
                </h2>
                {deepInsight && (
                  <div className="flex flex-wrap gap-1.5">
                    {deepInsight.nuanceTags.map((tag, idx) => (
                      <Badge key={idx} tone={tag.tone}>
                        {tag.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-2 text-lg font-bold text-fg md:text-xl">{rule.meaning}</p>
              {rule.explanation && (
                <p className="mt-2 text-sm leading-relaxed text-fg/90">{rule.explanation}</p>
              )}
            </section>

            {/* 2. 🎯 Dùng khi nào? + 🔑 Từ khóa tín hiệu JLPT */}
            <section className="space-y-3.5 p-5 md:p-6">
              <h2 className="text-base font-bold text-fg">
                2. 🎯 Dùng khi nào? (Tình huống giao tiếp &amp; đề thi thực tế)
              </h2>
              {deepInsight ? (
                <ul className="space-y-2 text-sm leading-relaxed text-fg">
                  {deepInsight.whenToUse.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-fg">
                        {idx + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                rule.usage && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-fg md:text-base">
                    {rule.usage}
                  </p>
                )
              )}

              {deepInsight && deepInsight.triggerWords.length > 0 && (
                <div className="rounded-xl border border-line bg-surface-2/70 p-3.5">
                  <p className="mb-2 text-xs font-semibold tracking-wide text-primary-fg uppercase">
                    🔑 Cụm từ khóa &quot;Tín hiệu&quot; hay đi kèm trong đề thi JLPT
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {deepInsight.triggerWords.map((kw, i) => (
                      <span
                        key={i}
                        lang="ja"
                        className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-fg"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* 3. 💡 Mẹo nhớ 3 giây & Sơ đồ Trục Nhóm Ngữ pháp */}
            {deepInsight && (
              <section className="space-y-3.5 bg-sakura-soft/25 p-5 md:p-6">
                <div className="flex items-center gap-2">
                  <Lightbulb className="size-4 text-sakura" aria-hidden />
                  <h2 className="text-base font-bold text-fg">
                    3. 💡 Mẹo nhớ 3 giây &amp; Sơ đồ Trục Hành Động
                  </h2>
                </div>
                <p className="rounded-xl border border-sakura/35 bg-surface/80 p-3.5 text-sm leading-relaxed text-fg">
                  {deepInsight.mnemonicTip}
                </p>

                {deepInsight.confusableGroup.timelineSteps &&
                  deepInsight.confusableGroup.timelineSteps.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-muted">
                        Sơ đồ chuỗi liên tưởng (Nhìn 1 trục nhớ cả cụm):
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {deepInsight.confusableGroup.timelineSteps.map((step, sIdx) => (
                          <React.Fragment key={sIdx}>
                            <span
                              className={cn(
                                'rounded-lg border px-2.5 py-1 text-xs font-semibold',
                                step.includes(rule.name.replace(/^[～〜~]/, ''))
                                  ? 'border-primary bg-primary text-on-primary shadow-card'
                                  : 'border-line bg-surface text-fg',
                              )}
                            >
                              {step}
                            </span>
                            {sIdx < deepInsight.confusableGroup.timelineSteps!.length - 1 && (
                              <span className="text-xs font-bold text-muted" aria-hidden>
                                ➔
                              </span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
              </section>
            )}

            {/* 4. ⚖️ Đặt cạnh Cặp Ngữ pháp dễ nhầm (A vs B vs C) */}
            {deepInsight && deepInsight.confusableGroup.items.length > 1 && (
              <section className="space-y-3 p-5 md:p-6">
                <div>
                  <h2 className="text-base font-bold text-fg">
                    4. ⚖️ Phân biệt các cấu trúc dễ nhầm lẫn
                  </h2>
                  <p className="text-xs text-muted">{deepInsight.confusableGroup.groupTitle}</p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {deepInsight.confusableGroup.items.map((item, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'rounded-xl border p-3.5 space-y-1',
                        item.isCurrent
                          ? 'border-primary bg-primary-soft/50 ring-1 ring-primary/20'
                          : 'border-line bg-surface-2/60',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span lang="ja" className="text-sm font-bold text-primary-fg">
                          {item.pattern}
                        </span>
                        {item.isCurrent && <Badge tone="primary">Đang học</Badge>}
                      </div>
                      <p className="text-xs font-semibold text-fg">{item.meaning}</p>
                      <p className="text-xs leading-relaxed text-muted">{item.nuance}</p>
                      {item.exampleJa && (
                        <p lang="ja" className="pt-1 text-xs font-medium text-fg">
                          VD: {item.exampleJa}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 5. ✅ Khi nào Đúng (○) vs ❌ Khi nào Sai (×) */}
            {deepInsight && (
              <section className="space-y-3 p-5 md:p-6">
                <h2 className="text-base font-bold text-fg">
                  5. ✅ Câu Đúng chuẩn (○) vs ❌ Lỗi dùng Sai thường gặp (×)
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-success-line bg-success-soft/40 p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-success-fg">
                      <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                      <span>Cách dùng ĐÚNG (○)</span>
                    </div>
                    <p lang="ja" className="text-sm font-bold text-fg">
                      {deepInsight.rightVsWrong.rightSentence}
                    </p>
                    <p className="text-xs leading-relaxed text-muted">
                      {deepInsight.rightVsWrong.rightMeaning}
                    </p>
                  </div>
                  <div className="rounded-xl border border-danger-line bg-danger-soft/35 p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-danger-fg">
                      <XCircle className="size-4 shrink-0" aria-hidden />
                      <span>Bẫy hay mắc / Cách dùng SAI (×)</span>
                    </div>
                    <p lang="ja" className="text-sm font-bold text-fg">
                      {deepInsight.rightVsWrong.wrongSentence}
                    </p>
                    <p className="text-xs leading-relaxed text-muted">
                      {deepInsight.rightVsWrong.wrongReason}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* 6. Cấu trúc & Cách chia */}
            <section className="p-5 md:p-6">
              <h2 className="mb-3 text-base font-bold text-fg">6. Cấu trúc &amp; Công thức nối từ</h2>
              <div className="space-y-2.5">
                {rule.templates.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-line bg-surface-2 p-4"
                  >
                    <p lang="ja" className="text-base font-bold text-primary-fg md:text-lg">
                      {t.pattern}
                    </p>
                    {t.vietnamesePattern && (
                      <p className="mt-1 text-sm text-muted">{t.vietnamesePattern}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {rule.patterns && rule.patterns.length > 0 && (
              <section className="p-5 md:p-6">
                <h2 className="mb-3 text-base font-semibold text-fg">Cách chia / Form chi tiết</h2>
                <ul className="space-y-2">
                  {rule.patterns.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 px-3.5 py-2.5"
                    >
                      <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                      <span lang="ja" className="font-mono text-sm font-medium text-fg">
                        {p.pattern}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {rule.notes && (
              <section className="p-5 md:p-6">
                <Notice tone="warning" className="space-y-1">
                  <h2 className="font-semibold">Ghi chú quan trọng</h2>
                  <p className="leading-relaxed whitespace-pre-wrap text-fg">{rule.notes}</p>
                </Notice>
              </section>
            )}
          </Card>

          {/* 7. Nhiều cách để nhớ: Thẻ Lật Tình Huống 2 Mặt + Quiz Tình huống 10 giây (Giống Hình 1) */}
          {deepInsight && deepInsight.scenarioQuestions[0] && (() => {
            const sc = deepInsight.scenarioQuestions[0];
            const isAnswered = activeMicroChoice !== null;
            const isCorrect = activeMicroChoice === sc.correctAnswer;
            return (
              <Card padding="lg" className="space-y-5 border-primary/45">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-5 text-primary-fg" aria-hidden />
                    <h2 className="text-base font-bold text-fg md:text-lg">
                      Thử thách Tình huống &amp; Sắc thái (10 giây khóa trí nhớ)
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="sakura">{sc.badgeLabel}</Badge>
                    <Button
                      type="button"
                      variant={isRuleUnderstood ? 'soft' : 'primary'}
                      size="sm"
                      leftIcon={<CheckCircle2 className="size-3.5" aria-hidden />}
                      onClick={confirmGrammarUnderstood}
                    >
                      {isRuleUnderstood ? 'Đã hiểu mẫu này' : 'Xác nhận đã hiểu'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFlashcardFlipped((v) => !v);
                        confirmGrammarUnderstood();
                      }}
                    >
                      {flashcardFlipped ? 'Xem dạng Quiz 4 đáp án' : 'Lật Thẻ nhớ 2 mặt'}
                    </Button>
                  </div>
                </div>

                {flashcardFlipped ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setFlashcardFlipped(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setFlashcardFlipped(false);
                    }}
                    className="cursor-pointer rounded-2xl border-2 border-dashed border-primary/50 bg-primary-soft/40 p-6 text-center space-y-3 transition-transform hover:scale-[1.01]"
                  >
                    <Badge tone="primary">Thẻ Lật Tình Huống 2 Mặt</Badge>
                    <p className="text-sm font-medium text-muted">{deepInsight.flashcardPromptVi}</p>
                    <div className="border-t border-line pt-3">
                      <p lang="ja" className="text-2xl font-bold text-primary-fg">
                        {rule.name} {rule.hiragana ? `(${rule.hiragana})` : ''}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-fg">{rule.meaning}</p>
                      <p lang="ja" className="mt-2 text-sm text-muted">
                        VD: {sc.exampleJa} — {sc.exampleVi}
                      </p>
                    </div>
                    <p className="text-xs text-primary-fg">Bấm để quay lại câu hỏi Quiz Tình huống →</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-base leading-relaxed font-bold text-fg md:text-lg">
                      {sc.prompt}
                    </p>

                    <div className="space-y-2.5">
                      {sc.options.map((opt, idx) => {
                        const picked = activeMicroChoice === opt;
                        const optIsRight = opt === sc.correctAnswer;
                        return (
                          <button
                            key={idx}
                            type="button"
                            disabled={isAnswered}
                            onClick={() => {
                              setMicroQuizAnswer({ grammarId, selected: opt });
                              confirmGrammarUnderstood();
                            }}
                            className={cn(
                              'flex w-full cursor-pointer items-center justify-between gap-3 rounded-full border px-5 py-3.5 text-left text-sm font-semibold transition-all duration-150 md:text-base',
                              !isAnswered
                                ? 'border-line-strong bg-surface hover:border-primary hover:bg-primary-soft/30'
                                : optIsRight
                                  ? 'border-success-line bg-success-soft text-success-fg'
                                  : picked
                                    ? 'border-danger-line bg-danger-soft text-danger-fg'
                                    : 'border-line bg-surface-2/50 text-muted opacity-75',
                            )}
                          >
                            <span lang="ja">{opt}</span>
                            {isAnswered && optIsRight && (
                              <CheckCircle2 className="size-5 shrink-0 text-success-fg" aria-hidden />
                            )}
                            {isAnswered && picked && !optIsRight && (
                              <XCircle className="size-5 shrink-0 text-danger-fg" aria-hidden />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isAnswered && (
                      <div className="animate-fade-in space-y-3 rounded-2xl border border-line bg-surface-2 p-4 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={cn(
                              'font-bold',
                              isCorrect ? 'text-success-fg' : 'text-danger-fg',
                            )}
                          >
                            {isCorrect
                              ? '✓ Chính xác! Bạn đã nắm chắc sắc thái ngữ pháp này.'
                              : `Chưa chính xác — Đáp án đúng là 「${sc.correctAnswer}」`}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            leftIcon={<RotateCcw className="size-3.5" aria-hidden />}
                            onClick={() => setMicroQuizAnswer({ grammarId, selected: null })}
                          >
                            Thử lại
                          </Button>
                        </div>

                        <p className="text-xs leading-relaxed text-fg">{sc.explanation}</p>

                        <div className="space-y-1.5 border-t border-line pt-2.5">
                          <p className="text-xs font-semibold text-muted">
                            Phân tích đối chiếu 4 đáp án:
                          </p>
                          {sc.optionBreakdowns.map((b, bIdx) => (
                            <p key={bIdx} className="text-xs leading-relaxed text-fg">
                              {b.isCorrect ? '✅' : '❌'}{' '}
                              <strong lang="ja">{b.option}:</strong> {b.reason}
                            </p>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface p-3">
                          <div>
                            <p lang="ja" className="text-sm font-bold text-primary-fg">
                              {sc.exampleJa}
                            </p>
                            <p className="text-xs text-muted">{sc.exampleVi}</p>
                          </div>
                          <Button
                            type="button"
                            variant="soft"
                            size="sm"
                            leftIcon={<Volume2 className="size-4" aria-hidden />}
                            onClick={() => speakJapanese(sc.exampleJa)}
                          >
                            Nghe câu
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })()}

          {/* Ví dụ động */}
          <Card padding="lg" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-fg">Ví dụ</h2>
              <Button
                variant="soft"
                size="sm"
                onClick={handleGenerateExamples}
                leftIcon={<RefreshCw className="size-4" aria-hidden />}
              >
                Tạo ví dụ khác
              </Button>
            </div>

            <div className="space-y-3">
              {examples.map((ex, idx) => {
                const meta = ex.metadata;
                if (!meta) return null;
                const isExpanded = expandedExample === idx;
                const slotValues = (meta.slotValues ?? {}) as Record<string, string>;
                const vocabList = (meta.vocabulary ?? []) as ExampleVocabularyItem[];
                const conjugation = meta.conjugation as
                  | { base?: string; conjugated?: string; rule?: string }
                  | undefined;

                return (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-xl border border-line bg-surface-2"
                  >
                    <div className="p-4 md:p-5">
                      <div className="flex items-start gap-3">
                        <Badge tone="primary" className="tabular mt-1 shrink-0">
                          {idx + 1}
                        </Badge>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p lang="ja" className="min-w-0 flex-1 text-lg leading-loose font-medium text-fg md:text-xl">
                              {meta.pattern && meta.slotValues
                                ? meta.pattern.split(/(\{.*?\})/).map((part, i) => {
                                    if (part.startsWith('{') && part.endsWith('}')) {
                                      const slotName = part.slice(1, -1);
                                      return (
                                        <span
                                          key={i}
                                          className="mx-0.5 rounded border border-line bg-surface px-1.5 py-0.5 font-semibold text-primary-fg"
                                        >
                                          {slotValues[slotName]}
                                        </span>
                                      );
                                    }
                                    if (part && !/^[、。！？\s]+$/.test(part)) {
                                      return (
                                        <span key={i} className="mx-0.5 font-bold text-primary-fg underline decoration-primary/40 underline-offset-4">
                                          {part}
                                        </span>
                                      );
                                    }
                                    return <span key={i}>{part}</span>;
                                  })
                                : meta.japanese}
                            </p>
                            {meta.japanese && (
                              <JapaneseLookupButton
                                text={meta.japanese}
                                sentenceTranslation={meta.vietnamese}
                                className="mt-1"
                              />
                            )}
                          </div>
                          {meta.hiragana && (
                            <p lang="ja" className="text-sm text-muted">
                              {meta.hiragana}
                            </p>
                          )}
                          {meta.vietnamese && <p className="text-sm font-medium text-fg">{meta.vietnamese}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-line bg-surface">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedExample(isExpanded ? null : idx)}
                        className="flex w-full items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-4" aria-hidden />
                        ) : (
                          <ChevronDown className="size-4" aria-hidden />
                        )}
                        {isExpanded ? 'Đóng phân tích' : 'Phân tích câu'}
                      </button>

                      {isExpanded && (
                        <div className="space-y-4 border-t border-line p-4 md:p-5">
                          {conjugation && (
                            <div>
                              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                                Cách tạo câu
                              </h3>
                              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 font-mono text-sm text-fg">
                                <span lang="ja">{conjugation.base}</span>
                                <span className="text-subtle" aria-hidden>
                                  →
                                </span>
                                <span lang="ja" className="font-semibold text-primary-fg">
                                  {conjugation.conjugated}
                                </span>
                                <span className="text-subtle" aria-hidden>
                                  →
                                </span>
                                <span>{conjugation.rule}</span>
                              </div>
                            </div>
                          )}

                          {vocabList.length > 0 && (
                            <div>
                              <h3 className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">
                                Từ vựng
                              </h3>
                              <div className="divide-y divide-line rounded-lg border border-line bg-surface-2">
                                {vocabList.map((v, vi) => (
                                  <div
                                    key={vi}
                                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                                  >
                                    <div>
                                      <span lang="ja" className="font-semibold text-fg">
                                        {v.kanji || v.hiragana}
                                      </span>
                                      {v.kanji && v.hiragana && (
                                        <span lang="ja" className="ml-2 text-muted">
                                          ({v.hiragana})
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-right text-muted">
                                      {v.meaning?.split(',')[0]}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Practice Workspace */}
        <div>
          <Card padding="lg" className="sticky top-6 space-y-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-fg">
              <Play className="size-5 text-primary-fg" aria-hidden />
              Luyện tập chuyên sâu
            </h2>
            <p className="text-sm text-muted">
              Chọn luyện phản xạ theo tình huống sắc thái (giống thi thật) hoặc làm bài tổng hợp điền câu &amp; sắp xếp sao ★.
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<Sparkles className="size-4" aria-hidden />}
              onClick={() =>
                navigate(`/grammar/${bookId}/${chapterId}/practice/${grammarId}?mode=scenario&count=10`)
              }
            >
              Quiz Tình huống &amp; Sắc thái
            </Button>
            <Button
              variant="soft"
              size="md"
              fullWidth
              onClick={() =>
                navigate(`/grammar/${bookId}/${chapterId}/practice/${grammarId}?mode=mixed&count=10`)
              }
            >
              Luyện tổng hợp (Điền câu &amp; ★)
            </Button>

            <div className="border-t border-line pt-4">
              <Button
                variant="secondary"
                size="md"
                fullWidth
                leftIcon={<FileDown className="size-4" aria-hidden />}
                onClick={() =>
                  navigate(
                    `/pdf?tab=grammar&bookId=${bookId}&chapterId=${chapterId}&grammarId=${grammarId}`,
                  )
                }
              >
                Tạo PDF bài này
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
};
