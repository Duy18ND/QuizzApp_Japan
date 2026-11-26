import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, FileText, Type } from 'lucide-react';
import { VocabularyPdfWorkspace } from '../components/pdf/workspaces/VocabularyPdfWorkspace';
import { GrammarPdfWorkspace } from '../components/pdf/workspaces/GrammarPdfWorkspace';
import { KanjiPdfWorkspace } from '../components/pdf/workspaces/KanjiPdfWorkspace';
import { PageContainer, PageHeader, Tabs, type TabItem } from '../components/ui';

type PdfType = 'vocabulary' | 'grammar' | 'kanji';

const VALID_TABS: PdfType[] = ['vocabulary', 'grammar', 'kanji'];

const TAB_ITEMS: TabItem<PdfType>[] = [
  { value: 'vocabulary', label: 'Từ vựng', icon: <FileText className="size-4" aria-hidden /> },
  { value: 'grammar', label: 'Ngữ pháp', icon: <BookOpen className="size-4" aria-hidden /> },
  { value: 'kanji', label: 'Kanji', icon: <Type className="size-4" aria-hidden /> },
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
      <div className="print:hidden">
        <PageHeader
          title="Xuất tài liệu PDF"
        />

        <div className="mb-6 rounded-xl border border-line bg-glass px-3 py-1.5 shadow-card backdrop-blur-md">
          <Tabs
            aria-label="Loại tài liệu PDF"
            variant="pill"
            items={TAB_ITEMS}
            value={activeType}
            onChange={handleTabChange}
            className="gap-1.5"
          />
        </div>
      </div>

      <div className="flex-1">
        {activeType === 'vocabulary' && <VocabularyPdfWorkspace />}
        {activeType === 'grammar' && <GrammarPdfWorkspace />}
        {activeType === 'kanji' && <KanjiPdfWorkspace />}
      </div>
    </PageContainer>
  );
};
