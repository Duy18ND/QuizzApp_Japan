import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, PageContainer, PageHeader, buttonStyles } from '../components/ui';

export const UnmasteredPage: React.FC = () => {
  return (
    <PageContainer size="md">
      <PageHeader title="Từ chưa thuộc" />
      <EmptyState
        title="Tính năng đang được hoàn thiện"
        description="This is the placeholder for UnmasteredPage."
        action={
          <Link to="/vocabulary" className={buttonStyles({ variant: 'secondary' })}>
            Quay lại Từ vựng
          </Link>
        }
      />
    </PageContainer>
  );
};
