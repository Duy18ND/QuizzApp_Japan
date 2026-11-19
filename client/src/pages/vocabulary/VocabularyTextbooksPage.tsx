import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, BookOpen } from 'lucide-react';
import {
  getUnitsForVocabTextbook,
  getVocabTextbooksForLevel,
  parseVocabLevelParam,
} from '../../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { Badge, CardLink, EmptyState, PageContainer, PageHeader } from '../../components/ui';

export const VocabularyTextbooksPage: React.FC = () => {
  const { level } = useParams<{ level: string }>();
  const levelKey = parseVocabLevelParam(level) ?? 'N5';
  const levelSegment = levelKey.toLowerCase();
  const cmsSnapshot = useCurriculumSnapshot();

  const textbooks = useMemo(() => {
    return getVocabTextbooksForLevel(levelKey).map((book) => {
      const units = getUnitsForVocabTextbook(cmsSnapshot, levelKey, book);
      const totalWords = units.reduce((sum, u) => sum + u.totalWords, 0);
      const activeUnitCount = units.filter((u) => u.totalWords > 0).length;
      return { book, units, totalWords, activeUnitCount };
    });
  }, [cmsSnapshot, levelKey]);

  return (
    <PageContainer size="md" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Từ vựng', to: '/vocabulary' },
          { label: `Trình độ ${levelKey}` },
        ]}
        title={`Chọn giáo trình (${levelKey})`}
        description={`Chọn bộ giáo trình từ vựng thuộc trình độ JLPT ${levelKey} để mở công cụ luyện tập và danh sách bài học tương ứng.`}
      />

      {textbooks.length === 0 ? (
        <EmptyState
          title="Chưa có giáo trình"
          description={`Đang cập nhật danh sách giáo trình cho trình độ ${levelKey}.`}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {textbooks.map(({ book, totalWords, activeUnitCount }) => {
            const hasWords = totalWords > 0;

            return (
              <li key={book.id}>
                <CardLink
                  to={`/vocabulary/${levelSegment}/book/${book.id}`}
                  padding="md"
                  className="group flex h-full items-start gap-3.5"
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-fg">
                    <BookOpen className="size-5" aria-hidden />
                  </span>

                  <span className="min-w-0 flex-1 space-y-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-fg">{book.title}</span>
                      <Badge tone="primary">{levelKey}</Badge>
                    </span>

                    <span lang="ja" className="block text-xs font-medium text-primary-fg">
                      {book.japaneseTitle}
                    </span>

                    <span className="block text-xs leading-relaxed text-muted sm:text-sm">
                      {book.description}
                    </span>

                    <span className="flex flex-wrap items-center gap-2 pt-1">
                      {hasWords ? (
                        <>
                          <Badge tone="success" className="tabular">
                            {totalWords} từ vựng
                          </Badge>
                          <Badge tone="neutral" className="tabular">
                            {activeUnitCount} bài học
                          </Badge>
                        </>
                      ) : (
                        <Badge tone="warning">Sắp ra mắt · 0 từ</Badge>
                      )}
                    </span>
                  </span>

                  <ArrowRight
                    className="mt-1 size-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary-fg"
                    aria-hidden
                  />
                </CardLink>
              </li>
            );
          })}
        </ul>
      )}
    </PageContainer>
  );
};
