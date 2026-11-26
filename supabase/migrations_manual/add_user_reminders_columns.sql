-- Bảng user_reminders tạo từ bản cũ thiếu 5 cột, nên app không lưu được lịch nhắc lên tài khoản.
-- Chạy một lần trong Supabase → SQL Editor. Chạy lại cũng không sao, dữ liệu cũ được giữ nguyên.

alter table public.user_reminders
  add column if not exists streak_mode text not null default 'every_day'
    check (streak_mode in ('every_day', 'custom_weekly')),
  add column if not exists streak_days_of_week jsonb not null default '[1,2,3,4,5,6,0]'::jsonb,
  add column if not exists completed_dates jsonb not null default '[]'::jsonb,
  add column if not exists target_exam_level text not null default 'N3'
    check (target_exam_level in ('N5', 'N4', 'N3', 'N2', 'N1')),
  add column if not exists target_exam_date text default '';

-- cho API nhận ra cột mới ngay
notify pgrst, 'reload schema';
