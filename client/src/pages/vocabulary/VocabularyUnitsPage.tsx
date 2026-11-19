import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  ChevronRight,
  Keyboard,
  ListChecks,
  PlayCircle,
} from 'lucide-react';
import {
  buildVocabToolQuery,
  findVocabTextbook,
  getUnitsForVocabTextbook,
  parseVocabLevelParam,
} from '../../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveUnitsForLevel } from '../../services/curriculumStore';
import { Badge, Card, CardLink, EmptyState, PageContainer, PageHeader } from '../../components/ui';

interface Props {
  basePath?: string;
  title?: string;
  hideTabs?: boolean;
}

export const VocabularyUnitsPage: React.FC<Props> = ({
  basePath = '/vocabulary',
  title = 'Từ vựng',
  hideTabs = false,
}) => {
  const { level, bookId } = useParams<{ level: string; bookId?: string }>();
  const levelKey = parseVocabLevelParam(level) ?? 'N3';
  const levelSegment = levelKey.toLowerCase();
  const cmsSnapshot = useCurriculumSnapshot();

  const textbook = useMemo(
    () => (bookId ? findVocabTextbook(levelKey, bookId) : undefined),
    [levelKey, bookId],
  );

  const units = useMemo(() => {
    if (textbook) {
      return getUnitsForVocabTextbook(cmsSnapshot, levelKey, textbook);
    }
    return getLiveUnitsForLevel(cmsSnapshot, levelKey);
  }, [cmsSnapshot, levelKey, textbook]);

  const totalBookWords = useMemo(
    () => units.reduce((sum, u) => sum + u.totalWords, 0),
    [units],
  );

  const toolQuery = buildVocabToolQuery(levelKey, textbook?.id);

  const textbookTools = useMemo(() => {
    const scopeLabel = textbook ? `${textbook.title} (${levelKey})` : `JLPT ${levelKey}`;
    return [
      {
        to: `/vocabulary/writing${toolQuery}`,
        title: 'Luyện gõ & nhớ từ',
        desc: `Gõ Hiragana/Kanji từ nghĩa Việt theo ${scopeLabel}.`,
        icon: Keyboard,
      },
      {
        to: `/vocabulary/review${toolQuery}`,
        title: 'Ôn tập tổng hợp',
        desc: `Ôn từ ★, từ làm sai và lỗi liên quan của ${scopeLabel}.`,
        icon: ListChecks,
      },
      {
        to: `/vocabulary/unmastered${toolQuery}`,
        title: 'Từ & Kanji chưa thuộc',
        desc: `Lọc điểm yếu thuộc ${scopeLabel} để luyện lại ngay.`,
        icon: BookMarked,
      },
      {
        to: `/vocabulary/quiz${toolQuery}`,
        title: 'Luyện Quiz từ vựng',
        desc: `Trắc nghiệm nhiều chế độ (có Việt → Kanji) cho ${scopeLabel}.`,
        icon: PlayCircle,
      },
    ];
  }, [levelKey, textbook, toolQuery]);

  const isTextbookView = !hideTabs && Boolean(textbook);

  const breadcrumbs = isTextbookView && textbook
    ? [
        { label: 'Trang chủ', to: '/' },
        { label: title, to: basePath },
        { label: `Trình độ ${levelKey}`, to: `${basePath}/${levelSegment}` },
        { label: textbook.title },
      ]
    : [
        { label: 'Trang chủ', to: '/' },
        { label: title, to: basePath },
        { label: `Trình độ ${levelKey}` },
      ];

  return (
    <PageContainer className="space-y-8">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={
          isTextbookView && textbook ? (
            <span className="flex flex-wrap items-center gap-2.5">
              <span>{textbook.title}</span>
              <Badge tone="primary">JLPT {levelKey}</Badge>
              {totalBookWords > 0 ? (
                <Badge tone="success" className="tabular">
                  {totalBookWords} từ vựng
                </Badge>
              ) : (
                <Badge tone="warning">Chưa có dữ liệu</Badge>
              )}
            </span>
          ) : (
            `Chọn bài học (${levelKey})`
          )
        }
        description={
          isTextbookView && textbook
            ? `${textbook.japaneseTitle} — ${textbook.description}`
            : `Danh sách các Unit thuộc trình độ ${levelKey}.`
        }
      />

      {isTextbookView && textbook && (
        <section className="space-y-3" aria-label="Công cụ luyện tập nhanh">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-fg">
              Công cụ luyện tập · {textbook.title} ({levelKey})
            </h2>
            <Badge tone="neutral">{textbook.shortTitle} · {levelKey}</Badge>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {textbookTools.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <CardLink to={item.to} padding="sm" className="group flex h-full items-center gap-3 p-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-fg">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-fg">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{item.desc}</span>
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary-fg"
                      aria-hidden
                    />
                  </CardLink>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="space-y-3" aria-label="Danh sách bài học">
        {isTextbookView && (
          <h2 className="text-base font-semibold text-fg">
            Danh sách bài học (Unit) · {textbook?.title}
          </h2>
        )}

        {units.length === 0 ? (
          <EmptyState
            title="Chưa có bài học cho giáo trình này"
            description={
              textbook
                ? `Dữ liệu từ vựng cho ${textbook.title} (${levelKey}) đang được cập nhật.`
                : `Đang cập nhật dữ liệu cho trình độ ${levelKey}.`
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {units.map((unit) => {
              const isAvailable = unit.totalWords > 0;
              const unitTargetPath =
                isTextbookView && textbook
                  ? `${basePath}/${levelSegment}/book/${textbook.id}/${unit.id}`
                  : `${basePath}/${levelSegment}/${unit.id}`;

              return (
                <li key={unit.id}>
                  {isAvailable ? (
                    <CardLink
                      to={unitTargetPath}
                      className="group flex items-center justify-between gap-4"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-fg">
                          <BookOpen className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-fg">{unit.name}</p>
                          <div className="mt-1">
                            <Badge tone="neutral" className="tabular">
                              {unit.totalWords} từ vựng
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        className="size-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary-fg"
                        aria-hidden
                      />
                    </CardLink>
                  ) : (
                    <Card
                      tone="muted"
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-center justify-between gap-4 opacity-70"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
                          <BookOpen className="size-5" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-muted">{unit.name}</p>
                          <div className="mt-1">
                            <Badge tone="warning">Sắp ra mắt</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </PageContainer>
  );
};
