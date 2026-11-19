import { PageContainer, PageHeader } from '../components/ui';
import { QuizHistoryCard } from '../components/ui/QuizHistoryCard';
import { MAX_HISTORY_ITEMS } from '../services/quizHistoryService';

export function ProfilePage() {
  return (
    <PageContainer size="md" className="py-2">
      <PageHeader
        breadcrumbs={[{ label: 'Trang chủ', to: '/' }, { label: 'Lịch sử làm bài' }]}
        title="Lịch sử làm bài"
        description={`Xem lại chi tiết tối đa ${MAX_HISTORY_ITEMS} lượt hoàn thành gần nhất của bạn.`}
      />

      <QuizHistoryCard />
    </PageContainer>
  );
}
