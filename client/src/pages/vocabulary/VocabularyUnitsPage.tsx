import React from 'react';
import { useParams } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import { UNIT_DATA } from '../../data/unitData';
import type { JLPTLevel } from '../../types/quiz';
import { Badge, CardLink, EmptyState, PageContainer, PageHeader } from '../../components/ui';

interface Props {
  basePath?: string;
  title?: string;
  hideTabs?: boolean;
}

export const VocabularyUnitsPage: React.FC<Props> = ({
  basePath = '/vocabulary',
  title = 'Từ vựng',
}) => {
  const { level } = useParams<{ level: string }>();
  const levelKey = (level?.toUpperCase() || 'N3') as JLPTLevel;
  const units = UNIT_DATA[levelKey] || [];
  const levelSegment = level || levelKey.toLowerCase();

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: title, to: basePath },
          { label: `Trình độ ${levelKey}` },
        ]}
        title={`Chọn bài học (${levelKey})`}
        description={`Danh sách các Unit thuộc trình độ ${levelKey}.`}
      />

      {units.length === 0 ? (
        <EmptyState
          title="Chưa có bài học"
          description={`Đang cập nhật dữ liệu cho trình độ ${levelKey}.`}
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {units.map((unit) => (
            <li key={unit.id}>
              <CardLink
                to={`${basePath}/${levelSegment}/${unit.id}`}
                className="group flex items-center justify-between gap-4"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-fg">
                    <BookOpen className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-fg">{unit.name}</p>
                    <div className="mt-1">
                      <Badge tone="neutral" className="tabular">
                        {unit.totalWords} từ vựng
                      </Badge>
                    </div>
                  </div>
                </div>
                <ChevronRight
                  className="size-4 shrink-0 text-subtle transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-primary-fg"
                  aria-hidden
                />
              </CardLink>
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
};
