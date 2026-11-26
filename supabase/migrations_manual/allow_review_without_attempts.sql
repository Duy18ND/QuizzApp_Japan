-- Cho phép gửi đánh giá ngay, không cần hoàn thành bài luyện trước và không ép tối thiểu 15 ký tự
alter table public.app_reviews drop constraint if exists app_reviews_comment_check;
alter table public.app_reviews
  add constraint app_reviews_comment_check
  check (char_length(trim(comment)) between 1 and 500);

create or replace function public.sync_app_review_verified_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts integer;
begin
  select count(*)::integer into v_attempts
  from public.quiz_attempts
  where user_id = new.user_id;

  if tg_op = 'INSERT' then
    new.verified_attempts := coalesce(v_attempts, 0);
  end if;
  new.updated_at := now();

  if tg_op = 'UPDATE' and not public.is_admin_or_super() then
    new.is_featured := old.is_featured;
    new.is_hidden := old.is_hidden;
  end if;

  return new;
end;
$$;
