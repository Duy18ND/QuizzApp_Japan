import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
  Volume2,
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
import { isSpeechSupported, speakJapanese } from '../utils/tts';
import { SupabaseStatusBadge } from '../components/common/SupabaseStatusBadge';
import { LoginRequiredState } from '../components/auth/LoginRequiredState';
import { StudyScheduleCard } from '../components/settings/StudyScheduleCard';
import { useAuth } from '../context/auth-context';
import { commitUserProgress, loadUserProgress } from '../hooks/useUserProgress';
import { loadStudySchedule } from '../services/notificationService';
import {
  clearAllCloudAccountData,
  pushRestoredProgressToCloud,
} from '../services/progressSyncService';
import {
  Button,
  Card,
  Chip,
  Modal,
  Notice,
  PageContainer,
  PageHeader,
  Switch,
  useToast,
} from '../components/ui';

const TTS_SPEEDS = [
  { value: 0.75, label: '0.75x Chậm' },
  { value: 0.9, label: '0.9x Vừa' },
  { value: 1.0, label: '1.0x Chuẩn' },
  { value: 1.2, label: '1.2x Nhanh' },
];

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
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const kanjiState = useAppSelector((state) => state.kanji);
  const grammarRecords = useAppSelector((state) => state.grammarProgress.records);
  const mistakeItems = useAppSelector((state) => state.mistake.mistakes);
  const { theme, setTheme } = useTheme();
  const { settings, updateSettings } = useAppSettings();
  const { progress, resetProgress } = useUserProgress();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{
    tone: 'success' | 'danger';
    message: string;
  } | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

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
    if (user?.id) {
      void clearAllCloudAccountData(user.id);
    }
    setIsResetModalOpen(false);
    setImportStatus({ tone: 'success', message: 'Đã đặt lại toàn bộ tiến độ học tập.' });
    toast({ title: 'Đã đặt lại tiến độ học tập', tone: 'info' });
  };

  const speechAvailable = isSpeechSupported();

  return (
    <PageContainer size="lg" className="max-w-5xl space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Cài đặt' }]}
        title="Cài đặt & Quản lý dữ liệu"
        description="Tùy chỉnh lịch nhắc học trên điện thoại, giao diện, giọng đọc tiếng Nhật và sao lưu tiến độ cá nhân."
        actions={<SupabaseStatusBadge />}
      />

      {/* 0. Mobile Study Notification & Fixed Schedule Manager */}
      <StudyScheduleCard />

      {/* 1. Theme */}
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

      {/* 2. TTS Voice Settings */}
      <Card padding="lg" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-fg">Phát âm tiếng Nhật (TTS)</h2>
            <p className="text-sm text-muted">Áp dụng cho Flashcard, Bảng từ, Luyện viết và Ôn tập.</p>
          </div>
          <Button
            variant="soft"
            size="sm"
            disabled={!speechAvailable}
            leftIcon={<Volume2 className="size-4" aria-hidden />}
            onClick={() => speakJapanese('こんにちは、日本語の勉強を始めましょう。', settings.ttsRate)}
          >
            Nghe thử
          </Button>
        </div>

        {!speechAvailable && (
          <Notice tone="warning">
            Trình duyệt hiện tại không hỗ trợ Web Speech API cho phát âm tiếng Nhật.
          </Notice>
        )}

        <Switch
          checked={settings.ttsAutoPlay}
          onChange={(checked) => updateSettings({ ttsAutoPlay: checked })}
          label="Tự động phát âm khi chuyển thẻ Flashcard / Luyện viết"
          description="Tắt nếu bạn muốn tự bấm nút loa trước khi xem gợi ý."
        />

        <div className="space-y-2 border-t border-line pt-4">
          <p className="text-sm font-medium text-fg">Tốc độ đọc</p>
          <div className="flex flex-wrap gap-2">
            {TTS_SPEEDS.map((opt) => (
              <Chip
                key={opt.value}
                selected={Math.abs(settings.ttsRate - opt.value) < 0.05}
                onClick={() => updateSettings({ ttsRate: opt.value })}
              >
                {opt.label}
              </Chip>
            ))}
          </div>
        </div>
      </Card>

      {/* 3. Backup Export / Restore */}
      <Card padding="lg" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-fg">Sao lưu & Khôi phục tiến độ (.json)</h2>
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

      {/* 4. Reset Progress Danger Zone */}
      <Card padding="lg" className="border-danger-line space-y-4">
        <div>
          <h2 className="text-base font-semibold text-danger-fg">Đặt lại tiến độ học tập</h2>
          <p className="text-sm text-muted">
            Xóa toàn bộ tiến độ Kanji đã thuộc, điểm Ngữ pháp, từ vựng đã lưu (★) và danh sách lỗi sai.
          </p>
        </div>

        {!user ? (
          <Notice tone="info">
            Chế độ Khách hiện không lưu tiến độ nên không có dữ liệu cá nhân cần đặt lại.
          </Notice>
        ) : (
          <Button
            variant="danger"
            leftIcon={<Trash2 className="size-4" aria-hidden />}
            onClick={() => setIsResetModalOpen(true)}
          >
            Xóa toàn bộ tiến độ
          </Button>
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
          Toàn bộ dữ liệu Kanji, Ngữ pháp, Từ vựng ★/sai và lịch sử lỗi sai trên trình duyệt này sẽ bị xóa về 0.
        </Notice>
      </Modal>
    </PageContainer>
  );
};
