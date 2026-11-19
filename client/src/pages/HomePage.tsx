import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, ArrowRight, Compass, Flame, GraduationCap, Lock, LogIn } from 'lucide-react';
import { LoginRequiredState } from '../components/auth/LoginRequiredState';
import { StudyScheduleModal } from '../components/settings/StudyScheduleCard';
import {
  Badge,
  Button,
  Card,
  CardLink,
  Chip,
  PageContainer,
  ProgressBar,
  QuizHistoryCard,
  Stat,
  useToast,
} from '../components/ui';
import { buttonStyles } from '../components/ui/styles';
import { useAuth } from '../context/auth-context';
import {
  getNextRoadmapStep,
  getRoadmapStepCount,
  STUDY_ROADMAPS,
} from '../data/studyRoadmaps';
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
import {
  getStudyLevelMeta,
  loadRoadmapCompletedSteps,
  requestOpenLevelModal,
  ROADMAP_PROGRESS_SYNC_EVENT,
  STUDY_LEVEL_OPTIONS,
  type StudyLevel,
} from '../services/userLevelService';
import { useAppSelector } from '../store/hooks';

interface Area {
  to: string;
  glyph: string;
  title: string;
  description: string;
  featured?: boolean;
  badgeText?: string;
  spanFull?: boolean;
}

const CORE_AREAS: Area[] = [
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
    badgeText: 'JLPT Mock',
  },
];

function FeatureNavCard({ area }: { area: Area }) {
  return (
    <Link
      to={area.to}
      className={cn(
        'animate-fade-up group relative flex h-full cursor-pointer items-start gap-3.5 overflow-hidden rounded-xl border p-3.5 shadow-card transition-[border-color,background-color,transform] duration-150 ease-out-soft hover:-translate-y-0.5 active:scale-[0.99]',
        area.spanFull
          ? 'border-primary/45 bg-glass-soft hover:border-primary hover:bg-glass-hover'
          : area.featured
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
          area.spanFull
            ? 'bg-primary text-on-primary ring-2 ring-primary/25'
            : area.featured
              ? 'bg-sakura text-on-primary ring-2 ring-sakura/30 group-hover:bg-primary'
              : 'bg-primary-soft text-primary-fg ring-1 ring-primary/20 group-hover:bg-primary group-hover:text-on-primary group-hover:ring-sakura/45',
        )}
      >
        {area.glyph}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className="block text-sm font-semibold text-fg md:text-base">{area.title}</span>
          {area.badgeText && (
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                area.spanFull
                  ? 'border-primary/35 bg-primary-soft text-primary-fg'
                  : 'border-sakura/35 bg-glass-soft text-sakura',
              )}
            >
              {area.badgeText}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted md:text-sm">{area.description}</span>
      </span>
      {area.spanFull && (
        <ArrowRight
          className="relative mt-2.5 hidden size-4 shrink-0 text-primary-fg transition-transform duration-150 group-hover:translate-x-0.5 sm:block"
          aria-hidden
        />
      )}
    </Link>
  );
}

export const HomePage: React.FC = () => {
  const { user, studyLevel, updateStudyLevel } = useAuth();
  const { toast } = useToast();
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
  const [roadmapVersion, setRoadmapVersion] = useState(0);

  useEffect(() => {
    const onSync = () => setSchedule(loadStudySchedule());
    const onOnlineSync = () => setTodayOnlineSeconds(getTodayOnlineSeconds());
    const onRoadmapSync = () => setRoadmapVersion((v) => v + 1);
    window.addEventListener(STUDY_SCHEDULE_SYNC_EVENT, onSync);
    window.addEventListener(ONLINE_TIME_SYNC_EVENT, onOnlineSync);
    window.addEventListener(ROADMAP_PROGRESS_SYNC_EVENT, onRoadmapSync);
    return () => {
      window.removeEventListener(STUDY_SCHEDULE_SYNC_EVENT, onSync);
      window.removeEventListener(ONLINE_TIME_SYNC_EVENT, onOnlineSync);
      window.removeEventListener(ROADMAP_PROGRESS_SYNC_EVENT, onRoadmapSync);
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

  const activeLevelMeta = user ? getStudyLevelMeta(studyLevel) : null;
  const completedSteps = user && roadmapVersion >= 0 ? loadRoadmapCompletedSteps(user.id) : [];
  const activeRoadmap = user && studyLevel ? STUDY_ROADMAPS[studyLevel] : null;
  const roadmapTotalSteps = user && studyLevel ? getRoadmapStepCount(studyLevel) : 0;
  const roadmapDoneSteps = activeRoadmap
    ? activeRoadmap.phases.reduce(
        (sum, phase) => sum + phase.steps.filter((s) => completedSteps.includes(s.id)).length,
        0,
      )
    : 0;
  const nextStepInfo = user && studyLevel ? getNextRoadmapStep(studyLevel, completedSteps) : null;

  const startLearningAreas: Area[] = useMemo(
    () => [
      {
        to: '/roadmap',
        glyph: '道',
        title: 'Học theo lộ trình',
        description:
          user && studyLevel
            ? `Theo dõi 4 giai đoạn học bài bản cho trình độ JLPT ${studyLevel} (có đủ 5 cấp độ N5 – N1).`
            : 'Lộ trình học từng bước theo 5 trình độ JLPT (N5 – N1) từ Từ vựng, Kanji, Ngữ pháp đến Thi thử.',
        badgeText: user && studyLevel ? `JLPT ${studyLevel}` : '5 trình độ N5–N1',
        spanFull: true,
      },
      ...CORE_AREAS,
    ],
    [user, studyLevel],
  );

  const handleQuickSelectLevel = async (level: StudyLevel) => {
    if (!user) return;
    await updateStudyLevel(level);
    toast({
      title: `Đã chọn trình độ JLPT ${level}`,
      tone: 'success',
    });
  };

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
              ? `Xin chào ${user.displayName}! Chúc bạn có một buổi học hiệu quả.`
              : 'Đăng nhập bằng Google hoặc tạo tài khoản để chọn trình độ, mở lộ trình học và lưu tiến độ cá nhân.'}
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

      <Card as="section" aria-label="Tiến độ & Lộ trình học tập" className="mb-5 md:mb-6" padding="md">
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              lang="ja"
              aria-hidden
              className="grid size-7 place-items-center rounded-md bg-primary text-xs font-bold text-on-primary"
            >
              進
            </span>
            <h2 className="text-xs font-semibold tracking-wide text-muted uppercase">
              Tiến độ &amp; Lộ trình học tập
            </h2>
          </div>
          {!user && (
            <Badge tone="neutral">
              <Lock className="size-3 shrink-0" aria-hidden />
              Yêu cầu đăng nhập
            </Badge>
          )}
        </div>

        {user ? (
          <>
            {/* Logged-in Study Level & Personalized Roadmap Area */}
            <div className="mb-4">
              {!studyLevel ? (
                <div className="rounded-xl border border-primary/45 bg-primary-soft/50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden
                        className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary"
                      >
                        <Compass className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-fg sm:text-base">
                          Chọn trình độ để hiển thị lộ trình học tập
                        </h3>
                        <p className="mt-0.5 text-xs text-muted sm:text-sm">
                          Bạn chưa chọn trình độ JLPT. Hãy chọn 1 trong 5 cấp độ (N5 – N1) để hệ thống hiển thị lộ trình học phù hợp ngay tại đây.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      className="shrink-0"
                      leftIcon={<GraduationCap className="size-4" aria-hidden />}
                      onClick={requestOpenLevelModal}
                    >
                      Chọn trình độ
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/70 pt-3">
                    <span className="text-xs font-medium text-muted">Chọn nhanh:</span>
                    {STUDY_LEVEL_OPTIONS.map((opt) => (
                      <Chip
                        key={opt.level}
                        selected={false}
                        onClick={() => void handleQuickSelectLevel(opt.level)}
                      >
                        JLPT {opt.level}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : (
                <div
                  id="study-roadmap-slot"
                  data-study-level={studyLevel}
                  className="space-y-3 rounded-xl border border-line bg-surface-2/60 p-3.5 sm:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-sm font-bold text-on-primary">
                        {studyLevel}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-fg sm:text-base">
                            Lộ trình học tập JLPT {studyLevel}
                            {activeLevelMeta ? ` · ${activeLevelMeta.title}` : ''}
                          </h3>
                          {activeLevelMeta && (
                            <Badge tone="primary">{activeLevelMeta.japaneseLabel}</Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted sm:text-sm">
                          {nextStepInfo
                            ? `Bước tiếp theo (${nextStepInfo.phase.title.split(':')[0]}): ${nextStepInfo.step.title}`
                            : `Bạn đã hoàn thành toàn bộ ${roadmapTotalSteps} bước trong lộ trình JLPT ${studyLevel}!`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Link
                        to="/roadmap"
                        className={buttonStyles({ variant: 'primary', size: 'sm' })}
                      >
                        Vào lộ trình
                        <ArrowRight className="size-4" aria-hidden />
                      </Link>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={requestOpenLevelModal}
                      >
                        Đổi trình độ
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>Tiến độ lộ trình JLPT {studyLevel}</span>
                      <span className="font-medium text-fg tabular-nums">
                        {roadmapDoneSteps}/{roadmapTotalSteps} bước
                      </span>
                    </div>
                    <ProgressBar
                      value={roadmapDoneSteps}
                      max={roadmapTotalSteps}
                      label={`Tiến độ lộ trình JLPT ${studyLevel}`}
                      size="sm"
                    />
                  </div>
                </div>
              )}
            </div>

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
          </>
        ) : (
          <LoginRequiredState
            compact
            title="Đăng nhập để chọn trình độ, xem lộ trình & lưu tiến độ"
            description="Chỉ tài khoản đã đăng nhập mới có thể chọn trình độ JLPT (N5 – N1), theo dõi lộ trình học và lưu tiến độ làm bài."
          />
        )}
      </Card>

      {[
        { id: 'section-start-learning', title: 'Bắt đầu học', note: undefined, list: startLearningAreas, first: false },
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
              <li
                key={area.to}
                className={area.spanFull ? 'sm:col-span-2 lg:col-span-3' : undefined}
              >
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
