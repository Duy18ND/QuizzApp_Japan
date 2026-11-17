import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, FileText, Hammer, Layers, Type } from 'lucide-react';
import { VocabularyPdfWorkspace } from '../components/pdf/workspaces/VocabularyPdfWorkspace';
import { GrammarPdfWorkspace } from '../components/pdf/workspaces/GrammarPdfWorkspace';
import { KanjiPdfWorkspace } from '../components/pdf/workspaces/KanjiPdfWorkspace';
import { Card, EmptyState, PageContainer, PageHeader, Tabs, type TabItem } from '../components/ui';

type PdfType = 'vocabulary' | 'grammar' | 'kanji' | 'flashcard';

const VALID_TABS: PdfType[] = ['vocabulary', 'grammar', 'kanji', 'flashcard'];

const TAB_ITEMS: TabItem<PdfType>[] = [
  { value: 'vocabulary', label: 'Từ vựng', icon: <FileText className="size-4" aria-hidden /> },
  { value: 'grammar', label: 'Ngữ pháp', icon: <BookOpen className="size-4" aria-hidden /> },
  { value: 'kanji', label: 'Kanji', icon: <Type className="size-4" aria-hidden /> },
  { value: 'flashcard', label: 'Flashcard', icon: <Layers className="size-4" aria-hidden /> },
];

export const PdfPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const paramTab = searchParams.get('tab') as PdfType | null;
  const activeType: PdfType = paramTab && VALID_TABS.includes(paramTab) ? paramTab : 'vocabulary';

  const handleTabChange = (nextTab: PdfType) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', nextTab);
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <PageContainer className="flex flex-1 flex-col">
      <PageHeader
        title="Xuất tài liệu PDF"
        description="Tạo tài liệu luyện tập chuẩn A4 để in và học trên giấy."
      />

      <Tabs
        aria-label="Loại tài liệu PDF"
        items={TAB_ITEMS}
        value={activeType}
        onChange={handleTabChange}
        className="mb-6"
      />

      <div className="flex-1">
        {activeType === 'vocabulary' && <VocabularyPdfWorkspace />}
        {activeType === 'grammar' && <GrammarPdfWorkspace />}
        {activeType === 'kanji' && <KanjiPdfWorkspace />}
        {activeType === 'flashcard' && (
          <Card padding="lg">
            <EmptyState
              icon={<Hammer className="size-6" aria-hidden />}
              title="Đang phát triển"
              description="Tính năng xuất PDF cho Flashcard hiện đang được xây dựng và sẽ sớm ra mắt trong phiên bản tới."
            />
          </Card>
        )}
      </div>
    </PageContainer>
  );
};
