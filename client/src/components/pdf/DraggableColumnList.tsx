import React from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';
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
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    if (sourceIndex === destinationIndex) return;

    const newCols = Array.from(columns);
    const [removed] = newCols.splice(sourceIndex, 1);
    newCols.splice(destinationIndex, 0, removed);

    onColumnsChange(newCols);
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Fixed STT Column */}
      <div className="flex cursor-not-allowed items-center gap-3 rounded-lg border border-line bg-surface-2 px-3.5 py-3 opacity-75">
        <GripVertical className="size-4 text-subtle" aria-hidden />
        <span className="text-sm font-medium text-muted">STT (Cố định)</span>
      </div>

      {/* Draggable Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="pdf-columns" direction="vertical">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="flex flex-col gap-2"
            >
              {columns.map((col, index) => (
                <Draggable key={col.id} draggableId={col.id} index={index}>
                  {(dragProvided, snapshot) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3.5 py-3 transition-colors',
                        snapshot.isDragging
                          ? 'border-primary bg-surface-2 shadow-pop'
                          : 'border-line bg-surface hover:border-line-strong',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          {...dragProvided.dragHandleProps}
                          aria-label={`Kéo để sắp xếp cột ${col.label}`}
                          className="cursor-grab rounded p-0.5 text-subtle hover:text-fg active:cursor-grabbing"
                        >
                          <GripVertical className="size-4" aria-hidden />
                        </span>
                        <span className="text-sm font-medium text-fg">{col.label}</span>
                      </div>

                      <Checkbox
                        label="Hiển thị nội dung"
                        checked={col.showContent}
                        onChange={(checked) => {
                          const newCols = [...columns];
                          newCols[index] = { ...col, showContent: checked };
                          onColumnsChange(newCols);
                        }}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};
