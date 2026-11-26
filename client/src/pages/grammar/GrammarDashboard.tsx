import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, Check, ChevronDown, ChevronRight, ChevronUp, FileText, RotateCcw } from 'lucide-react';
import type { JLPTLevel } from '../../types/grammar';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveGrammarBooks } from '../../services/curriculumStore';
import { useAuth } from '../../context/auth-context';
import { getPreferredVocabLevel, resolveActiveVocabTextbook } from '../../data/vocabTextbooks';
import { cn } from '../../lib/cn';
import { useAppSelector } from '../../store/hooks';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  ProgressBar,
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

  const grammarRecords = useAppSelector((state) => state.grammarProgress.records);
  const isPracticed = (grammarId: string) => {
    const record = grammarRecords[grammarId];
    return Boolean(record && Object.values(record).some((score) => (score ?? 0) > 0));
  };

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
              className={buttonStyles({ variant: 'secondary', size: 'md' })}
            >
              <RotateCcw className="size-4" aria-hidden />
              Ôn lỗi sai
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
            const bookTotal = book.chapters.reduce((sum, c) => sum + c.grammars.length, 0);
            const bookPracticed = book.chapters.reduce(
              (sum, c) => sum + c.grammars.filter((g) => isPracticed(g.id)).length,
              0,
            );
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
                      <h2 className="line-clamp-2 text-base font-bold text-fg md:text-lg">{book.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge tone="primary">{book.level}</Badge>
                        {isActiveBook && <Badge tone="sakura">Giáo trình đang chọn</Badge>}
                        <span className="tabular text-xs text-muted">
                          {book.chapters.length} bài ·{' '}
                          {bookPracticed}/{bookTotal} mẫu đã luyện
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 text-muted" aria-hidden>
                    {expanded ? <ChevronUp className="size-5" /> : <ChevronDown className="size-5" />}
                  </span>
                </button>

                {expanded && (
                  <>
                    {bookTotal > 0 && (
                      <div className="border-t border-line px-4 pt-3 md:px-6">
                        <ProgressBar
                          value={bookPracticed}
                          max={bookTotal}
                          size="sm"
                          label={`Tiến độ ${book.title}`}
                        />
                      </div>
                    )}
                    <ul className="divide-y divide-line">
                      {book.chapters.map((chapter) => {
                        const total = chapter.grammars.length;
                        const done = chapter.grammars.filter((g) => isPracticed(g.id)).length;
                        const complete = total > 0 && done === total;
                        return (
                          <li
                            key={chapter.id}
                            className="flex items-center gap-2 px-4 py-2.5 transition-colors hover:bg-surface-2 md:px-6"
                          >
                            <Link
                              to={`/grammar/${book.id}/${chapter.id}`}
                              className="flex min-w-0 flex-1 items-center gap-3 py-0.5"
                            >
                              <span
                                className={cn(
                                  'tabular grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold',
                                  complete ? 'bg-success-soft text-success-fg' : 'bg-surface-2 text-muted',
                                )}
                              >
                                {complete ? (
                                  <Check className="size-4" aria-label="Đã luyện hết" />
                                ) : (
                                  chapter.chapterNumber
                                )}
                              </span>
                              <span className="min-w-0">
                                <span className="block text-sm font-semibold text-fg md:text-base">
                                  {chapter.title}
                                </span>
                                <span className="tabular block text-xs text-muted">
                                  {done > 0 ? `${done}/${total} mẫu đã luyện` : `${total} mẫu ngữ pháp`}
                                </span>
                              </span>
                              <ChevronRight className="ml-auto size-4 shrink-0 text-subtle" aria-hidden />
                            </Link>
                            <Link
                              to={`/grammar/${book.id}/${chapter.id}/practice?mode=scenario&count=12`}
                              className={buttonStyles({ variant: 'soft', size: 'sm', className: 'shrink-0' })}
                            >
                              Quiz
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
};
