import React, { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  Eye,
  FileSignature,
  Info,
  Play,
  RotateCcw,
} from 'lucide-react';
import { KanjiCanvas } from '../../components/kanji/KanjiCanvas';
import type { KanjiCanvasRef } from '../../components/kanji/KanjiCanvas';
import { useCurriculumSnapshot } from '../../hooks/useCurriculumData';
import { getLiveKanjis } from '../../services/curriculumStore';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { markTutorialSeen, updateKanjiProgress } from '../../store/slices/kanjiSlice';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  EmptyState,
  IconButton,
  Modal,
  Notice,
  PageContainer,
  buttonStyles,
} from '../../components/ui';
import { cn } from '../../lib/cn';

const MODES: {
  id: 'show' | 'trace' | 'test';
  title: string;
  desc: string;
  icon: typeof Eye;
}[] = [
  { id: 'show', title: 'Xem mẫu', desc: 'Quan sát hình dáng và thứ tự nét chữ.', icon: Eye },
  {
    id: 'trace',
    title: 'Viết theo mẫu (Trace)',
    desc: 'Được hướng dẫn từng nét một.',
    icon: FileSignature,
  },
  { id: 'test', title: 'Tự viết (Test)', desc: 'Viết không có nét mờ hướng dẫn.', icon: Edit2 },
];

export const KanjiPractice: React.FC = () => {
  const { kanjiId } = useParams();
  const dispatch = useAppDispatch();
  const cmsSnapshot = useCurriculumSnapshot();
  const kanjiList = React.useMemo(() => getLiveKanjis(cmsSnapshot), [cmsSnapshot]);

  const canvasRef = useRef<KanjiCanvasRef>(null);

  const tutorialSeen = useAppSelector((state) => state.kanji.tutorialSeen);
  const kanjiProgress = useAppSelector((state) =>
    kanjiId ? state.kanji.progress[kanjiId] : undefined,
  );

  const [mode, setMode] = useState<'show' | 'trace' | 'test'>('show');
  const [showTutorial, setShowTutorial] = useState(!tutorialSeen);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'warning' | '' }>({
    text: '',
    type: '',
  });

  const kanji = kanjiList.find((k) => k.id === kanjiId);

  if (!kanji) {
    return (
      <PageContainer size="md">
        <EmptyState
          title="Kanji không tồn tại"
          action={
            <Link to="/kanji" className={buttonStyles({ variant: 'secondary' })}>
              Quay lại danh sách Kanji
            </Link>
          }
        />
      </PageContainer>
    );
  }

  const handleTutorialClose = () => {
    setShowTutorial(false);
    dispatch(markTutorialSeen());
  };

  const handleAnimate = () => {
    canvasRef.current?.animate();
  };

  const handleClear = () => {
    canvasRef.current?.clear();
    setFeedback({ text: '', type: '' });
  };

  const handleCorrect = () => {
    setFeedback({ text: 'Tốt lắm!', type: 'success' });
  };

  const handleMistake = () => {
    setFeedback({ text: 'Sai nét hoặc sai thứ tự. Hãy thử lại!', type: 'warning' });
  };

  const handleComplete = () => {
    setFeedback({ text: 'Hoàn thành xuất sắc!', type: 'success' });
    dispatch(updateKanjiProgress({ kanjiId: kanji.id, correct: true }));
  };

  return (
    <PageContainer size="md" className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Breadcrumbs
          className="mb-0"
          items={[
            { label: 'Kanji', to: '/kanji' },
            { label: kanji.kanji, to: `/kanji/${kanji.id}` },
            { label: 'Luyện viết' },
          ]}
        />

        <IconButton
          variant="soft"
          aria-label="Hướng dẫn viết Kanji"
          onClick={() => setShowTutorial(true)}
        >
          <Info className="size-5" aria-hidden />
        </IconButton>
      </div>

      <Card padding="none" className="flex flex-col overflow-hidden md:flex-row">
        {/* Left: Canvas */}
        <div className="flex flex-col items-center justify-center border-b border-line bg-surface-2 p-6 md:border-r md:border-b-0 md:p-8">
          <div className="mb-5 flex gap-2">
            <Button
              variant="soft"
              size="sm"
              leftIcon={<Play className="size-4" aria-hidden />}
              onClick={handleAnimate}
            >
              Phát lại
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RotateCcw className="size-4" aria-hidden />}
              onClick={handleClear}
            >
              Làm lại
            </Button>
          </div>

          <div className="rounded-xl border border-line bg-surface p-2 shadow-card">
            <KanjiCanvas
              ref={canvasRef}
              kanji={kanji.kanji}
              size={300}
              mode={mode}
              onCorrect={handleCorrect}
              onMistake={handleMistake}
              onComplete={handleComplete}
            />
          </div>

          <div className="mt-5 flex min-h-9 items-center justify-center">
            {feedback.text && (
              <Badge
                tone={feedback.type === 'success' ? 'success' : 'warning'}
                className="animate-fade-in px-3 py-1 text-sm"
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="size-4" aria-hidden />
                ) : (
                  <AlertTriangle className="size-4" aria-hidden />
                )}
                {feedback.text}
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Mode Controls */}
        <div className="flex flex-1 flex-col p-6 md:p-8">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-fg">
                Luyện viết: <span lang="ja">{kanji.kanji}</span>
              </h1>
              <p className="mt-1 text-sm text-muted">Nghĩa: {kanji.meanings.join(', ')}</p>
            </div>
            {kanjiProgress && (
              <Badge tone={kanjiProgress.learned ? 'success' : 'neutral'} className="tabular">
                Đúng {kanjiProgress.correctAttempts} / {kanjiProgress.writingAttempts} lượt
              </Badge>
            )}
          </div>

          <div className="flex-1 space-y-3">
            {MODES.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setMode(item.id);
                    setFeedback({ text: '', type: '' });
                  }}
                  className={cn(
                    'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary-soft'
                      : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-lg',
                      active
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-2 text-muted',
                    )}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-fg">{item.title}</span>
                    <span className="block text-sm text-muted">{item.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <Modal
        open={showTutorial}
        onClose={handleTutorialClose}
        title="Hướng dẫn viết Kanji"
        footer={
          <Button
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
            onClick={handleTutorialClose}
          >
            Tôi đã hiểu
          </Button>
        }
      >
        <div className="space-y-4 text-sm text-muted">
          <div className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-fg">
              1
            </span>
            <p>
              <strong className="text-fg">Chế độ &ldquo;Xem mẫu&rdquo;</strong>: Quan sát thứ tự nét
              và hướng viết.
            </p>
          </div>

          <div className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-fg">
              2
            </span>
            <p>
              <strong className="text-fg">Chế độ &ldquo;Viết theo mẫu&rdquo;</strong>: Vẽ lên khung ô
              li theo đường viền mờ, đúng nét và đúng hướng.
            </p>
          </div>

          <div className="flex gap-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-bold text-primary-fg">
              3
            </span>
            <p>
              <strong className="text-fg">Chế độ &ldquo;Tự viết&rdquo;</strong>: Tự nhớ và viết lại.
              Nếu sai 3 lần, nét gợi ý sẽ hiện ra.
            </p>
          </div>

          <Notice tone="info" className="flex items-start gap-2.5">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Bạn có thể dùng chuột trên máy tính hoặc ngón tay / Apple Pencil trên điện thoại, iPad
              để vẽ trực tiếp vào khung ô li.
            </span>
          </Notice>
        </div>
      </Modal>
    </PageContainer>
  );
};
