import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Eye, Play, RefreshCw, Volume2, XCircle } from 'lucide-react';
import { useAuth } from '../context/auth-context';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUserProgress } from '../hooks/useUserProgress';
import { clearAttemptMistakeGroup } from '../services/attemptMistakeService';
import { saveLastPracticeTarget } from '../services/lastPracticeService';
import { recordQuizAttempt } from '../services/quizHistoryService';
import { useAppDispatch } from '../store/hooks';
import { addMistake } from '../store/slices/mistakeSlice';
import type { VocabularyItem } from '../types/vocabulary';
import { shuffleArray } from '../utils/shuffle';
import { speakJapanese, stopJapaneseSpeech } from '../utils/tts';
import {
  getVocabularyDisplay,
  matchesVocabularyAnswer,
} from '../utils/vocabularyHelpers';
import {
  findVocabTextbook,
  getWordsForVocabTextbook,
  parseVocabLevelParam,
} from '../data/vocabTextbooks';
import { useCurriculumSnapshot } from '../hooks/useCurriculumData';
import { getLiveAllVocabulary } from '../services/curriculumStore';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  Notice,
  PageContainer,
  PageHeader,
  ProgressBar,
  buttonStyles,
} from '../components/ui';

type SourceScope = 'all' | 'starred' | 'wrong';
type PromptMode = 'meaning' | 'listening';

interface SessionFeedback {
  isCorrect: boolean;
  userAnswer: string;
}

export const WritingPage: React.FC = () => {
  const cmsSnapshot = useCurriculumSnapshot();
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { progress, addWrongWord } = useUserProgress();
  const { settings } = useAppSettings();
  const sessionStartRef = useRef<number>(0);

  const levelParam = parseVocabLevelParam(searchParams.get('level'));
  const textbook = useMemo(
    () => findVocabTextbook(levelParam, searchParams.get('book')),
    [levelParam, searchParams],
  );
  const activeLevel = textbook?.level ?? levelParam;

  const allWords = useMemo(() => {
    if (textbook) {
      return getWordsForVocabTextbook(cmsSnapshot, textbook.level, textbook);
    }
    const all = getLiveAllVocabulary(cmsSnapshot);
    if (activeLevel) {
      return all.filter((w) => w.level === activeLevel);
    }
    return all;
  }, [cmsSnapshot, textbook, activeLevel]);

  const [sourceScope, setSourceScope] = useState<SourceScope>(() => {
    const raw = searchParams.get('source');
    return raw === 'wrong' || raw === 'starred' ? raw : 'all';
  });
  const [promptMode, setPromptMode] = useState<PromptMode>('meaning');
  const [limit, setLimit] = useState<number>(10);

  const [sessionWords, setSessionWords] = useState<VocabularyItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<SessionFeedback | null>(null);
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  const [sessionMistakes, setSessionMistakes] = useState<Array<Record<string, unknown>>>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const candidateWords = useMemo(() => {
    if (sourceScope === 'starred') {
      return allWords.filter((w) => progress.starredWords.includes(w.id));
    }
    if (sourceScope === 'wrong') {
      const wrongSet = new Set(Object.keys(progress.wrongWords).map(Number));
      return allWords.filter((w) => wrongSet.has(w.id));
    }
    return allWords;
  }, [allWords, progress.starredWords, progress.wrongWords, sourceScope]);

  const startSession = useCallback(
    (customList?: VocabularyItem[]) => {
      const pool = customList ?? candidateWords;
      if (pool.length === 0) return;

      const shuffled = shuffleArray([...pool]);
      const chosen = limit > 0 ? shuffled.slice(0, limit) : shuffled;

      sessionStartRef.current = Date.now();
      saveLastPracticeTarget(
        {
          path: '/vocabulary/writing',
          label: 'Luyện gõ Từ vựng',
          quizType: 'writing',
        },
        user?.id,
      );
      setSessionWords(chosen);
      setCurrentIndex(0);
      setInputValue('');
      setShowHint(false);
      setFeedback(null);
      setWrongIds([]);
      setSessionMistakes([]);
      setCorrectCount(0);
      setIsFinished(false);
      setIsActive(true);
    },
    [candidateWords, limit, user?.id],
  );

  useEffect(() => {
    return () => stopJapaneseSpeech();
  }, []);

  const currentWord = isActive && !isFinished ? sessionWords[currentIndex] : undefined;

  useEffect(() => {
    if (!currentWord) return;
    if (promptMode === 'listening' || settings.ttsAutoPlay) {
      const timer = window.setTimeout(() => {
        speakJapanese(currentWord.hiragana || currentWord.kanji || '', settings.ttsRate);
      }, 120);
      return () => window.clearTimeout(timer);
    }
  }, [currentIndex, currentWord, promptMode, settings.ttsAutoPlay, settings.ttsRate]);

  const handleNext = useCallback(() => {
    setFeedback(null);
    setInputValue('');
    setShowHint(false);
    if (currentIndex >= sessionWords.length - 1) {
      const durationSeconds =
        sessionStartRef.current > 0
          ? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000))
          : 0;
      const levels = Array.from(new Set(sessionWords.map((w) => w.level).filter(Boolean)));
      const level = levels.length === 1 ? levels[0] : 'ALL';
      const retryAttemptId = searchParams.get('retryAttemptId')?.trim() || undefined;
      void recordQuizAttempt(
        {
          quizType: 'writing',
          level,
          score: correctCount,
          totalQuestions: Math.max(1, sessionWords.length),
          durationSeconds,
          mistakesJson: sessionMistakes,
        },
        user?.id,
      ).then(() => {
        if (retryAttemptId) {
          clearAttemptMistakeGroup(retryAttemptId, user?.id);
        }
      });
      setIsFinished(true);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, sessionWords, correctCount, sessionMistakes, user?.id, searchParams]);

  useEffect(() => {
    if (!feedback) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [feedback, handleNext]);

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || feedback || !inputValue.trim()) return;

    const isCorrect = matchesVocabularyAnswer(inputValue, currentWord);
    setFeedback({ isCorrect, userAnswer: inputValue.trim() });

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
    } else {
      setWrongIds((prev) => (prev.includes(currentWord.id) ? prev : [...prev, currentWord.id]));
      addWrongWord(currentWord.id);
      const jpDisplay = currentWord.kanji
        ? `${currentWord.kanji}（${currentWord.hiragana}）`
        : currentWord.hiragana;
      const writingMistake = {
        id: `writing_${currentWord.id}_${Date.now()}`,
        questionId: `vocab-writing-${currentWord.id}`,
        wordId: currentWord.id,
        prompt: `Gõ từ tiếng Nhật cho nghĩa: "${currentWord.meaning}"`,
        userAnswer: inputValue.trim(),
        correctAnswer: jpDisplay,
        explanation: `${jpDisplay}${currentWord.hanViet ? ` [${currentWord.hanViet}]` : ''} — ${currentWord.meaning}`,
        level: currentWord.level,
        categoryLabel: `Luyện gõ Từ vựng · ${currentWord.level || 'Tổng hợp'}`,
        practicePath: '/vocabulary/writing',
      };
      setSessionMistakes((prev) => [...prev, writingMistake]);
      dispatch(
        addMistake({
          id: writingMistake.id,
          grammarId: `VOCAB_WRITING_${currentWord.level || 'ALL'}`,
          questionId: writingMistake.questionId,
          userAnswer: writingMistake.userAnswer,
          correctAnswer: writingMistake.correctAnswer,
          errorType: 'missing_word',
          createdAt: new Date().toISOString(),
          prompt: writingMistake.prompt,
          categoryLabel: writingMistake.categoryLabel,
          practicePath: '/vocabulary/writing?source=wrong',
          explanation: writingMistake.explanation,
          level: currentWord.level,
          wordId: currentWord.id,
        }),
      );
    }

    speakJapanese(currentWord.hiragana || currentWord.kanji || '', settings.ttsRate);
  };

  if (!isActive) {
    const scopeTitle = textbook
      ? `${textbook.title} (${textbook.level})`
      : activeLevel
        ? `JLPT ${activeLevel}`
        : null;
    const breadcrumbs = textbook
      ? [
          { label: 'Trang chủ', to: '/' },
          { label: 'Từ vựng', to: '/vocabulary' },
          { label: `Trình độ ${textbook.level}`, to: `/vocabulary/${textbook.level.toLowerCase()}` },
          { label: textbook.title, to: `/vocabulary/${textbook.level.toLowerCase()}/book/${textbook.id}` },
          { label: 'Luyện gõ & nhớ từ' },
        ]
      : activeLevel
        ? [
            { label: 'Trang chủ', to: '/' },
            { label: 'Từ vựng', to: '/vocabulary' },
            { label: `Trình độ ${activeLevel}`, to: `/vocabulary/${activeLevel.toLowerCase()}` },
            { label: 'Luyện gõ & nhớ từ' },
          ]
        : [
            { label: 'Trang chủ', to: '/' },
            { label: 'Từ vựng', to: '/vocabulary' },
            { label: 'Luyện gõ & nhớ từ' },
          ];

    return (
      <PageContainer size="md">
        <PageHeader
          breadcrumbs={breadcrumbs}
          title={
            <span className="flex flex-wrap items-center gap-2.5">
              <span>Luyện viết &amp; gõ từ vựng</span>
              {scopeTitle && <Badge tone="primary">{scopeTitle}</Badge>}
            </span>
          }
          description={
            scopeTitle
              ? `Đang lọc đúng từ vựng thuộc ${scopeTitle}. Nhìn nghĩa tiếng Việt hoặc nghe phát âm rồi gõ lại từ tiếng Nhật.`
              : 'Nhìn nghĩa tiếng Việt hoặc nghe phát âm rồi gõ lại từ tiếng Nhật (Hiragana hoặc Kanji).'
          }
        />

        <Card padding="lg" className="space-y-6">
          {scopeTitle && (
            <Notice tone="info" className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Phạm vi hiện tại: <strong>{scopeTitle}</strong> ({allWords.length} từ vựng)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.delete('level');
                  next.delete('book');
                  setSearchParams(next, { replace: true });
                }}
              >
                Xem tất cả cấp độ
              </Button>
            </Notice>
          )}
          <div className="space-y-2">
            <p className="text-sm font-medium text-fg">Nguồn từ vựng</p>
            <div className="flex flex-wrap gap-2">
              <Chip selected={sourceScope === 'all'} onClick={() => setSourceScope('all')}>
                Tất cả ({allWords.length})
              </Chip>
              <Chip
                selected={sourceScope === 'starred'}
                disabled={allWords.filter((w) => progress.starredWords.includes(w.id)).length === 0}
                onClick={() => setSourceScope('starred')}
              >
                Đã lưu ★ ({allWords.filter((w) => progress.starredWords.includes(w.id)).length})
              </Chip>
              <Chip
                selected={sourceScope === 'wrong'}
                disabled={allWords.filter((w) => (progress.wrongWords[w.id] || 0) > 0).length === 0}
                onClick={() => setSourceScope('wrong')}
              >
                Hay làm sai ({allWords.filter((w) => (progress.wrongWords[w.id] || 0) > 0).length})
              </Chip>
            </div>
          </div>

          <div className="space-y-2 border-t border-line pt-5">
            <p className="text-sm font-medium text-fg">Hình thức luyện</p>
            <div className="flex flex-wrap gap-2">
              <Chip selected={promptMode === 'meaning'} onClick={() => setPromptMode('meaning')}>
                Nghĩa Việt → Gõ tiếng Nhật
              </Chip>
              <Chip selected={promptMode === 'listening'} onClick={() => setPromptMode('listening')}>
                Nghe phát âm → Gõ lại từ
              </Chip>
            </div>
          </div>

          <div className="space-y-2 border-t border-line pt-5">
            <p className="text-sm font-medium text-fg">Số lượng câu</p>
            <div className="flex flex-wrap gap-2">
              {[10, 20, 0].map((val) => (
                <Chip key={val} selected={limit === val} onClick={() => setLimit(val)}>
                  {val === 0 ? 'Tất cả' : `${val} từ`}
                </Chip>
              ))}
            </div>
          </div>

          {candidateWords.length === 0 ? (
            <EmptyState
              title={
                scopeTitle
                  ? `Chưa có từ vựng cho ${scopeTitle}`
                  : 'Chưa có từ vựng trong mục này'
              }
              description={
                scopeTitle
                  ? `Dữ liệu từ vựng của ${scopeTitle} đang được cập nhật. Bạn có thể chuyển sang giáo trình khác hoặc xem tất cả cấp độ.`
                  : 'Hãy chọn nguồn tất cả từ vựng hoặc đánh dấu sao / làm quiz trước.'
              }
            />
          ) : (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              leftIcon={<Play className="size-4" aria-hidden />}
              onClick={() => startSession()}
            >
              Bắt đầu luyện viết ({limit === 0 ? candidateWords.length : Math.min(limit, candidateWords.length)} từ)
            </Button>
          )}
        </Card>
      </PageContainer>
    );
  }

  if (isFinished) {
    const total = sessionWords.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const missedWords = sessionWords.filter((w) => wrongIds.includes(w.id));

    return (
      <PageContainer size="sm" className="py-4">
        <Card padding="lg" className="space-y-6 text-center">
          <div>
            <p className="text-sm font-medium text-muted">Hoàn thành phiên luyện gõ</p>
            <h1 className="mt-1 text-2xl font-bold text-fg md:text-3xl">Kết quả luyện viết</h1>
          </div>

          <div className="space-y-3">
            <p className="tabular text-5xl font-bold text-primary-fg">
              {correctCount} <span className="text-2xl font-medium text-muted">/ {total}</span>
            </p>
            <p className="tabular text-base font-semibold text-fg">{accuracy}% chính xác</p>
            <ProgressBar
              value={correctCount}
              max={total}
              label="Tỷ lệ gõ đúng"
              tone={accuracy >= 80 ? 'success' : 'primary'}
              className="mx-auto max-w-xs"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {missedWords.length > 0 && (
              <Button
                variant="primary"
                leftIcon={<RefreshCw className="size-4" aria-hidden />}
                onClick={() => startSession(missedWords)}
              >
                Luyện lại {missedWords.length} từ sai
              </Button>
            )}
            <Button
              variant="secondary"
              leftIcon={<RefreshCw className="size-4" aria-hidden />}
              onClick={() => startSession()}
            >
              Phiên mới
            </Button>
            <Button variant="ghost" onClick={() => setIsActive(false)}>
              Đổi cấu hình
            </Button>
          </div>
        </Card>
      </PageContainer>
    );
  }

  if (!currentWord) return null;

  const display = getVocabularyDisplay(currentWord);

  return (
    <PageContainer size="md" className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => setIsActive(false)}>
          ← Cài đặt phiên
        </Button>
        <div className="flex items-center gap-2">
          <Badge tone="primary" className="tabular">
            Từ {currentIndex + 1} / {sessionWords.length}
          </Badge>
          <Badge tone="success" className="tabular">
            Đúng: {correctCount}
          </Badge>
          <Badge tone="danger" className="tabular">
            Sai: {wrongIds.length}
          </Badge>
        </div>
      </div>

      <ProgressBar value={currentIndex + 1} max={sessionWords.length} label="Tiến độ luyện gõ từ" />

      <Card padding="lg" className="space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone="neutral">{currentWord.wordType}</Badge>
            <div className="flex items-center gap-2">
              <Button
                variant="soft"
                size="sm"
                leftIcon={<Volume2 className="size-4" aria-hidden />}
                onClick={() => speakJapanese(currentWord.hiragana || currentWord.kanji || '', settings.ttsRate)}
              >
                Nghe phát âm
              </Button>
              {!feedback && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Eye className="size-4" aria-hidden />}
                  onClick={() => setShowHint((h) => !h)}
                >
                  {showHint ? 'Ẩn gợi ý' : 'Gợi ý'}
                </Button>
              )}
            </div>
          </div>

          {promptMode === 'meaning' ? (
            <h2 className="text-2xl font-bold text-fg md:text-3xl">{currentWord.meaning}</h2>
          ) : (
            <div className="rounded-xl border border-line bg-surface-2 p-4 text-center">
              <p className="text-sm font-medium text-muted">
                Nghe phát âm tiếng Nhật và gõ lại từ tương ứng bằng Hiragana hoặc Kanji.
              </p>
            </div>
          )}

          {showHint && !feedback && (
            <Notice tone="info" className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span>
                Bắt đầu bằng:{' '}
                <strong lang="ja" className="text-fg">
                  {currentWord.hiragana.slice(0, 1)}… ({currentWord.hiragana.length} ký tự kana)
                </strong>
              </span>
              {display.hanViet && (
                <span>
                  Hán Việt: <strong className="uppercase text-fg">{display.hanViet}</strong>
                </span>
              )}
            </Notice>
          )}
        </div>

        <form onSubmit={handleCheck} className="space-y-4">
          <Field
            label="Nhập tiếng Nhật (Hiragana hoặc Kanji)"
            htmlFor="writing-answer-input"
            hint="Chấp nhận cả dạng Kanji lẫn Hiragana."
          >
            <Input
              id="writing-answer-input"
              lang="ja"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ví dụ: だんせい hoặc 男性"
              disabled={Boolean(feedback)}
              autoFocus
            />
          </Field>

          {!feedback && (
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={!inputValue.trim()}>
              Kiểm tra đáp án
            </Button>
          )}
        </form>

        {feedback && (
          <div className="animate-fade-in space-y-4">
            <Notice tone={feedback.isCorrect ? 'success' : 'danger'} className="space-y-2">
              <div className="flex items-center gap-2 text-base font-bold">
                {feedback.isCorrect ? (
                  <>
                    <CheckCircle2 className="size-5 shrink-0" aria-hidden />
                    Chính xác!
                  </>
                ) : (
                  <>
                    <XCircle className="size-5 shrink-0" aria-hidden />
                    Chưa chính xác (Bạn gõ: {feedback.userAnswer})
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-fg">
                <span lang="ja" className="text-xl font-bold">
                  {display.primaryText}
                </span>
                {display.hasKanji && (
                  <span lang="ja" className="text-base font-medium text-primary-fg">
                    {display.hiragana}
                  </span>
                )}
                {display.hanViet && (
                  <span className="text-xs font-semibold text-muted uppercase">{display.hanViet}</span>
                )}
                <span className="text-sm text-muted">— {currentWord.meaning}</span>
              </div>
            </Notice>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              rightIcon={<ArrowRight className="size-4" aria-hidden />}
              onClick={handleNext}
            >
              {currentIndex >= sessionWords.length - 1 ? 'Xem kết quả' : 'Từ tiếp theo'}
            </Button>
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Link to="/vocabulary/unmastered" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
          Xem danh sách từ chưa thuộc →
        </Link>
      </div>
    </PageContainer>
  );
};
