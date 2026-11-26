import { useLocation, useNavigate } from 'react-router-dom';
import { PageContainer } from '../components/ui';
import { QuizHistoryCard } from '../components/ui/QuizHistoryCard';

export function ProfilePage() {
  const navigate = useNavigate();
  const { key } = useLocation();

  return (
    <PageContainer size="md" className="py-2">
      {/* opened directly (no previous page in the app) → close goes home */}
      <QuizHistoryCard onClose={() => (key === 'default' ? navigate('/') : navigate(-1))} />
    </PageContainer>
  );
}
