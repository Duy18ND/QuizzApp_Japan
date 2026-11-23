import React, { useState } from 'react';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { Checkbox } from '../ui';
import { cn } from '../../lib/cn';

export interface ColumnOption {
  id: string;
  label: string;
  showContent: boolean;
}

interface Props {
  columns: ColumnOption[];
  onColumnsChange: (newCols: ColumnOption[]) => void;
}

export const DraggableColumnList: React.FC<Props> = ({ columns, onColumnsChange }) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= columns.length ||
      toIndex >= columns.length
    ) {
      return;
    }
    const nextCols = [...columns];
    const [moved] = nextCols.splice(fromIndex, 1);
    nextCols.splice(toIndex, 0, moved);
    onColumnsChange(nextCols);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Fixed STT Column */}
      <div className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-line bg-surface-2 px-3.5 py-3 opacity-75">
        <GripVertical className="size-4 text-subtle" aria-hidden />
        <span className="text-sm font-medium text-muted">STT (Cố định)</span>
      </div>

      {/* Native HTML5 Drag-and-Drop + Arrow Buttons (zero position-fixed offset inside glass cards) */}
      <div className="flex flex-col gap-2">
        {columns.map((col, index) => {
          const isBeingDragged = draggedIndex === index;
          const isDropTarget = dragOverIndex === index && draggedIndex !== null && draggedIndex !== index;

          return (
            <div
              key={col.id}
              draggable
              onDragStart={(e) => {
                setDraggedIndex(index);
                e.dataTransfer.effectAllowed = 'move';
                try {
                  e.dataTransfer.setData('text/plain', col.id);
                } catch {
                  // Ignore browsers that disallow setData
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragOverIndex !== index) {
                  setDragOverIndex(index);
                }
              }}
              onDragLeave={() => {
                if (dragOverIndex === index) {
                  setDragOverIndex(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedIndex !== null && draggedIndex !== index) {
                  moveItem(draggedIndex, index);
                }
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              onDragEnd={() => {
                setDraggedIndex(null);
                setDragOverIndex(null);
              }}
              className={cn(
                'flex flex-wrap items-center justify-between gap-2.5 rounded-lg border px-3 py-2.5 transition-all duration-150 select-none',
                isBeingDragged
                  ? 'border-primary bg-primary-soft/45 opacity-60'
                  : isDropTarget
                    ? 'border-primary bg-primary-soft/25 ring-2 ring-primary/30'
                    : 'border-line bg-surface hover:border-line-strong',
              )}
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-label={`Kéo để sắp xếp cột ${col.label}`}
                  title="Kéo thả hoặc dùng nút lên/xuống để đổi vị trí cột"
                  className="cursor-grab rounded p-0.5 text-subtle hover:text-fg active:cursor-grabbing"
                >
                  <GripVertical className="size-4" aria-hidden />
                </span>
                <span className="text-sm font-medium text-fg">{col.label}</span>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox
                  label="Hiển thị nội dung"
                  checked={col.showContent}
                  onChange={(checked) => {
                    const newCols = [...columns];
                    newCols[index] = { ...col, showContent: checked };
                    onColumnsChange(newCols);
                  }}
                />
                <div className="flex items-center gap-1 border-l border-line pl-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Đưa cột ${col.label} lên trên`}
                    title="Đưa lên trên"
                    onClick={() => moveItem(index, index - 1)}
                    className="grid size-7 cursor-pointer place-items-center rounded-md border border-line bg-surface-2 text-muted transition-colors hover:border-primary hover:text-primary-fg disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowUp className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={index === columns.length - 1}
                    aria-label={`Đưa cột ${col.label} xuống dưới`}
                    title="Đưa xuống dưới"
                    onClick={() => moveItem(index, index + 1)}
                    className="grid size-7 cursor-pointer place-items-center rounded-md border border-line bg-surface-2 text-muted transition-colors hover:border-primary hover:text-primary-fg disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowDown className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
