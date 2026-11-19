import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, ArrowRight, Flame, Lock, LogIn } from 'lucide-react';
import { LoginRequiredState } from '../components/auth/LoginRequiredState';
import { StudyScheduleModal } from '../components/settings/StudyScheduleCard';
import { Badge, Button, CardLink, Card, PageContainer, ProgressBar, QuizHistoryCard, Stat } from '../components/ui';
import { buttonStyles } from '../components/ui/styles';
import { useAuth } from '../context/auth-context';
import { useCurriculumSnapshot } from '../hooks/useCurriculumData';
import { getLiveGrammarBooks, getLiveKanjis } from '../services/curriculumStore';
import { cn } from '../lib/cn';
import {
  calculateStudyStreakStats,
  formatOnlineDurationVi,
  getLocalDateKey,
  getTodayOnlineSeconds,
  loadStudySchedule,
  ONLINE_TIME_SYNC_EVENT,
  STUDY_SCHEDULE_SYNC_EVENT,
  type StudyScheduleConfig,
} from '../services/notificationService';
import { useAppSelector } from '../store/hooks';

interface Area {
  to: string;
  glyph: string;
  title: string;
  description: string;
  featured?: boolean;
}

const AREAS: Area[] = [
  { to: '/vocabulary', glyph: '語', title: 'Từ vựng', description: 'Danh sách từ theo cấp độ JLPT và từng Unit.' },
  { to: '/grammar', glyph: '文', title: 'Ngữ pháp', description: 'Bài học và luyện tập theo giáo trình Shin Kanzen Master.' },
  { to: '/kanji', glyph: '漢', title: 'Kanji', description: 'Tra cứu, tập viết và theo dõi chữ Hán đã thuộc.' },
  { to: '/vocabulary/quiz', glyph: '問', title: 'Luyện Quiz', description: 'Trắc nghiệm 4 đáp án kèm giải thích đúng/sai.' },
  { to: '/flashcard', glyph: '札', title: 'Flashcard', description: 'Ôn từ vựng bằng thẻ lật theo từng Unit.' },
  { to: '/pdf', glyph: '印', title: 'Xuất PDF', description: 'Tạo tài liệu từ vựng, ngữ pháp và Kanji để in.' },
];

const JLPT_AREAS: Area[] = [
  {
    to: '/jlpt/kanji',
    glyph: '字',
    title: 'Luyện Chữ Hán',
    description: 'Luyện cách đọc Hiragana, âm On-Kun và chọn chữ Hán chuẩn trong câu.',
  },
  {
    to: '/jlpt/vocab',
    glyph: '詞',
    title: 'Luyện Từ vựng',
    description: 'Điền từ theo ngữ cảnh, tìm từ đồng nghĩa và cách dùng từ đúng chuẩn JLPT.',
  },
  {
    to: '/jlpt/grammar',
    glyph: '法',
    title: 'Luyện Ngữ pháp',
    description: 'Chọn mẫu ngữ pháp phù hợp trong câu và điền ngữ pháp vào đoạn văn.',
  },
  {
    to: '/jlpt/star',
    glyph: '星',
    title: 'Luyện Hái sao (★)',
    description: 'Sắp xếp 4 mảnh ghép thành câu hoàn chỉnh và chọn từ đúng ở vị trí ngôi sao.',
  },
  {
    to: '/jlpt/reading-short',
    glyph: '短',
    title: 'Đọc hiểu Ngắn (Đoản văn)',
    description: 'Luyện đọc nhanh đoạn văn ngắn (150–200 chữ), email, bảng thông báo và tìm ý chính.',
  },
  {
    to: '/jlpt/reading-medium',
    glyph: '中',
    title: 'Đọc hiểu Trung văn',
    description: 'Phân tích bài viết độ dài trung bình (400–500 chữ) và trả lời câu hỏi lý giải nguyên nhân.',
  },
  {
    to: '/jlpt/reading-long',
    glyph: '長',
    title: 'Đọc hiểu Trường văn',
    description: 'Luyện đọc bài luận dài, nắm bắt mạch lập luận của tác giả và tìm kiếm thông tin.',
  },
  {
    to: '/jlpt/listening',
    glyph: '聴',
    title: 'Luyện Nghe hiểu',
    description: 'Luyện nghe theo từng Mondai (bắt điểm chính, phản xạ nhanh) kèm transcript và giải thích.',
  },
  {
    to: '/jlpt/full-test',
    glyph: '全',
    title: 'Thi thử Toàn bộ (Full Test)',
    description: 'Làm đề thi JLPT hoàn chỉnh đầy đủ các phần có bấm giờ, chấm điểm tự động và giải thích lỗi sai.',
    featured: true,
  },
];

function FeatureNavCard({ area }: { area: Area }) {
  return (
    <Link
      to={area.to}
      className={cn(
        'animate-fade-up group relative flex h-full cursor-pointer items-start gap-3.5 overflow-hidden rounded-xl border p-3.5 shadow-card transition-[border-color,background-color,transform] duration-150 ease-out-soft hover:-translate-y-0.5 active:scale-[0.99]',
        area.featured
          ? 'border-sakura/50 bg-glass-soft hover:border-sakura hover:bg-glass-hover'
          : 'border-line bg-glass hover:border-primary hover:bg-glass-hover',
      )}
    >
      <span
        aria-hidden
        className="seigaiha-mask pointer-events-none absolute -right-2 -bottom-2 h-8 w-20 bg-wave opacity-0 transition-opacity duration-150 group-hover:opacity-30"
      />
      <span
        lang="ja"
        aria-hidden
        className={cn(
          'relative flex size-10 shrink-0 items-center justify-center rounded-lg text-base font-bold transition-colors duration-150',
          area.featured
            ? 'bg-sakura text-on-primary ring-2 ring-sakura/30 group-hover:bg-primary'
            : 'bg-primary-soft text-primary-fg ring-1 ring-primary/20 group-hover:bg-primary group-hover:text-on-primary group-hover:ring-sakura/45',
        )}
      >
        {area.glyph}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="block text-sm font-semibold text-fg md:text-base">{area.title}</span>
          {area.featured && (
            <span className="rounded-full border border-sakura/35 bg-glass-soft px-2 py-0.5 text-[11px] font-semibold text-sakura">
              JLPT Mock
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted md:text-sm">{area.description}</span>
      </span>
    </Link>
  );
}

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const cmsSnapshot = useCurriculumSnapshot();
  const kanjiTotal = useMemo(() => getLiveKanjis(cmsSnapshot).length, [cmsSnapshot]);
  const grammarTotal = useMemo(
    () =>
      getLiveGrammarBooks(cmsSnapshot).reduce(
        (sum, book) => sum + book.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.grammars.length, 0),
        0,
      ),
    [cmsSnapshot],
  );
  const kanjiProgress = useAppSelector((state) => state.kanji.progress);
  const grammarRecords = useAppSelector((state) => state.grammarProgress.records);
  const mistakes = useAppSelector((state) => state.mistake.mistakes);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [schedule, setSchedule] = useState<StudyScheduleConfig>(() => loadStudySchedule());
  const [todayOnlineSeconds, setTodayOnlineSeconds] = useState(() => getTodayOnlineSeconds());

  useEffect(() => {
    const onSync = () => setSchedule(loadStudySchedule());
    const onOnlineSync = () => setTodayOnlineSeconds(getTodayOnlineSeconds());
    window.addEventListener(STUDY_SCHEDULE_SYNC_EVENT, onSync);
    window.addEventListener(ONLINE_TIME_SYNC_EVENT, onOnlineSync);
    return () => {
      window.removeEventListener(STUDY_SCHEDULE_SYNC_EVENT, onSync);
      window.removeEventListener(ONLINE_TIME_SYNC_EVENT, onOnlineSync);
    };
  }, []);

  const streakStats = calculateStudyStreakStats(
    {
      streakMode: 'every_day',
      streakDaysOfWeek: [1, 2, 3, 4, 5, 6, 0],
      completedDates: schedule.completedDates,
    },
    getLocalDateKey(),
  );

  const kanjiLearned = Object.values(kanjiProgress).filter((item) => item.learned).length;
  const grammarPracticed = Object.values(grammarRecords).filter((record) =>
    Object.values(record).some((score) => score > 0),
  ).length;

  return (
    <PageContainer>
      <section
        aria-label="Giới thiệu"
        className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-glass px-3.5 py-3 shadow-card sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-4 md:mb-5 md:px-5"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span lang="ja" className="rounded-md bg-primary-soft px-2 py-0.5 text-xs font-semibold tracking-widest text-primary-fg">
              日本語道場
            </span>
            <h1 className="text-lg font-bold tracking-tight text-fg sm:text-xl md:text-2xl">
              Học tiếng Nhật mỗi ngày
            </h1>
          </div>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            {user
              ? `Đang đồng bộ tiến độ tài khoản ${user.displayName} (${user.role}).`
              : 'Chế độ Khách chỉ xem học liệu. Đăng nhập bằng Google hoặc tự tạo tài khoản để lưu tiến độ & câu sai.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user ? (
            <>
              <Badge tone={streakStats.completedToday ? 'success' : 'sakura'}>
                <Flame className="size-3.5 shrink-0" aria-hidden />
                <span className="tabular-nums">
                  {streakStats.currentStreak} ngày · {formatOnlineDurationVi(todayOnlineSeconds)}
                </span>
              </Badge>
              {schedule.enabled && (
                <Badge tone="primary">
                  <span className="font-mono tabular-nums">{schedule.primaryTime}</span>
                </Badge>
              )}
            </>
          ) : (
            <Link
              to="/login"
              className={buttonStyles({ variant: 'primary', size: 'sm', className: 'w-full sm:w-auto' })}
            >
              <LogIn className="size-4 shrink-0" aria-hidden />
              Đăng nhập lưu tiến độ
            </Link>
          )}
          <Button
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
            leftIcon={<AlarmClock className="size-4 text-primary-fg shrink-0" aria-hidden />}
            onClick={() => setScheduleModalOpen(true)}
          >
            Lịch nhắc &amp; Mục tiêu
          </Button>
        </div>
      </section>
      <StudyScheduleModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
      />

      <Card as="section" aria-label="Tiến độ học tập" className="mb-5 md:mb-6" padding="md">
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              lang="ja"
              aria-hidden
              className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-on-primary"
            >
              進
            </span>
            <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">Tiến độ học tập</h2>
          </div>
          {!user && (
            <Badge tone="neutral">
              <Lock className="size-3 shrink-0" aria-hidden />
              Yêu cầu đăng nhập
            </Badge>
          )}
        </div>
        {user ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Stat label="Kanji đã thuộc" value={`${kanjiLearned}/${kanjiTotal}`} />
              <ProgressBar value={kanjiLearned} max={kanjiTotal} label="Kanji đã thuộc" size="sm" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Stat label="Ngữ pháp đã luyện" value={`${grammarPracticed}/${grammarTotal}`} />
              <ProgressBar value={grammarPracticed} max={grammarTotal} label="Ngữ pháp đã luyện" size="sm" />
            </div>
            <Stat label="Câu sai cần ôn" value={mistakes.length} hint={mistakes.length > 0 ? undefined : 'Chưa có câu sai nào'} />
            <div className="flex items-end">
              <CardLink
                to="/grammar/mistakes"
                padding="sm"
                className="flex w-full items-center justify-between gap-2 border-sakura/40 bg-sakura-soft text-sm font-semibold text-fg hover:border-sakura hover:bg-glass-hover"
              >
                <span className="flex items-center gap-2">
                  <span aria-hidden className="size-2 rounded-full bg-sakura" />
                  Ôn tập lỗi sai
                </span>
                <ArrowRight className="size-4 text-sakura" aria-hidden />
              </CardLink>
            </div>
          </div>
        ) : (
          <LoginRequiredState
            compact
            title="Đăng nhập để lưu & hiển thị tiến độ học tập"
            description="Người chưa đăng nhập sẽ không lưu tiến độ làm bài, câu sai hay chuỗi ngày học. Hãy đăng nhập bằng Google hoặc tự tạo tài khoản."
          />
        )}
      </Card>

      {[
        { id: 'section-start-learning', title: 'Bắt đầu học', note: undefined, list: AREAS, first: false },
        {
          id: 'section-jlpt-practice',
          title: 'Luyện đề JLPT',
          note: 'Luyện tập chuyên sâu theo từng dạng bài (Mondai) hoặc thi thử toàn bộ đề chuẩn cấu trúc JLPT',
          list: JLPT_AREAS,
          first: true,
        },
      ].map((section) => (
        <section key={section.id} aria-labelledby={section.id} className={section.first ? 'mt-6 md:mt-7' : undefined}>
          <div className="mb-3 inline-flex flex-col rounded-xl border border-line bg-glass px-3.5 py-2 shadow-card">
            <h2 id={section.id} className="flex items-center gap-2 text-base font-semibold text-fg md:text-lg">
              <span aria-hidden className="h-4 w-1 rounded-full bg-wave" />
              {section.title}
            </h2>
            {section.note && <p className="mt-0.5 text-xs text-muted md:text-sm">{section.note}</p>}
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {section.list.map((area) => (
              <li key={area.to}>
                <FeatureNavCard area={area} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <QuizHistoryCard limit={5} showProfileLink className="mt-6 md:mt-7" />
    </PageContainer>
  );
};
