const fs = require('fs');

let vocab = fs.readFileSync('src/pages/VocabularyPage.tsx', 'utf8');
vocab = vocab.replace(/import \{ Link, useNavigate \} from 'react-router-dom';/, "import { useNavigate } from 'react-router-dom';");
fs.writeFileSync('src/pages/VocabularyPage.tsx', vocab);

let list = fs.readFileSync('src/components/pdf/DraggableColumnList.tsx', 'utf8');
list = list.replace(/import \{ DragDropContext, Droppable, Draggable, DropResult \} from '@hello-pangea\/dnd';/, "import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';\nimport type { DropResult } from '@hello-pangea/dnd';");
fs.writeFileSync('src/components/pdf/DraggableColumnList.tsx', list);

let exportTs = fs.readFileSync('src/utils/pdfExport.ts', 'utf8');
exportTs = exportTs.replace(/import \{ ColumnOption \} from '..\/components\/pdf\/DraggableColumnList';/, "import type { ColumnOption } from '../components/pdf/DraggableColumnList';");
fs.writeFileSync('src/utils/pdfExport.ts', exportTs);
