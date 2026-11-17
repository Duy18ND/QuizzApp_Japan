import React from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, PageContainer, PageHeader, buttonStyles } from '../components/ui';

export const SettingsPage: React.FC = () => {
  return (
    <PageContainer size="md">
      <PageHeader title="Cài đặt" />
      <EmptyState
        title="Trang cài đặt"
        description="This is the placeholder for SettingsPage."
        action={
          <Link to="/" className={buttonStyles({ variant: 'secondary' })}>
            Về trang chủ
          </Link>
        }
      />
    </PageContainer>
  );
};
