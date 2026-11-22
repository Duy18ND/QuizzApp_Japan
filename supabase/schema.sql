-- Nihongo 問 — Supabase PostgreSQL Schema & Strict Row-Level Security (RLS)
-- Apply via Supabase SQL Editor or CLI (`supabase db reset` / `psql`).

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. PROFILES & 3-TIER RBAC ('SUPER_ADMIN' | 'ADMIN' | 'USER')
-- ============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  role text not null default 'USER' check (role in ('SUPER_ADMIN', 'ADMIN', 'USER')),
  study_level text check (study_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  auth_provider text not null default 'email',
  has_client_hash boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists study_level text check (study_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  add column if not exists auth_provider text not null default 'email',
  add column if not exists has_client_hash boolean not null default false;

alter table public.profiles enable row level security;

-- Helper predicates evaluated with SECURITY DEFINER to avoid RLS self-recursion
create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()),
    'USER'
  );
$$;

create or replace function public.is_admin_or_super()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('ADMIN', 'SUPER_ADMIN')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'SUPER_ADMIN'
  );
$$;

-- Auto-provision & keep profile provider/hash metadata synced with auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_provider text;
  resolved_has_hash boolean;
begin
  resolved_provider := coalesce(nullif(trim(new.raw_app_meta_data ->> 'provider'), ''), 'email');
  resolved_has_hash := coalesce((new.raw_user_meta_data ->> 'password_hash_scheme') is not null, false);

  insert into public.profiles (id, email, display_name, role, auth_provider, has_client_hash)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(
      trim(
        coalesce(
          new.raw_user_meta_data ->> 'display_name',
          new.raw_user_meta_data ->> 'full_name',
          new.raw_user_meta_data ->> 'name',
          ''
        )
      ),
      ''
    ),
    'USER',
    resolved_provider,
    resolved_has_hash
  )
  on conflict (id) do update
    set email = excluded.email,
        auth_provider = excluded.auth_provider,
        has_client_hash = (public.profiles.has_client_hash or excluded.has_client_hash);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update of email, raw_app_meta_data, raw_user_meta_data on auth.users
  for each row execute function public.handle_new_user();

-- Backfill existing profiles with provider & client-hash metadata from auth.users
update public.profiles p
set
  auth_provider = coalesce(nullif(trim(u.raw_app_meta_data ->> 'provider'), ''), 'email'),
  has_client_hash = coalesce((u.raw_user_meta_data ->> 'password_hash_scheme') is not null, false)
from auth.users u
where u.id = p.id;

-- Safe Admin/SuperAdmin aggregate statistics directly from auth.users
create or replace function public.get_admin_account_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_total bigint;
  v_google bigint;
  v_email bigint;
  v_hashed bigint;
begin
  if not public.is_admin_or_super() then
    raise exception 'Forbidden: ADMIN or SUPER_ADMIN required';
  end if;

  select
    count(*)::bigint,
    count(*) filter (
      where (u.raw_app_meta_data ->> 'provider') = 'google'
         or coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'google'
    )::bigint,
    count(*) filter (
      where coalesce(u.raw_app_meta_data ->> 'provider', 'email') = 'email'
    )::bigint,
    count(*) filter (
      where (u.raw_user_meta_data ->> 'password_hash_scheme') is not null
    )::bigint
  into v_total, v_google, v_email, v_hashed
  from auth.users u;

  return jsonb_build_object(
    'total', v_total,
    'google', v_google,
    'email', v_email,
    'hashed', v_hashed
  );
end;
$$;

-- Anti-privilege-escalation & last-SUPER_ADMIN protection trigger
create or replace function public.protect_profiles_rbac()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining_super_admins integer;
  is_db_superuser boolean;
begin
  -- Allow direct SQL administration in Supabase SQL Editor / migrations (auth.uid() is null)
  is_db_superuser := (auth.uid() is null and current_user in ('postgres', 'supabase_admin'));

  if tg_op = 'DELETE' then
    if old.role = 'SUPER_ADMIN' then
      select count(*) into remaining_super_admins
      from public.profiles
      where role = 'SUPER_ADMIN' and id <> old.id;

      if remaining_super_admins = 0 then
        raise exception 'Cannot delete the last SUPER_ADMIN account';
      end if;
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    new.updated_at := now();

    if old.role is distinct from new.role then
      if not is_db_superuser and not public.is_super_admin() then
        raise exception 'Forbidden: only SUPER_ADMIN can change user roles';
      end if;

      if old.role = 'SUPER_ADMIN' and new.role <> 'SUPER_ADMIN' then
        select count(*) into remaining_super_admins
        from public.profiles
        where role = 'SUPER_ADMIN' and id <> old.id;

        if remaining_super_admins = 0 then
          raise exception 'Forbidden: cannot demote the last SUPER_ADMIN';
        end if;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profiles_rbac on public.profiles;
create trigger trg_protect_profiles_rbac
  before update or delete on public.profiles
  for each row execute function public.protect_profiles_rbac();

-- RLS on profiles
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id or public.is_admin_or_super());

drop policy if exists "profiles_update_self_or_super" on public.profiles;
create policy "profiles_update_self_or_super"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id or public.is_super_admin())
  with check (
    (auth.uid() = id and role = (select p.role from public.profiles p where p.id = auth.uid()))
    or public.is_super_admin()
  );

-- Prevent direct client inserts into profiles (provisioned only via auth trigger)
drop policy if exists "profiles_no_direct_insert" on public.profiles;
create policy "profiles_no_direct_insert"
  on public.profiles
  for insert
  to authenticated
  with check (false);

-- ============================================================================
-- 2. CURRICULUM CONTENT TABLES (Public Read, Admin/SuperAdmin Write)
-- ============================================================================

create table if not exists public.units (
  id text primary key,
  level text not null check (level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  unit_number integer not null default 1,
  textbook_id text,
  title text not null,
  description text default '',
  order_index integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.units
  add column if not exists textbook_id text;

create index if not exists idx_units_level on public.units (level, order_index);

create table if not exists public.vocabularies (
  id bigint generated by default as identity primary key,
  unit_id text not null references public.units (id) on delete cascade,
  word_number integer,
  kanji text,
  hiragana text not null,
  han_viet text,
  meaning text not null,
  word_type text not null,
  example_sentence text,
  example_meaning text,
  notes text,
  level text not null check (level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  tags text[] not null default '{}',
  semantic_roles text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_vocabularies_unit_level on public.vocabularies (level, unit_id, word_number);

create table if not exists public.kanjis (
  id text primary key,
  character text not null unique,
  han_viet text not null default '',
  meanings jsonb not null default '[]'::jsonb,
  onyomi jsonb not null default '[]'::jsonb,
  kunyomi jsonb not null default '[]'::jsonb,
  stroke_count integer not null default 0,
  jlpt_level text not null check (jlpt_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  examples jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_kanjis_level on public.kanjis (jlpt_level);

create table if not exists public.grammar_rules (
  id text primary key,
  book_id text not null,
  chapter_id text not null,
  level text not null check (level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  title text not null,
  structure text not null default '',
  meaning text not null,
  explanation text not null default '',
  notes text not null default '',
  examples jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_grammar_rules_book_chapter on public.grammar_rules (book_id, chapter_id, level);

create table if not exists public.jlpt_questions (
  id text primary key,
  module_id text not null,
  level text not null check (level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  question_type text not null,
  prompt text not null,
  passage text,
  options jsonb not null default '[]'::jsonb,
  correct_index integer not null default 0,
  explanation text not null default '',
  audio_text text,
  created_at timestamptz not null default now()
);

create index if not exists idx_jlpt_questions_module_level on public.jlpt_questions (module_id, level);

-- Enable RLS & policies on all 5 content tables
do $$
declare
  tbl text;
begin
  foreach tbl in array array['units', 'vocabularies', 'kanjis', 'grammar_rules', 'jlpt_questions']
  loop
    execute format('alter table public.%I enable row level security;', tbl);

    execute format('drop policy if exists "%I_select_public" on public.%I;', tbl, tbl);
    execute format(
      'create policy "%I_select_public" on public.%I for select to anon, authenticated using (true);',
      tbl, tbl
    );

    execute format('drop policy if exists "%I_insert_admin" on public.%I;', tbl, tbl);
    execute format(
      'create policy "%I_insert_admin" on public.%I for insert to authenticated with check (public.is_admin_or_super());',
      tbl, tbl
    );

    execute format('drop policy if exists "%I_update_admin" on public.%I;', tbl, tbl);
    execute format(
      'create policy "%I_update_admin" on public.%I for update to authenticated using (public.is_admin_or_super()) with check (public.is_admin_or_super());',
      tbl, tbl
    );

    execute format('drop policy if exists "%I_delete_admin" on public.%I;', tbl, tbl);
    execute format(
      'create policy "%I_delete_admin" on public.%I for delete to authenticated using (public.is_admin_or_super());',
      tbl, tbl
    );
  end loop;
end $$;

-- ============================================================================
-- 3. USER LEARNING & AUDIT TABLES (Strict Owner-Only RLS auth.uid() = user_id)
-- ============================================================================

create table if not exists public.user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_type text not null check (item_type in ('vocab', 'kanji', 'grammar', 'mistake')),
  item_id text not null,
  status text not null default 'learning',
  score integer not null default 0,
  attempts integer not null default 0,
  starred boolean not null default false,
  wrong_count integer not null default 0,
  metadata_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint uq_user_progress_owner_item unique (user_id, item_type, item_id)
);

create index if not exists idx_user_progress_user_type on public.user_progress (user_id, item_type);

alter table public.user_progress enable row level security;

drop policy if exists "user_progress_owner_all" on public.user_progress;
create policy "user_progress_owner_all"
  on public.user_progress
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quiz_type text not null,
  level text not null,
  score integer not null default 0,
  total_questions integer not null default 0,
  duration_seconds integer not null default 0,
  mistakes_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_quiz_attempts_user_created on public.quiz_attempts (user_id, created_at desc);

alter table public.quiz_attempts enable row level security;

drop policy if exists "quiz_attempts_owner_select" on public.quiz_attempts;
create policy "quiz_attempts_owner_select"
  on public.quiz_attempts
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "quiz_attempts_owner_insert" on public.quiz_attempts;
create policy "quiz_attempts_owner_insert"
  on public.quiz_attempts
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "quiz_attempts_owner_delete" on public.quiz_attempts;
create policy "quiz_attempts_owner_delete"
  on public.quiz_attempts
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_created on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
  on public.audit_logs
  for select
  to authenticated
  using (public.is_admin_or_super());

drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_insert"
  on public.audit_logs
  for insert
  to authenticated
  with check (auth.uid() = actor_id and public.is_admin_or_super());

-- ============================================================================
-- 4. USER STUDY REMINDERS, STREAK GOAL & MULTI-DEVICE WEB PUSH (RLS)
-- ============================================================================

create table if not exists public.user_reminders (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean default true,
  time_slots jsonb default '[]'::jsonb,
  is_continuous_daily boolean default true,
  days_of_week jsonb default '[1,2,3,4,5,6,0]'::jsonb,
  streak_mode text not null default 'every_day' check (streak_mode in ('every_day', 'custom_weekly')),
  streak_days_of_week jsonb not null default '[1,2,3,4,5,6,0]'::jsonb,
  completed_dates jsonb not null default '[]'::jsonb,
  target_exam_level text not null default 'N3' check (target_exam_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  target_exam_date text default '',
  continuous_repeat_minutes int default 0,
  timezone text default 'Asia/Ho_Chi_Minh',
  push_subscription jsonb,
  updated_at timestamptz default now()
);

alter table public.user_reminders enable row level security;

drop policy if exists "user_reminders_owner_all" on public.user_reminders;
create policy "user_reminders_owner_all"
  on public.user_reminders
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- 5. MULTI-DEVICE WEB PUSH SUBSCRIPTIONS (VAPID — WORKS WHEN SWIPED CLOSED)
-- ============================================================================

create table if not exists public.user_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  notifications_enabled boolean not null default true,
  reminder_time text not null default '20:00',
  repeat_interval_minutes integer not null default 10,
  study_weekdays jsonb not null default '[1,2,3,4,5,6,0]'::jsonb,
  daily_minutes_target integer not null default 10,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  last_completed_date text,
  active_stage_label text,
  last_notified_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint uq_user_push_subscriptions_owner_endpoint unique (user_id, endpoint)
);

create index if not exists idx_user_push_subs_active
  on public.user_push_subscriptions (notifications_enabled, last_completed_date);

alter table public.user_push_subscriptions enable row level security;

drop policy if exists "user_push_subscriptions_owner_all" on public.user_push_subscriptions;
create policy "user_push_subscriptions_owner_all"
  on public.user_push_subscriptions
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);



