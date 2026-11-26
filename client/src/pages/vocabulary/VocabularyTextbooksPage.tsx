import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Play, ScrollText } from 'lucide-react';
import {
  getPreferredVocabTextbookId,
  getUnitsForVocabTextbook,
  getVocabTextbooksForLevel,
  parseVocabLevelParam,
  savePreferredVocabLevel,
  savePreferredVocabTextbookId,
} from '../../data/vocabTextbooks';
import { useAuth } from '../../context/auth-context';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { Badge, Button, EmptyState, Field, PageContainer, PageHeader, Select } from '../../components/ui';
import { buttonStyles } from '../../components/ui/styles';
import type { JLPTLevel } from '../../types/quiz';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const VocabularyTextbooksPage: React.FC = () => {
  const { level } = useParams<{ level: string }>();
  const navigate = useNavigate();
  const { studyLevel, updateStudyLevel, user } = useAuth();
  const levelKey = parseVocabLevelParam(level) ?? studyLevel ?? 'N3';
  const [bookSelection, setBookSelection] = useState<{ level: JLPTLevel; bookId: string } | null>(null);
  const selectedBookId =
    (bookSelection?.level === levelKey ? bookSelection.bookId : null) ??
    getPreferredVocabTextbookId(levelKey, user?.id) ??
    getVocabTextbooksForLevel(levelKey)[0]?.id ??
    '';
  const cmsSnapshot = useCurriculumSnapshot();
  const textbooks = getVocabTextbooksForLevel(levelKey);

  const textbookStats = useMemo(
    () =>
      textbooks.map((book) => {
        const bookUnits = getUnitsForVocabTextbook(cmsSnapshot, levelKey, book);
        const wordCount = bookUnits.reduce((sum, u) => sum + u.totalWords, 0);
        return { book, unitCount: bookUnits.length, wordCount, isReady: wordCount > 0 };
      }),
    [cmsSnapshot, levelKey, textbooks],
  );
  const firstReadyBook = textbookStats.find((s) => s.isReady)?.book ?? null;

  const textbook = useMemo(
    () => textbooks.find((book) => book.id === selectedBookId) ?? textbooks[0],
    [selectedBookId, textbooks],
  );
  const units = useMemo(
    () => (textbook ? getUnitsForVocabTextbook(cmsSnapshot, levelKey, textbook) : []),
    [cmsSnapshot, levelKey, textbook],
  );
  const totalWords = units.reduce((sum, unit) => sum + unit.totalWords, 0);
  const availableUnits = units.filter((unit) => unit.totalWords > 0).length;

  const handleLevelChange = async (nextLevel: JLPTLevel) => {
    savePreferredVocabLevel(nextLevel, user?.id);
    if (studyLevel !== nextLevel) await updateStudyLevel(nextLevel);
    navigate(`/vocabulary/${nextLevel.toLowerCase()}`);
  };

  const handleBookChange = (nextBookId: string) => {
    setBookSelection({ level: levelKey, bookId: nextBookId });
    savePreferredVocabTextbookId(levelKey, nextBookId, user?.id);
  };

  const fullBookQuizParams = new URLSearchParams({
    level: levelKey,
    book: textbook?.id ?? '',
    unit: 'all',
    autoStart: '1',
  });

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Từ vựng', to: '/vocabulary' },
          { label: `Trình độ ${levelKey}` },
        ]}
        title={`Từ vựng · ${levelKey}`}
        actions={
          textbook && totalWords > 0 ? (
            <Link
              to={`/vocabulary/quiz?${fullBookQuizParams.toString()}`}
              className={buttonStyles({ variant: 'primary', size: 'md' })}
            >
              <Play className="size-4" aria-hidden />
              Quiz cả giáo trình
            </Link>
          ) : undefined
        }
      />

      <section className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 sm:p-5" aria-label="Lựa chọn học tập">
        <Field label="Trình độ JLPT" htmlFor="vocabulary-level">
          <Select
            id="vocabulary-level"
            value={levelKey}
            onChange={(event) => void handleLevelChange(event.target.value as JLPTLevel)}
          >
            {LEVELS.map((item) => (
              <option key={item} value={item}>
                JLPT {item}
              </option>
            ))}
          </Select>
        </Field>
        {textbookStats.length > 1 && (
        <Field label="Giáo trình từ vựng" htmlFor="vocabulary-textbook">
          <Select
            id="vocabulary-textbook"
            value={textbook?.id ?? ''}
            onChange={(event) => handleBookChange(event.target.value)}
          >
            {textbookStats.map(({ book, wordCount, isReady }) => (
              <option key={book.id} value={book.id}>
                {book.title} {isReady ? `(${wordCount} từ)` : '— Sắp ra mắt'}
              </option>
            ))}
          </Select>
        </Field>
        )}
        {textbook && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 sm:col-span-2">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span lang="ja" className="font-medium text-primary-fg">{textbook.japaneseTitle}</span>
              <span aria-hidden>·</span>
              {totalWords > 0 ? (
                <span className="tabular">{availableUnits} bài có dữ liệu · {totalWords} từ</span>
              ) : (
                <Badge tone="warning">Sắp ra mắt</Badge>
              )}
            </div>
            <p className="text-xs text-muted">Lựa chọn giáo trình được ghi nhớ cho lần sau.</p>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-label="Bài học từ vựng">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-fg">
            {textbook ? `Bài học · ${textbook.shortTitle}` : 'Bài học'}
          </h2>
          {textbook && <span className="text-sm text-muted">{textbook.description}</span>}
        </div>

        {!textbook || units.length === 0 ? (
          <EmptyState
            title={`Giáo trình ${textbook?.shortTitle ?? ''} (${levelKey}) — Sắp ra mắt`}
            description={`Đội ngũ đang biên soạn và kiểm duyệt bộ từ vựng cho ${textbook?.title ?? 'giáo trình này'}. Bạn có thể học ngay các giáo trình đã hoàn thiện trong lúc chờ cập nhật.`}
            action={
              firstReadyBook && firstReadyBook.id !== textbook?.id ? (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => handleBookChange(firstReadyBook.id)}
                >
                  Học ngay: {firstReadyBook.title}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => void handleLevelChange('N5')}
                >
                  Mở trọn bộ N5 · Minna no Nihongo I (25 bài)
                </Button>
              )
            }
          />
        ) : (
          <ol className="divide-y divide-line border-y border-line">
            {units.map((unit) => {
              const isAvailable = unit.totalWords > 0;
              const unitPath = `/vocabulary/${levelKey.toLowerCase()}/book/${textbook.id}/${unit.dbUnitId ?? unit.id}`;
              const quizParams = new URLSearchParams({
                level: levelKey,
                book: textbook.id,
                unit: String(unit.id),
                autoStart: '1',
              });
              if (unit.dbUnitId) quizParams.set('unitDbId', unit.dbUnitId);

              return (
                <li key={unit.dbUnitId ?? unit.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-fg">
                      <ScrollText className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-fg">{unit.name}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {isAvailable ? `${unit.totalWords} từ vựng` : 'Chưa có dữ liệu từ vựng'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:shrink-0">
                    {isAvailable ? (
                      <>
                        <Link to={unitPath} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                          <BookOpen className="size-4" aria-hidden />
                          Mở bài học
                        </Link>
                        <Link
                          to={`/vocabulary/quiz?${quizParams.toString()}`}
                          className={buttonStyles({ variant: 'soft', size: 'sm' })}
                        >
                          <Play className="size-4" aria-hidden />
                          Quiz bài này
                          <ArrowRight className="size-4" aria-hidden />
                        </Link>
                      </>
                    ) : (
                      <Button variant="secondary" size="sm" disabled>
                        Sắp có dữ liệu
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </PageContainer>
  );
};
