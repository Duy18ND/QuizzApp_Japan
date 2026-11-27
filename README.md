# Nihongo 問 — Ứng dụng học tiếng Nhật JLPT (N5 – N3)

Ứng dụng web học tiếng Nhật toàn diện, hỗ trợ học offline/PWA và đồng bộ tiến độ đám mây qua Supabase.

- **Bản trực tuyến:** https://duy18nd.github.io/QuizzApp_Japan/

## Tính năng chính

- **Lộ trình học thông minh (`/roadmap`):** Theo dõi tiến độ hằng ngày theo giáo trình chuẩn (N5 – N3) hoặc tự tạo lộ trình cá nhân, đặt mục tiêu phút/ngày và ngày hoàn thành dự kiến.
- **6 kỹ năng & luyện tập:** Từ vựng (flashcard, quiz, phát âm), Ngữ pháp, Luyện viết Kanji (`hanzi-writer`), Đọc hiểu, Nghe hiểu (Mondai 1–4) và Mini-game.
- **Thi thử & công cụ:** Thi thử JLPT tính giờ, ôn câu sai & từ đánh dấu sao, xuất tài liệu học PDF qua hộp thoại in trình duyệt.
- **Đồng bộ & nhắc học:** Đăng nhập Google / Email (Supabase Auth), sao lưu/khôi phục tiến độ `.json`, nhắc học qua Web Push / PWA & tải lịch `.ics` trong **Cài đặt**.

## Cài đặt & chạy local

Yêu cầu **Node.js 22+**.

```bash
cd client
npm install
```

Tạo file `client/.env` từ mẫu `client/.env.example` (tùy chọn; app vẫn chạy được ở chế độ offline nếu chưa cấu hình Supabase):

```env
VITE_SUPABASE_URL=<URL_SUPABASE_PROJECT>
VITE_SUPABASE_ANON_KEY=<SUPABASE_PUBLISHABLE_OR_ANON_KEY>
VITE_VAPID_PUBLIC_KEY=<VAPID_PUBLIC_KEY_OPTIONAL>
```

> **Lưu ý bảo mật:** Frontend (`client/.env`) chỉ được phép dùng public/publishable key (`VITE_*`). Tuyệt đối không đưa `SUPABASE_SERVICE_ROLE_KEY` hay `VAPID_PRIVATE_KEY` vào mã nguồn client.

Các lệnh thường dùng trong thư mục `client/`:

```bash
npm run dev      # Chạy server phát triển (Vite)
npm run build    # Kiểm tra TypeScript & build production ra client/dist/
npm run lint     # Kiểm tra code bằng Oxlint
npm run preview  # Xem trước bản build production
```

## Triển khai (Deploy)

Workflow `.github/workflows/deploy.yml` tự động build `client/` và deploy `client/dist/` lên **GitHub Pages** mỗi khi push code lên nhánh `main` (cần cấu hình `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY` trong GitHub Actions Secrets).
