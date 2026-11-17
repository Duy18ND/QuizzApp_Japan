import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { JLPTLevel } from '../../types/quiz';
import { CardLink, PageContainer, PageHeader } from '../../components/ui';

const LEVELS: { id: JLPTLevel; title: string; desc: string }[] = [
  { id: 'N5', title: 'Trình độ N5', desc: 'Nhập môn tiếng Nhật' },
  { id: 'N4', title: 'Trình độ N4', desc: 'Sơ cấp tiếng Nhật' },
  { id: 'N3', title: 'Trình độ N3', desc: 'Trung cấp tiếng Nhật (Mimi kara Oboeru)' },
  { id: 'N2', title: 'Trình độ N2', desc: 'Thượng cấp tiếng Nhật' },
  { id: 'N1', title: 'Trình độ N1', desc: 'Cao cấp tiếng Nhật' },
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
    <PageContainer size="md">
      <PageHeader
        title={hideTabs ? `Chọn trình độ (${title})` : 'Chọn trình độ (JLPT)'}
        description="Chọn trình độ bạn muốn học để xem danh sách bài học tương ứng."
      />

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((level) => (
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
                <span className="block text-sm font-semibold text-fg md:text-base">{level.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{level.desc}</span>
              </span>
              <ArrowRight
                className="size-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary-fg"
                aria-hidden
              />
            </CardLink>
          </li>
        ))}
      </ul>
    </PageContainer>
  );
};
