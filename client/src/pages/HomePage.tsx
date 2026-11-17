import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CardLink, Card, PageContainer, ProgressBar, Stat } from '../components/ui';
import { grammarBooks } from '../data/grammar';
import kanjiDataRaw from '../data/kanji/kanjiDataset.json';
import { cn } from '../lib/cn';
import type { KanjiItem } from '../types/kanji';
import { useAppSelector } from '../store/hooks';

const kanjiTotal = ((kanjiDataRaw || []) as KanjiItem[]).length;
const grammarTotal = grammarBooks.reduce(
  (sum, book) => sum + book.chapters.reduce((chapterSum, chapter) => chapterSum + chapter.grammars.length, 0),
  0,
);

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
        'animate-fade-up group relative flex h-full cursor-pointer items-start gap-4 overflow-hidden rounded-2xl border p-5 shadow-card backdrop-blur-[2px] transition-[border-color,background-color,transform] duration-150 ease-out-soft hover:-translate-y-0.5 active:scale-[0.99]',
        area.featured
          ? 'border-sakura/45 bg-sakura-soft hover:border-sakura hover:bg-primary-soft'
          : 'border-line bg-surface/92 hover:border-primary hover:bg-surface-2',
      )}
    >
      <span
        aria-hidden
        className="seigaiha-mask pointer-events-none absolute -right-2 -bottom-2 h-10 w-24 bg-wave opacity-0 transition-opacity duration-150 group-hover:opacity-35"
      />
      <span
        lang="ja"
        aria-hidden
        className={cn(
          'relative flex size-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold transition-colors duration-150',
          area.featured
            ? 'bg-sakura text-on-primary ring-2 ring-sakura/30 group-hover:bg-primary'
            : 'bg-primary-soft text-primary-fg ring-1 ring-primary/20 group-hover:bg-primary group-hover:text-on-primary group-hover:ring-sakura/45',
        )}
      >
        {area.glyph}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="block text-base font-semibold text-fg">{area.title}</span>
          {area.featured && (
            <span className="rounded-full border border-sakura/35 bg-surface/80 px-2 py-0.5 text-[11px] font-semibold text-sakura">
              JLPT Mock
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-muted">{area.description}</span>
      </span>
    </Link>
  );
}

export const HomePage: React.FC = () => {
  const kanjiProgress = useAppSelector((state) => state.kanji.progress);
  const grammarRecords = useAppSelector((state) => state.grammarProgress.records);
  const mistakes = useAppSelector((state) => state.mistake.mistakes);

  const kanjiLearned = Object.values(kanjiProgress).filter((item) => item.learned).length;
  const grammarPracticed = Object.values(grammarRecords).filter((record) =>
    Object.values(record).some((score) => score > 0),
  ).length;

  return (
    <PageContainer>
      <section
        aria-label="Giới thiệu"
        className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-hero-from to-hero-to p-6 text-on-hero md:mb-8 md:p-10"
      >
        <div aria-hidden className="seigaiha-mask pointer-events-none absolute inset-0 bg-on-hero opacity-[0.12]" />
        <svg
          aria-hidden
          viewBox="0 0 400 160"
          className="pointer-events-none absolute right-0 bottom-0 h-40 w-auto text-on-hero opacity-25 md:h-56"
          fill="currentColor"
        >
          <circle cx="300" cy="46" r="26" opacity="0.7" />
          <path d="M120 160 L230 62 L252 80 L270 66 L400 160 Z" opacity="0.55" />
          <path d="M214 76 L230 62 L246 76 L238 74 L230 82 L222 74 Z" opacity="0.9" />
          {/* Graceful Cranes flying past Mount Fuji */}
          <path d="M256 44 Q246 34 234 38 Q244 42 254 46 Q264 36 276 40 Q266 44 256 44 Z" opacity="0.85" />
          <path d="M282 32 Q274 24 265 27 Q273 30 280 34 Q288 26 297 29 Q289 32 282 32 Z" opacity="0.75" />
          <path d="M0 160 Q50 120 100 150 T200 150 T300 150 T400 150 V160 Z" />
        </svg>
        <div className="relative max-w-xl">
          <p lang="ja" className="text-sm font-medium tracking-[0.3em] text-on-hero/80">
            日本語道場
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Học tiếng Nhật mỗi ngày</h1>
          <p className="mt-2 text-base text-on-hero/85">
            Như sóng biển, từng chút một rồi sẽ thành đại dương. Tiến độ được lưu ngay trên thiết bị của bạn.
          </p>
        </div>
      </section>

      <Card as="section" aria-label="Tiến độ học tập" className="mb-8" padding="lg">
        <div className="mb-5 flex items-center gap-2.5">
          <span
            lang="ja"
            aria-hidden
            className="grid size-8 place-items-center rounded-md bg-primary text-sm font-bold text-on-primary"
          >
            進
          </span>
          <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Tiến độ học tập</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <Stat label="Kanji đã thuộc" value={`${kanjiLearned}/${kanjiTotal}`} />
            <ProgressBar value={kanjiLearned} max={kanjiTotal} label="Kanji đã thuộc" size="sm" />
          </div>
          <div className="flex flex-col gap-2">
            <Stat label="Ngữ pháp đã luyện" value={`${grammarPracticed}/${grammarTotal}`} />
            <ProgressBar value={grammarPracticed} max={grammarTotal} label="Ngữ pháp đã luyện" size="sm" />
          </div>
          <Stat label="Câu sai cần ôn" value={mistakes.length} hint={mistakes.length > 0 ? undefined : 'Chưa có câu sai nào'} />
          <div className="flex items-end">
            <CardLink
              to="/grammar/mistakes"
              padding="sm"
              className="flex w-full items-center justify-between gap-2 border-sakura/40 bg-sakura-soft text-sm font-semibold text-fg hover:border-sakura hover:bg-primary-soft"
            >
              <span className="flex items-center gap-2">
                <span aria-hidden className="size-2 rounded-full bg-sakura" />
                Ôn tập lỗi sai
              </span>
              <ArrowRight className="size-4 text-sakura" aria-hidden />
            </CardLink>
          </div>
        </div>
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
        <section key={section.id} aria-labelledby={section.id} className={section.first ? 'mt-8 md:mt-10' : undefined}>
          <div className="mb-4">
            <h2 id={section.id} className="flex items-center gap-2 text-lg font-semibold text-fg">
              <span aria-hidden className="h-5 w-1 rounded-full bg-wave" />
              {section.title}
            </h2>
            {section.note && <p className="mt-1 text-sm text-muted">{section.note}</p>}
          </div>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {section.list.map((area) => (
              <li key={area.to}>
                <FeatureNavCard area={area} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </PageContainer>
  );
};
