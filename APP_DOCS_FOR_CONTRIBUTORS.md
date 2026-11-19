# TÀI LIỆU TỔNG QUAN HỆ THỐNG & HƯỚNG DẪN ĐÓNG GÓP DỮ LIỆU HỌC TẬP
## Dự án: `Nihongo 問` (NihonMaster — QuizzApp Japan)

> **Dành cho:** Cộng tác viên nội dung (Content Contributors), Giáo viên / Mentor tiếng Nhật & Đội ngũ phát triển  
> **Mục đích tài liệu:** Giúp người đọc nắm bắt toàn bộ kiến trúc, tính năng, hiện trạng dữ liệu của ứng dụng **`Nihongo 問`**, đồng thời cung cấp **biểu mẫu JSON chuẩn (copy-paste dùng ngay)** để biên soạn và nạp dữ liệu Từ vựng, Kanji, Ngữ pháp, Đề thi JLPT vào hệ thống.

---

## MỤC LỤC

- [Phần 1: Tổng quan Dự án & Kiến trúc Hệ thống (`Nihongo 問` — QuizzApp Japan)](#phần-1-tổng-quan-dự-án--kiến-trúc-hệ-thống-nihongo-問--quizzapp-japan)
- [Phần 2: Thống kê Dữ liệu Hiện Có vs Các Phần Đang Trống Cần Fill](#phần-2-thống-kê-dữ-liệu-hiện-có-vs-các-phần-đang-trống-cần-fill)
- [Phần 3: Quy chuẩn & Mẫu Dữ liệu để Fill (Tương thích 100% với nút Import JSON trong `/admin`)](#phần-3-quy-chuẩn--mẫu-dữ-liệu-để-fill-tương-thích-100-với-nút-import-json-trong-admin)
- [Phần 4: Quy trình Nạp Dữ liệu vào Web](#phần-4-quy-trình-nạp-dữ-liệu-vào-web)

---

## Phần 1: Tổng quan Dự án & Kiến trúc Hệ thống (`Nihongo 問` — QuizzApp Japan)

### 1.1. Mục tiêu cốt lõi
**`Nihongo 問` (QuizzApp Japan)** là ứng dụng web học tiếng Nhật và luyện thi JLPT (`N5` → `N1`) được thiết kế theo triết lý **Micro-learning & Active Recall (Học nhanh — Nhớ sâu — Cá nhân hóa)**:

- **Tối ưu cho các phiên luyện tập siêu ngắn (10–20 giây/phiên):** Người học có thể mở ứng dụng bất cứ lúc nào để lật nhanh vài thẻ Flashcard, làm 1 câu Hái sao (★), tô nét 1 chữ Kanji hoặc ôn lại ngay các câu vừa làm sai mà không bị ngợp.
- **Tự động định hướng theo Lộ trình 5 cấp độ (`N5` → `N1`):** Chia nhỏ mục tiêu học tập thành 4 giai đoạn rõ ràng (Từ vựng & Kanji → Ngữ pháp cốt lõi → Đọc hiểu & Nghe hiểu Mondai → Thi thử Full Test).
- **Tự cài đặt lịch nhắc học & Chuỗi ngày (Study Streak):** Theo dõi thời gian học thực tế (tối thiểu 60 giây tương tác/ngày để tính Streak), đồng bộ 1 chạm với **Google Calendar** hoặc xuất tệp lịch **`.ics`**.
- **Xuất phiếu PDF chuẩn A4 để luyện viết tay:** Cho phép học viên tự chọn từ vựng, mẫu ngữ pháp và chữ Kanji để tạo tờ bài tập in ra giấy A4.

---

### 1.2. Công nghệ sử dụng (Tech Stack)

| Tầng hệ thống | Công nghệ chi tiết | Vai trò trong dự án |
| :--- | :--- | :--- |
| **Frontend** | **React 19**, **TypeScript**, **Vite 8**, **Tailwind CSS v4**, **Redux Toolkit**, **PWA-ready** | Giao diện SPA phản hồi tức thì, hỗ trợ chế độ Sáng/Tối (Light/Dark Mode), vẽ nét Kanji tương tác (`hanzi-writer`), kéo-thả câu Hái sao (`@hello-pangea/dnd`), phát âm tiếng Nhật bản ngữ (`Web Speech API`). |
| **Backend & Database** | **Supabase PostgreSQL**, **Supabase Auth** (Email + PBKDF2-SHA256 & **Google OAuth 2.0**), **Row-Level Security (RLS)** | Lưu trữ tập trung 9 bảng dữ liệu (`profiles`, `units`, `vocabularies`, `kanjis`, `grammar_rules`, `jlpt_questions`, `user_progress`, `quiz_attempts`, `audit_logs`), phân quyền 3 tầng (`SUPER_ADMIN`, `ADMIN`, `USER`) và đồng bộ tiến độ đa thiết bị. |
| **Cơ chế Hybrid Sync** | **`curriculumStore` + `localStorage` Overlay** | Đảm bảo ứng dụng tải tức thì; mọi thay đổi từ trang quản trị (`Admin CMS`) được phát sóng trực tiếp (Live Sync) sang giao diện học viên mà không cần build lại code. |
| **Hosting & CI/CD** | **GitHub Pages** + **GitHub Actions** | Tự động kiểm tra chất lượng mã nguồn (`Oxlint`, `TypeScript`) và triển khai tự động mỗi khi cập nhật nhánh chính. |

---

### 1.3. Bản đồ toàn bộ tính năng & màn hình hiện có

Hệ thống định tuyến (`HashRouter` trong `client/src/App.tsx`) bao gồm đầy đủ các phân hệ cho Học viên và Quản trị viên:

| Nhóm | Màn hình / Tính năng | Đường dẫn (Route) | Mô tả chi tiết chức năng |
| :--- | :--- | :--- | :--- |
| **1. Trang chủ & Lộ trình** | **Trang chủ (`HomePage`)** | `/#/` | Bảng điều khiển trung tâm: hiển thị chuỗi ngày học (Streak), thẻ Lịch nhắc & Mục tiêu, thống kê Kanji đã thuộc / Ngữ pháp đã luyện / Câu sai cần ôn, lối vào nhanh tất cả phân hệ và lịch sử làm bài. |
| | **Lộ trình học 5 cấp độ (`RoadmapPage`)** | `/#/roadmap` | Lộ trình học từng bước cho 5 trình độ `N5`, `N4`, `N3`, `N2`, `N1` (4 giai đoạn/cấp độ). Cho phép tích chọn hoàn thành từng bước và đồng bộ lên tài khoản Supabase. |
| **2. Từ vựng (`Vocabulary`)** | **Chọn cấp độ & Unit (`VocabularyLevelsPage`, `VocabularyUnitsPage`)** | `/#/vocabulary`<br>`/#/vocabulary/:level` | Duyệt kho từ vựng theo cấp độ JLPT (`N5`–`N1`) và từng bài học (`Unit`). Hỗ trợ nhập thêm mảng JSON tạm thời để học thử. |
| | **Danh sách từ vựng (`VocabularyWordsPage`)** | `/#/vocabulary/:level/:unitId` | Bảng từ vựng chi tiết (Kanji, Hiragana, Hán Việt, Từ loại, Nghĩa, Ví dụ), nghe phát âm tiếng Nhật, đánh dấu sao (★) từ khó và lọc từ hay sai. |
| | **Thẻ lật 3D (`FlashcardPage` & `FlashcardViewer`)** | `/#/flashcard`<br>`/#/flashcard/:level/:unitId` | Ôn từ vựng bằng thẻ lật 3D trực quan, hỗ trợ phím tắt (`Space`, `←`, `→`), phát âm tự động và lọc riêng danh sách từ gắn sao. |
| | **Trắc nghiệm Từ vựng (`QuizPage`)** | `/#/vocabulary/quiz` | Làm bài Quiz 4 đáp án với nhiều chế độ hỏi (Kanji → Hiragana, Từ → Nghĩa, Nghĩa → Từ), giải thích đáp án và lưu kết quả vào lịch sử làm bài. |
| | **Luyện gõ & Ôn từ chưa thuộc (`WritingPage`, `ReviewPage`, `UnmasteredPage`)** | `/#/vocabulary/writing`<br>`/#/vocabulary/review`<br>`/#/vocabulary/unmastered` | Các màn hình luyện gõ phản xạ chữ Nhật, ôn tập tổng hợp và danh sách từ chưa thuộc. |
| **3. Chữ Hán (`Kanji`)** | **Bảng tra cứu Kanji (`KanjiDashboard`)** | `/#/kanji` | Tra cứu Kanji theo cấp độ JLPT (`N5`–`N1`), tìm kiếm theo mặt chữ/âm đọc, lọc trạng thái *Tất cả / Chưa học / Đã thuộc*. |
| | **Chi tiết Kanji (`KanjiDetail`)** | `/#/kanji/:kanjiId` | Xem âm On, âm Kun, âm Hán Việt, nghĩa, số nét, danh sách từ ghép ví dụ và phát âm từng từ. |
| | **Luyện viết nét chữ (`KanjiPractice`)** | `/#/kanji/:kanjiId/practice` | Tương tác vẽ nét chữ Hán trên khung Canvas (`HanziWriter`) với 3 chế độ: **Show** (Xem mẫu bút thuận), **Trace** (Tô theo nét mờ), **Test** (Tự viết kiểm tra). Tự động đánh dấu "Đã thuộc" sau 3 lần viết đúng. |
| **4. Ngữ pháp (`Grammar`)** | **Danh mục sách & bài học (`GrammarDashboard`, `GrammarDetail`)** | `/#/grammar`<br>`/#/grammar/:bookId/:chapterId` | Quản lý giáo trình ngữ pháp theo sách và chương bài (hiện có *Shin Kanzen Master N3*). Hiển thị tỷ lệ hoàn thành từng mẫu câu. |
| | **Bài giảng thông minh (`GrammarLesson`)** | `/#/grammar/:bookId/:chapterId/lesson/:grammarId` | Giải thích cấu trúc, ý nghĩa, cách dùng, lưu ý đặc biệt và hệ thống câu ví dụ song ngữ Nhật – Việt có phát âm. |
| | **Luyện tập Ngữ pháp (`GrammarPractice`)** | `/#/grammar/:bookId/:chapterId/practice`<br>`/#/grammar/:bookId/:chapterId/practice/:grammarId` | Engine bài tập ngữ pháp đa dạng: Trắc nghiệm 4 lựa chọn, Điền vào chỗ trống, Chia thể động/tính từ, Sắp xếp câu và Bài tập Hái sao (★). |
| **5. Luyện đề JLPT (`JLPT 9 Modules`)** | **9 Kỹ năng & Thi thử (`JLPTModulePage`)** | `/#/jlpt/:moduleId` | 9 module chuyên sâu chuẩn cấu trúc đề thi thật:<br>1. `kanji` (Luyện Chữ Hán)<br>2. `vocab` (Luyện Từ vựng)<br>3. `grammar` (Luyện Ngữ pháp)<br>4. `star` (Luyện Hái sao ★)<br>5. `reading-short` (Đọc hiểu Đoản văn 150–200 chữ)<br>6. `reading-medium` (Đọc hiểu Trung văn 400–500 chữ)<br>7. `reading-long` (Đọc hiểu Trường văn)<br>8. `listening` (Luyện Nghe hiểu kèm Audio & Transcript)<br>9. `full-test` (Thi thử Toàn bộ có đồng hồ đếm ngược 20 phút). |
| **6. Ôn tập lỗi sai (`Mistakes`)** | **Sổ tay lỗi sai (`MistakesReview`)** | `/#/grammar/mistakes` | Tự động thu thập mọi câu trả lời sai từ Ngữ pháp và các module JLPT; phân loại lỗi, giải thích chi tiết và cho phép xóa khi đã nắm vững. |
| **7. Xuất tài liệu in (`PDF Export`)** | **Trình tạo phiếu học tập PDF (`PdfPage`)** | `/#/pdf` | Tạo và in phiếu bài tập chuẩn khổ A4 cho **Từ vựng**, **Ngữ pháp** và **Kanji** (hỗ trợ kéo-thả sắp xếp cột, bật/tắt đáp án, khung tập viết ô vuông). |
| **8. Tài khoản & Cài đặt** | **Đăng nhập / Đăng ký (`AuthPage`)** | `/#/login`<br>`/#/register` | Đăng nhập bằng Email/Mật khẩu hoặc **Tiếp tục với Google**, hỗ trợ chế độ Khách. |
| | **Hồ sơ & Cài đặt (`ProfilePage`, `SettingsPage`)** | `/#/profile`<br>`/#/settings` | Đổi trình độ JLPT mục tiêu (`N5`–`N1`), cài đặt khung giờ nhắc học hằng ngày, chọn mục tiêu ngày thi JLPT, đồng bộ Google Calendar & xuất file `.ics`. |
| **9. Quản trị (`Admin CMS`)** | **Hệ thống Admin CMS 7 phân hệ (`AdminDashboardPage`)** | `/#/admin` | Dành riêng cho `ADMIN` & `SUPER_ADMIN` gồm 7 tab:<br>1. **Units**: Quản lý danh mục bài học<br>2. **Từ vựng**: Thêm/sửa/xóa & Import JSON/CSV hàng loạt<br>3. **Kanji**: Quản lý chữ Hán & Import hàng loạt<br>4. **Ngữ pháp**: Quản lý mẫu câu, ví dụ & Import hàng loạt<br>5. **Đề JLPT**: Quản lý ngân hàng câu hỏi 9 kỹ năng & Import hàng loạt<br>6. **Users & Audit**: Phân quyền người dùng & Xem nhật ký hệ thống<br>7. **Migration & E2E Test**: Đẩy dữ liệu tĩnh lên Supabase Cloud & Chạy kiểm thử tự động. |

---

## Phần 2: Thống kê Dữ liệu Hiện Có vs Các Phần Đang Trống Cần Fill

Dưới đây là số liệu kiểm đếm chính xác 100% từ thư mục `client/src/data/` hiện tại và danh sách các khoảng trống cần cộng tác viên/mentor hỗ trợ biên soạn thêm:

### 2.1. Bảng tổng hợp toàn bộ kho dữ liệu hiện tại

| Phân hệ dữ liệu | Nguồn file trong mã nguồn | Số lượng hiện có (Chi tiết) | Các phần đang trống / Cần bổ sung gấp |
| :--- | :--- | :--- | :--- |
| **1. Từ vựng (`vocabularies`)** | `client/src/data/unitData.ts`<br>`client/src/data/n3/unit1.ts` | **Tổng cộng: `130` từ**<br>- `N3 Unit 1` (*Mimi kara Oboeru*): **130 từ** (120 từ chuẩn ID `1..120` + 10 động/tính từ mở rộng ID `200..209`).<br>- Đầy đủ Kanji, Hiragana, Hán Việt, Nghĩa, Từ loại.<br>- Tuy nhiên `exampleSentence`, `exampleMeaning`, `notes` đang để `null`. | - **`N5` (`Unit 1+`):** Đang trống **0 từ** (cần bổ sung ~600–800 từ sơ cấp).<br>- **`N4` (`Unit 1+`):** Đang trống **0 từ** (cần bổ sung ~700 từ sơ trung cấp).<br>- **`N3` (`Unit 2` trở đi):** Đang trống **0 từ** (cần bổ sung các Unit tiếp theo của N3).<br>- **`N2` & `N1`:** Đang trống **0 từ**.<br>- Bổ sung câu ví dụ (`example_sentence`, `example_meaning`) cho 130 từ `N3 Unit 1`. |
| **2. Chữ Hán (`kanjis`)** | `client/src/data/kanji/kanjiDataset.json` | **Tổng cộng: `178` chữ Kanji**<br>Phân bổ theo cấp độ:<br>- `N5`: **26** chữ<br>- `N4`: **35** chữ<br>- `N3`: **70** chữ<br>- `N2`: **23** chữ<br>- `N1`: **24** chữ<br>Đã có âm On, âm Kun, số nét và từ ghép ví dụ. | - **Thiếu âm Hán Việt (`han_viet`):** **177 / 178 chữ** đang để trống `hanViet: ""` (chỉ mới có 1 chữ có dữ liệu).<br>- **Nghĩa (`meanings`):** **177 / 178 chữ** đang lưu nghĩa tiếng Anh (ví dụ: `"male"`, `"nature"`), chữ `会` đang rỗng dữ liệu — cần dịch sang **nghĩa tiếng Việt**.<br>- **Thiếu số lượng chữ theo chuẩn JLPT:** Cần bổ sung cho đủ bộ `N5` (~100 chữ), `N4` (~200 chữ), `N3` (~350 chữ), `N2` & `N1`. |
| **3. Ngữ pháp (`grammar_rules`)** | `client/src/data/grammar/index.ts`<br>`shinkanzen-n3/lesson01.ts`<br>`shinkanzen-n3/lesson02.ts`<br>`lesson01Sentences.ts`<br>`lesson01PracticeBank.ts` | **Tổng cộng: `1` sách, `2` bài, `11` mẫu ngữ pháp**<br>- Sách `SHINKANZEN_N3` (*Shin Kanzen Master N3*):<br>  + **Bài 1 (`L01` - Thời gian):** **6 mẫu** (`～うちに (trạng thái)`, `～うちに (biến đổi)`, `～あいだ`, `～あいだに`, `～てからでないと`, `～て以来`).<br>  + **Bài 2 (`L02` - Liên quan đến):** **5 mẫu** (`～につれて`, `～にしたがって`, `～とともに`, `～に伴って`, `～次第`).<br>- Đi kèm **220 câu** ví dụ & ngân hàng câu hỏi luyện tập (20 câu/mẫu). | - **Cấp độ `N5` & `N4`:** Chưa có sách và bài học nào (cần bổ sung *Minna no Nihongo N5/N4* hoặc *Shin Kanzen N4*).<br>- **Cấp độ `N3`:** Cần bổ sung tiếp **Bài 3 (`L03`) trở đi** của sách *Shin Kanzen Master N3*.<br>- **Cấp độ `N2` & `N1`:** Chưa có dữ liệu ngữ pháp (*Shin Kanzen Master N2/N1*). |
| **4. Ngân hàng Đề JLPT (`jlpt_questions`)** | `client/src/data/jlpt/jlptDataset.ts` | **Tổng cộng: `149` câu hỏi / bài tập** trải đều 9 kỹ năng cho `N5`, `N4`, `N3` *(xem bảng chi tiết 2.2 bên dưới)*. | - **Cấp độ `N2` & `N1`:** Hiện chưa có câu hỏi nào ở cả 9 kỹ năng.<br>- **Đọc hiểu (`reading-short`, `medium`, `long`):** Mỗi cấp độ `N5`, `N4`, `N3` mới chỉ có **1 bài đọc/module** (tổng 9 bài đọc) — cần bổ sung nhiều bài đọc kèm bản dịch & giải thích.<br>- **Nghe hiểu (`listening`):** Mỗi cấp độ `N5`, `N4`, `N3` mới có **2 bài hội thoại** (tổng 6 bài) — cần bổ sung thêm kịch bản hội thoại. |

---

### 2.2. Thống kê chi tiết Ngân hàng Đề JLPT theo 9 Kỹ năng (`client/src/data/jlpt/jlptDataset.ts`)

| STT | Mã Module (`module_id`) | Tên kỹ năng trên giao diện | Tổng số lượng hiện có | Phân bổ chi tiết (`N5` / `N4` / `N3` / `N2` / `N1`) | Ghi chú nhu cầu bổ sung |
| :---: | :--- | :--- | :---: | :--- | :--- |
| 1 | `kanji` | **Luyện Chữ Hán** | **33 câu** | `N5`: 9 câu · `N4`: 9 câu · `N3`: 15 câu · `N2`: 0 · `N1`: 0<br>*(15 câu biên soạn thủ công + 18 câu sinh từ kho từ vựng)* | Cần thêm câu hỏi đọc âm On-Kun và chọn chữ Hán cho `N5`–`N1`. |
| 2 | `vocab` | **Luyện Từ vựng** | **28 câu** | `N5`: 4 câu · `N4`: 4 câu · `N3`: 20 câu · `N2`: 0 · `N1`: 0<br>*(12 câu biên soạn thủ công + 16 câu sinh từ kho từ vựng)* | Cần thêm câu hỏi từ đồng nghĩa, cách dùng từ (用法) cho `N4`, `N5`, `N2`, `N1`. |
| 3 | `grammar` | **Luyện Ngữ pháp** | **34 câu** | `N5`: 4 câu · `N4`: 4 câu · `N3`: 26 câu · `N2`: 0 · `N1`: 0<br>*(12 câu biên soạn thủ công + 22 câu trích từ ngân hàng N3)* | Cần tăng số lượng câu ngữ pháp cho `N5`, `N4` và mở mới cho `N2`, `N1`. |
| 4 | `star` | **Luyện Hái sao (★)** | **28 câu** | `N5`: 2 câu · `N4`: 2 câu · `N3`: 24 câu · `N2`: 0 · `N1`: 0<br>*(6 câu biên soạn thủ công + 22 câu trích từ ngân hàng N3)* | `N5` và `N4` mới có 2 câu/cấp độ — rất cần bổ sung thêm bài tập sắp xếp 4 mảnh ghép ★. |
| 5 | `reading-short` | **Đọc hiểu Ngắn (Đoản văn)** | **3 bài đọc** *(6 câu hỏi)* | `N5`: 1 bài (2 câu) · `N4`: 1 bài (2 câu) · `N3`: 1 bài (2 câu) · `N2`: 0 · `N1`: 0 | **Ưu tiên cao:** Cần bổ sung thêm các đoạn email, thông báo ngắn (150–200 chữ) kèm bản dịch. |
| 6 | `reading-medium` | **Đọc hiểu Trung văn** | **3 bài đọc** *(6 câu hỏi)* | `N5`: 1 bài (2 câu) · `N4`: 1 bài (2 câu) · `N3`: 1 bài (2 câu) · `N2`: 0 · `N1`: 0 | **Ưu tiên cao:** Cần bổ sung bài đọc 400–500 chữ kèm câu hỏi phân tích nguyên nhân/ý tác giả. |
| 7 | `reading-long` | **Đọc hiểu Trường văn** | **3 bài đọc** *(8 câu hỏi)* | `N5`: 1 bài (2 câu) · `N4`: 1 bài (3 câu) · `N3`: 1 bài (3 câu) · `N2`: 0 · `N1`: 0 | **Ưu tiên cao:** Cần bổ sung bài luận dài / bài tìm kiếm thông tin (700–1000 chữ). |
| 8 | `listening` | **Luyện Nghe hiểu** | **6 bài nghe** *(6 câu hỏi)* | `N5`: 2 bài · `N4`: 2 bài · `N3`: 2 bài · `N2`: 0 · `N1`: 0 | Cần thêm các đoạn hội thoại ngắn kèm lời thoại (`audio_text`) để hệ thống đọc tự động. |
| 9 | `full-test` | **Thi thử Toàn bộ (Full Test)** | **Tự động tổng hợp** | Rút ngẫu nhiên từ 8 module trên để tạo đề thi 20 phút (4 Kanji + 4 Từ vựng + 4 Ngữ pháp + 2 Hái sao + 1 Bài đọc + 2 Bài nghe). | Khi 8 module trên có nhiều câu hỏi hơn, đề Full Test sẽ càng phong phú và không bị lặp câu. |

---

## Phần 3: Quy chuẩn & Mẫu Dữ liệu để Fill (Tương thích 100% với nút Import JSON trong `/admin`)

Bộ công cụ **Import JSON hàng loạt** trong `/#/admin` (`client/src/utils/batchImportUtils.ts`) được thiết kế thông minh, hỗ trợ **tự động nhận diện cả chuẩn tên trường `snake_case` (của Database Supabase) lẫn `camelCase` (của Frontend)**.

Khi biên soạn dữ liệu, cộng tác viên chỉ cần đặt các đối tượng vào trong **một mảng JSON `[ ... ]`** theo đúng 4 mẫu dưới đây.

---

### 3.1. Mẫu điền Từ vựng (`vocab_template.json`)

#### Mẫu JSON chuẩn (Copy & Paste để điền):
```json
[
  {
    "unit_id": "N4-U1",
    "level": "N4",
    "word_number": 1,
    "kanji": "約束",
    "hiragana": "やくそく",
    "han_viet": "ƯỚC THÚC",
    "meaning": "lời hứa, cuộc hẹn",
    "word_type": "Danh từ",
    "example_sentence": "友達と約束をしました。",
    "example_meaning": "Tôi đã hẹn với bạn.",
    "notes": "Danh từ ghép với する thành động từ (約束する: hứa, hẹn)."
  },
  {
    "unit_id": "N4-U1",
    "level": "N4",
    "word_number": 2,
    "kanji": "間に合う",
    "hiragana": "まにあう",
    "han_viet": "GIAN HỢP",
    "meaning": "kịp giờ, đúng giờ",
    "word_type": "Động từ",
    "example_sentence": "始発の電車に間に合いました。",
    "example_meaning": "Tôi đã kịp chuyến tàu đầu tiên.",
    "notes": "Đi với trợ từ に (N に間に合う)."
  }
]
```

#### Giải thích chi tiết từng trường (Từ vựng):
| Tên trường | Bắt buộc / Tùy chọn | Kiểu dữ liệu | Quy chuẩn & Lưu ý khi điền |
| :--- | :---: | :--- | :--- |
| `hiragana` | **Bắt buộc** | `string` | Cách đọc bằng chữ Hiragana (hoặc Katakana đối với từ ngoại lai). Không được để trống. |
| `meaning` | **Bắt buộc** | `string` | Nghĩa tiếng Việt ngắn gọn, rõ ràng. Nhiều nghĩa ngăn cách bằng dấu phẩy `,`. |
| `level` | **Bắt buộc** | `string` | Cấp độ JLPT viết hoa: `"N5"`, `"N4"`, `"N3"`, `"N2"`, hoặc `"N1"`. |
| `unit_id` | **Bắt buộc** | `string` hoặc `number` | Mã bài học theo định dạng `"<Cấp độ>-U<Số bài>"` (VD: `"N4-U1"`, `"N5-U1"`, `"N3-U2"`). *(Lưu ý: Nếu dùng nút Import JSON nhanh trên `/admin`, có thể điền số nguyên `1`, `2` tương ứng với Unit 1, Unit 2; hệ thống sẽ tự động chuẩn hóa).* |
| `word_type` | **Bắt buộc** *(Mặc định: `"Danh từ"`)* | `string` | Chọn 1 trong các nhãn chuẩn: `"Danh từ"`, `"Động từ"`, `"Tính từ -i"`, `"Tính từ -na"`, `"Phó từ"`, `"Liên từ"`, `"Cụm từ"`. |
| `word_number` | *Tùy chọn* | `number` | Số thứ tự của từ trong Unit (`1`, `2`, `3`...). Nếu bỏ trống, hệ thống tự đánh số tăng dần. |
| `kanji` | *Tùy chọn* | `string \| null` | Chữ Hán của từ (VD: `"約束"`). Nếu từ chỉ viết bằng Hiragana/Katakana thì điền `""` hoặc `null`. |
| `han_viet` | *Tùy chọn* | `string \| null` | Âm Hán Việt viết IN HOA (VD: `"ƯỚC THÚC"`). Rất khuyến khích điền để học viên dễ liên tưởng Kanji. |
| `example_sentence` | *Tùy chọn* | `string \| null` | Câu ví dụ tiếng Nhật có chứa từ vựng đó. |
| `example_meaning` | *Tùy chọn* | `string \| null` | Bản dịch tiếng Việt của câu ví dụ trên. |
| `notes` | *Tùy chọn* | `string \| null` | Ghi chú thêm về trợ từ đi kèm, từ đồng nghĩa/trái nghĩa hoặc lưu ý chia thể. |

---

### 3.2. Mẫu điền / bổ sung Kanji (`kanji_template.json`)

> **Mẹo hữu ích:** Nếu nhập một chữ Kanji đã có sẵn trong 178 chữ hiện tại (ví dụ `"男"`), công cụ Import trong `/admin` có chế độ **Ghi đè (Upsert)** giúp cập nhật ngay âm Hán Việt (`han_viet`) và nghĩa tiếng Việt (`meanings`) cho chữ đó mà không tạo bản ghi trùng.

#### Mẫu JSON chuẩn (Copy & Paste để điền):
```json
[
  {
    "character": "男",
    "han_viet": "NAM",
    "meanings": ["đàn ông", "nam giới"],
    "onyomi": ["ダン", "ナン"],
    "kunyomi": ["おとこ"],
    "stroke_count": 7,
    "jlpt_level": "N5",
    "examples": [
      {
        "word": "男性",
        "hiragana": "だんせい",
        "meaning": "nam giới"
      },
      {
        "word": "男の子",
        "hiragana": "おとこのこ",
        "meaning": "bé trai"
      }
    ]
  }
]
```

#### Giải thích chi tiết từng trường (Kanji):
| Tên trường | Bắt buộc / Tùy chọn | Kiểu dữ liệu | Quy chuẩn & Lưu ý khi điền |
| :--- | :---: | :--- | :--- |
| `character` *(hoặc `kanji`)* | **Bắt buộc** | `string` | Đúng 1 ký tự chữ Hán duy nhất (VD: `"男"`, `"학"` -> `"学"`). Đây cũng là khóa định danh của chữ Hán. |
| `han_viet` | **Bắt buộc** | `string` | Âm Hán Việt chuẩn viết IN HOA (VD: `"NAM"`, `"HỌC"`, `"NHẬT"`). |
| `meanings` | **Bắt buộc** | `string[]` | Mảng các nghĩa tiếng Việt của chữ Hán (VD: `["đàn ông", "nam giới"]`). |
| `jlpt_level` | **Bắt buộc** | `string` | Cấp độ JLPT của chữ Hán: `"N5"`, `"N4"`, `"N3"`, `"N2"`, hoặc `"N1"`. |
| `onyomi` *(hoặc `onReadings`)* | *Tùy chọn* *(Khuyến nghị có)* | `string[]` | Mảng các âm On viết bằng chữ **Katakana** (VD: `["ダン", "ナン"]`). Nếu không có âm On, để mảng rỗng `[]`. |
| `kunyomi` *(hoặc `kunReadings`)* | *Tùy chọn* *(Khuyến nghị có)* | `string[]` | Mảng các âm Kun viết bằng chữ **Hiragana** (VD: `["おとこ"]`). Nếu không có âm Kun, để mảng rỗng `[]`. |
| `stroke_count` | *Tùy chọn* | `number` | Tổng số nét viết của chữ Hán (số nguyên dương, VD: `7`). |
| `examples` | *Tùy chọn* | `Array<{ word, hiragana, meaning }>` | Danh sách từ vựng ghép tiêu biểu chứa chữ Kanji này (mỗi từ gồm `word`: từ có chứa Kanji, `hiragana`: cách đọc, `meaning`: nghĩa tiếng Việt). |

---

### 3.3. Mẫu điền Ngữ pháp (`grammar_template.json`)

#### Mẫu JSON chuẩn (Copy & Paste để điền):
```json
[
  {
    "id": "N4-MNN-L01-01",
    "book_id": "MINNA_N4",
    "chapter_id": "L01",
    "level": "N4",
    "title": "～ながら",
    "structure": "Vます (bỏ ます) + ながら",
    "meaning": "Vừa làm A vừa làm B",
    "explanation": "Diễn tả hai hành động diễn ra song song cùng một lúc do cùng một chủ thể thực hiện, trong đó hành động ở vế sau (B) là hành động chính.",
    "notes": "Không dùng với các động từ chỉ hành động xảy ra trong khoảnh khắc (như 死ぬ, 結婚する).",
    "examples": [
      {
        "jp": "音楽を聞きながら、勉強します。",
        "vi": "Tôi vừa nghe nhạc vừa học bài."
      },
      {
        "jp": "アルバイトをしながら、大学に通っています。",
        "vi": "Tôi vừa đi làm thêm vừa đi học đại học."
      }
    ]
  }
]
```

#### Giải thích chi tiết từng trường (Ngữ pháp):
| Tên trường | Bắt buộc / Tùy chọn | Kiểu dữ liệu | Quy chuẩn & Lưu ý khi điền |
| :--- | :---: | :--- | :--- |
| `title` | **Bắt buộc** | `string` | Tên mẫu ngữ pháp hiển thị trên tiêu đề bài học (VD: `"～ながら"`, `"～うちに（状態）"`). |
| `structure` | **Bắt buộc** | `string` | Công thức kết hợp từ (VD: `"Vます + ながら"`, `"Vる / Vない + ように"`). Nếu có nhiều cách kết hợp, ngăn cách bằng dấu `" / "`. |
| `meaning` | **Bắt buộc** | `string` | Nghĩa tiếng Việt cô đọng của mẫu câu. |
| `level` | **Bắt buộc** | `string` | Cấp độ JLPT: `"N5"`, `"N4"`, `"N3"`, `"N2"`, hoặc `"N1"`. |
| `id` | *Tùy chọn* *(Khuyến nghị có)* | `string` | Mã định danh duy nhất theo quy tắc `"<Level>-<ViếtTắtSách>-<MãBài>-<SốThứTự>"` (VD: `"N4-MNN-L01-01"`). Nếu bỏ trống, hệ thống tự động sinh mã. |
| `book_id` | *Tùy chọn* *(Mặc định: `"SHINKANZEN_N3"`)* | `string` | Mã giáo trình (VD: `"MINNA_N5"`, `"MINNA_N4"`, `"SHINKANZEN_N3"`, `"SHINKANZEN_N2"`, `"SHINKANZEN_N1"`). |
| `chapter_id` | *Tùy chọn* *(Mặc định: `"L01"`)* | `string` | Mã bài/chương trong sách (VD: `"L01"`, `"L02"`, `"L03"`...). |
| `explanation` | *Tùy chọn* *(Khuyến nghị có)* | `string` | Giải thích chi tiết ngữ cảnh sử dụng, sắc thái biểu đạt của mẫu câu. |
| `notes` | *Tùy chọn* | `string` | Các lưu ý phân biệt với mẫu ngữ pháp tương tự hoặc các lỗi học viên hay mắc. |
| `examples` | *Tùy chọn* *(Khuyến nghị 2–5 câu)* | `Array<{ jp, vi }>` | Danh sách câu ví dụ minh họa. Mỗi phần tử gồm `"jp"` (câu tiếng Nhật) và `"vi"` (nghĩa tiếng Việt). Có thể thêm trường `"hiragana"` nếu muốn hiển thị phiên âm toàn câu. |

---

### 3.4. Mẫu điền Đề JLPT & Đọc hiểu (`jlpt_template.json`)

Hệ thống Admin CMS hợp nhất toàn bộ các kỹ năng JLPT vào bảng `jlpt_questions`. Bạn có thể gộp chung cả câu hỏi Trắc nghiệm (`kanji`, `vocab`, `grammar`), câu hỏi Đọc hiểu (`reading-short`, `reading-medium`, `reading-long`) và câu hỏi Hái sao (`star`) vào cùng một file JSON theo 3 mẫu chuẩn dưới đây:

#### Mẫu 1 — Câu hỏi Trắc nghiệm 4 đáp án (`kanji` / `vocab` / `grammar`):
```json
[
  {
    "id": "jlpt-vocab-n4-01",
    "module_id": "vocab",
    "level": "N4",
    "prompt": "新しい計画について、みんなで（　　）しました。",
    "options": ["相談", "反対", "出発", "掃除"],
    "correct_index": 0,
    "explanation": "相談する (そうだんする - Thảo luận, bàn bạc) phù hợp nhất với ngữ cảnh bàn về kế hoạch mới. 反対 (phản đối), 出発 (xuất phát), 掃除 (dọn dẹp)."
  },
  {
    "id": "jlpt-kanji-n4-01",
    "module_id": "kanji",
    "level": "N4",
    "prompt": "毎朝、公園を 【散歩】 しています。",
    "options": ["さんぽ", "さんぼ", "しんぽ", "せんぽ"],
    "correct_index": 0,
    "explanation": "散歩 (Tản bộ) đọc là さんぽ (biến âm 半濁音 từ ほ thành ぽ)."
  }
]
```

#### Mẫu 2 — Câu hỏi Đọc hiểu (`reading-short` / `reading-medium` / `reading-long`):
> **Lưu ý cho bài Đọc hiểu:** Đặt toàn bộ nội dung bài văn tiếng Nhật vào trường `"passage"`. Trong trường `"explanation"`, khuyến khích ghi kèm **Bản dịch tiếng Việt của đoạn văn + Từ vựng khó + Phân tích ngữ pháp/lý do chọn đáp án** để học viên học được tối đa kiến thức sau khi nộp bài.

```json
[
  {
    "id": "jlpt-rs-n4-01",
    "module_id": "reading-short",
    "level": "N4",
    "passage": "【図書館からのお知らせ】\n来週の月曜日（10日）から水曜日（12日）まで、本の整理のため図書館はお休みします。本を返す人は、入り口の横にある「返却ポスト」に入れてください。ただし、CDやDVDは壊れやすいので、木曜日以降に直接カウンターへ持ってきてください。",
    "prompt": "火曜日に図書館へ本とCDを返しに行きます。どうしなければなりませんか。",
    "options": [
      "本もCDも返却ポストに入れます。",
      "本は返却ポストに入れて、CDは木曜日以降にカウンターへ持っていきます。",
      "本もCDも木曜日以降にカウンターへ持っていきます。",
      "火曜日は開いているので、両方カウンターへ持っていきます。"
    ],
    "correct_index": 1,
    "explanation": "【Bản dịch】 Thông báo từ thư viện: Từ thứ Hai (ngày 10) đến thứ Tư (ngày 12) tuần sau, thư viện nghỉ để sắp xếp lại sách. Người trả sách vui lòng bỏ vào 'Hòm trả sách' cạnh lối vào. Tuy nhiên, đĩa CD và DVD dễ vỡ nên từ thứ Năm trở đi hãy mang trực tiếp đến quầy.\n【Giải thích】 Ngày thứ Ba nằm trong thời gian nghỉ (thứ Hai ~ thứ Tư), nên sách thì bỏ vào hòm trả sách, còn CD phải đợi từ thứ Năm trở đi mang tới quầy."
  }
]
```

#### Mẫu 3 — Câu hỏi Hái sao ★ (`star`):
> **Lưu ý cho bài Hái sao (★):**
> - Trong `"prompt"`, ghi câu tiếng Nhật có chứa 4 chỗ trống và ký hiệu `★` ở vị trí cần hỏi (ví dụ: `"___ ___ ★ ___"`).
> - Trong `"options"`, liệt kê **4 mảnh ghép theo đúng thứ tự đúng của câu hoàn chỉnh**.
> - Trong `"correct_index"`, điền chỉ số (`0`, `1`, `2`, hoặc `3`) tương ứng với vị trí của dấu `★` (ví dụ: dấu `★` ở vị trí thứ 3 thì `correct_index` là `2`).
> - Trong `"passage"`, ghi câu tiếng Nhật hoàn chỉnh sau khi ghép để hệ thống đối chiếu và hiển thị trong lời giải.

```json
[
  {
    "id": "jlpt-star-n4-01",
    "module_id": "star",
    "level": "N4",
    "prompt": "この本は ___ ___ ★ ___ わかりやすいです。",
    "passage": "この本は 漢字に 読み方が ついているので わかりやすいです。",
    "options": [
      "漢字に",
      "読み方が",
      "ついているので",
      "とても"
    ],
    "correct_index": 2,
    "explanation": "【Câu hoàn chỉnh】 この本は 漢字に 読み方が ついているので とても わかりやすいです。(Cuốn sách này vì ở chữ Hán có gắn kèm cách đọc nên rất dễ hiểu).\n【Cấu trúc】 漢字に (ở chữ Hán) + 読み方がつく (có gắn cách đọc) + ので (vì...). Mảnh ghép tại vị trí ★ (vị trí số 3, index = 2) là 「ついているので」."
  }
]
```

#### Giải thích chi tiết từng trường (Đề JLPT):
| Tên trường | Bắt buộc / Tùy chọn | Kiểu dữ liệu | Quy chuẩn & Lưu ý khi điền |
| :--- | :---: | :--- | :--- |
| `module_id` *(hoặc `moduleId`)* | **Bắt buộc** | `string` | Chọn đúng 1 trong 8 mã kỹ năng:<br>- `"kanji"` (Chữ Hán)<br>- `"vocab"` (Từ vựng)<br>- `"grammar"` (Ngữ pháp)<br>- `"star"` (Hái sao ★)<br>- `"reading-short"` (Đoản văn 150–200 chữ)<br>- `"reading-medium"` (Trung văn 400–500 chữ)<br>- `"reading-long"` (Trường văn >700 chữ)<br>- `"listening"` (Nghe hiểu). |
| `level` | **Bắt buộc** | `string` | Cấp độ đề thi: `"N5"`, `"N4"`, `"N3"`, `"N2"`, hoặc `"N1"`. |
| `prompt` | **Bắt buộc** | `string` | Nội dung câu hỏi / câu đề bài. Với câu hỏi từ vựng/ngữ pháp dùng `（　　）` cho chỗ trống; với câu hỏi chữ Hán đặt từ cần hỏi trong ngoặc `【...】`. |
| `options` | **Bắt buộc** | `string[]` | Mảng gồm **4 phương án lựa chọn** (4 phần tử chuỗi). |
| `correct_index` *(hoặc `correctIndex`)* | **Bắt buộc** | `number` | Vị trí đáp án đúng trong mảng `options`, tính từ **`0` đến `3`** (`0` = đáp án A, `1` = đáp án B, `2` = đáp án C, `3` = đáp án D). |
| `explanation` | **Bắt buộc** *(Khuyến nghị chi tiết)* | `string` | Lời giải thích chi tiết vì sao chọn đáp án đúng, nghĩa của các phương án nhiễu, bản dịch tiếng Việt và phân tích ngữ pháp. |
| `passage` | *Bắt buộc với bài Đọc hiểu (`reading-*`)* / *Tùy chọn với bài khác* | `string \| null` | Đoạn văn bài đọc tiếng Nhật (với module `reading-short`, `reading-medium`, `reading-long`) hoặc câu hoàn chỉnh (với module `star`). |
| `audio_text` | *Chỉ dùng cho bài Nghe (`listening`)* | `string \| null` | Kịch bản hội thoại tiếng Nhật (VD: `"男: 明日の会議は何時からですか。\n女: 午前10時からです。"`). Trình phát âm của web sẽ tự động đọc đoạn hội thoại này. |
| `id` | *Tùy chọn* | `string` | Mã câu hỏi duy nhất (VD: `"jlpt-vocab-n4-01"`). Nếu không điền, hệ thống tự động tạo mã. |

---

## Phần 4: Quy trình Nạp Dữ liệu vào Web

Sau khi cộng tác viên hoặc mentor hoàn thành việc biên soạn dữ liệu theo các mẫu ở **Phần 3**, có **2 cách đơn giản và an toàn** để đưa dữ liệu lên hệ thống **`Nihongo 問`**:

### Cách 1: Gửi file `.json` (hoặc Google Sheet / Excel) để Admin Import hàng loạt
Phù hợp khi cộng tác viên muốn soạn thảo hàng chục hoặc hàng trăm từ vựng / câu hỏi cùng lúc trên máy tính cá nhân:

1. **Bước 1 — Chuẩn bị file:** Cộng tác viên lưu dữ liệu dưới dạng file `.json` theo đúng mẫu ở Phần 3 (hoặc điền trên Google Sheet / Excel với tiêu đề cột trùng tên trường rồi xuất ra `.csv` / `.json`).
2. **Bước 2 — Kiểm tra tự động (Preview & Validate):** Admin đăng nhập vào trang quản trị `/#/admin`, chọn phân hệ tương ứng (**Từ vựng**, **Kanji**, **Ngữ pháp**, hoặc **Đề JLPT**) và bấm nút **"Import JSON / CSV"**.
3. **Bước 3 — Xử lý trùng lặp thông minh:** Hệ thống tự động kiểm tra từng dòng dữ liệu và phân loại màu rõ ràng:
   - **Hợp lệ (Valid):** Sẵn sàng thêm mới.
   - **Trùng lặp (Duplicate):** Cho phép chọn *Bỏ qua dòng trùng (Skip)* hoặc *Ghi đè cập nhật (Upsert — rất tiện khi bổ sung âm Hán Việt cho 178 chữ Kanji hiện có)*.
   - **Lỗi cú pháp (Invalid):** Báo rõ dòng nào thiếu trường bắt buộc để sửa ngay.
4. **Bước 4 — Lưu lên Supabase Cloud:** Bấm **"Xác nhận Import"**, toàn bộ dữ liệu được đẩy thẳng lên cơ sở dữ liệu Supabase và **hiển thị tức thì** trên giao diện học viên.

---

### Cách 2: Cấp quyền `ADMIN` để nhập trực tiếp trên giao diện Quản trị Web
Phù hợp khi mentor hoặc cộng tác viên muốn trực tiếp thêm/sửa từng bài học, xem trước giao diện hiển thị và lưu trực tiếp lên đám mây:

1. **Bước 1 — Đăng ký tài khoản:** Cộng tác viên truy cập trang `/#/login` của web và đăng nhập nhanh bằng tài khoản **Google** (hoặc đăng ký bằng Email).
2. **Bước 2 — Nâng quyền `ADMIN`:** Chủ dự án (`SUPER_ADMIN`) vào `/#/admin` → tab **"Users & Audit"**, tìm email của cộng tác viên và chuyển vai trò từ `USER` sang **`ADMIN`**.
3. **Bước 3 — Quản trị trực tiếp tại `/#/admin`:**
   - Ngay sau khi được cấp quyền, thanh điều hướng của cộng tác viên sẽ xuất hiện nút **"Quản trị"** dẫn tới `/#/admin`.
   - Cộng tác viên có thể dùng biểu mẫu trực quan (Form UI) để tạo Unit mới, thêm/sửa Từ vựng, Kanji, Ngữ pháp, Câu hỏi JLPT hoặc tự dùng nút **Import JSON / CSV** trên web.
   - Mọi thao tác thêm/sửa/xóa đều được đồng bộ trực tiếp lên **Supabase PostgreSQL** và ghi nhận tự động vào **Nhật ký hệ thống (`Audit Logs`)** để đảm bảo an toàn dữ liệu.
