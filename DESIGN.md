# Nihongo 問 — Design System

Authoritative visual contract for the QuizzApp frontend (`client/`). Style: **modern Japanese minimalist, ocean blue & white**, calm and readable first. Learning content (Kanji, Hiragana, Vietnamese meaning, quiz questions) is the hero; Japanese cultural motifs (Seigaiha waves, Mount Fuji, Torii, Pagoda) act as subtle, calming ambient backgrounds.

> Surface mode: **Operate + Read** with **Subtle Japanese Cultural Ambient**. Keep reading/quiz surfaces clean and high-contrast; restrict decorative SVG motifs to background layers and hero headers using semantic tokens only.

## 1. Rules (non-negotiable)

1. **Colour only through semantic tokens** (`bg-surface`, `text-fg`, `border-line`, `bg-primary`, `bg-primary-soft`, `text-primary-fg` …). Raw palette classes (`gray-500`, `blue-600`, `sky-500`, `bg-white`, `text-white`, `red-*`…) and hardcoded hex values are strictly forbidden in components. Tailwind's default palette is removed (`--color-*: initial`), so a raw class renders as *nothing*.
2. **No `dark:` variants.** Tokens swap automatically under `.dark` on `<html>`; components are written once.
3. **Compose from `src/components/ui/`** before writing markup. Do not copy-paste button/input/badge/card styling.
4. Correct/wrong/warning state must never rely on colour alone — pair with an icon or text (✓ / ✕ / label).
5. Motion: ≤ 200 ms, `transform`/`opacity` only, honours `prefers-reduced-motion` (global). No animation on keyboard-driven, high-frequency actions.

## 2. Tokens (`client/src/index.css`)

| Token (utility) | Light | Dark | Use |
| :-- | :-- | :-- | :-- |
| `bg` (`bg-bg`) | `#F2F9FF` | `#071B2F` | App background + ambient radial glow |
| `surface` | `#FFFFFF` | `#0D2844` | Cards, header, inputs, modals |
| `surface-2` | `#E0F2FE` | `#133659` | Hover fills, secondary/inset areas, oceanic tint |
| `surface-3` | `#BAE6FD` | `#1E4976` | Progress track, skeleton, switch off |
| `fg` | `#0C2340` | `#F0F9FF` | Primary text |
| `muted` | `#47698A` | `#93C5FD` | Secondary text |
| `subtle` | `#7FA6C9` | `#38BDF8` | Placeholder, ambient background SVGs |
| `line` / `line-strong` | `#CBE7FD` / `#93C5FD` | `#1B436B` / `#255C91` | Hairlines / control borders |
| `primary` (+`-hover`, `-active`) | `#0284C7` / `#0369A1` | `#38BDF8` / `#7DD3FC` | Filled buttons, focus, progress, hero accents |
| `on-primary` | `#FFFFFF` | `#071B2F` | Text on `bg-primary` |
| `primary-soft` (+`-hover`) | `#E0F2FE` | `#0C4A6E` | Kanji icon badges, selected states, featured cards |
| `primary-fg` | `#0369A1` | `#7DD3FC` | Primary-coloured **text/icons/wave motifs** on surfaces |
| `sakura` / `sakura-soft` / `sun-disc` | `#F472B6` / `#FDF2F8` / `#FDA4AF` | `#FB7185` / `rgba(244,114,182,.14)` / `#FDE68A` | Sakura petals, Fuji sun/moon disc, accent badges |
| `success` / `-fg` / `-soft` / `-line` | `#16A34A` / `#15803D` / `#F0FDF4` / `#BBF7D0` | `#22C55E` / `#4ADE80` / `#052E16` / `#166534` | Correct |
| `warning` … | `#F59E0B` / `#B45309` … | `#FBBF24` … | Caution (use `-fg` for text) |
| `danger` … | `#EF4444` / `#DC2626` … | `#F87171` … | Wrong / destructive |
| `scrim` | `rgb(15 23 42 / .45)` | `rgb(2 6 23 / .65)` | Modal backdrop |

Use `*-fg` for status **text**, `*-soft` for status backgrounds, `*-line` for status borders; `success`/`danger`/`warning` themselves only for fills, bars and icons.

## 3. Theme (light / dark) & Japanese Ocean Ambient

- Mechanism: `.dark` class + `color-scheme` on `<html>`; tokens in `:root` / `.dark`.
- Toggle: `<ThemeToggle />` in the header.
- **Japanese Wave & Cultural Background (`<JapaneseWaveBg />`)**:
  - Rendered as a `fixed inset-0 pointer-events-none overflow-hidden -z-10` inline SVG layer.
  - Uses `text-primary-fg` and `text-subtle` with `fill-current` / `stroke-current` at low opacity (`opacity-[0.07]` to `opacity-[0.15]`) so it adapts seamlessly between Light (ocean blue on crisp white-blue) and Dark (luminous indigo wave on deep navy) without `dark:` classes.
  - Motifs: Seigaiha (青海波) layered ocean waves along the bottom, subtle Mount Fuji silhouette at top-centre, Torii gate silhouette on left, and 5-tier Pagoda silhouette on right.

## 4. Typography

One family — **Noto Sans JP** (Latin, Vietnamese, Japanese) — covers all text. Japanese runs get `lang="ja"` (or `.jp`).

| Role | Classes |
| :-- | :-- |
| Display (Kanji / word hero) | `text-5xl md:text-6xl font-bold` + `lang="ja"` |
| Page title (h1) | `text-2xl md:text-3xl font-bold tracking-tight text-fg` |
| Section title (h2) | `text-lg font-semibold text-fg` |
| Subtitle / lead | `text-base text-muted` |
| Body | `text-sm`–`text-base text-fg` |
| Caption / meta | `text-xs text-muted` |

Question text in quizzes: `text-2xl md:text-3xl font-bold`. Numbers that change: `tabular-nums`.

## 5. Spacing, radius, elevation

- 4/8 px rhythm. Page padding `px-4 md:px-8`; section gap `space-y-6 md:space-y-8`.
- Content widths via `<PageContainer size="sm|md|lg">` (`max-w-2xl|4xl|6xl`).
- Radius: controls `rounded-lg` (8), cards/panels `rounded-xl` (12), modal `rounded-2xl` (16), Kanji icon badges `rounded-xl`, pills `rounded-full`.
- Elevation: hairline border (`border border-line`) first. Hover states on interactive cards use `hover:border-primary hover:bg-surface-2 transition-colors`.

## 6. Components (`src/components/ui/`)

Compose strictly from existing primitives: `Button`, `IconButton`, `buttonStyles()`, `Input`, `Select`, `SearchInput`, `Switch`, `Chip`, `Card`, `CardLink`, `Badge`, `Stat`, `PageContainer`, `PageHeader`, `ProgressBar`, `Modal`, `Tabs`, `EmptyState`, `LoadingState`, `Skeleton`, `ErrorState`, `Notice`, `ThemeToggle`.

## 7. Layout & Home Navigation Pattern

- **Header (`AppLayout`)**: Minimal header (`bg-surface/90 border-b border-line`). Left: `Nihongo 問` logo (links to `/`). Right: `← Trang chủ` button (visible only on sub-pages) + `<ThemeToggle />`. **No horizontal navigation tabs in header.**
- **Home Page (`/`) Structure**:
  1. **Hero & Progress Panel (`TIẾN ĐỘ HỌC TẬP`)**: Uses `Card` with subtle wave watermark SVG inside, displaying `Stat` + `ProgressBar` for *Kanji đã thuộc*, *Ngữ pháp đã luyện*, *Câu sai cần ôn*, and CTA button `Ôn tập lỗi sai →`.
  2. **Entry Card Pattern (`<FeatureCardLink />`)**:
     - Built on `CardLink` in a 3-column grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`).
     - Left: Square Kanji badge (`w-11 h-11 rounded-xl bg-primary-soft text-primary-fg font-bold text-lg flex items-center justify-center shrink-0` with `lang="ja"`).
     - Right: Title (`font-semibold text-fg`) + 2-line description (`text-sm text-muted`).
  3. **Section 1 — `Bắt đầu học` (6 cards)**:
     - `[語] Từ vựng` (`/vocabulary`), `[文] Ngữ pháp` (`/grammar`), `[漢] Kanji` (`/kanji`), `[問] Luyện Quiz` (`/vocabulary/quiz`), `[札] Flashcard` (`/flashcard`), `[印] Xuất PDF` (`/pdf`).
  4. **Section 2 — `Luyện đề JLPT` (9 cards, route `/jlpt/:moduleId`)**:
     - `[字] Luyện Chữ Hán` (`/jlpt/kanji`): Luyện cách đọc Hiragana, âm On-Kun và chọn chữ Hán chuẩn trong câu.
     - `[詞] Luyện Từ vựng` (`/jlpt/vocab`): Điền từ theo ngữ cảnh, tìm từ đồng nghĩa và cách dùng từ chuẩn JLPT.
     - `[法] Luyện Ngữ pháp` (`/jlpt/grammar`): Chọn mẫu ngữ pháp phù hợp trong câu và điền ngữ pháp vào đoạn văn.
     - `[星] Luyện Hái sao (★)` (`/jlpt/star`): Sắp xếp 4 mảnh ghép thành câu hoàn chỉnh và chọn từ đúng ở vị trí ngôi sao.
     - `[短] Đọc hiểu Ngắn (Đoản văn)` (`/jlpt/reading-short`): Đọc nhanh đoạn văn ngắn (150–200 chữ), thông báo và tìm ý chính.
     - `[中] Đọc hiểu Trung văn` (`/jlpt/reading-medium`): Phân tích bài viết độ dài trung bình (400–500 chữ) và trả lời câu hỏi lý giải.
     - `[長] Đọc hiểu Trường văn` (`/jlpt/reading-long`): Luyện đọc bài luận dài, nắm bắt mạch lập luận và tìm kiếm thông tin.
     - `[聴] Luyện Nghe hiểu` (`/jlpt/listening`): Luyện nghe theo từng Mondai kèm transcript và giải thích chi tiết.
     - `[全] Thi thử Toàn bộ (Full Test)` (`/jlpt/full-test`): Làm đề JLPT hoàn chỉnh có bấm giờ, chấm điểm tự động và lưu câu sai (highlighted with `border-primary bg-primary-soft/40`).

## 8. Quiz & JLPT Module UX Contract

- **Standard Quiz (`kanji`, `vocab`, `grammar`)**:
  - Question is loudest (`text-2xl md:text-3xl font-bold`). Four options A–D, ≥ 56 px tall, `gap-3`.
  - Correct → `bg-success-soft border-success-line text-success-fg` + ✓; Wrong → `bg-danger-soft border-danger-line text-danger-fg` + ✕.
- **Star Puzzle (`star` — Mondai ★)**:
  - Displays sentence with 4 interactive slot pills (`___` `___` `_★_` `___` using `bg-surface-2 border-line`, star slot highlighted with `border-primary text-primary-fg`). Clicking/tapping options fills slots in order so learners can visually verify the full sentence before submitting the `★` slot answer.
- **Reading Comprehension (`reading-short`, `reading-medium`, `reading-long`)**:
  - Desktop 2-column split (`lg:grid-cols-12 gap-6`): Left 7 cols (`Card` with Japanese passage `lang="ja"`, toggleable Furigana switch, independent scroll); Right 5 cols (sticky question list + explanation panel).
- **Listening (`listening`)**:
  - Compact audio controller bar (`bg-surface-2 rounded-xl p-4`), question options, and collapsible transcript + translation unlocked after answering.
- **Error Tracking**: Any wrong answer across all `/jlpt/:moduleId` modules automatically records into the user's wrong-answer review queue (`Câu sai cần ôn`).