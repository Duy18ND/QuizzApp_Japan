# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Nihongo 問" (NihonMaster / QuizzApp Japan): a Japanese-learning and JLPT-prep SPA (N5→N1) for Vietnamese learners. All UI strings, docs and commit-facing content are in **Vietnamese**; learning content is Japanese + Vietnamese. The real app lives in `client/`; the root `package.json` only proxies to it.

## Commands

Run from `client/` (or use the root proxies `npm run dev` / `npm run build` / `npm run install:all`):

```bash
npm run dev       # Vite dev server (base path /QuizzApp_Japan/)
npm run build     # tsc -b && vite build  — this is the type-check; CI runs exactly this
npm run lint      # oxlint (config: client/.oxlintrc.json)
npm run preview   # serve the built dist/
```

- **Tests:** `client/src/utils/grammarEngine/__tests__/conjugator.test.ts` is written in Jest style, but no test runner is installed (only `@types/jest`). There is no working `test` script; if you need to run tests, add a runner (e.g. Vitest, which accepts the Jest API) first.
- **Seed SQL/JSON:** `node scripts/seedDatabase.ts` (from repo root) exports the static datasets in `client/src/data/` to `supabase/seed.json` + `supabase/seed.sql`. It imports Vite from `client/node_modules`, so install client deps first.
- **Env:** copy `client/.env.example` → `client/.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_VAPID_PUBLIC_KEY`). Without Supabase vars the app still runs on static data only.

## Deploy

GitHub Pages via `.github/workflows/deploy.yml` on push to `main` (build job → deploy job; secrets injected as `VITE_*`). Work happens on `develop`. Because of Pages, routing uses `HashRouter` (`/#/...`) and Vite `base: '/QuizzApp_Japan/'` — keep both when touching routing or asset paths.

## Architecture

**Stack:** React 19 + TypeScript + Vite 8 + Tailwind v4 + Redux Toolkit, Supabase (Postgres, Auth with email + Google OAuth, RLS), PWA service worker (`client/public/sw.js`). `@google/genai` / `@google/generative-ai` are dependencies but currently unused in `src/`.

**Routing** (`client/src/App.tsx`): every page is `lazy()`-loaded under `AppLayout`. `/admin` is wrapped in `ProtectedRoute` for `ADMIN`/`SUPER_ADMIN`. `AdminPostLoginRedirector` handles post-OAuth redirects (admin → `/admin`, pending Google Calendar sync → `/roadmap`).

**Curriculum data — static bundle + live CMS overlay.** This is the key cross-file concept:
- Static datasets ship in `client/src/data/` (vocab per level/textbook/unit via `data/index.ts`, `kanji/kanjiDataset.json`, `grammar/`, `jlpt/`, `studyRoadmaps.ts`).
- `services/adminCmsService.ts` builds a `CmsSnapshot` (units, vocabularies, kanjis, grammar rules, JLPT questions), starting from static data (`build*` / `map*FromDb` / `map*ToDb` helpers live in `services/migrationService.ts`) and loading from Supabase when configured.
- `services/curriculumStore.ts` holds the current snapshot, refreshes from the cloud once, and re-emits on the `nihonmaster:cms-sync` window event (fired by admin edits). Components read it through `useCurriculumSnapshot()` (`hooks/useCurriculumData.ts`, `useSyncExternalStore`) plus the `getLive*` selectors (`getLiveVocabForUnit`, `getLiveKanjis`, `getLiveGrammarBooks`, `getLiveJlpt*`). **New UI that shows curriculum content should use these selectors, not import `data/` files directly**, or admin edits won't appear.
- Units have a DB id like `"N4-MINNA-N4-U1"` (`dbUnitId`) and a numeric `unitNumber`; vocab matches by `dbUnitId` first, falling back to `unitNumber` only when that number is unique within the level.
- Admin bulk import (`utils/batchImportUtils.ts`) accepts both snake_case (DB) and camelCase (frontend) field names. JSON templates and field rules: `APP_DOCS_FOR_CONTRIBUTORS.md` Part 3; `DATA_JSON_STRUCTURE.md` has full data shapes.

**User progress — cloud-only, per account** (see header comments in `services/sessionScope.ts` and `services/cloudProgressWriter.ts`):
- Signed-in users: every action writes straight to Supabase (`user_progress`, `quiz_attempts`) scoped by `user_id`, with per-account in-memory maps for instant UI; wiped on logout.
- Guests never persist progress anywhere. Do **not** reintroduce `localStorage`/cookie storage for progress, mistakes, quiz history (legacy keys are listed in `LEGACY_UNSCOPED_PROGRESS_KEYS` for cleanup only).
- `services/progressSyncService.ts` hydrates Redux slices (`store/slices/*`: auth, grammar, practice, grammarProgress, mistake, kanji) from cloud rows. `user_progress` is a generic table (`item_type` = vocab/kanji/grammar/mistake + `item_id` + `metadata_json`); special singleton rows use reserved item ids like `__daily_online_study_time__`, `__user_custom_studio__`, `__attempt_mistake_resolutions__`.
- Auth session is persisted in localStorage under `nihonmaster_sb_auth_v1` through a hardened storage adapter in `services/supabaseClient.ts`.

**Grammar engine** (`utils/grammarEngine/`): tokenizer, verb conjugator, sentence/question generators, answer validator. Produces the practice types (multiple choice, fill blank, ★ star ordering, conjugation, sentence ordering, ja↔vi, …) used by `GrammarPractice` and JLPT modules.

**JLPT modules** (`/jlpt/:moduleId`): `kanji`, `vocab`, `grammar`, `star`, `reading-short|medium|long`, `listening` (audio via Web Speech TTS, `utils/tts.ts`), `full-test` (assembled from the others).

**Supabase** (`supabase/schema.sql`): content tables (`units`, `vocabularies`, `kanjis`, `grammar_rules`, `jlpt_questions`) are public-read, write only via `public.is_admin_or_super()`; per-user tables (`user_progress`, `quiz_attempts`, `user_reminders`, `user_push_subscriptions`) are owner-only RLS; plus `profiles` (roles `SUPER_ADMIN`/`ADMIN`/`USER`), `audit_logs`, `app_reviews`/`app_review_votes`. Admin writes should also go through `writeAuditLog`. Background study reminders: Edge Function `supabase/functions/send-study-reminders` + Web Push (setup in `docs/WEB_PUSH_SETUP.md`).

## UI rules (from `DESIGN.md` — read it before UI work)

- Colours only via semantic tokens defined in `client/src/index.css` (`bg-surface`, `text-fg`, `border-line`, `bg-primary`, `text-primary-fg`, `*-soft`, `*-fg`…). Tailwind's default palette is removed (`--color-*: initial`), so raw classes like `bg-white`, `gray-500`, `blue-600` silently render nothing.
- No `dark:` variants: tokens swap under `.dark` on `<html>`.
- Build from `client/src/components/ui/` (Button, Fields, Feedback, Overlays, Tabs, Layout…) before writing new styled markup.
- Correct/wrong states need an icon or text, not colour alone. Motion ≤ 200 ms, transform/opacity only.
- Japanese text gets `lang="ja"`; font is Noto Sans JP throughout.
