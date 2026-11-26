import React, { useState } from 'react';
import {
  CheckCircle2,
  GraduationCap,
  LogOut,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { LoginRequiredState } from '../components/auth/LoginRequiredState';
import { StudyScheduleCard } from '../components/settings/StudyScheduleCard';
import { useAuth } from '../context/auth-context';
import { cn } from '../lib/cn';
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
  Notice,
  PageContainer,
  PageHeader,
  useToast,
} from '../components/ui';

export const SettingsPage: React.FC = () => {
  const { user, studyLevel, studyTextbookId, updateStudyLevel, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [savingLevel, setSavingLevel] = useState<StudyLevel | null>(null);

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

  return (
    <PageContainer size="lg" className="max-w-5xl space-y-4 sm:space-y-6">
      <PageHeader
        breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Cài đặt' }]}
        title="Cài đặt"
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

      {user && (
        <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-muted">{user.email}</p>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<LogOut className="size-4" aria-hidden />}
            onClick={() => void signOut()}
          >
            Đăng xuất
          </Button>
        </Card>
      )}
    </PageContainer>
  );
};
