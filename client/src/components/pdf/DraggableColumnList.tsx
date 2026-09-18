import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { GripVertical } from 'lucide-react';

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
      <div className="flex items-center gap-3 p-3 bg-gray-900/50 border border-gray-800 rounded-lg opacity-80 cursor-not-allowed">
        <div className="text-gray-600">
          <GripVertical className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-400">
          STT (Cố định)
        </span>
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
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center justify-between p-3 bg-gray-900 border rounded-lg transition-colors ${
                        snapshot.isDragging ? 'border-blue-500 shadow-lg' : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          {...provided.dragHandleProps}
                          className="text-gray-400 hover:text-white focus:outline-none cursor-grab active:cursor-grabbing"
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-gray-200">
                          {col.label}
                        </span>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer" title="Hiển thị nội dung trong PDF">
                        <span className="text-xs text-gray-400 select-none">Hiển thị nội dung</span>
                        <input 
                          type="checkbox"
                          checked={col.showContent}
                          onChange={(e) => {
                            const newCols = [...columns];
                            newCols[index] = { ...col, showContent: e.target.checked };
                            onColumnsChange(newCols);
                          }}
                          className="w-4 h-4 text-blue-600 bg-gray-900 border-gray-600 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                        />
                      </label>
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
