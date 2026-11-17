import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Volume2 } from 'lucide-react';
import { UNIT_DATA } from '../../data/unitData';
import { useUserProgress } from '../../hooks/useUserProgress';
import type { JLPTLevel, WordType } from '../../types/quiz';
import { allVocabularyData } from '../../data';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  PageContainer,
  PageHeader,
  SearchInput,
} from '../../components/ui';
import { cn } from '../../lib/cn';

interface VocabRow {
  id: number;
  kanji: string;
  hanviet: string;
  hiragana: string;
  meaning: string;
  wordType: WordType;
}

const formatWordType = (type?: WordType): string => {
  switch (type) {
    case 'noun':
      return 'Danh từ';
    case 'verb':
      return 'Động từ';
    case 'vi':
      return 'Tự động từ';
    case 'vt':
      return 'Tha động từ';
    case 'i_adj':
      return 'Tính từ (い)';
    case 'na_adj':
      return 'Tính từ (な)';
    case 'adv':
      return 'Phó từ';
    default:
      return 'Khác';
  }
};

const mapVietnameseWordTypeToEnglish = (viType?: string): WordType => {
  if (!viType) return 'other';
  const t = viType.toLowerCase();
  if (t.includes('danh từ')) return 'noun';
  if (t.includes('động từ')) return 'verb';
  if (t.includes('tính từ -i') || t.includes('tính từ (い)') || t.includes('tính từ đuôi i')) return 'i_adj';
  if (t.includes('tính từ -na') || t.includes('tính từ (な)') || t.includes('tính từ đuôi na')) return 'na_adj';
  if (t.includes('phó từ') || t.includes('trạng từ')) return 'adv';
  return 'other';
};

const FILTER_OPTIONS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'noun', label: 'Danh từ' },
  { id: 'verb', label: 'Động từ' },
  { id: 'i_adj', label: 'Tính từ -i' },
  { id: 'na_adj', label: 'Tính từ -na' },
  { id: 'adv', label: 'Phó từ' },
];

export const VocabularyWordsPage: React.FC = () => {
  const { level, unitId } = useParams<{ level: string; unitId: string }>();
  const { progress, toggleStar } = useUserProgress();

  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const levelKey = (level?.toUpperCase() || 'N3') as JLPTLevel;
  const numericUnitId = Number(unitId);
  const unitInfo = UNIT_DATA[levelKey]?.find((u) => u.id === numericUnitId);

  const words = useMemo<VocabRow[]>(() => {
    const data = allVocabularyData[levelKey.toLowerCase()]?.[numericUnitId.toString()];
    if (!Array.isArray(data)) return [];
    return data.map((w) => ({
      id: Number(w.id),
      kanji: w.kanji || '',
      hanviet: w.hanViet || w.hanviet || '',
      hiragana: w.hiragana || '',
      meaning: w.meaning || '',
      wordType: mapVietnameseWordTypeToEnglish(w.wordType),
    }));
  }, [numericUnitId, levelKey]);

  const filteredWords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return words.filter((word) => {
      const matchesType =
        selectedType === 'all' ||
        (selectedType === 'verb'
          ? ['verb', 'vi', 'vt'].includes(word.wordType)
          : word.wordType === selectedType);

      if (!matchesType) return false;
      if (!q) return true;

      return (
        word.kanji.toLowerCase().includes(q) ||
        word.hiragana.toLowerCase().includes(q) ||
        word.hanviet.toLowerCase().includes(q) ||
        word.meaning.toLowerCase().includes(q)
      );
    });
  }, [words, selectedType, searchQuery]);

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: 'Từ vựng', to: '/vocabulary' },
          { label: `Trình độ ${levelKey}`, to: `/vocabulary/${level || levelKey.toLowerCase()}` },
          { label: unitInfo?.name || `Unit ${numericUnitId}` },
        ]}
        title={unitInfo?.name || `Unit ${numericUnitId}`}
        description={`Danh sách ${filteredWords.length} / ${words.length} từ vựng`}
      />

      <Card padding="none" className="overflow-hidden">
        {/* Toolbar */}
        <div className="space-y-3 border-b border-line bg-surface p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Tìm Kanji, Hiragana, Hán Việt hoặc nghĩa..."
              className="md:max-w-sm md:flex-1"
            />
            <div className="hide-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
              {FILTER_OPTIONS.map((opt) => (
                <Chip
                  key={opt.id}
                  selected={selectedType === opt.id}
                  onClick={() => setSelectedType(opt.id)}
                  className="shrink-0"
                >
                  {opt.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {words.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Chưa có dữ liệu từ vựng"
              description="Bài học này chưa có dữ liệu offline."
            />
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Không tìm thấy từ vựng phù hợp"
              description="Hãy thử đổi từ khóa tìm kiếm hoặc chọn loại từ khác."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedType('all');
                  }}
                >
                  Xóa bộ lọc
                </Button>
              }
            />
          </div>
        ) : (
          <>
            {/* Mobile View: Stacked rows */}
            <div className="divide-y divide-line md:hidden">
              {filteredWords.map((word, index) => {
                const isStarred = progress.starredWords.includes(word.id);
                const wrongCount = progress.wrongWords[word.id] || 0;

                return (
                  <div key={word.id} className="space-y-2.5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-baseline gap-3">
                        <span className="tabular text-xs font-medium text-subtle">{index + 1}.</span>
                        <div className="min-w-0">
                          <p lang="ja" className="text-xl font-bold text-fg">
                            {word.kanji || word.hiragana}
                          </p>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            {word.kanji && (
                              <span lang="ja" className="text-sm font-medium text-primary-fg">
                                {word.hiragana}
                              </span>
                            )}
                            {word.kanji && word.hanviet && (
                              <span className="text-xs font-medium text-muted uppercase">
                                {word.hanviet}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <IconButton
                          aria-label={`Phát âm ${word.kanji || word.hiragana}`}
                          size="sm"
                          onClick={() => speakText(word.kanji || word.hiragana)}
                        >
                          <Volume2 className="size-4" aria-hidden />
                        </IconButton>
                        <IconButton
                          aria-label={isStarred ? 'Bỏ lưu từ này' : 'Lưu từ này'}
                          aria-pressed={isStarred}
                          size="sm"
                          onClick={() => toggleStar(word.id)}
                          className={cn(isStarred && 'text-warning-fg')}
                        >
                          <Star className={cn('size-4', isStarred && 'fill-current')} aria-hidden />
                        </IconButton>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pl-6">
                      <Badge tone="neutral">{formatWordType(word.wordType)}</Badge>
                      {wrongCount > 0 && (
                        <Badge tone="danger" className="tabular">
                          Sai {wrongCount} lần
                        </Badge>
                      )}
                    </div>

                    <p className="pl-6 text-sm leading-relaxed text-fg">{word.meaning}</p>
                  </div>
                );
              })}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line bg-surface-2 text-xs font-semibold tracking-wide text-muted uppercase">
                  <tr>
                    <th className="w-14 px-5 py-3.5">STT</th>
                    <th className="px-5 py-3.5">Từ vựng</th>
                    <th className="w-36 px-5 py-3.5">Từ loại</th>
                    <th className="px-5 py-3.5">Ý nghĩa</th>
                    <th className="w-28 px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredWords.map((word, index) => {
                    const isStarred = progress.starredWords.includes(word.id);
                    const wrongCount = progress.wrongWords[word.id] || 0;

                    return (
                      <tr key={word.id} className="transition-colors hover:bg-surface-2">
                        <td className="tabular px-5 py-4 text-muted">{index + 1}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col">
                            <span lang="ja" className="text-lg font-bold text-fg">
                              {word.kanji || word.hiragana}
                            </span>
                            {word.kanji && (
                              <span lang="ja" className="text-sm font-medium text-primary-fg">
                                {word.hiragana}
                              </span>
                            )}
                            {word.kanji && word.hanviet && (
                              <span className="text-xs font-medium text-muted uppercase">
                                {word.hanviet}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1">
                            <Badge tone="neutral">{formatWordType(word.wordType)}</Badge>
                            {wrongCount > 0 && (
                              <Badge tone="danger" className="tabular">
                                Sai {wrongCount} lần
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-fg">{word.meaning}</td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <IconButton
                              aria-label={`Phát âm ${word.kanji || word.hiragana}`}
                              size="sm"
                              onClick={() => speakText(word.kanji || word.hiragana)}
                            >
                              <Volume2 className="size-4" aria-hidden />
                            </IconButton>
                            <IconButton
                              aria-label={isStarred ? 'Bỏ lưu từ này' : 'Lưu từ này'}
                              aria-pressed={isStarred}
                              size="sm"
                              onClick={() => toggleStar(word.id)}
                              className={cn(isStarred && 'text-warning-fg')}
                            >
                              <Star className={cn('size-4', isStarred && 'fill-current')} aria-hidden />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </PageContainer>
  );
};
