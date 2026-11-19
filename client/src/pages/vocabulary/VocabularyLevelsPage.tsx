import React from 'react';
import { ArrowRight } from 'lucide-react';
import { getVocabTextbooksForLevel } from '../../data/vocabTextbooks';
import type { JLPTLevel } from '../../types/quiz';
import { CardLink, PageContainer, PageHeader } from '../../components/ui';

const LEVELS: { id: JLPTLevel; title: string; desc: string }[] = [
  { id: 'N5', title: 'Trình độ N5', desc: 'Nhập môn tiếng Nhật · Minna, Shin Kanzen, Mimi...' },
  { id: 'N4', title: 'Trình độ N4', desc: 'Sơ cấp tiếng Nhật · Minna II, Shin Kanzen, Mimi...' },
  { id: 'N3', title: 'Trình độ N3', desc: 'Trung cấp · Mimi kara Oboeru, Shin Kanzen, Minna...' },
  { id: 'N2', title: 'Trình độ N2', desc: 'Thượng cấp · Shin Kanzen, Mimi, Sou Matome...' },
  { id: 'N1', title: 'Trình độ N1', desc: 'Cao cấp · Shin Kanzen, Mimi, Sou Matome...' },
];

interface Props {
  basePath?: string;
  title?: string;
  hideTabs?: boolean;
}

export const VocabularyLevelsPage: React.FC<Props> = ({
  basePath = '/vocabulary',
  title = 'Từ vựng',
  hideTabs = false,
}) => {
  return (
    <PageContainer size="md" className="space-y-6">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: hideTabs ? title : 'Từ vựng' },
        ]}
        title={hideTabs ? `Chọn trình độ (${title})` : 'Chọn trình độ (JLPT)'}
        description={
          hideTabs
            ? 'Chọn trình độ bạn muốn học để xem danh sách bài học tương ứng.'
            : 'Chọn trình độ JLPT để xem danh sách giáo trình (Minna, Shin Kanzen, Mimi...) và công cụ luyện tập.'
        }
      />

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((level) => {
          const bookCount = getVocabTextbooksForLevel(level.id).length;

          return (
            <li key={level.id}>
              <CardLink
                to={`${basePath}/${level.id.toLowerCase()}`}
                padding="sm"
                className="group flex h-full items-center gap-3 p-3.5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-base font-bold text-primary-fg">
                  {level.id}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-fg md:text-base">
                    {level.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {hideTabs ? `${level.desc.split(' · ')[0]}` : `${bookCount} giáo trình · ${level.desc.split(' · ')[1] || level.desc}`}
                  </span>
                </span>
                <ArrowRight
                  className="size-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary-fg"
                  aria-hidden
                />
              </CardLink>
            </li>
          );
        })}
      </ul>
    </PageContainer>
  );
};
