-- Cập nhật RPC thống kê công khai để trả thêm số người đang học từng lộ trình (N5–N1)
create or replace function public.get_public_community_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_users integer := 0;
  v_attempts integer := 0;
  v_reviews integer := 0;
  v_avg numeric := 0;
  v_level_counts jsonb := '{}'::jsonb;
begin
  select count(*)::integer into v_users from public.profiles;
  select count(*)::integer into v_attempts from public.quiz_attempts;
  select count(*)::integer, coalesce(round(avg(rating)::numeric, 2), 0)
    into v_reviews, v_avg
  from public.app_reviews
  where is_hidden = false;

  select coalesce(jsonb_object_agg(study_level, cnt), '{}'::jsonb)
    into v_level_counts
  from (
    select study_level, count(*)::integer as cnt
    from public.profiles
    where study_level is not null
    group by study_level
  ) level_stats;

  return jsonb_build_object(
    'totalUsers', coalesce(v_users, 0),
    'totalAttempts', coalesce(v_attempts, 0),
    'totalReviews', coalesce(v_reviews, 0),
    'avgRating', coalesce(v_avg, 0),
    'levelCounts', coalesce(v_level_counts, '{}'::jsonb)
  );
end;
$$;

grant execute on function public.get_public_community_stats() to anon, authenticated;
