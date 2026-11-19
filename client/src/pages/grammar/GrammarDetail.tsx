import React, { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, FileText, PlayCircle } from 'lucide-react';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveGrammarBooks } from '../../services/curriculumStore';
import { useAppSelector } from '../../store/hooks';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageContainer,
  PageHeader,
  ProgressBar,
  buttonStyles,
} from '../../components/ui';

export const GrammarDetail: React.FC = () => {
  const { bookId, chapterId } = useParams<{ bookId: string; chapterId: string }>();
  const navigate = useNavigate();
  const cmsSnapshot = useCurriculumSnapshot();
  const progressRecords = useAppSelector((state) => state.grammarProgress.records);

  const { book, chapter } = useMemo(() => {
    const books = getLiveGrammarBooks(cmsSnapshot);
    const b = books.find((bk) => bk.id === bookId);
    const c = b?.chapters.find((ch) => ch.id === chapterId);
    return { book: b, chapter: c };
  }, [cmsSnapshot, bookId, chapterId]);

  if (!book || !chapter) {
    return (
      <PageContainer size="md">
        <EmptyState
          title="Không tìm thấy dữ liệu"
          description="Bài học ngữ pháp bạn tìm không tồn tại."
          action={
            <Link to="/grammar" className={buttonStyles({ variant: 'secondary' })}>
              Quay lại danh sách
            </Link>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer size="md">
      <PageHeader
        breadcrumbs={[
          { label: 'Ngữ pháp', to: '/grammar' },
          { label: book.title },
          { label: `Bài ${chapter.chapterNumber}` },
        ]}
        title={chapter.title}
        description={book.title}
        actions={
          <>
            <Button
              variant="secondary"
              leftIcon={<FileText className="size-4" aria-hidden />}
              onClick={() => navigate(`/pdf?tab=grammar&bookId=${book.id}&chapterId=${chapter.id}`)}
            >
              Tạo bài tập PDF
            </Button>
            <Button
              variant="primary"
              leftIcon={<PlayCircle className="size-4" aria-hidden />}
              onClick={() =>
                navigate(`/grammar/${book.id}/${chapter.id}/practice?count=20&mode=mixed`)
              }
            >
              Luyện tập toàn bộ bài
            </Button>
          </>
        }
      />

      <Card padding="none" className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">
            Danh sách ngữ pháp
          </h2>
          <Badge tone="neutral" className="tabular">
            {chapter.grammars.length} cấu trúc
          </Badge>
        </div>

        <div className="divide-y divide-line">
          {chapter.grammars.map((grammar, index) => {
            const record = progressRecords[grammar.id];
            const bestScore = record
              ? Math.max(0, ...Object.values(record).map((score) => score ?? 0))
              : 0;

            return (
              <div key={grammar.id} className="space-y-4 p-5 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="tabular text-sm font-semibold text-muted">{index + 1}.</span>
                      <h3 lang="ja" className="text-xl font-bold text-fg">
                        {grammar.name}
                      </h3>
                      {grammar.hiragana && (
                        <Badge tone="primary" className="jp">
                          {grammar.hiragana}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted">
                      Ý nghĩa: <span className="font-medium text-fg">{grammar.meaning}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      to={`/grammar/${bookId}/${chapterId}/lesson/${grammar.id}`}
                      className={buttonStyles({ variant: 'soft', size: 'sm' })}
                    >
                      <BookOpen className="size-4" aria-hidden />
                      Học ngay
                    </Link>
                  </div>
                </div>

                {bestScore > 0 && (
                  <div className="flex items-center gap-3">
                    <ProgressBar
                      value={bestScore}
                      max={100}
                      size="sm"
                      tone={bestScore >= 80 ? 'success' : 'primary'}
                      label={`Tiến độ ${grammar.name}`}
                      className="max-w-48"
                    />
                    <span className="tabular text-xs font-medium text-muted">{bestScore}%</span>
                  </div>
                )}

                {grammar.templates && grammar.templates.length > 0 && (
                  <div className="rounded-lg border border-line bg-surface-2 p-3.5">
                    <p className="mb-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                      Cấu trúc
                    </p>
                    <ul className="space-y-1 text-sm">
                      {grammar.templates.map((t, idx) => (
                        <li key={idx} className="text-fg">
                          <span lang="ja" className="font-medium">
                            ・ {t.pattern}
                          </span>
                          {t.vietnamesePattern && (
                            <span className="mt-0.5 block pl-4 text-xs text-muted">
                              → {t.vietnamesePattern}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </PageContainer>
  );
};
