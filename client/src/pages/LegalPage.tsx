import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ShieldCheck } from 'lucide-react';
import { Badge, Card, PageContainer, PageHeader } from '../components/ui';
import { buttonStyles } from '../components/ui/styles';

interface LegalPageProps {
  doc: 'privacy' | 'terms';
}

export const LegalPage: React.FC<LegalPageProps> = ({ doc }) => {
  const isPrivacy = doc === 'privacy';

  return (
    <PageContainer size="md" className="space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: isPrivacy ? 'Chính sách bảo mật' : 'Điều khoản sử dụng' },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>{isPrivacy ? 'Chính sách bảo mật' : 'Điều khoản sử dụng'}</span>
            <Badge tone="primary">Nihongo 問</Badge>
          </span>
        }
        description="Cập nhật gần nhất: 2026 · Áp dụng cho toàn bộ ứng dụng học tiếng Nhật Nihongo 問 (Web & PWA)."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/privacy"
              className={buttonStyles({
                variant: isPrivacy ? 'primary' : 'secondary',
                size: 'sm',
              })}
            >
              <ShieldCheck className="size-4" aria-hidden />
              Bảo mật
            </Link>
            <Link
              to="/terms"
              className={buttonStyles({
                variant: !isPrivacy ? 'primary' : 'secondary',
                size: 'sm',
              })}
            >
              <FileText className="size-4" aria-hidden />
              Điều khoản
            </Link>
          </div>
        }
      />

      {isPrivacy ? (
        <Card padding="lg" className="space-y-5 text-sm leading-relaxed text-fg">
          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-fg">1. Dữ liệu chúng tôi thu thập</h2>
            <p className="text-muted">
              Khi bạn đăng ký hoặc đăng nhập bằng Email/Google, Nihongo 問 chỉ lưu các thông tin cần thiết để cá nhân hóa việc học:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>Thông tin tài khoản cơ bản: địa chỉ email, tên hiển thị và mã định danh tài khoản.</li>
              <li>Tiến độ học tập: từ vựng đánh dấu sao, câu làm sai, tiến độ Kanji/Ngữ pháp, lịch sử làm bài Quiz/JLPT, chuỗi ngày học và thời gian học hằng ngày.</li>
              <li>Tùy chọn cá nhân: trình độ JLPT mục tiêu, giáo trình đang học, giao diện Sáng/Tối và lịch nhắc học.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-fg">2. Mục đích sử dụng &amp; Bảo vệ dữ liệu</h2>
            <p className="text-muted">
              Dữ liệu học tập được đồng bộ bảo mật qua hạ tầng Supabase với phân quyền theo từng tài khoản (Row Level Security — chỉ tài khoản của bạn mới có quyền đọc/ghi tiến độ của chính mình). Chúng tôi <strong className="text-fg">không bán, không cho thuê và không chia sẻ dữ liệu cá nhân</strong> của bạn cho bên thứ ba vì mục đích quảng cáo.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-fg">3. Quyền kiểm soát dữ liệu của người dùng</h2>
            <p className="text-muted">
              Bạn có toàn quyền xuất bản sao lưu JSON, đặt lại tiến độ học tập ngay trong trang{' '}
              <Link to="/settings" className="font-medium text-primary-fg underline underline-offset-2">
                Cài đặt
              </Link>
              , hoặc gửi yêu cầu xóa vĩnh viễn tài khoản qua email <strong className="text-fg">support@nihongo-dojo.vn</strong>.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-fg">4. Lưu trữ cục bộ (Local Storage &amp; PWA)</h2>
            <p className="text-muted">
              Ứng dụng sử dụng bộ nhớ trình duyệt để duy trì phiên đăng nhập, ghi nhớ âm thanh Mini-game, chủ đề giao diện và sao lưu nhanh thời gian học mỗi giây tránh thất thoát khi mất kết nối mạng.
            </p>
          </section>
        </Card>
      ) : (
        <Card padding="lg" className="space-y-5 text-sm leading-relaxed text-fg">
          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-fg">1. Phạm vi dịch vụ</h2>
            <p className="text-muted">
              Nihongo 問 là nền tảng tự học tiếng Nhật trực tuyến hỗ trợ luyện Từ vựng, Kanji, Ngữ pháp, Luyện đề JLPT, Bản đồ Màn học theo ngày và các Mini-game phản xạ.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-fg">2. Tài khoản &amp; Sử dụng hợp lệ</h2>
            <ul className="list-disc space-y-1 pl-5 text-muted">
              <li>Bạn chịu trách nhiệm bảo mật thông tin đăng nhập tài khoản của mình.</li>
              <li>Không sử dụng công cụ tự động tấn công, sao chép hàng loạt cơ sở dữ liệu hoặc gây gián đoạn hệ thống.</li>
              <li>Nội dung lộ trình chia sẻ (mã NIHON-...) không được chứa ngôn từ vi phạm pháp luật hoặc nội dung phản cảm.</li>
            </ul>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-fg">3. Gói Miễn phí &amp; Gói PRO (Sắp ra mắt)</h2>
            <p className="text-muted">
              Trong giai đoạn Beta hiện tại, người dùng được trải nghiệm miễn phí trọn bộ giáo trình JLPT N5 (Minna no Nihongo I), 6 Mini-game và tạo lộ trình cá nhân. Khi chính thức ra mắt gói PRO Creator có thu phí, biểu phí, quyền lợi và chính sách hoàn tiền minh bạch sẽ được thông báo rõ trước khi người dùng xác nhận thanh toán.
            </p>
          </section>

          <section className="space-y-1.5">
            <h2 className="text-base font-semibold text-fg">4. Liên hệ &amp; Hỗ trợ</h2>
            <p className="text-muted">
              Mọi thắc mắc, báo lỗi nội dung tiếng Nhật hoặc yêu cầu hỗ trợ tài khoản xin liên hệ:{' '}
              <strong className="text-fg">support@nihongo-dojo.vn</strong>.
            </p>
          </section>
        </Card>
      )}
    </PageContainer>
  );
};
