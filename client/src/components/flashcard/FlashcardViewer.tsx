import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Shuffle, Star, Volume2 } from 'lucide-react';
import { allVocabularyData } from '../../data';
import { useUserProgress } from '../../hooks/useUserProgress';
import {
  Badge,
  Breadcrumbs,
  Button,
  EmptyState,
  IconButton,
  Kbd,
  PageContainer,
  ProgressBar,
  buttonStyles,
} from '../ui';
import { cn } from '../../lib/cn';

interface FlashcardWord {
  id: number;
  kanji?: string;
  hiragana: string;
  hanviet?: string;
  hanViet?: string;
  meaning: string;
  wordType?: string;
}

export const FlashcardViewer: React.FC = () => {
  const { level, unitId } = useParams<{ level: string; unitId: string }>();
  const levelKey = level?.toLowerCase() || 'n3';
  const unitKey = unitId || '1';
  const deckKey = `${levelKey}:${unitKey}`;

  const baseWords = useMemo<FlashcardWord[]>(() => {
    const unitWords = allVocabularyData[levelKey]?.[unitKey];
    return Array.isArray(unitWords) ? (unitWords as FlashcardWord[]) : [];
  }, [levelKey, unitKey]);

  const [shuffledDeck, setShuffledDeck] = useState<{
    deckKey: string;
    list: FlashcardWord[];
  } | null>(null);
  const [cardState, setCardState] = useState<{
    deckKey: string;
    index: number;
    flipped: boolean;
  }>({ deckKey, index: 0, flipped: false });
  const { progress, toggleStar } = useUserProgress();

  const words = shuffledDeck?.deckKey === deckKey ? shuffledDeck.list : baseWords;
  const currentIndex = cardState.deckKey === deckKey ? cardState.index : 0;
  const isFlipped = cardState.deckKey === deckKey ? cardState.flipped : false;

  const currentWord = words[currentIndex];
  const isStarred = currentWord ? progress.starredWords.includes(currentWord.id) : false;

  const handleNext = useCallback(() => {
    setCardState((prev) => {
      const idx = prev.deckKey === deckKey ? prev.index : 0;
      if (idx >= words.length - 1) return prev;
      return { deckKey, index: idx + 1, flipped: false };
    });
  }, [deckKey, words.length]);

  const handlePrev = useCallback(() => {
    setCardState((prev) => {
      const idx = prev.deckKey === deckKey ? prev.index : 0;
      if (idx <= 0) return prev;
      return { deckKey, index: idx - 1, flipped: false };
    });
  }, [deckKey]);

  const handleFlip = useCallback(() => {
    setCardState((prev) => {
      if (prev.deckKey !== deckKey) return { deckKey, index: 0, flipped: true };
      return { ...prev, flipped: !prev.flipped };
    });
  }, [deckKey]);

  const handleShuffle = useCallback(() => {
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setShuffledDeck({ deckKey, list: shuffled });
    setCardState({ deckKey, index: 0, flipped: false });
  }, [deckKey, words]);

  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  useEffect(() => {
    if (currentWord) {
      const timer = setTimeout(() => {
        speakText(currentWord.kanji || currentWord.hiragana);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, currentWord, speakText]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
        return;
      }
      if (
        e.key === ' ' ||
        e.key === 'ArrowUp' ||
        e.key === 'ArrowDown' ||
        (e.key === 'Enter' && target?.tagName !== 'BUTTON' && target?.tagName !== 'A')
      ) {
        e.preventDefault();
        handleFlip();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, handleFlip]);

  const levelDisplay = (level || 'N3').toUpperCase();

  if (!words.length) {
    return (
      <PageContainer size="md">
        <Breadcrumbs
          items={[
            { label: 'Flashcard', to: '/flashcard' },
            { label: levelDisplay, to: `/flashcard/${level || 'n3'}` },
            { label: `Unit ${unitKey}` },
          ]}
        />
        <EmptyState
          title="Chưa có dữ liệu flashcard"
          description="Unit này chưa có dữ liệu từ vựng offline."
          action={
            <Link to={`/flashcard/${level || 'n3'}`} className={buttonStyles({ variant: 'secondary' })}>
              Chọn bài khác
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const hanViet = currentWord.hanViet || currentWord.hanviet;

  return (
    <PageContainer size="md" className="flex flex-1 flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Breadcrumbs
          className="mb-0"
          items={[
            { label: 'Flashcard', to: '/flashcard' },
            { label: levelDisplay, to: `/flashcard/${level || 'n3'}` },
            { label: `Unit ${unitKey}` },
          ]}
        />
        <span className="tabular text-sm font-medium text-muted">
          Thẻ {currentIndex + 1} / {words.length}
        </span>
      </div>

      <ProgressBar value={currentIndex + 1} max={words.length} label="Tiến độ Flashcard" className="mb-6" />

      {/* Flip Card */}
      <div className="relative mx-auto mb-6 min-h-80 w-full flex-1 [perspective:1000px] sm:min-h-96 md:max-h-[460px]">
        <div
          role="button"
          tabIndex={0}
          aria-pressed={isFlipped}
          aria-label={isFlipped ? 'Mặt sau thẻ — nhấn để lật lại mặt trước' : 'Mặt trước thẻ — nhấn để xem nghĩa'}
          onClick={handleFlip}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleFlip();
            }
          }}
          className={cn(
            'relative h-full min-h-80 w-full cursor-pointer transition-transform duration-200 ease-out-soft [transform-style:preserve-3d] select-none sm:min-h-96',
            isFlipped && '[transform:rotateY(180deg)]',
          )}
        >
          {/* Front Face */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-line bg-surface p-8 shadow-card [backface-visibility:hidden]">
            <div className="absolute top-4 right-4">
              <IconButton
                variant="soft"
                aria-label={`Phát âm ${currentWord.kanji || currentWord.hiragana}`}
                onClick={(e) => {
                  e.stopPropagation();
                  speakText(currentWord.kanji || currentWord.hiragana);
                }}
              >
                <Volume2 className="size-5" aria-hidden />
              </IconButton>
            </div>

            <p lang="ja" className="text-center text-5xl leading-tight font-bold break-words text-fg md:text-7xl">
              {currentWord.kanji || currentWord.hiragana}
            </p>

            <p className="mt-8 flex items-center gap-1.5 text-xs text-muted">
              Nhấp vào thẻ hoặc nhấn <Kbd className="hidden sm:inline-flex">Space</Kbd> để lật
            </p>
          </div>

          {/* Back Face */}
          <div className="absolute inset-0 flex [transform:rotateY(180deg)] flex-col items-center justify-center rounded-2xl border border-primary bg-surface p-8 shadow-card [backface-visibility:hidden]">
            <div className="flex max-w-md flex-col items-center gap-3 text-center">
              {currentWord.kanji && (
                <p lang="ja" className="text-2xl font-semibold text-primary-fg md:text-3xl">
                  {currentWord.hiragana}
                </p>
              )}

              {currentWord.kanji && hanViet && (
                <p className="text-sm font-semibold tracking-widest text-muted uppercase md:text-base">
                  {hanViet}
                </p>
              )}

              <div className="my-1 h-px w-16 bg-line" aria-hidden />

              <p className="text-xl font-semibold text-fg md:text-2xl">{currentWord.meaning}</p>

              {currentWord.wordType && <Badge tone="neutral">{currentWord.wordType}</Badge>}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-card md:p-4">
        <div className="flex items-center gap-2">
          <IconButton variant="secondary" aria-label="Đảo trộn thẻ" onClick={handleShuffle}>
            <Shuffle className="size-4" aria-hidden />
          </IconButton>
          <IconButton
            variant={isStarred ? 'soft' : 'secondary'}
            aria-label={isStarred ? 'Bỏ lưu từ vựng' : 'Lưu từ vựng'}
            aria-pressed={isStarred}
            onClick={() => toggleStar(currentWord.id)}
            className={cn(isStarred && 'text-warning-fg')}
          >
            <Star className={cn('size-4', isStarred && 'fill-current')} aria-hidden />
          </IconButton>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            leftIcon={<ChevronLeft className="size-4" aria-hidden />}
          >
            Trước
          </Button>

          <span className="tabular min-w-16 text-center text-sm font-semibold text-fg">
            {currentIndex + 1} / {words.length}
          </span>

          <Button
            variant="primary"
            onClick={handleNext}
            disabled={currentIndex === words.length - 1}
            rightIcon={<ChevronRight className="size-4" aria-hidden />}
          >
            Tiếp
          </Button>
        </div>
      </div>
    </PageContainer>
  );
};
