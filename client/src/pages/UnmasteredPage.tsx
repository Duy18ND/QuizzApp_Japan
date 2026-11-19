import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Pencil, Play, Volume2 } from 'lucide-react';
import { LoginRequiredState } from '../components/auth/LoginRequiredState';
import { useAuth } from '../context/auth-context';
import {
  buildVocabToolQuery,
  findVocabTextbook,
  getWordsForVocabTextbook,
  parseVocabLevelParam,
} from '../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../hooks/useCurriculumData';
import { getLiveAllVocabulary, getLiveKanjis } from '../services/curriculumStore';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAppSelector } from '../store/hooks';
import type { JLPTLevel } from '../types/quiz';
import { speakJapanese } from '../utils/tts';
import { getVocabularyDisplay } from '../utils/vocabularyHelpers';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Notice,
  PageContainer,
  PageHeader,
  SearchInput,
  Stat,
  buttonStyles,
} from '../components/ui';

type FilterTab = 'all' | 'vocab' | 'kanji';
const LEVELS: Array<'All' | JLPTLevel> = ['All', 'N5', 'N4', 'N3', 'N2', 'N1'];

export const UnmasteredPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const kanjiProgress = useAppSelector((state) => state.kanji.progress);
  const { progress, clearWrongWord } = useUserProgress();
  const { settings } = useAppSettings();
  const cmsSnapshot = useCurriculumSnapshot();

  const levelParam = parseVocabLevelParam(searchParams.get('level'));
  const textbook = useMemo(
    () => findVocabTextbook(levelParam, searchParams.get('book')),
    [levelParam, searchParams],
  );
  const initialLevel = textbook?.level ?? levelParam ?? 'All';

  const [tab, setTab] = useState<FilterTab>('all');
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<'All' | JLPTLevel>(initialLevel);

  const allKanji = useMemo(() => getLiveKanjis(cmsSnapshot), [cmsSnapshot]);
  const allVocab = useMemo(() => {
    if (textbook) {
      return getWordsForVocabTextbook(cmsSnapshot, textbook.level, textbook);
    }
    return getLiveAllVocabulary(cmsSnapshot);
  }, [cmsSnapshot, textbook]);

  const missedVocab = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allVocab
      .filter((w) => (progress.wrongWords[w.id] || 0) > 0)
      .filter((w) => {
        if (levelFilter !== 'All' && w.level !== levelFilter) return false;
        if (!q) return true;
        return (
          (w.kanji || '').toLowerCase().includes(q) ||
          w.hiragana.toLowerCase().includes(q) ||
          (w.hanViet || '').toLowerCase().includes(q) ||
          w.meaning.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (progress.wrongWords[b.id] || 0) - (progress.wrongWords[a.id] || 0));
  }, [allVocab, levelFilter, progress.wrongWords, search]);

  const unmasteredKanji = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allKanji
      .filter((k) => !kanjiProgress[k.id]?.learned)
      .filter((k) => {
        if (levelFilter !== 'All' && k.jlptLevel !== levelFilter) return false;
        if (!q) return true;
        return (
          k.kanji.includes(search.trim()) ||
          (k.hanViet || '').toLowerCase().includes(q) ||
          k.meanings.some((m) => m.toLowerCase().includes(q))
        );
      });
  }, [allKanji, kanjiProgress, levelFilter, search]);

  const showVocab = tab === 'all' || tab === 'vocab';
  const showKanji = tab === 'all' || tab === 'kanji';

  const scopedWrongVocabCount = useMemo(
    () =>
      allVocab.filter(
        (w) => (progress.wrongWords[w.id] || 0) > 0 && (levelFilter === 'All' || w.level === levelFilter),
      ).length,
    [allVocab, progress.wrongWords, levelFilter],
  );
  const scopedTotalKanji = useMemo(
    () => allKanji.filter((k) => levelFilter === 'All' || k.jlptLevel === levelFilter),
    [allKanji, levelFilter],
  );
  const scopedUnmasteredKanjiCount = useMemo(
    () => scopedTotalKanji.filter((k) => !kanjiProgress[k.id]?.learned).length,
    [scopedTotalKanji, kanjiProgress],
  );

  const scopeTitle = textbook
    ? `${textbook.title} (${textbook.level})`
    : levelFilter !== 'All'
      ? `JLPT ${levelFilter}`
      : null;
  const toolQuery =
    levelFilter !== 'All' ? buildVocabToolQuery(levelFilter, textbook?.id) : '';
  const pageBreadcrumbs = textbook
    ? [
        { label: 'Trang chủ', to: '/' },
        { label: 'Từ vựng', to: '/vocabulary' },
        { label: `Trình độ ${textbook.level}`, to: `/vocabulary/${textbook.level.toLowerCase()}` },
        { label: textbook.title, to: `/vocabulary/${textbook.level.toLowerCase()}/book/${textbook.id}` },
        { label: 'Chưa thuộc & Từ sai' },
      ]
    : [
        { label: 'Trang chủ', to: '/' },
        { label: 'Từ vựng', to: '/vocabulary' },
        { label: 'Chưa thuộc & Từ sai' },
      ];

  if (!user) {
    return (
      <PageContainer className="space-y-6">
        <PageHeader
          breadcrumbs={pageBreadcrumbs}
          title={
            <span className="flex flex-wrap items-center gap-2.5">
              <span>Từ &amp; Kanji chưa thuộc</span>
              {scopeTitle && <Badge tone="primary">{scopeTitle}</Badge>}
            </span>
          }
          description="Theo dõi các từ vựng hay làm sai và chữ Kanji chưa hoàn thành để luyện lại nhanh."
        />
        <LoginRequiredState
          title="Đăng nhập để lưu & xem từ / Kanji chưa thuộc"
          description="Hệ thống chỉ lưu danh sách từ sai và tiến độ luyện Kanji theo từng tài khoản đã đăng nhập."
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        breadcrumbs={pageBreadcrumbs}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            <span>Từ &amp; Kanji chưa thuộc</span>
            {scopeTitle && <Badge tone="primary">{scopeTitle}</Badge>}
          </span>
        }
        description={
          scopeTitle
            ? `Theo dõi từ vựng làm sai và Kanji chưa thuộc theo phạm vi ${scopeTitle}.`
            : 'Theo dõi các từ vựng hay làm sai và chữ Kanji chưa hoàn thành để luyện lại nhanh.'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to={`/vocabulary/quiz${toolQuery}`} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              <Play className="size-4" aria-hidden />
              Làm Quiz
            </Link>
            <Link to={`/vocabulary/writing${toolQuery}`} className={buttonStyles({ variant: 'primary', size: 'sm' })}>
              <Pencil className="size-4" aria-hidden />
              Luyện gõ từ
            </Link>
          </div>
        }
      />

      {textbook && (
        <Notice tone="info" className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Đang lọc theo giáo trình: <strong>{textbook.title} ({textbook.level})</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete('level');
              next.delete('book');
              setSearchParams(next, { replace: true });
              setLevelFilter('All');
            }}
          >
            Xem tất cả giáo trình
          </Button>
        </Notice>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card padding="md">
          <Stat label="Từ vựng làm sai cần ôn" value={scopedWrongVocabCount} />
        </Card>
        <Card padding="md">
          <Stat
            label="Kanji chưa thuộc"
            value={`${scopedUnmasteredKanjiCount} / ${scopedTotalKanji.length}`}
          />
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Chip selected={tab === 'all'} onClick={() => setTab('all')}>
              Tất cả
            </Chip>
            <Chip selected={tab === 'vocab'} onClick={() => setTab('vocab')}>
              Từ vựng hay sai ({missedVocab.length})
            </Chip>
            <Chip selected={tab === 'kanji'} onClick={() => setTab('kanji')}>
              Kanji chưa thuộc ({unmasteredKanji.length})
            </Chip>
          </div>

          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm Kanji, kana, Hán Việt, nghĩa..."
            className="sm:w-72"
          />
        </div>

        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto border-t border-line pt-3">
          {LEVELS.map((lvl) => (
            <Chip
              key={lvl}
              selected={levelFilter === lvl}
              onClick={() => setLevelFilter(lvl)}
              className="shrink-0"
            >
              {lvl === 'All' ? 'Tất cả cấp độ' : lvl}
            </Chip>
          ))}
        </div>
      </Card>

      {showVocab && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sky-legible text-lg font-semibold text-fg">Từ vựng từng trả lời sai</h2>
            {missedVocab.length > 0 && (
              <Link to="/vocabulary/review" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                Vào phiên ôn tập →
              </Link>
            )}
          </div>

          {missedVocab.length === 0 ? (
            <EmptyState
              title="Không có từ vựng sai"
              description="Tuyệt vời! Bạn hiện không có từ nào cần ôn lại trong bộ lọc này."
            />
          ) : (
            <Card padding="none" className="divide-y divide-line overflow-hidden">
              {missedVocab.map((word) => {
                const display = getVocabularyDisplay(word);
                const wrongCount = progress.wrongWords[word.id] || 0;
                return (
                  <div key={word.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span lang="ja" className="text-lg font-bold text-fg">
                          {display.primaryText}
                        </span>
                        {display.hasKanji && (
                          <span lang="ja" className="text-sm font-medium text-primary-fg">
                            {display.hiragana}
                          </span>
                        )}
                        {display.hanViet && (
                          <span className="text-xs text-muted uppercase">{display.hanViet}</span>
                        )}
                        <Badge tone="danger" className="tabular">
                          Sai {wrongCount} lần
                        </Badge>
                      </div>
                      <p className="text-sm text-muted">{word.meaning}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <IconButton
                        size="sm"
                        aria-label={`Phát âm ${display.primaryText}`}
                        onClick={() => speakJapanese(word.hiragana || display.primaryText, settings.ttsRate)}
                      >
                        <Volume2 className="size-4" aria-hidden />
                      </IconButton>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Check className="size-4" aria-hidden />}
                        onClick={() => clearWrongWord(word.id)}
                      >
                        Đã thuộc
                      </Button>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
        </section>
      )}

      {showKanji && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sky-legible text-lg font-semibold text-fg">Kanji chưa thuộc</h2>
            {unmasteredKanji.length > 0 && (
              <Link
                to={`/kanji/${encodeURIComponent(unmasteredKanji[0].kanji)}/practice`}
                className={buttonStyles({ variant: 'secondary', size: 'sm' })}
              >
                Luyện chữ đầu tiên →
              </Link>
            )}
          </div>

          {unmasteredKanji.length === 0 ? (
            <EmptyState
              title="Không có Kanji nào chưa thuộc"
              description="Bạn đã thuộc hết danh sách Kanji trong bộ lọc này!"
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {unmasteredKanji.map((k) => {
                const record = kanjiProgress[k.id];
                const correctCount = record?.correctAttempts || 0;
                return (
                  <Card key={k.id} padding="md" className="flex flex-col justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span
                        lang="ja"
                        className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-soft text-2xl font-bold text-primary-fg"
                      >
                        {k.kanji}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {k.jlptLevel && <Badge tone="primary">{k.jlptLevel}</Badge>}
                          <Badge tone="neutral" className="tabular">
                            Đúng {correctCount}/3
                          </Badge>
                        </div>
                        {k.hanViet && (
                          <p className="text-xs font-semibold text-fg uppercase">{k.hanViet}</p>
                        )}
                        <p className="truncate text-sm text-muted">
                          {k.meanings.join(', ') || 'Chưa có mô tả'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                      <Link
                        to={`/kanji/${encodeURIComponent(k.kanji)}/practice`}
                        className={buttonStyles({ variant: 'primary', size: 'sm', className: 'flex-1' })}
                      >
                        Luyện viết
                      </Link>
                      <Link
                        to={`/kanji/${encodeURIComponent(k.kanji)}`}
                        className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                      >
                        Chi tiết
                      </Link>
                      <Link
                        to={`/vocabulary/quiz?kanji=${encodeURIComponent(k.kanji)}`}
                        className={buttonStyles({ variant: 'ghost', size: 'sm' })}
                      >
                        Quiz
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      )}
    </PageContainer>
  );
};
