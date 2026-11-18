# Hướng dẫn Build iOS Native App (Capacitor) & Kiểm thử Thông báo Nền

Tài liệu này giải thích kiến trúc **Capacitor Native iOS Local Notifications (`UNUserNotificationCenter` / `UNCalendarNotificationTrigger`)**, các bước build/ký (signing) trên macOS Xcode, và quy trình kiểm thử thực tế trên iPhone (bao gồm trường hợp chọn **"Xóa khỏi Màn hình chính / Remove from Home Screen"**).

---

## 1. So sánh iPhone PWA (Safari) vs iPhone Native App (Capacitor)

| Tính năng | Bản Web / PWA trên iOS Safari | Bản Native iOS App (Capacitor) |
| :--- | :--- | :--- |
| Cơ chế nhắc lịch nền | Server Web Push qua Apple APNs (`web.push.apple.com`) + Service Worker | **Apple `UNUserNotificationCenter` & `UNCalendarNotificationTrigger`** lưu trực tiếp trong `usernotificationd` của iOS |
| Phụ thuộc trình duyệt / JS / mạng liên tục | Cần có kết nối mạng lúc máy chủ bắn Push và trình duyệt đã đăng ký Push Subscription | **Không** phụ thuộc Safari, JS, `setTimeout`, `setInterval`, Service Worker hay Internet sau khi đã lưu lịch |
| Thoát app / Khóa màn hình / Đóng App Switcher | Hoạt động qua APNs (khi còn icon PWA trên MH chính) | **Hoạt động trực tiếp từ hệ điều hành iOS** |
| Khởi động lại iPhone (Device Reboot) | Chờ APNs Push mới khi có mạng | `usernotificationd` tự khôi phục `UNNotificationRequest` ngay khi bật lại máy |
| Chọn **"Xóa khỏi Màn hình chính"** (*Remove from Home Screen*) | **NGỪNG HOẠT ĐỘNG** — Safari Web App không tồn tại trong App Library như app Native; xóa icon là xóa Web App & thu hồi Web Push | **VẪN HOẠT ĐỘNG BÌNH THƯỜNG** — Ứng dụng vẫn được cài trong **Thư viện ứng dụng (App Library)** và toàn bộ lịch `UNNotificationRequest` vẫn giữ nguyên |
| Chọn **"Xóa ứng dụng"** (*Delete App*) | Gỡ cài đặt hoàn toàn, ngừng nhận thông báo | Gỡ cài đặt hoàn toàn khỏi iPhone, hệ điều hành tự hủy toàn bộ thông báo chờ |

---

## 2. 3 Cách Xóa/Ẩn Biểu Tượng Khỏi Màn Hình Chính iPhone Mà Vẫn Nhận Thông Báo

### Cách 1 (Khuyên dùng): Cài App Native iOS (Capacitor) ➔ Chọn "Remove from Home Screen" vào App Library
- Khi đã cài **Nihongo 問** dưới dạng App Native (`client/ios/`):
  1. Bấm giữ biểu tượng trên Màn hình chính ➔ chọn **Xóa ứng dụng (Remove App)**.
  2. Chọn **Xóa khỏi Màn hình chính (Remove from Home Screen)**. *(Tuyệt đối KHÔNG chọn "Xóa ứng dụng / Delete App" màu đỏ).*
  3. Biểu tượng biến mất khỏi Màn hình chính nhưng app vẫn nằm trong **Thư viện ứng dụng (App Library)**. Thông báo từ `UNUserNotificationCenter` vẫn nổ đầy đủ ngay cả khi tắt app, khóa màn hình, mất mạng hay khởi động lại máy.

### Cách 2 (Không cần Mac/Xcode — Tải `.ipa` trực tiếp từ GitHub Actions & cài bằng Windows)
Workflow [`.github/workflows/build-native-apps.yml`](../.github/workflows/build-native-apps.yml) tự động chạy trên máy **macOS Cloud** của GitHub để đóng gói sẵn file **`Nihongo-QuizzApp-iOS-Unsigned.ipa`**:
1. Vào tab **Actions** trên GitHub ➔ chọn workflow **Build Native iOS (.ipa) & Android (.apk)** ➔ tải artifact **`Nihongo-QuizzApp-iOS-Unsigned-IPA`**.
2. Giải nén lấy file `Nihongo-QuizzApp-iOS-Unsigned.ipa`.
3. Trên máy **Windows**, cài **Sideloadly** hoặc **AltServer / AltStore**, cắm iPhone qua USB, kéo file `.ipa` vào và ký bằng Apple ID thường miễn phí của bạn (tương tự Xcode Personal Team — Local Notifications hoạt động **100% không cần tài khoản Apple Developer trả phí \$99/năm**).

### Cách 3 (Dùng Web Safari ngay lập tức — Không cần cài App `.ipa`)
- **3A — Xóa hẳn icon Web, giao cho Apple Calendar (`.ics`) nhắc lịch:** Vào `/settings` trên Safari ➔ bấm **`📲 Cài vào Lịch Báo Thức Điện Thoại (iPhone .ics)`** để nạp toàn bộ lịch học vào ứng dụng **Lịch (Calendar)** gốc của iPhone. Sau đó bạn có thể xóa hẳn bookmark Web khỏi Màn hình chính mà Lịch iPhone vẫn reo chuông + hiện thông báo ngoài màn hình khóa kèm đường dẫn mở thẳng bài ôn tập.
- **3B — Giấu icon Safari PWA nhưng vẫn nhận Web Push (APNs):** Sau khi *Thêm vào Màn hình chính* từ Safari, kéo icon sang 1 trang riêng ở cuối ➔ chạm giữ vùng trống Màn hình chính ➔ bấm dãy chấm trang (`•••`) ở dưới ➔ **bỏ dấu tích trang đó** ➔ bấm **Xong**. iPhone ẩn trang đó khỏi Màn hình chính nhưng không xóa Web App, nên Web Push APNs vẫn hoạt động.

---

## 3. Yêu cầu Môi trường Build trực tiếp bằng Xcode trên macOS

> **Lưu ý giới hạn hiện tại trên Windows:** Do môi trường phát triển hiện tại là **Windows 11** (không có macOS và Xcode), toàn bộ mã nguồn Capacitor, cấu hình Swift Package Manager (`CapApp-SPM`), dự án Xcode `client/ios/App/App.xcodeproj`, và dịch vụ lập lịch `nativeNotificationService.ts` đã được chuẩn bị sẵn, **nhưng chưa biên dịch (compile), chưa ký (code-sign) và chưa cài lên iPhone thật**.

### Yêu cầu phần cứng & phần mềm trên Mac
- Máy **macOS** chạy **Xcode 15+** (khuyến nghị Xcode 16+ / iOS SDK 17+ hoặc 18+).
- **Node.js 20+** (hoặc 22 LTS).
- **Apple ID**:
  - **Apple ID miễn phí (Personal Team)**: Hỗ trợ **100% Apple `UNUserNotificationCenter` Local Notifications** để build và cài trực tiếp qua cáp USB lên iPhone thật (không cần trả phí \$99/năm vì Local Notifications không yêu cầu capability APNs Remote Push!). Thời hạn chứng chỉ Personal Team là 7 ngày/lần build dev.
  - **Apple Developer Program (\$99/năm)**: Cần nếu phát hành lên **TestFlight / App Store** hoặc bật thêm Remote APNs Push capability trong Xcode.

---

## 3. Các bước Build & Cài đặt lên iPhone trên macOS Xcode

1. **Cài dependencies & build bản Web cho Capacitor (`base: ./`):**
   ```bash
   cd client
   npm install
   npm run cap:ios
   ```
   Lệnh `npm run cap:ios` chạy `tsc -b && vite build --base=./` và đồng bộ `client/dist/` + `capacitor.config.ts` + plugin (`@capacitor/local-notifications`, `@capacitor/app`) vào `client/ios/`.

2. **Mở dự án Xcode:**
   ```bash
   npx cap open ios
   ```
   Hoặc mở trực tiếp `client/ios/App/App.xcodeproj` bằng Xcode (lưu ý: Capacitor 8 dùng **Swift Package Manager `CapApp-SPM`**, không cần chạy `pod install`). Chờ Xcode tải xong `capacitor-swift-pm`.

3. **Cấu hình Signing & Capabilities trong Xcode:**
   - Chọn target **App** ➔ tab **Signing & Capabilities**.
   - Tích **Automatically manage signing**.
   - Chọn **Team** (Apple ID của bạn).
   - Kiểm tra **Bundle Identifier** là `vn.nihongo.quizzapp` (nếu bị trùng trên Apple ID miễn phí, đổi sang ID riêng của bạn ví dụ `com.tenban.nihongo.quizzapp` và cập nhật tương ứng `appId` trong `client/capacitor.config.ts`).
   - Không cần thêm Capability trả phí nếu chỉ dùng Local Notifications (`UNUserNotificationCenter`). Nếu muốn bật thêm Remote Push trên tài khoản Apple Developer trả phí, mới bấm `+ Capability` ➔ `Push Notifications` + `Background Modes (Remote notifications)`.

4. **Chọn iPhone thật & Run:**
   - Kết nối iPhone qua cáp USB (bật *Developer Mode* trong **Cài đặt iOS ➔ Quyền riêng tư & Bảo mật ➔ Chế độ nhà phát triển**).
   - Chọn thiết bị iPhone ở thanh trên cùng của Xcode ➔ bấm **Run (`Cmd + R`)**.
   - Lần đầu cài qua Apple ID miễn phí: vào **Cài đặt iOS ➔ Cài đặt chung ➔ Quản lý VPN & Thiết bị** ➔ chọn **Tin cậy (Trust)** chứng chỉ nhà phát triển của bạn.

---

## 4. Hướng dẫn Build Android APK (Tùy chọn kiểm tra trên Android)

Nếu muốn đóng gói Android Native (`AlarmManager` + `LocalNotificationRestoreReceiver`):
```bash
cd client
npm install
npm run cap:android
npx cap open android
```
Sau đó mở bằng **Android Studio**, chờ Gradle sync và bấm **Run** hoặc **Build APK(s)**.

---

## 5. Quy trình Kiểm thử 11 Tình huống Bắt buộc trên iPhone Thật

Thực hiện lần lượt 11 bước dưới đây trên iPhone vật lý sau khi build từ Xcode:

1. Mở app **Nihongo 問** ➔ vào **Cài đặt (`/settings`)** ➔ bấm **Bật quyền thông báo (Enable Notifications)** ➔ chọn **Cho phép (Allow)** trên hộp thoại iOS.
2. Tạo 1 lịch nhắc cách giờ hiện tại **5 phút** (hoặc thử cả chế độ **Lặp hàng tuần** & **Một lần**). Quan sát chỉ báo **`iOS UNUserNotificationCenter: X/62`** đã tăng lên.
3. **Thoát app** về Màn hình chính iPhone.
4. **Khóa màn hình** iPhone, chờ đủ 5 phút ➔ xác nhận màn hình khóa bật sáng và hiển thị thông báo **Nihongo 問** kèm âm thanh.
5. Mở lại app ➔ hẹn tiếp một lịch mới +5 phút ➔ mở **App Switcher và vuốt đóng hẳn Nihongo 問** ➔ chờ 5 phút ➔ xác nhận thông báo vẫn xuất hiện bình thường.
6. **Kiểm tra "Xóa khỏi Màn hình chính" (App Library):**
   - Hẹn tiếp một lịch +5 phút (hoặc dùng nút **📲 Test 5s**).
   - Bấm giữ biểu tượng **Nihongo 問** trên Màn hình chính ➔ chọn **Xóa ứng dụng (Remove App)** ➔ chọn **Xóa khỏi Màn hình chính (Remove from Home Screen)** *(TUYỆT ĐỐI KHÔNG chọn "Xóa ứng dụng / Delete App")*.
   - Vuốt sang trang cuối cùng của iPhone để xác nhận **Nihongo 問** vẫn nằm trong **Thư viện ứng dụng (App Library)**.
   - Khóa màn hình và chờ đúng giờ hẹn ➔ xác nhận **thông báo vẫn hiển thị đầy đủ**.
7. Mở app từ **App Library**, bấm **Sửa (Edit)** một lịch cũ ➔ đổi giờ hoặc nội dung ➔ xác nhận chỉ lịch được sửa thay đổi, các lịch khác vẫn còn nguyên và đổ chuông đúng giờ mới.
8. Bấm **Xóa (Delete)** một lịch ➔ kiểm tra khi qua giờ đó không còn thông báo của lịch đã xóa, trong khi các lịch còn lại vẫn hoạt động.
9. Hẹn một lịch tương lai (ví dụ sáng hôm sau hoặc +10 phút), **tắt nguồn & khởi động lại iPhone (Restart device)** mà không mở lại app ➔ xác nhận thông báo tương lai vẫn tự động kích hoạt nhờ `usernotificationd`.
10. Kiểm tra khi từ chối quyền thông báo (*iOS Settings ➔ Notifications ➔ Nihongo 問 ➔ tắt Allow Notifications*): vào `/settings` trong app phải hiển thị trạng thái **`Quyền thông báo đang bị chặn`** và không tự làm phiền người dùng bằng popup trái phép.
11. Kiểm tra mục **Study Streak**: việc chỉ nhận thông báo (hoặc bấm mở từ thông báo) **không** tự cộng ngày học vào Study Streak cho đến khi người dùng thực sự làm Quiz hoặc bấm *Hoàn thành bài học hôm nay*.
