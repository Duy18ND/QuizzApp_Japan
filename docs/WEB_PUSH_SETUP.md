# Hướng dẫn bật Web Push chạy nền (Vuốt tắt đa nhiệm vẫn nổ thông báo — 0 đồng)

Toàn bộ mã nguồn Frontend (`client/public/sw.js`, `client/src/services/pwaReminderService.ts`), bảng Database (`supabase/schema.sql`) và Edge Function (`supabase/functions/send-study-reminders/index.ts`) đã được tích hợp sẵn trong dự án.

Bạn chỉ cần làm **3 bước cấu hình 1 lần** trên Supabase Free để bật thông báo màn hình khóa 24/7:

---

## Bước 1 — Tạo cặp khóa VAPID miễn phí (10 giây)

Chạy lệnh sau trong Terminal trên máy bạn:

```bash
npx web-push generate-vapid-keys
```

Bạn sẽ nhận được 2 chuỗi:
- `Public Key` → dán vào file `client/.env` (và GitHub Actions Secrets nếu deploy GitHub Pages):
  ```env
  VITE_VAPID_PUBLIC_KEY=<Dán Public Key ở đây>
  ```
- `Private Key` → **CHỈ lưu trên Supabase Secrets ở Bước 2**, không bao giờ đưa lên Frontend.

---

## Bước 2 — Chạy SQL tạo bảng & Deploy Edge Function lên Supabase

1. Mở **Supabase Dashboard → SQL Editor**, chạy đoạn tạo bảng `public.user_push_subscriptions` ở cuối file `supabase/schema.sql`.
2. Cài/đăng nhập Supabase CLI và set các biến môi trường bí mật:

```bash
supabase secrets set \
  VAPID_PUBLIC_KEY="<Public Key>" \
  VAPID_PRIVATE_KEY="<Private Key>" \
  VAPID_SUBJECT="mailto:email-cua-ban@gmail.com" \
  APP_BASE_URL="https://duy18nd.github.io/QuizzApp_Japan" \
  CRON_SECRET="tao-1-chuoi-bi-mat-bat-ky"

supabase functions deploy send-study-reminders --no-verify-jwt
```

---

## Bước 3 — Bật lịch tự chạy mỗi 10 phút (pg_cron trên Supabase Free)

Vào **Supabase Dashboard → Database → Extensions**, bật `pg_cron` và `pg_net`, sau đó chạy đoạn SQL này 1 lần trong **SQL Editor** (thay `<PROJECT_REF>` và `<CRON_SECRET>` của bạn):

```sql
select cron.schedule(
  'nihongo-send-study-reminders',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-study-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', '<CRON_SECRET>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## Cách hoạt động sau khi bật xong
- Người dùng trên **iPhone (iOS 16.4+ đã bấm Cài App ra MH chính)**, **Android**, hoặc **Laptop** bấm bật nút **Nhắc học** trên trang **Lộ trình**.
- Kể cả khi người dùng **vuốt tắt hẳn app khỏi đa nhiệm**, cứ mỗi 10 phút server kiểm tra:
  - Chưa đủ 10–15 phút / chưa hoàn thành Màn hôm nay → **Bắn Web Push ra màn hình khóa**.
  - Đã bấm **Hoàn thành Màn hôm nay** → Frontend cập nhật `last_completed_date = hôm nay` lên Supabase → **Server lập tức ngừng gửi thông báo cho đến ngày mai**.
