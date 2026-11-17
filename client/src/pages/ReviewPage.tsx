import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, PageContainer, PageHeader, buttonStyles } from '../components/ui';

export const ReviewPage: React.FC = () => {
  return (
    <PageContainer size="md">
      <PageHeader title="Ôn tập từ vựng" />
      <EmptyState
        title="Tính năng đang được hoàn thiện"
        description="This is the placeholder for ReviewPage."
        action={
          <Link to="/vocabulary" className={buttonStyles({ variant: 'secondary' })}>
            Quay lại Từ vựng
          </Link>
        }
      />
    </PageContainer>
  );
};
