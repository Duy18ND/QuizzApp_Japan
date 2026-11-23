import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, ChevronDown, ChevronRight, ChevronUp, FileText, LayoutList } from 'lucide-react';
import type { JLPTLevel } from '../../types/grammar';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveGrammarBooks } from '../../services/curriculumStore';
import { useAuth } from '../../context/auth-context';
import { getPreferredVocabLevel, resolveActiveVocabTextbook } from '../../data/vocabTextbooks';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  PageContainer,
  PageHeader,
  buttonStyles,
} from '../../components/ui';

const LEVELS: (JLPTLevel | 'All')[] = ['All', 'N5', 'N4', 'N3', 'N2', 'N1'];

export const GrammarDashboard: React.FC = () => {
  const { studyLevel, studyTextbookId, user } = useAuth();
  const [selectedLevelOverride, setSelectedLevelOverride] = useState<JLPTLevel | 'All' | null>(null);
  const [expandedBooks, setExpandedBooks] = useState<Record<string, boolean>>({});

  const selectedLevel =
    selectedLevelOverride ?? studyLevel ?? getPreferredVocabLevel(user?.id) ?? 'All';

  const cmsSnapshot = useCurriculumSnapshot();
  const grammarBooks = getLiveGrammarBooks(cmsSnapshot);
  const filteredBooks = grammarBooks.filter(
    (book) => selectedLevel === 'All' || book.level === selectedLevel,
  );

  const activeTextbookId =
    selectedLevel !== 'All'
      ? resolveActiveVocabTextbook(
          selectedLevel,
          user?.id,
          selectedLevel === studyLevel ? studyTextbookId : null,
        ).id
      : null;

  const isExpanded = (bookId: string, index: number) => {
    if (expandedBooks[bookId] !== undefined) return expandedBooks[bookId];
    if (activeTextbookId && filteredBooks.some((b) => b.id === activeTextbookId)) {
      return bookId === activeTextbookId;
    }
    return index === 0;
  };

  const toggleBook = (bookId: string, index: number) => {
    setExpandedBooks((prev) => ({
      ...prev,
      [bookId]: !isExpanded(bookId, index),
    }));
  };

  return (
    <PageContainer>
      <PageHeader
        title="Ngữ pháp"
        description="Hệ thống học ngữ pháp theo giáo trình chuẩn."
        actions={
          <>
            <Link
              to="/pdf?tab=grammar"
              className={buttonStyles({ variant: 'secondary', size: 'md' })}
            >
              <FileText className="size-4" aria-hidden />
              Xuất PDF
            </Link>
            <Link
              to="/grammar/mistakes"
              className={buttonStyles({ variant: 'danger', size: 'md' })}
            >
              Ôn tập lỗi sai
            </Link>
          </>
        }
      />

      {/* Level Filter */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-medium text-muted">Cấp độ:</span>
        {LEVELS.map((level) => (
          <Chip
            key={level}
            selected={selectedLevel === level}
            onClick={() => setSelectedLevelOverride(level)}
          >
            {level === 'All' ? 'Tất cả' : level}
          </Chip>
        ))}
      </div>

      {/* Books & Chapters List */}
      {filteredBooks.length === 0 ? (
        <EmptyState
          title={`Chưa có giáo trình ngữ pháp cho ${selectedLevel}`}
          description="Dữ liệu ngữ pháp cho cấp độ này đang được cập nhật. Bạn có thể xem tất cả cấp độ có sẵn."
          action={
            selectedLevel !== 'All' ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedLevelOverride('All')}
              >
                Xem tất cả cấp độ
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredBooks.map((book, bookIdx) => {
            const expanded = isExpanded(book.id, bookIdx);
            const isActiveBook = activeTextbookId === book.id;
            return (
              <Card key={book.id} padding="none" className="overflow-hidden">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => toggleBook(book.id, bookIdx)}
                  className="flex w-full items-center justify-between gap-4 bg-glass-soft px-5 py-3.5 text-left transition-colors hover:bg-glass-hover md:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-fg">
                      <Book className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-fg">{book.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone="primary">{book.level}</Badge>
                        {isActiveBook && <Badge tone="sakura">Giáo trình đang chọn</Badge>}
                        <span className="tabular text-xs text-muted">
                          {book.chapters.length} bài học
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-muted" aria-hidden>
                    {expanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                  </span>
                </button>

                {expanded && (
                  <div className="divide-y divide-line border-t border-line">
                    {book.chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className="flex flex-col justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center md:px-6"
                      >
                        <div className="flex min-w-0 items-start gap-3.5">
                          <span className="tabular mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold text-muted">
                            {chapter.chapterNumber}
                          </span>
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-fg">{chapter.title}</h3>
                            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                              <LayoutList className="size-4 shrink-0" aria-hidden />
                              <span className="tabular">{chapter.grammars.length} ngữ pháp</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                          <Link
                            to={`/grammar/${book.id}/${chapter.id}/practice?mode=scenario&count=12`}
                            className={buttonStyles({
                              variant: 'primary',
                              size: 'sm',
                            })}
                          >
                            🎯 Quiz Tình huống
                          </Link>
                          <Link
                            to={`/grammar/${book.id}/${chapter.id}`}
                            className={buttonStyles({
                              variant: 'soft',
                              size: 'sm',
                            })}
                          >
                            Lý thuyết &amp; Mẹo nhớ
                            <ChevronRight className="size-4" aria-hidden />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
};
