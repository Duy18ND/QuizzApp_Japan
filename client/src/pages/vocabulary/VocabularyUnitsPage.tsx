import React, { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  ChevronRight,
  Keyboard,
  ListChecks,
  Play,
  PlayCircle,
} from 'lucide-react';
import {
  buildVocabToolQuery,
  findVocabTextbook,
  getUnitsForVocabTextbook,
  getVocabTextbooksForLevel,
  parseVocabLevelParam,
  resolveActiveVocabTextbook,
  savePreferredVocabLevel,
  savePreferredVocabTextbookId,
} from '../../data/vocabTextbooks';
import { useAuth } from '../../context/auth-context';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveUnitsForLevel } from '../../services/curriculumStore';
import type { JLPTLevel } from '../../types/quiz';
import {
  Badge,
  Card,
  CardLink,
  EmptyState,
  Field,
  PageContainer,
  PageHeader,
  Select,
  buttonStyles,
} from '../../components/ui';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

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
  const navigate = useNavigate();
  const { user, studyLevel, studyTextbookId, updateStudyLevel } = useAuth();
  const levelKey = parseVocabLevelParam(level) ?? studyLevel ?? 'N3';
  const levelSegment = levelKey.toLowerCase();
  const cmsSnapshot = useCurriculumSnapshot();
  const levelTextbooks = useMemo(() => getVocabTextbooksForLevel(levelKey), [levelKey]);

  const textbook = useMemo(() => {
    if (bookId) {
      return (
        findVocabTextbook(levelKey, bookId) ??
        resolveActiveVocabTextbook(levelKey, user?.id)
      );
    }
    return resolveActiveVocabTextbook(
      levelKey,
      user?.id,
      levelKey === studyLevel ? studyTextbookId : null,
    );
  }, [bookId, levelKey, studyLevel, studyTextbookId, user?.id]);

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

  const handleLevelChange = (nextLevel: JLPTLevel) => {
    const nextBook = resolveActiveVocabTextbook(nextLevel, user?.id);
    savePreferredVocabLevel(nextLevel, user?.id);
    savePreferredVocabTextbookId(nextLevel, nextBook.id, user?.id);
    if (user) {
      void updateStudyLevel(nextLevel, nextBook.id);
    }
    navigate(`${basePath}/${nextLevel.toLowerCase()}/book/${nextBook.id}`);
  };

  const handleBookChange = (nextBookId: string) => {
    savePreferredVocabLevel(levelKey, user?.id);
    savePreferredVocabTextbookId(levelKey, nextBookId, user?.id);
    if (user && studyLevel === levelKey) {
      void updateStudyLevel(levelKey, nextBookId);
    }
    navigate(`${basePath}/${levelSegment}/book/${nextBookId}`);
  };

  const isTextbookView = !hideTabs && Boolean(textbook);

  const breadcrumbs = textbook
    ? [
        { label: 'Trang chủ', to: '/' },
        { label: title },
        { label: `${levelKey} · ${textbook.shortTitle}` },
      ]
    : [
        { label: 'Trang chủ', to: '/' },
        { label: title },
        { label: `Trình độ ${levelKey}` },
      ];

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={
          textbook ? (
            <span className="flex flex-wrap items-center gap-2.5">
              <span>{hideTabs ? `${title} · ${textbook.title}` : textbook.title}</span>
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
          textbook
            ? `${textbook.japaneseTitle} — ${textbook.description}`
            : `Danh sách các Unit thuộc trình độ ${levelKey}.`
        }
      />

      {/* Compact Context Switcher (Level + Textbook in 1 click without intermediate screens) */}
      <section
        aria-label="Đổi nhanh trình độ và giáo trình"
        className="grid grid-cols-1 gap-3 rounded-xl border border-line bg-glass p-3.5 shadow-card sm:grid-cols-2 sm:p-4"
      >
        <Field label="Trình độ JLPT" htmlFor={`${title}-level-switcher`}>
          <Select
            id={`${title}-level-switcher`}
            value={levelKey}
            onChange={(e) => handleLevelChange(e.target.value as JLPTLevel)}
          >
            {LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                JLPT {lvl}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Giáo trình đang học" htmlFor={`${title}-book-switcher`}>
          <Select
            id={`${title}-book-switcher`}
            value={textbook?.id ?? ''}
            onChange={(e) => handleBookChange(e.target.value)}
          >
            {levelTextbooks.map((book) => {
              const bookWordCount = getUnitsForVocabTextbook(cmsSnapshot, levelKey, book).reduce(
                (sum, u) => sum + u.totalWords,
                0,
              );
              return (
                <option key={book.id} value={book.id}>
                  {book.title}
                  {bookWordCount > 0 ? ` (${bookWordCount} từ)` : ' (Đang cập nhật)'}
                </option>
              );
            })}
          </Select>
        </Field>
      </section>

      <section className="space-y-3" aria-label="Danh sách bài học">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-glass px-3.5 py-2 shadow-card">
          <h2 className="text-base font-semibold text-fg">
            Danh sách bài học (Unit) · {textbook?.shortTitle ?? levelKey}
          </h2>
          {totalBookWords > 0 && (
            <span className="tabular text-xs font-medium text-muted">
              {units.filter((u) => u.totalWords > 0).length} bài có sẵn · {totalBookWords} từ
            </span>
          )}
        </div>

        {units.length === 0 ? (
          <EmptyState
            className="bg-glass"
            title="Chưa có bài học cho giáo trình này"
            description={
              textbook
                ? `Dữ liệu từ vựng cho ${textbook.title} (${levelKey}) đang được cập nhật. Bạn có thể chọn giáo trình hoặc trình độ khác ở thanh phía trên.`
                : `Đang cập nhật dữ liệu cho trình độ ${levelKey}.`
            }
          />
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {units.map((unit) => {
              const isAvailable = unit.totalWords > 0;
              const unitTargetPath = textbook
                ? `${basePath}/${levelSegment}/book/${textbook.id}/${unit.dbUnitId ?? unit.id}`
                : `${basePath}/${levelSegment}/${unit.id}`;
              const quickQuizParams = new URLSearchParams({
                level: levelKey,
                unit: String(unit.id),
                autoStart: '1',
              });
              if (textbook) quickQuizParams.set('book', textbook.id);
              if (unit.dbUnitId) quickQuizParams.set('unitDbId', unit.dbUnitId);

              return (
                <li key={unit.dbUnitId ?? unit.id}>
                  {isAvailable ? (
                    <Card
                      padding="sm"
                      className="flex h-full flex-col justify-between gap-3 p-3.5 transition-colors hover:border-primary"
                    >
                      <Link
                        to={unitTargetPath}
                        className="group flex min-w-0 items-center justify-between gap-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-fg">
                            <BookOpen className="size-5" aria-hidden />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-fg group-hover:text-primary-fg">
                              {unit.name}
                            </p>
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
                      </Link>
                      {!hideTabs && (
                        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
                          <Link
                            to={unitTargetPath}
                            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                          >
                            <BookOpen className="size-3.5" aria-hidden />
                            Học từ vựng
                          </Link>
                          <Link
                            to={`/vocabulary/quiz?${quickQuizParams.toString()}`}
                            className={buttonStyles({ variant: 'soft', size: 'sm' })}
                          >
                            <Play className="size-3.5" aria-hidden />
                            Quiz nhanh
                          </Link>
                          <Link
                            to={`/flashcard/${levelSegment}/book/${textbook.id}/${unit.dbUnitId ?? unit.id}`}
                            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                          >
                            Flashcard
                          </Link>
                          <Link
                            to={`/games?game=shooter&level=${levelKey}&book=${textbook.id}&unit=${unit.id}`}
                            className={buttonStyles({ variant: 'soft', size: 'sm' })}
                          >
                            Chém từ (Game)
                          </Link>
                        </div>
                      )}
                    </Card>
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

      {isTextbookView && textbook && (
        <section className="space-y-3" aria-label="Công cụ luyện tập nhanh">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-glass px-3.5 py-2 shadow-card">
            <h2 className="text-base font-semibold text-fg">
              Công cụ luyện tập · {textbook.title} ({levelKey})
            </h2>
            <Badge tone="neutral">
              {textbook.shortTitle} · {levelKey}
            </Badge>
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {textbookTools.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <CardLink
                    to={item.to}
                    padding="sm"
                    className="group flex h-full items-center gap-3 p-3.5"
                  >
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
    </PageContainer>
  );
};
