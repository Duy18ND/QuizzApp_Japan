import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronDown, ChevronUp, FileDown, Play, RefreshCw } from 'lucide-react';
import { grammarBooks } from '../../data/grammar';
import { generateSmartQuestionSet } from '../../utils/grammarEngine/questionGenerator';
import { unit1Data } from '../../data/n3/unit1';
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
  const navigate = useNavigate();

  const { chapter, rule } = useMemo(() => {
    const book = grammarBooks.find((b) => b.id === bookId);
    const ch = book?.chapters.find((c) => c.id === chapterId);
    const gr = ch?.grammars.find((g) => g.id === grammarId);
    return { chapter: ch, rule: gr };
  }, [bookId, chapterId, grammarId]);

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
      rawVocabulary: unit1Data as unknown as Record<string, unknown>[],
      requestedPracticeTypes: ['example'],
    });
    return qs.questions as ExampleQuestion[];
  }, [rule]);

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
      rawVocabulary: unit1Data as unknown as Record<string, unknown>[],
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
        {/* Lý thuyết & Ví dụ */}
        <div className="space-y-6 lg:col-span-2">
          <Card padding="none" className="divide-y divide-line overflow-hidden">
            <section className="bg-primary-soft p-5 md:p-6">
              <h2 className="text-sm font-semibold tracking-wide text-primary-fg uppercase">
                1. Ý nghĩa
              </h2>
              <p className="mt-2 text-lg font-semibold text-fg">{rule.meaning}</p>
              {rule.explanation && <p className="mt-2 text-sm leading-relaxed text-muted">{rule.explanation}</p>}
            </section>

            {rule.usage && (
              <section className="p-5 md:p-6">
                <h2 className="mb-2 text-base font-semibold text-fg">2. Cách dùng</h2>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-fg md:text-base">
                  {rule.usage}
                </p>
              </section>
            )}

            <section className="p-5 md:p-6">
              <h2 className="mb-3 text-base font-semibold text-fg">3. Cấu trúc</h2>
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
                <h2 className="mb-3 text-base font-semibold text-fg">4. Cách chia / Form</h2>
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
                  <h2 className="font-semibold">Ghi chú</h2>
                  <p className="leading-relaxed whitespace-pre-wrap text-fg">{rule.notes}</p>
                </Notice>
              </section>
            )}
          </Card>

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
                          <p lang="ja" className="text-lg leading-loose font-medium text-fg md:text-xl">
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
              Luyện tập
            </h2>
            <p className="text-sm text-muted">
              Luyện tập 10 câu từ bộ 20 câu của ngữ pháp này.
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() =>
                navigate(`/grammar/${bookId}/${chapterId}/practice/${grammarId}?mode=mixed&count=10`)
              }
            >
              Bắt đầu luyện
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
