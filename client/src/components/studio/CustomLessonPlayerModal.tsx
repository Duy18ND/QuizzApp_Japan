import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Lightbulb,
  RotateCcw,
  Volume2,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, Modal } from '../ui';
import { AudioSpeechPlayer } from '../jlpt/AudioSpeechPlayer';
import { buttonStyles } from '../ui/styles';
import { cn } from '../../lib/cn';
import type { CustomLesson } from '../../services/customStudioService';
import { shuffleArray } from '../../utils/shuffle';
import { parseCustomDialogueLines, speakJapanese } from '../../utils/tts';

interface CustomLessonPlayerModalProps {
  lesson: CustomLesson | null;
  onClose: () => void;
  onMarkStudied?: () => void;
}

export const CustomLessonPlayerModal: React.FC<CustomLessonPlayerModalProps> = ({
  lesson,
  onClose,
  onMarkStudied,
}) => {
  const isCustomQuizLesson = lesson?.kind === 'quiz';
  const [mode, setMode] = useState<'flashcard' | 'quiz'>('flashcard');
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Quiz state (shared across both auto-generated vocab quiz & authored custom quiz)
  const [quizIndex, setQuizIndex] = useState(0);
  const [pickedOption, setPickedOption] = useState<string | null>(null);
  const [pickedOptionIndex, setPickedOptionIndex] = useState<number | null>(null);
  const [showScript, setShowScript] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizSeed, setQuizSeed] = useState(0);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  if (lesson && lesson.id !== activeLessonId) {
    setActiveLessonId(lesson.id);
    setMode(lesson.kind === 'quiz' ? 'quiz' : 'flashcard');
    setCardIndex(0);
    setFlipped(false);
    setQuizIndex(0);
    setPickedOption(null);
    setPickedOptionIndex(null);
    setShowScript(false);
    setQuizScore(0);
    setQuizSeed((s) => s + 1);
  }

  const studyItems = useMemo(() => {
    if (!lesson || lesson.kind === 'quiz') return [];
    if (lesson.kind === 'vocab') {
      return (lesson.vocabItems ?? []).map((v) => ({
        id: v.id,
        front: v.kanji || v.hiragana,
        frontSub: v.kanji && v.kanji !== v.hiragana ? v.hiragana : '',
        back: v.meaning,
        extra: [v.hanViet ? `[${v.hanViet}]` : '', v.example || ''].filter(Boolean).join(' · '),
        speak: v.hiragana || v.kanji,
      }));
    }
    if (lesson.kind === 'grammar') {
      return (lesson.grammarItems ?? []).map((g) => ({
        id: g.id,
        front: g.structure,
        frontSub: g.usage || '',
        back: g.meaning,
        extra: [g.exampleJp || '', g.exampleVi || ''].filter(Boolean).join(' — '),
        speak: g.exampleJp || g.structure,
      }));
    }
    return (lesson.kanjiItems ?? []).map((k) => ({
      id: k.id,
      front: k.kanji,
      frontSub: k.hanViet ? `[${k.hanViet}]` : '',
      back: k.meaning,
      extra: [k.reading ? `Đọc: ${k.reading}` : '', k.mnemonic || ''].filter(Boolean).join(' · '),
      speak: k.reading || k.kanji,
    }));
  }, [lesson]);

  const authoredQuizItems = useMemo(
    () => (lesson?.kind === 'quiz' ? (lesson.quizItems ?? []) : []),
    [lesson],
  );

  const quizQuestions = useMemo(() => {
    if (quizSeed < 0 || studyItems.length < 2) return [];
    const shuffled = shuffleArray(studyItems);
    return shuffled.map((item) => {
      const distractors = shuffleArray(studyItems.filter((x) => x.id !== item.id))
        .slice(0, 3)
        .map((x) => x.back);
      return {
        item,
        options: shuffleArray([item.back, ...distractors]),
      };
    });
  }, [quizSeed, studyItems]);

  const safeCardIdx = studyItems.length > 0 ? Math.min(cardIndex, studyItems.length - 1) : 0;
  const currentCard = studyItems[safeCardIdx];
  const currentQuiz = quizQuestions[quizIndex];
  const currentAuthoredQuiz = authoredQuizItems[quizIndex];
  const quizFinished = isCustomQuizLesson
    ? authoredQuizItems.length > 0 && quizIndex >= authoredQuizItems.length
    : quizQuestions.length > 0 && quizIndex >= quizQuestions.length;

  const totalCount = isCustomQuizLesson ? authoredQuizItems.length : studyItems.length;

  const resetAll = () => {
    setCardIndex(0);
    setFlipped(false);
    setQuizIndex(0);
    setPickedOption(null);
    setPickedOptionIndex(null);
    setQuizScore(0);
    setQuizSeed((s) => s + 1);
  };

  return (
    <Modal
      open={Boolean(lesson)}
      onClose={onClose}
      size="lg"
      title={lesson ? `${lesson.title}` : ''}
      description={
        lesson
          ? `${lesson.level} · ${
              lesson.kind === 'vocab'
                ? 'Bài Từ vựng tự tạo'
                : lesson.kind === 'grammar'
                  ? 'Bài Ngữ pháp tự tạo'
                  : lesson.kind === 'quiz'
                    ? 'Bộ Quiz trắc nghiệm tự tạo'
                    : 'Bài Kanji tự tạo'
            } (${totalCount} ${lesson.kind === 'quiz' ? 'câu' : 'mục'})`
          : ''
      }
      footer={
        <>
          {lesson?.kind === 'vocab' && studyItems.length >= 2 && (
            <Link
              to={`/games?customLesson=${encodeURIComponent(lesson.id)}`}
              onClick={onClose}
              className={buttonStyles({ variant: 'soft', size: 'sm' })}
            >
              <Gamepad2 className="size-4" aria-hidden />
              Chơi 6 Mini-game
            </Link>
          )}
          {onMarkStudied && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
              onClick={() => {
                onMarkStudied();
                onClose();
              }}
            >
              Đánh dấu đã học xong
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </>
      }
    >
      {totalCount === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Bài học này chưa có mục nào. Hãy bấm “Sửa” trong Studio để thêm nội dung.
        </p>
      ) : isCustomQuizLesson ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge tone="primary" className="tabular">
              {quizFinished
                ? `Hoàn thành ${authoredQuizItems.length}/${authoredQuizItems.length} câu`
                : `Câu ${quizIndex + 1}/${authoredQuizItems.length}`}
            </Badge>
            <Badge tone="success" className="tabular">
              Đúng: {quizScore}/{authoredQuizItems.length}
            </Badge>
          </div>

          {quizFinished ? (
            <Card padding="lg" className="space-y-3 text-center">
              <Badge tone="success" className="mx-auto">
                ★ Hoàn thành bộ Quiz tự tạo!
              </Badge>
              <p className="text-2xl font-bold text-fg tabular">
                {quizScore}/{authoredQuizItems.length} câu đúng (
                {Math.round((quizScore / Math.max(1, authoredQuizItems.length)) * 100)}%)
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<RotateCcw className="size-4" aria-hidden />}
                  onClick={resetAll}
                >
                  Làm lại lượt mới
                </Button>
                {onMarkStudied && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
                    onClick={() => {
                      onMarkStudied();
                      onClose();
                    }}
                  >
                    Hoàn thành &amp; Lưu tiến độ
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            currentAuthoredQuiz && (
              <div className="space-y-3">
                <div className="space-y-2.5 rounded-xl border border-line bg-surface-2/60 p-4">
                  {/* Uploaded MP3/M4A/WAV Audio Player */}
                  {currentAuthoredQuiz.audioDataUrl && (
                    <div className="rounded-lg border border-line bg-surface p-2">
                      <audio
                        controls
                        src={currentAuthoredQuiz.audioDataUrl}
                        className="h-9 w-full"
                      />
                    </div>
                  )}

                  {/* Japanese TTS Auto-Read Block: Multi-Speaker AudioSpeechPlayer OR Single Voice */}
                  {(currentAuthoredQuiz.speakText || lesson?.role === 'listening') &&
                    (() => {
                      const dialogueLines = parseCustomDialogueLines(currentAuthoredQuiz.speakText);
                      const revealScript = showScript || pickedOptionIndex !== null;
                      if (dialogueLines) {
                        return (
                          <div className="space-y-2">
                            <AudioSpeechPlayer
                              key={currentAuthoredQuiz.id}
                              dialogue={dialogueLines}
                              questionPrompt={currentAuthoredQuiz.prompt}
                            />
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowScript((v) => !v)}
                              >
                                {revealScript ? 'Ẩn Script hội thoại' : 'Xem Script hội thoại'}
                              </Button>
                            </div>
                            {revealScript && (
                              <div className="space-y-1 rounded-lg border border-line bg-surface p-2.5 text-sm">
                                {dialogueLines.map((ln, lIdx) => (
                                  <p key={`${ln.speaker}-${lIdx}`} lang="ja" className="text-fg">
                                    <strong className="mr-1.5 text-primary-fg">
                                      {ln.speaker}:
                                    </strong>
                                    <span>{ln.plainText}</span>
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }
                      return (
                        <div className="space-y-2 rounded-lg border border-primary/35 bg-primary-soft/20 p-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="primary"
                              size="sm"
                              leftIcon={<Volume2 className="size-4" aria-hidden />}
                              onClick={() =>
                                speakJapanese(
                                  currentAuthoredQuiz.speakText || currentAuthoredQuiz.prompt,
                                )
                              }
                            >
                              Nghe giọng đọc tiếng Nhật
                            </Button>
                            {currentAuthoredQuiz.speakText && (
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowScript((v) => !v)}
                              >
                                {revealScript ? 'Ẩn Script' : 'Xem Script tiếng Nhật'}
                              </Button>
                            )}
                          </div>
                          {currentAuthoredQuiz.speakText && revealScript && (
                            <p
                              lang="ja"
                              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-fg"
                            >
                              {currentAuthoredQuiz.speakText}
                            </p>
                          )}
                        </div>
                      );
                    })()}

                  <p className="text-base font-bold text-fg sm:text-lg">
                    {currentAuthoredQuiz.prompt}
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {currentAuthoredQuiz.options.map((opt, idx) => {
                    const isAnswered = pickedOptionIndex !== null;
                    const isPicked = pickedOptionIndex === idx;
                    const isCorrect = idx === currentAuthoredQuiz.correctIndex;
                    return (
                      <button
                        key={`${currentAuthoredQuiz.id}-${idx}`}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => {
                          setPickedOptionIndex(idx);
                          if (isCorrect) setQuizScore((s) => s + 1);
                        }}
                        className={cn(
                          'flex min-h-[52px] cursor-pointer items-center justify-between gap-2 rounded-xl border-2 px-3.5 py-2.5 text-left text-sm font-semibold transition-colors',
                          isAnswered && isCorrect
                            ? 'border-success bg-success-soft text-success-fg'
                            : isPicked && !isCorrect
                              ? 'border-danger bg-danger-soft text-danger-fg'
                              : 'border-line bg-surface hover:border-primary',
                        )}
                      >
                        <span>
                          <span className="mr-1.5 opacity-70">
                            {String.fromCharCode(65 + idx)}.
                          </span>
                          {opt}
                        </span>
                        {isAnswered && isCorrect && (
                          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                        )}
                        {isPicked && !isCorrect && (
                          <XCircle className="size-4 shrink-0" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>

                {pickedOptionIndex !== null && (
                  <div className="space-y-2.5 rounded-xl border border-line bg-surface-2/70 p-3.5">
                    {currentAuthoredQuiz.explanation && (
                      <div className="flex items-start gap-2 text-xs leading-relaxed text-fg sm:text-sm">
                        <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary-fg" aria-hidden />
                        <span>{currentAuthoredQuiz.explanation}</span>
                      </div>
                    )}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        rightIcon={<ArrowRight className="size-4" aria-hidden />}
                        onClick={() => {
                          setPickedOptionIndex(null);
                          setShowScript(false);
                          setQuizIndex((i) => i + 1);
                        }}
                      >
                        {quizIndex + 1 >= authoredQuizItems.length ? 'Xem kết quả' : 'Câu tiếp theo'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={mode === 'flashcard' ? 'primary' : 'secondary'}
                onClick={() => setMode('flashcard')}
              >
                Thẻ lật Flashcard
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'quiz' ? 'primary' : 'secondary'}
                disabled={studyItems.length < 2}
                onClick={() => {
                  setMode('quiz');
                  setQuizIndex(0);
                  setPickedOption(null);
                  setQuizScore(0);
                }}
              >
                Quiz nhanh ({studyItems.length} câu)
              </Button>
            </div>
            <Badge tone="primary" className="tabular">
              {mode === 'flashcard'
                ? `Thẻ ${safeCardIdx + 1}/${studyItems.length}`
                : `Đúng: ${quizScore}/${quizQuestions.length}`}
            </Badge>
          </div>

          {mode === 'flashcard' && currentCard ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setFlipped((f) => !f)}
                className="flex min-h-[210px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-primary/40 bg-surface-2/60 p-6 text-center transition-colors hover:border-primary"
              >
                {!flipped ? (
                  <>
                    <span className="text-[11px] font-medium text-muted">Mặt trước · Bấm để lật</span>
                    <p lang="ja" className="mt-2 text-3xl font-bold text-fg sm:text-4xl">
                      {currentCard.front}
                    </p>
                    {currentCard.frontSub && (
                      <p lang="ja" className="mt-1.5 text-sm font-medium text-primary-fg">
                        {currentCard.frontSub}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-medium text-success-fg">Nghĩa tiếng Việt</span>
                    <p className="mt-2 text-xl font-bold text-fg sm:text-2xl">
                      {currentCard.back}
                    </p>
                    {currentCard.extra && (
                      <p className="mt-2 max-w-md text-xs text-muted sm:text-sm">
                        {currentCard.extra}
                      </p>
                    )}
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={safeCardIdx <= 0}
                  leftIcon={<ChevronLeft className="size-4" aria-hidden />}
                  onClick={() => {
                    setCardIndex((i) => Math.max(0, i - 1));
                    setFlipped(false);
                  }}
                >
                  Thẻ trước
                </Button>

                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  leftIcon={<Volume2 className="size-4" aria-hidden />}
                  onClick={() => speakJapanese(currentCard.speak)}
                >
                  Nghe phát âm
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={safeCardIdx >= studyItems.length - 1}
                  rightIcon={<ChevronRight className="size-4" aria-hidden />}
                  onClick={() => {
                    setCardIndex((i) => Math.min(studyItems.length - 1, i + 1));
                    setFlipped(false);
                  }}
                >
                  Thẻ tiếp
                </Button>
              </div>
            </div>
          ) : quizFinished ? (
            <Card padding="lg" className="space-y-3 text-center">
              <Badge tone="success" className="mx-auto">
                ★ Hoàn thành Quiz bài tự tạo!
              </Badge>
              <p className="text-2xl font-bold text-fg">
                {quizScore}/{quizQuestions.length} câu đúng
              </p>
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<RotateCcw className="size-4" aria-hidden />}
                onClick={resetAll}
              >
                Làm lại lượt mới
              </Button>
            </Card>
          ) : (
            currentQuiz && (
              <div className="space-y-3">
                <div className="rounded-xl border border-line bg-surface-2/60 p-4 text-center">
                  <p lang="ja" className="text-2xl font-bold text-fg sm:text-3xl">
                    {currentQuiz.item.front}
                  </p>
                  {currentQuiz.item.frontSub && (
                    <p lang="ja" className="mt-1 text-sm text-muted">
                      {currentQuiz.item.frontSub}
                    </p>
                  )}
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<Volume2 className="size-4" aria-hidden />}
                      onClick={() => speakJapanese(currentQuiz.item.speak)}
                    >
                      Đọc tiếng Nhật
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {currentQuiz.options.map((opt) => {
                    const isPicked = pickedOption === opt;
                    const isCorrect = opt === currentQuiz.item.back;
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={pickedOption !== null}
                        onClick={() => {
                          setPickedOption(opt);
                          if (isCorrect) setQuizScore((s) => s + 1);
                          window.setTimeout(() => {
                            setPickedOption(null);
                            setQuizIndex((i) => i + 1);
                          }, 650);
                        }}
                        className={cn(
                          'flex min-h-[52px] cursor-pointer items-center justify-between gap-2 rounded-xl border-2 px-3.5 py-2.5 text-left text-sm font-semibold transition-colors',
                          pickedOption !== null && isCorrect
                            ? 'border-success bg-success-soft text-success-fg'
                            : isPicked && !isCorrect
                              ? 'border-danger bg-danger-soft text-danger-fg'
                              : 'border-line bg-surface hover:border-primary',
                        )}
                      >
                        <span>{opt}</span>
                        {pickedOption !== null && isCorrect && (
                          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                        )}
                        {isPicked && !isCorrect && (
                          <XCircle className="size-4 shrink-0" aria-hidden />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </Modal>
  );
};
