import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  GraduationCap,
  Moon,
  RotateCcw,
  Sun,
  Upload,
} from 'lucide-react';
import { useAppSettings, type AppSettings } from '../hooks/useAppSettings';
import { useTheme } from '../hooks/useTheme';
import { useUserProgress } from '../hooks/useUserProgress';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  hydrateGrammarProgress,
  resetAllGrammarProgress,
} from '../store/slices/grammarProgressSlice';
import { hydrateKanjiState, resetAllKanjiProgress } from '../store/slices/kanjiSlice';
import { clearMistakes, hydrateMistakes } from '../store/slices/mistakeSlice';
import type { UserProgress } from '../types/quiz';
import { LoginRequiredState } from '../components/auth/LoginRequiredState';
import { StudyScheduleCard } from '../components/settings/StudyScheduleCard';
import { useAuth } from '../context/auth-context';
import { commitUserProgress, loadUserProgress } from '../hooks/useUserProgress';
import { cn } from '../lib/cn';
import { loadStudySchedule } from '../services/notificationService';
import { clearJlptProgressCache } from '../services/jlptProgressService';
import {
  clearAllCloudAccountData,
  pushRestoredProgressToCloud,
} from '../services/progressSyncService';
import {
  getVocabTextbooksForLevel,
  resolveActiveVocabTextbook,
} from '../data/vocabTextbooks';
import {
  STUDY_LEVEL_OPTIONS,
  type StudyLevel,
} from '../services/userLevelService';
import {
  Badge,
  Button,
  Card,
  Chip,
  Modal,
  Notice,
  PageContainer,
  PageHeader,
  useToast,
} from '../components/ui';

interface ProgressBackupPayload {
  version: number;
  exportedAt: string;
  theme?: 'light' | 'dark';
  settings?: Partial<AppSettings>;
  userProgress?: Partial<UserProgress>;
  kanjiProgress?: unknown;
  grammarProgress?: unknown;
  grammarMistakes?: unknown;
  studySchedule?: unknown;
}

function hasSavedBackupAccess(userId?: string | null): boolean {
  return Boolean(userId);
}

export const SettingsPage: React.FC = () => {
  const { user, studyLevel, studyTextbookId, updateStudyLevel } = useAuth();
  const dispatch = useAppDispatch();
  const kanjiState = useAppSelector((state) => state.kanji);
  const grammarRecords = useAppSelector((state) => state.grammarProgress.records);
  const mistakeItems = useAppSelector((state) => state.mistake.mistakes);
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useAppSettings();
  const { progress, resetProgress } = useUserProgress();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [savingLevel, setSavingLevel] = useState<StudyLevel | null>(null);
  const [importStatus, setImportStatus] = useState<{
    tone: 'success' | 'danger';
    message: string;
  } | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleSelectStudyLevel = async (level: StudyLevel, textbookId?: string) => {
    setSavingLevel(level);
    await updateStudyLevel(level, textbookId);
    setSavingLevel(null);
    const activeBook = resolveActiveVocabTextbook(level, user?.id, textbookId);
    toast({
      title: `Đã chọn JLPT ${level} · ${activeBook.shortTitle}`,
      tone: 'success',
    });
  };

  const handleExportBackup = () => {
    if (!hasSavedBackupAccess(user?.id)) return;
    const payload: ProgressBackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      theme,
      settings,
      userProgress: progress ?? loadUserProgress(user?.id),
      kanjiProgress: kanjiState,
      grammarProgress: grammarRecords,
      grammarMistakes: mistakeItems,
      studySchedule: loadStudySchedule(undefined, user?.id),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `nihongo-progress-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({ title: 'Đã xuất sao lưu (.json)', tone: 'success' });
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('File không đúng cấu trúc JSON đối tượng.');
      }

      const data = parsed as Record<string, unknown>;
      const hasKnownField =
        'userProgress' in data ||
        'kanjiProgress' in data ||
        'grammarProgress' in data ||
        'grammarMistakes' in data ||
        'settings' in data;

      if (!hasKnownField) {
        throw new Error('File JSON không chứa dữ liệu tiến độ Nihongo hợp lệ.');
      }

      if (data.theme === 'light' || data.theme === 'dark') {
        setTheme(data.theme);
      }
      if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
        updateSettings(data.settings as Partial<AppSettings>);
      }
      if (
        data.userProgress &&
        typeof data.userProgress === 'object' &&
        !Array.isArray(data.userProgress)
      ) {
        commitUserProgress(data.userProgress as Partial<UserProgress> as UserProgress, user?.id);
      }
      if (data.kanjiProgress) {
        dispatch(hydrateKanjiState(data.kanjiProgress));
      }
      if (data.grammarProgress) {
        dispatch(hydrateGrammarProgress(data.grammarProgress));
      }
      if (data.grammarMistakes) {
        dispatch(hydrateMistakes(data.grammarMistakes));
      }
      if (user?.id) {
        void pushRestoredProgressToCloud(user.id);
      }

      setImportStatus({
        tone: 'success',
        message: 'Khôi phục dữ liệu học tập thành công! Tiến độ đã được cập nhật.',
      });
      toast({ title: 'Đã khôi phục tiến độ từ file JSON', tone: 'success' });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Không thể đọc file sao lưu JSON.';
      setImportStatus({ tone: 'danger', message: msg });
    }
  };

  const handleConfirmReset = () => {
    resetProgress();
    dispatch(resetAllKanjiProgress());
    dispatch(resetAllGrammarProgress());
    dispatch(clearMistakes());
    clearJlptProgressCache();
    if (user?.id) {
      void clearAllCloudAccountData(user.id);
    }
    setIsResetModalOpen(false);
    setImportStatus({ tone: 'success', message: 'Đã đặt lại toàn bộ tiến độ học tập.' });
    toast({ title: 'Đã đặt lại tiến độ học tập', tone: 'info' });
  };

  return (
    <PageContainer size="lg" className="max-w-5xl space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Cài đặt' }]}
        title="Cài đặt & Quản lý dữ liệu"
        description="Tùy chỉnh trình độ tiếng Nhật, lịch nhắc học, chuỗi ngày học, giao diện và sao lưu tiến độ cá nhân."
      />

      {/* 0. JLPT Study Level Selector (Logged-in users only) */}
      <Card padding="lg" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-fg"
            >
              <GraduationCap className="size-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-fg">Trình độ tiếng Nhật (JLPT)</h2>
              <p className="text-sm text-muted">
                Chọn 1 trong 5 trình độ JLPT (N5 – N1) để hiển thị đúng lộ trình học tập ở Trang chủ.
              </p>
            </div>
          </div>
          {user &&
            (studyLevel ? (
              <Badge tone="primary">Đang chọn: JLPT {studyLevel}</Badge>
            ) : (
              <Badge tone="warning">Chưa chọn trình độ</Badge>
            ))}
        </div>

        {!user ? (
          <LoginRequiredState
            compact
            title="Đăng nhập để chọn trình độ & mở lộ trình học"
            description="Chỉ tài khoản đã đăng nhập mới có thể chọn trình độ (N5 – N1) và sử dụng lộ trình học cá nhân."
          />
        ) : (
          <>
            {!studyLevel && (
              <Notice tone="info">
                Bạn chưa chọn trình độ học. Hãy chọn một cấp độ bên dưới để mở lộ trình học tập dành riêng cho bạn.
              </Notice>
            )}

            <div
              role="radiogroup"
              aria-label="Chọn trình độ tiếng Nhật"
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5"
            >
              {STUDY_LEVEL_OPTIONS.map((opt) => {
                const isSelected = studyLevel === opt.level;
                return (
                  <button
                    key={opt.level}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={savingLevel !== null}
                    onClick={() => void handleSelectStudyLevel(opt.level)}
                    className={cn(
                      'flex cursor-pointer flex-col gap-2 rounded-xl border p-3.5 text-left transition-colors duration-150',
                      isSelected
                        ? 'border-primary bg-primary-soft/65'
                        : 'border-line bg-surface-2/60 hover:border-primary/60 hover:bg-surface-2',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'inline-flex h-8 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-bold',
                          isSelected
                            ? 'bg-primary text-on-primary'
                            : 'bg-primary-soft text-primary-fg',
                        )}
                      >
                        {opt.level}
                      </span>
                      {isSelected && (
                        <CheckCircle2 className="size-4 text-primary-fg shrink-0" aria-hidden />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-fg">{opt.title}</div>
                      <div lang="ja" className="text-xs text-muted">
                        {opt.japaneseLabel}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {studyLevel && (
              <div className="space-y-2 border-t border-line pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-fg">
                    Giáo trình từ vựng chính ({studyLevel})
                  </p>
                  <span className="text-xs text-muted">
                    Mở thẳng khi bấm Từ vựng, Quiz và Flashcard
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getVocabTextbooksForLevel(studyLevel).map((book) => {
                    const activeBook = resolveActiveVocabTextbook(
                      studyLevel,
                      user.id,
                      studyTextbookId,
                    );
                    const isSelectedBook = activeBook.id === book.id;
                    return (
                      <Chip
                        key={book.id}
                        selected={isSelectedBook}
                        onClick={() => void handleSelectStudyLevel(studyLevel, book.id)}
                      >
                        {book.title}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      {/* 1. Study Schedule (push reminders for every time slot) */}
      <StudyScheduleCard />

      {/* 2. Theme */}
      <Card padding="lg" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-fg">Giao diện hiển thị</h2>
          <p className="text-sm text-muted">Chọn chế độ sáng (Ngày) hoặc tối (Đêm).</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Chip selected={theme === 'light'} onClick={() => setTheme('light')}>
            <Sun className="size-4" aria-hidden />
            Chế độ Sáng (Ngày)
          </Chip>
          <Chip selected={theme === 'dark'} onClick={() => setTheme('dark')}>
            <Moon className="size-4" aria-hidden />
            Chế độ Tối (Đêm)
          </Chip>
        </div>
      </Card>

      {/* 3. Backup Export / Restore */}
      <Card padding="lg" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-fg">Sao lưu &amp; Khôi phục tiến độ (.json)</h2>
          <p className="text-sm text-muted">
            Tải về toàn bộ tiến độ Kanji, Ngữ pháp, Từ đánh dấu sao và Lỗi sai theo tài khoản đã đăng nhập.
          </p>
        </div>

        {!user ? (
          <LoginRequiredState
            compact
            title="Đăng nhập để sao lưu & khôi phục tiến độ"
            description="Chức năng sao lưu chỉ áp dụng cho tài khoản đã đăng nhập."
          />
        ) : (
        <>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            leftIcon={<Download className="size-4" aria-hidden />}
            onClick={handleExportBackup}
          >
            Xuất file sao lưu (.json)
          </Button>

          <Button
            variant="secondary"
            leftIcon={<Upload className="size-4" aria-hidden />}
            onClick={() => fileInputRef.current?.click()}
          >
            Nhập / Khôi phục (.json)
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
            aria-label="Chọn file sao lưu JSON"
          />
        </div>

        {importStatus && (
          <Notice tone={importStatus.tone} className="flex items-center gap-2">
            {importStatus.tone === 'success' && <CheckCircle2 className="size-4 shrink-0" aria-hidden />}
            <span>{importStatus.message}</span>
          </Notice>
        )}
        </>
        )}
      </Card>

      <Modal
        open={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Xác nhận đặt lại tiến độ?"
        description="Hành động này không thể hoàn tác. Bạn nên xuất sao lưu (.json) trước khi tiếp tục."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>
              Hủy bỏ
            </Button>
            <Button
              variant="danger"
              leftIcon={<RotateCcw className="size-4" aria-hidden />}
              onClick={handleConfirmReset}
            >
              Xác nhận xóa tất cả
            </Button>
          </>
        }
      >
        <Notice tone="danger">
          Toàn bộ dữ liệu Kanji, Ngữ pháp, Từ vựng ★/sai và lịch sử lỗi sai của tài khoản này sẽ bị xóa về 0.
        </Notice>
      </Modal>
    </PageContainer>
  );
};
