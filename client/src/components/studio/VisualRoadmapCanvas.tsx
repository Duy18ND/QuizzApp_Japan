import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Crown,
  Gamepad2,
  GitBranch,
  Languages,
  Lock,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { Badge, Button, Card, Chip, Field, Input, Select } from '../ui';
import { cn } from '../../lib/cn';
import {
  autoArrangeSnakeLayout,
  isVisualNodeUnlocked,
  type CustomLesson,
  type VisualRoadmap,
  type VisualRoadmapNode,
  type VisualRoadmapNodeKind,
} from '../../services/customStudioService';

interface VisualRoadmapCanvasProps {
  roadmap: VisualRoadmap;
  customLessons: CustomLesson[];
  onChangeRoadmap: (next: VisualRoadmap) => void;
  onOpenCustomLesson: (lesson: CustomLesson, sourceNodeId?: string) => void;
}

const NODE_KIND_META: Record<
  VisualRoadmapNodeKind,
  { label: string; icon: React.ReactNode; badgeTone: 'primary' | 'sakura' | 'success' | 'warning' | 'neutral' }
> = {
  vocab: {
    label: 'Từ vựng',
    icon: <BookOpen className="size-4" aria-hidden />,
    badgeTone: 'primary',
  },
  grammar: {
    label: 'Ngữ pháp',
    icon: <Languages className="size-4" aria-hidden />,
    badgeTone: 'neutral',
  },
  kanji: {
    label: 'Chữ Hán',
    icon: <Sparkles className="size-4" aria-hidden />,
    badgeTone: 'warning',
  },
  minigame: {
    label: 'Mini-game',
    icon: <Gamepad2 className="size-4" aria-hidden />,
    badgeTone: 'sakura',
  },
  boss: {
    label: 'Thi Boss',
    icon: <Crown className="size-4" aria-hidden />,
    badgeTone: 'sakura',
  },
};

export const VisualRoadmapCanvas: React.FC<VisualRoadmapCanvasProps> = ({
  roadmap,
  customLessons,
  onChangeRoadmap,
  onOpenCustomLesson,
}) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const [mode, setMode] = useState<'edit' | 'play'>('edit');
  const [connectMode, setConnectMode] = useState(false);
  const [connectFromId, setConnectFromId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    roadmap.nodes[0]?.id ?? null,
  );

  const dragRef = useRef<{
    nodeId: string;
    pointerId: number;
    moved: boolean;
  } | null>(null);

  const selectedNode = useMemo(
    () => roadmap.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [roadmap.nodes, selectedNodeId],
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, VisualRoadmapNode>();
    for (const n of roadmap.nodes) map.set(n.id, n);
    return map;
  }, [roadmap.nodes]);

  const updateRoadmap = (patch: Partial<VisualRoadmap>) => {
    onChangeRoadmap({
      ...roadmap,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddNode = (kind: VisualRoadmapNodeKind = 'vocab') => {
    const idx = roadmap.nodes.length + 1;
    const xPct = 20 + ((idx - 1) % 3) * 30;
    const yPct = Math.min(84, 18 + Math.floor((idx - 1) / 3) * 22);
    const newNode: VisualRoadmapNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: `Màn ${idx}: ${NODE_KIND_META[kind].label}`,
      kind,
      xPct,
      yPct,
      targetPath:
        kind === 'minigame'
          ? '/games'
          : kind === 'grammar'
            ? '/grammar'
            : kind === 'kanji'
              ? '/kanji'
              : kind === 'boss'
                ? `/jlpt/full-test?level=${roadmap.level}`
                : `/vocabulary/${roadmap.level.toLowerCase()}`,
    };
    const prevNode = roadmap.nodes[roadmap.nodes.length - 1];
    const nextEdges = prevNode
      ? [
          ...roadmap.edges,
          { id: `edge-${prevNode.id}-${newNode.id}`, fromId: prevNode.id, toId: newNode.id },
        ]
      : roadmap.edges;

    updateRoadmap({
      nodes: [...roadmap.nodes, newNode],
      edges: nextEdges,
    });
    setSelectedNodeId(newNode.id);
    setMode('edit');
  };

  const handleAutoSnakeLayout = () => {
    updateRoadmap({
      nodes: autoArrangeSnakeLayout(roadmap.nodes),
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    const nextNodes = roadmap.nodes.filter((n) => n.id !== nodeId);
    const nextEdges = roadmap.edges.filter((e) => e.fromId !== nodeId && e.toId !== nodeId);
    const nextCompleted = roadmap.completedNodeIds.filter((id) => id !== nodeId);
    updateRoadmap({
      nodes: nextNodes,
      edges: nextEdges,
      completedNodeIds: nextCompleted,
    });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(nextNodes[0]?.id ?? null);
    }
  };

  const handleDeleteEdge = (edgeId: string) => {
    updateRoadmap({
      edges: roadmap.edges.filter((e) => e.id !== edgeId),
    });
  };

  const handleToggleNodeComplete = (nodeId: string) => {
    const exists = roadmap.completedNodeIds.includes(nodeId);
    updateRoadmap({
      completedNodeIds: exists
        ? roadmap.completedNodeIds.filter((id) => id !== nodeId)
        : [...roadmap.completedNodeIds, nodeId],
    });
  };

  const handleNodeClick = (node: VisualRoadmapNode) => {
    if (mode === 'edit') {
      if (connectMode) {
        if (!connectFromId) {
          setConnectFromId(node.id);
        } else if (connectFromId === node.id) {
          setConnectFromId(null);
        } else {
          const exists = roadmap.edges.some(
            (e) => e.fromId === connectFromId && e.toId === node.id,
          );
          if (!exists) {
            updateRoadmap({
              edges: [
                ...roadmap.edges,
                {
                  id: `edge-${connectFromId}-${node.id}-${roadmap.edges.length + 1}`,
                  fromId: connectFromId,
                  toId: node.id,
                },
              ],
            });
          }
          setConnectFromId(null);
        }
        return;
      }
      setSelectedNodeId(node.id);
      return;
    }

    // Play Mode: verify unlock state, then launch attached custom lesson or target route!
    const unlocked = isVisualNodeUnlocked(roadmap, node.id);
    if (!unlocked) return;

    if (node.customLessonId) {
      const lesson = customLessons.find((l) => l.id === node.customLessonId);
      if (lesson) {
        onOpenCustomLesson(lesson, node.id);
        return;
      }
    }
    if (node.targetPath) {
      navigate(node.targetPath);
    }
  };

  const handlePointerDownNode = (e: React.PointerEvent<HTMLDivElement>, node: VisualRoadmapNode) => {
    if (mode !== 'edit' || connectMode) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { nodeId: node.id, pointerId: e.pointerId, moved: false };
    setSelectedNodeId(node.id);
  };

  const handlePointerMoveNode = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const container = canvasRef.current;
    if (!drag || !container || mode !== 'edit') return;

    const rect = container.getBoundingClientRect();
    const xPct = Math.round(Math.min(84, Math.max(16, ((e.clientX - rect.left) / rect.width) * 100)));
    const yPct = Math.round(Math.min(86, Math.max(14, ((e.clientY - rect.top) / rect.height) * 100)));
    drag.moved = true;

    updateRoadmap({
      nodes: roadmap.nodes.map((n) =>
        n.id === drag.nodeId ? { ...n, xPct, yPct } : n,
      ),
    });
  };

  const handlePointerUpNode = () => {
    dragRef.current = null;
  };

  const updateSelectedNode = (patch: Partial<VisualRoadmapNode>) => {
    if (!selectedNode) return;
    updateRoadmap({
      nodes: roadmap.nodes.map((n) => (n.id === selectedNode.id ? { ...n, ...patch } : n)),
    });
  };

  return (
    <div className="space-y-3">
      {/* Canvas Toolbar */}
      <Card padding="sm" className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip
            selected={mode === 'edit'}
            onClick={() => {
              setMode('edit');
              setConnectFromId(null);
            }}
          >
            <Pencil className="size-3.5" aria-hidden />
            Vẽ &amp; Sửa Bản đồ
          </Chip>
          <Chip
            selected={mode === 'play'}
            onClick={() => {
              setMode('play');
              setConnectMode(false);
              setConnectFromId(null);
            }}
          >
            <Play className="size-3.5" aria-hidden />
            Chế độ Học ({roadmap.completedNodeIds.length}/{roadmap.nodes.length})
          </Chip>
        </div>

        {mode === 'edit' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Plus className="size-3.5" aria-hidden />}
              onClick={() => handleAddNode('vocab')}
            >
              Thêm Node
            </Button>
            <Chip
              selected={connectMode}
              onClick={() => {
                setConnectMode((c) => !c);
                setConnectFromId(null);
              }}
            >
              <GitBranch className="size-3.5" aria-hidden />
              {connectMode
                ? connectFromId
                  ? 'Chọn Node đích...'
                  : 'Nối dây: Chọn Node gốc'
                : 'Nối dây / Rẽ nhánh'}
            </Chip>
            <Button
              type="button"
              variant="soft"
              size="sm"
              leftIcon={<Wand2 className="size-3.5" aria-hidden />}
              onClick={handleAutoSnakeLayout}
            >
              Tự căn đường uốn lượn
            </Button>
          </div>
        )}
      </Card>

      {/* Interactive Drawing / Playing Canvas + Node Inspector */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <div
          ref={canvasRef}
          className="relative h-[430px] overflow-hidden rounded-2xl border-2 border-primary/35 bg-surface shadow-card select-none sm:h-[520px] lg:col-span-8"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, var(--line) 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
        >
          {/* SVG Curved Connecting Paths */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <defs>
              <marker
                id="roadmap-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--primary)" />
              </marker>
            </defs>
            {roadmap.edges.map((edge) => {
              const from = nodeMap.get(edge.fromId);
              const to = nodeMap.get(edge.toId);
              if (!from || !to) return null;
              const mx = (from.xPct + to.xPct) / 2;
              const my = (from.yPct + to.yPct) / 2;
              const isDone = roadmap.completedNodeIds.includes(from.id);
              const d = `M ${from.xPct} ${from.yPct} Q ${mx} ${from.yPct} ${mx} ${my} T ${to.xPct} ${to.yPct}`;
              return (
                <path
                  key={edge.id}
                  d={d}
                  fill="none"
                  stroke={isDone ? 'var(--success)' : 'var(--primary)'}
                  strokeWidth="0.85"
                  strokeDasharray={isDone ? undefined : '2 1.2'}
                  markerEnd="url(#roadmap-arrow)"
                />
              );
            })}
          </svg>

          {/* Clickable Edge Delete Pills in Edit Mode */}
          {mode === 'edit' &&
            roadmap.edges.map((edge) => {
              const from = nodeMap.get(edge.fromId);
              const to = nodeMap.get(edge.toId);
              if (!from || !to) return null;
              const mx = (from.xPct + to.xPct) / 2;
              const my = (from.yPct + to.yPct) / 2;
              return (
                <button
                  key={`del-${edge.id}`}
                  type="button"
                  title="Bấm để xóa dây nối này"
                  onClick={() => handleDeleteEdge(edge.id)}
                  style={{ left: `${mx}%`, top: `${my}%` }}
                  className="absolute z-10 grid size-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-line-strong bg-surface text-[10px] font-bold text-muted shadow-card transition-colors hover:border-danger hover:bg-danger-soft hover:text-danger-fg"
                >
                  ×
                </button>
              );
            })}

          {/* Draggable / Playable Nodes */}
          {roadmap.nodes.map((node) => {
            const meta = NODE_KIND_META[node.kind];
            const isSelected = selectedNodeId === node.id;
            const isConnectSource = connectFromId === node.id;
            const isDone = roadmap.completedNodeIds.includes(node.id);
            const unlocked = mode === 'edit' || isVisualNodeUnlocked(roadmap, node.id);
            const linkedLesson = node.customLessonId
              ? customLessons.find((l) => l.id === node.customLessonId)
              : null;

            return (
              <div
                key={node.id}
                onPointerDown={(e) => handlePointerDownNode(e, node)}
                onPointerMove={handlePointerMoveNode}
                onPointerUp={handlePointerUpNode}
                onClick={() => handleNodeClick(node)}
                style={{ left: `${node.xPct}%`, top: `${node.yPct}%` }}
                className={cn(
                  'absolute z-20 flex w-[104px] -translate-x-1/2 -translate-y-1/2 flex-col items-center rounded-2xl border-2 px-2 py-1.5 text-center shadow-card transition-colors sm:w-[144px] sm:px-2.5 sm:py-2 md:w-[152px]',
                  mode === 'edit' && !connectMode
                    ? 'cursor-grab touch-none active:cursor-grabbing'
                    : unlocked
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed opacity-60',
                  isConnectSource
                    ? 'border-sakura bg-sakura-soft ring-4 ring-sakura/30'
                    : isSelected && mode === 'edit'
                      ? 'border-primary bg-surface ring-4 ring-primary/25'
                      : isDone
                        ? 'border-success bg-success-soft/90'
                        : unlocked
                          ? 'border-line-strong bg-surface hover:border-primary'
                          : 'border-line bg-surface-2/80',
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'grid size-7 place-items-center rounded-lg',
                      isDone
                        ? 'bg-success text-on-primary'
                        : unlocked
                          ? 'bg-primary-soft text-primary-fg'
                          : 'bg-surface-3 text-muted',
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="size-4" aria-hidden />
                    ) : !unlocked ? (
                      <Lock className="size-3.5" aria-hidden />
                    ) : (
                      meta.icon
                    )}
                  </span>
                  <Badge tone={isDone ? 'success' : meta.badgeTone} className="text-[10px]">
                    {meta.label}
                  </Badge>
                </div>

                <p className="mt-1 line-clamp-2 text-xs font-bold text-fg leading-tight">
                  {node.title}
                </p>

                {linkedLesson && (
                  <span className="mt-0.5 max-w-full truncate text-[10px] font-medium text-primary-fg">
                    ★ {linkedLesson.title}
                  </span>
                )}
              </div>
            );
          })}

          {/* Canvas Bottom Helper Pill */}
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 flex justify-center">
            <span className="rounded-full border border-line bg-surface/90 px-3 py-1 text-[11px] font-medium text-muted backdrop-blur-sm">
              {mode === 'edit'
                ? connectMode
                  ? 'Bấm Node gốc → bấm Node đích để tạo mũi tên mở khóa'
                  : 'Kéo-thả từng ô để vẽ đường đi · Bấm vào ô để gắn bài tự tạo ở khung bên cạnh'
                : 'Bấm vào Màn đang mở để vào học ngay · Hoàn thành Màn trước sẽ tự mở khóa Màn nối tiếp'}
            </span>
          </div>
        </div>

        {/* Node Inspector Panel */}
        <Card padding="md" className="space-y-3 lg:col-span-4">
          {selectedNode ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-line pb-2">
                <h3 className="text-sm font-bold text-fg">
                  {mode === 'edit' ? 'Tùy chỉnh Node đang chọn' : 'Thông tin Màn học'}
                </h3>
                {mode === 'edit' && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    leftIcon={<Trash2 className="size-3.5" aria-hidden />}
                  >
                    Xóa
                  </Button>
                )}
              </div>

              <Field label="Tên Màn / Node" htmlFor="node-title">
                <Input
                  id="node-title"
                  value={selectedNode.title}
                  disabled={mode !== 'edit'}
                  onChange={(e) => updateSelectedNode({ title: e.target.value })}
                />
              </Field>

              <Field label="Loại điểm (Icon)" htmlFor="node-kind">
                <Select
                  id="node-kind"
                  value={selectedNode.kind}
                  disabled={mode !== 'edit'}
                  onChange={(e) =>
                    updateSelectedNode({ kind: e.target.value as VisualRoadmapNodeKind })
                  }
                >
                  <option value="vocab">📖 Từ vựng</option>
                  <option value="grammar">🧩 Ngữ pháp</option>
                  <option value="kanji">漢 Chữ Hán (Kanji)</option>
                  <option value="minigame">⚔️ Mini-game phản xạ</option>
                  <option value="boss">👑 Thi Boss / Tổng ôn</option>
                </Select>
              </Field>

              <Field
                label="Gắn Bài tự tạo của bạn"
                htmlFor="node-custom-lesson"
                hint="Gắn bài từ Kho Bài Tự Tạo để bấm vào Node là mở Flashcard / Quiz / Mini-game ngay."
              >
                <Select
                  id="node-custom-lesson"
                  value={selectedNode.customLessonId ?? ''}
                  disabled={mode !== 'edit'}
                  onChange={(e) =>
                    updateSelectedNode({
                      customLessonId: e.target.value || undefined,
                    })
                  }
                >
                  <option value="">— Dùng trang có sẵn của hệ thống —</option>
                  {customLessons.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      [{lesson.kind === 'vocab' ? 'Từ vựng' : lesson.kind === 'grammar' ? 'Ngữ pháp' : 'Kanji'}]{' '}
                      {lesson.title}
                    </option>
                  ))}
                </Select>
              </Field>

              {!selectedNode.customLessonId && (
                <Field label="Hoặc gắn trang học có sẵn" htmlFor="node-system-path">
                  <Select
                    id="node-system-path"
                    value={selectedNode.targetPath ?? '/games'}
                    disabled={mode !== 'edit'}
                    onChange={(e) => updateSelectedNode({ targetPath: e.target.value })}
                  >
                    <option value={`/vocabulary/${roadmap.level.toLowerCase()}`}>
                      Kho Từ vựng {roadmap.level}
                    </option>
                    <option value="/grammar">Kho Ngữ pháp</option>
                    <option value="/kanji">Kho Chữ Hán (Kanji)</option>
                    <option value="/games">Phòng 6 Mini-game (Dojo)</option>
                    <option value={`/jlpt/full-test?level=${roadmap.level}`}>
                      Thi thử JLPT {roadmap.level}
                    </option>
                  </Select>
                </Field>
              )}

              <div className="flex flex-col gap-2 border-t border-line pt-2.5">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  fullWidth
                  leftIcon={<Play className="size-4" aria-hidden />}
                  onClick={() => {
                    if (selectedNode.customLessonId) {
                      const found = customLessons.find(
                        (l) => l.id === selectedNode.customLessonId,
                      );
                      if (found) {
                        onOpenCustomLesson(found, selectedNode.id);
                        return;
                      }
                    }
                    if (selectedNode.targetPath) {
                      navigate(selectedNode.targetPath);
                    }
                  }}
                >
                  Vào học Node này ngay
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth
                  leftIcon={<CheckCircle2 className="size-4" aria-hidden />}
                  onClick={() => handleToggleNodeComplete(selectedNode.id)}
                >
                  {roadmap.completedNodeIds.includes(selectedNode.id)
                    ? 'Bỏ đánh dấu hoàn thành'
                    : 'Đánh dấu hoàn thành Node'}
                </Button>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-xs text-muted">
              Bấm vào một Node trên bản đồ (hoặc bấm “Thêm Node”) để tùy chỉnh tên, loại bài và gắn bài tự tạo.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};
