import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Gamepad2,
  Languages,
  Map as MapIcon,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { CustomLessonPlayerModal } from '../components/studio/CustomLessonPlayerModal';
import { VisualRoadmapCanvas } from '../components/studio/VisualRoadmapCanvas';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  Modal,
  Notice,
  PageContainer,
  PageHeader,
  Select,
  Tabs,
  Textarea,
  useToast,
} from '../components/ui';
import { buttonStyles } from '../components/ui/styles';
import { useAuth } from '../context/auth-context';
import {
  createFiveSkillPresetVisualRoadmap,
  createStarterVisualRoadmap,
  CUSTOM_STUDIO_SYNC_EVENT,
  loadCustomStudioState,
  parseBulkVocabText,
  saveCustomStudioState,
  type CustomGrammarEntry,
  type CustomKanjiEntry,
  type CustomLesson,
  type CustomLessonKind,
  type CustomQuizEntry,
  type CustomStudioState,
  type CustomVocabEntry,
  type VisualRoadmap,
} from '../services/customStudioService';
import type { JLPTLevel } from '../types/quiz';

const LEVELS: JLPTLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];

export const CustomStudioPage: React.FC = () => {
  const { user, studyLevel } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') === 'canvas' ? 'canvas' : 'lessons';
  const [studio, setStudio] = useState<CustomStudioState>(() => loadCustomStudioState(user?.id));
  const [selectedRoadmapId, setActiveRoadmapId] = useState<string | null>(
    () => searchParams.get('map') || loadCustomStudioState(user?.id).visualRoadmaps[0]?.id || null,
  );
  const mapParam = searchParams.get('map');
  const activeRoadmapId =
    mapParam && studio.visualRoadmaps.some((m) => m.id === mapParam)
      ? mapParam
      : selectedRoadmapId;

  // Lesson Editor Modal State (Phase 1 — Mini-CMS like Admin!)
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonKind, setLessonKind] = useState<CustomLessonKind>('vocab');
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonLevel, setLessonLevel] = useState<JLPTLevel>(studyLevel ?? 'N5');
  const [lessonDescription, setLessonDescription] = useState('');
  const [vocabDraft, setVocabDraft] = useState<CustomVocabEntry[]>([]);
  const [grammarDraft, setGrammarDraft] = useState<CustomGrammarEntry[]>([]);
  const [kanjiDraft, setKanjiDraft] = useState<CustomKanjiEntry[]>([]);
  const [quizDraft, setQuizDraft] = useState<CustomQuizEntry[]>([]);
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [showBulkPaste, setShowBulkPaste] = useState(false);

  // New Visual Roadmap Modal
  const [newMapModalOpen, setNewMapModalOpen] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newMapLevel, setNewMapLevel] = useState<JLPTLevel>(studyLevel ?? 'N5');
  const [newMapTemplate, setNewMapTemplate] = useState<'five-skill' | 'starter'>('five-skill');

  // Instant Lesson Player Modal (auto-opens when ?lesson=<id> deep link is present)
  const [playingLesson, setPlayingLesson] = useState<{
    lesson: CustomLesson;
    sourceNodeId?: string;
  } | null>(() => {
    const lessonParam = searchParams.get('lesson');
    if (!lessonParam) return null;
    const found = loadCustomStudioState(user?.id).lessons.find((l) => l.id === lessonParam);
    return found ? { lesson: found } : null;
  });

  useEffect(() => {
    const sync = () => setStudio(loadCustomStudioState(user?.id));
    window.addEventListener(CUSTOM_STUDIO_SYNC_EVENT, sync);
    return () => window.removeEventListener(CUSTOM_STUDIO_SYNC_EVENT, sync);
  }, [user?.id]);

  const commitStudio = (next: CustomStudioState) => {
    const saved = saveCustomStudioState(next, user?.id);
    setStudio(saved);
  };

  const setTab = (tab: 'lessons' | 'canvas') => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const openNewLessonModal = (kind: CustomLessonKind) => {
    setEditingLessonId(null);
    setLessonKind(kind);
    setLessonTitle('');
    setLessonLevel(studyLevel ?? 'N5');
    setLessonDescription('');
    setBulkPasteText('');
    setShowBulkPaste(false);
    setVocabDraft(
      kind === 'vocab'
        ? [{ id: `v-${Date.now()}`, kanji: '', hiragana: '', meaning: '' }]
        : [],
    );
    setGrammarDraft(
      kind === 'grammar'
        ? [{ id: `g-${Date.now()}`, structure: '', meaning: '', exampleJp: '', exampleVi: '' }]
        : [],
    );
    setKanjiDraft(
      kind === 'kanji'
        ? [{ id: `k-${Date.now()}`, kanji: '', hanViet: '', meaning: '', reading: '' }]
        : [],
    );
    setQuizDraft(
      kind === 'quiz'
        ? [
            {
              id: `q-${Date.now()}`,
              prompt: '',
              options: ['', '', '', ''],
              correctIndex: 0,
              explanation: '',
            },
          ]
        : [],
    );
    setEditorOpen(true);
  };

  const openEditLessonModal = (lesson: CustomLesson) => {
    setEditingLessonId(lesson.id);
    setLessonKind(lesson.kind);
    setLessonTitle(lesson.title);
    setLessonLevel(lesson.level);
    setLessonDescription(lesson.description ?? '');
    setVocabDraft(lesson.vocabItems ? [...lesson.vocabItems] : []);
    setGrammarDraft(lesson.grammarItems ? [...lesson.grammarItems] : []);
    setKanjiDraft(lesson.kanjiItems ? [...lesson.kanjiItems] : []);
    setQuizDraft(
      lesson.quizItems
        ? lesson.quizItems.map((q) => ({ ...q, options: [...q.options] }))
        : [],
    );
    setBulkPasteText('');
    setShowBulkPaste(false);
    setEditorOpen(true);
  };

  const handleApplyBulkPaste = () => {
    const parsed = parseBulkVocabText(bulkPasteText);
    if (parsed.length === 0) {
      toast({
        title: 'Chưa nhận diện được dòng nào. Hãy nhập theo dạng: Kanji | Hiragana | Nghĩa',
        tone: 'warning',
      });
      return;
    }
    const existingNonEmpty = vocabDraft.filter(
      (v) => v.kanji.trim() || v.hiragana.trim() || v.meaning.trim(),
    );
    setVocabDraft([...existingNonEmpty, ...parsed]);
    setBulkPasteText('');
    setShowBulkPaste(false);
    toast({ title: `Đã nhập nhanh ${parsed.length} từ vựng!`, tone: 'success' });
  };

  const handleSaveLesson = () => {
    const cleanTitle = lessonTitle.trim();
    if (!cleanTitle) {
      toast({ title: 'Vui lòng nhập tên bài học', tone: 'warning' });
      return;
    }

    const now = new Date().toISOString();
    const cleanVocab = vocabDraft
      .map((v) => ({
        ...v,
        kanji: v.kanji.trim(),
        hiragana: v.hiragana.trim() || v.kanji.trim(),
        meaning: v.meaning.trim(),
        hanViet: v.hanViet?.trim() || undefined,
        example: v.example?.trim() || undefined,
      }))
      .filter((v) => (v.kanji || v.hiragana) && v.meaning);

    const cleanGrammar = grammarDraft
      .map((g) => ({
        ...g,
        structure: g.structure.trim(),
        meaning: g.meaning.trim(),
        usage: g.usage?.trim() || undefined,
        exampleJp: g.exampleJp?.trim() || undefined,
        exampleVi: g.exampleVi?.trim() || undefined,
      }))
      .filter((g) => g.structure && g.meaning);

    const cleanKanji = kanjiDraft
      .map((k) => ({
        ...k,
        kanji: k.kanji.trim(),
        hanViet: k.hanViet.trim(),
        meaning: k.meaning.trim(),
        reading: k.reading?.trim() || undefined,
        mnemonic: k.mnemonic?.trim() || undefined,
      }))
      .filter((k) => k.kanji && k.meaning);

    const cleanQuiz: CustomQuizEntry[] = quizDraft
      .map((q) => {
        const cleanOpts = q.options.map((o) => o.trim()).filter(Boolean);
        return {
          ...q,
          prompt: q.prompt.trim(),
          options: cleanOpts,
          correctIndex: Math.max(0, Math.min(cleanOpts.length - 1, q.correctIndex)),
          explanation: q.explanation?.trim() || undefined,
          speakText: q.speakText?.trim() || undefined,
        };
      })
      .filter((q) => q.prompt && q.options.length >= 2);

    const itemCount =
      lessonKind === 'vocab'
        ? cleanVocab.length
        : lessonKind === 'grammar'
          ? cleanGrammar.length
          : lessonKind === 'quiz'
            ? cleanQuiz.length
            : cleanKanji.length;

    if (itemCount === 0) {
      toast({ title: 'Hãy thêm ít nhất 1 mục nội dung đầy đủ (chữ/nghĩa hoặc câu hỏi/đáp án)!', tone: 'warning' });
      return;
    }

    const nextLesson: CustomLesson = {
      id: editingLessonId || `cl-${Date.now()}`,
      kind: lessonKind,
      title: cleanTitle,
      level: lessonLevel,
      description: lessonDescription.trim() || undefined,
      vocabItems: lessonKind === 'vocab' ? cleanVocab : undefined,
      grammarItems: lessonKind === 'grammar' ? cleanGrammar : undefined,
      kanjiItems: lessonKind === 'kanji' ? cleanKanji : undefined,
      quizItems: lessonKind === 'quiz' ? cleanQuiz : undefined,
      createdAt:
        studio.lessons.find((l) => l.id === editingLessonId)?.createdAt ?? now,
      updatedAt: now,
    };

    const nextLessons = editingLessonId
      ? studio.lessons.map((l) => (l.id === editingLessonId ? nextLesson : l))
      : [nextLesson, ...studio.lessons];

    commitStudio({ ...studio, lessons: nextLessons });
    setEditorOpen(false);
    toast({
      title: editingLessonId
        ? `Đã cập nhật bài "${cleanTitle}" (${itemCount} mục)!`
        : `Đã tạo bài "${cleanTitle}" (${itemCount} mục) — sẵn sàng học & chơi Mini-game!`,
      tone: 'success',
    });
  };

  const handleDeleteLesson = (lessonId: string) => {
    commitStudio({
      ...studio,
      lessons: studio.lessons.filter((l) => l.id !== lessonId),
    });
    toast({ title: 'Đã xóa bài tự tạo', tone: 'info' });
  };

  const activeRoadmap = useMemo(
    () =>
      studio.visualRoadmaps.find((r) => r.id === activeRoadmapId) ??
      studio.visualRoadmaps[0] ??
      null,
    [activeRoadmapId, studio.visualRoadmaps],
  );

  const handleCreateVisualRoadmap = () => {
    const created =
      newMapTemplate === 'five-skill'
        ? createFiveSkillPresetVisualRoadmap(newMapName, newMapLevel)
        : createStarterVisualRoadmap(newMapName, newMapLevel);
    commitStudio({
      ...studio,
      visualRoadmaps: [created, ...studio.visualRoadmaps],
    });
    setActiveRoadmapId(created.id);
    setNewMapName('');
    setNewMapModalOpen(false);
    toast({ title: `Đã tạo bản đồ "${created.name}"!`, tone: 'success' });
  };

  const handleQuickCreateFiveSkillMap = () => {
    const targetLevel = (studyLevel ?? 'N5') as JLPTLevel;
    const created = createFiveSkillPresetVisualRoadmap('', targetLevel);
    commitStudio({
      ...studio,
      visualRoadmaps: [created, ...studio.visualRoadmaps],
    });
    setActiveRoadmapId(created.id);
    toast({
      title: `Đã sinh nhanh Lộ trình Chuẩn 5 Kỹ năng (${targetLevel}) · 7 ngày!`,
      tone: 'success',
    });
  };

  const handleUpdateVisualRoadmap = (updated: VisualRoadmap) => {
    commitStudio({
      ...studio,
      visualRoadmaps: studio.visualRoadmaps.map((r) => (r.id === updated.id ? updated : r)),
    });
  };

  const handleDeleteVisualRoadmap = (mapId: string) => {
    const remaining = studio.visualRoadmaps.filter((r) => r.id !== mapId);
    commitStudio({ ...studio, visualRoadmaps: remaining });
    setActiveRoadmapId(remaining[0]?.id ?? null);
    toast({ title: 'Đã xóa bản đồ tự vẽ', tone: 'info' });
  };

  return (
    <PageContainer size="lg" className="max-w-5xl space-y-4">
      <PageHeader
        breadcrumbs={[
          { label: 'Trang chủ', to: '/' },
          { label: 'Bản đồ Màn', to: '/roadmap' },
          { label: 'Studio Tự tạo Bài & Lộ trình' },
        ]}
        title={
          <span className="flex flex-wrap items-center gap-2">
            <span>Studio Tự tạo Bài &amp; Vẽ Lộ trình</span>
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/roadmap?new=quiz" className={buttonStyles({ variant: 'primary', size: 'sm' })}>
              Tạo quiz
            </Link>
            <Link to="/roadmap?new=wizard" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              Tạo lộ trình
            </Link>
            <Link
              to="/games"
              className={buttonStyles({ variant: 'soft', size: 'sm' })}
            >
              <Gamepad2 className="size-4" aria-hidden />
              Phòng Mini-game
            </Link>
          </div>
        }
      />

      {!user && (
        <Notice tone="info">
          Chế độ khách: bài tự tạo chỉ lưu trên trình duyệt này.
        </Notice>
      )}

      <div className="rounded-xl border border-line bg-glass px-3 py-1.5 shadow-card backdrop-blur-md">
        <Tabs
          aria-label="Chế độ Studio"
          variant="pill"
          value={activeTab}
          onChange={setTab}
          className="gap-1.5"
          items={[
            {
              value: 'lessons',
              label: `1. Kho Bài Tự Tạo (${studio.lessons.length})`,
              icon: <BookOpen className="size-4" aria-hidden />,
            },
            {
              value: 'canvas',
              label: `2. Tự Vẽ Bản Đồ Lộ Trình (${studio.visualRoadmaps.length})`,
              icon: <MapIcon className="size-4" aria-hidden />,
            },
          ]}
        />
      </div>

      {/* PHASE 1: CUSTOM LESSONS MINI-CMS */}
      {activeTab === 'lessons' ? (
        <div className="space-y-4">
          <Card padding="sm" className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted">
              Tạo bài mới:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Plus className="size-4" aria-hidden />}
                onClick={() => openNewLessonModal('vocab')}
              >
                + Bài Từ vựng
              </Button>
              <Button
                type="button"
                variant="soft"
                size="sm"
                leftIcon={<Languages className="size-4" aria-hidden />}
                onClick={() => openNewLessonModal('grammar')}
              >
                + Bài Ngữ pháp
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Sparkles className="size-4" aria-hidden />}
                onClick={() => openNewLessonModal('kanji')}
              >
                + Bài Kanji
              </Button>
              <Button
                type="button"
                variant="soft"
                size="sm"
                leftIcon={<Plus className="size-4" aria-hidden />}
                onClick={() => openNewLessonModal('quiz')}
              >
                + Bộ Quiz 4 đáp án
              </Button>
            </div>
          </Card>

          {studio.lessons.length === 0 ? (
            <EmptyState
              title="Bạn chưa tự tạo bài học nào"
              description="Có thể dán nhiều dòng từ Excel / Sheets."
              action={
                <Button
                  type="button"
                  variant="primary"
                  leftIcon={<Plus className="size-4" aria-hidden />}
                  onClick={() => openNewLessonModal('vocab')}
                >
                  Tạo bài Từ vựng đầu tiên
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {studio.lessons.map((lesson) => {
                const count =
                  lesson.kind === 'vocab'
                    ? lesson.vocabItems?.length ?? 0
                    : lesson.kind === 'grammar'
                      ? lesson.grammarItems?.length ?? 0
                      : lesson.kind === 'quiz'
                        ? lesson.quizItems?.length ?? 0
                        : lesson.kanjiItems?.length ?? 0;
                const kindLabel =
                  lesson.kind === 'vocab'
                    ? 'Từ vựng'
                    : lesson.kind === 'grammar'
                      ? 'Ngữ pháp'
                      : lesson.kind === 'quiz'
                        ? 'Quiz 4 đáp án'
                        : 'Chữ Hán';
                return (
                  <Card key={lesson.id} padding="md" className="flex flex-col justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge
                            tone={
                              lesson.kind === 'vocab'
                                ? 'primary'
                                : lesson.kind === 'kanji' || lesson.kind === 'quiz'
                                  ? 'warning'
                                  : 'sakura'
                            }
                          >
                            {kindLabel}
                          </Badge>
                          <Badge tone="neutral">{lesson.level}</Badge>
                          <Badge tone="success" className="tabular">
                            {count} {lesson.kind === 'quiz' ? 'câu' : 'mục'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditLessonModal(lesson)}
                            leftIcon={<Pencil className="size-3.5" aria-hidden />}
                          >
                            Sửa
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteLesson(lesson.id)}
                            aria-label={`Xóa bài ${lesson.title}`}
                          >
                            <Trash2 className="size-3.5 text-danger-fg" aria-hidden />
                          </Button>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-fg">{lesson.title}</h3>
                      {lesson.description && (
                        <p className="text-xs text-muted">{lesson.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 border-t border-line pt-2.5">
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        leftIcon={<Play className="size-3.5" aria-hidden />}
                        onClick={() => setPlayingLesson({ lesson })}
                      >
                        Flashcard &amp; Quiz
                      </Button>
                      {lesson.kind === 'vocab' && count >= 2 && (
                        <Link
                          to={`/games?customLesson=${encodeURIComponent(lesson.id)}`}
                          className={buttonStyles({ variant: 'soft', size: 'sm' })}
                        >
                          <Gamepad2 className="size-3.5" aria-hidden />
                          Chơi 6 Mini-game
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* PHASE 2: VISUAL ROADMAP CANVAS BUILDER */
        <div className="space-y-3">
          <Card padding="sm" className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {studio.visualRoadmaps.map((rm) => (
                <Chip
                  key={rm.id}
                  selected={activeRoadmap?.id === rm.id}
                  onClick={() => setActiveRoadmapId(rm.id)}
                >
                  {rm.name} ({rm.nodes.length})
                </Chip>
              ))}
              <Button
                type="button"
                variant="primary"
                size="sm"
                leftIcon={<Plus className="size-3.5" aria-hidden />}
                onClick={() => setNewMapModalOpen(true)}
              >
                Vẽ Bản đồ mới
              </Button>
              <Button
                type="button"
                variant="soft"
                size="sm"
                leftIcon={<Sparkles className="size-3.5" aria-hidden />}
                onClick={handleQuickCreateFiveSkillMap}
              >
                + Sinh nhanh Mẫu 5 Kỹ năng
              </Button>
            </div>
            {activeRoadmap && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteVisualRoadmap(activeRoadmap.id)}
                leftIcon={<Trash2 className="size-3.5 text-danger-fg" aria-hidden />}
              >
                Xóa bản đồ này
              </Button>
            )}
          </Card>

          {activeRoadmap ? (
            <VisualRoadmapCanvas
              roadmap={activeRoadmap}
              customLessons={studio.lessons}
              onChangeRoadmap={handleUpdateVisualRoadmap}
              onOpenCustomLesson={(lesson, sourceNodeId) =>
                setPlayingLesson({ lesson, sourceNodeId })
              }
            />
          ) : (
            <EmptyState
              title="Chưa có Bản đồ Lộ trình tự vẽ"
              description="Kéo thả các điểm bài học và nối chúng thành lộ trình."
              action={
                <Button
                  type="button"
                  variant="primary"
                  leftIcon={<Plus className="size-4" aria-hidden />}
                  onClick={() => setNewMapModalOpen(true)}
                >
                  Tạo Bản đồ tự vẽ đầu tiên
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* Create / Edit Custom Lesson Modal (Mini-Admin CMS) */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        size="lg"
        title={
          editingLessonId
            ? `Sửa bài ${lessonKind === 'vocab' ? 'Từ vựng' : lessonKind === 'grammar' ? 'Ngữ pháp' : 'Kanji'}`
            : `Tạo bài ${lessonKind === 'vocab' ? 'Từ vựng' : lessonKind === 'grammar' ? 'Ngữ pháp' : 'Kanji'} mới`
        }
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setEditorOpen(false)}>
              Hủy
            </Button>
            <Button type="button" variant="primary" onClick={handleSaveLesson}>
              Lưu bài học
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Tên bài học *" htmlFor="studio-lesson-title" className="sm:col-span-2">
              <Input
                id="studio-lesson-title"
                placeholder="VD: Từ vựng phỏng vấn IT Nhật, Bài 1 lớp N5..."
                value={lessonTitle}
                onChange={(e) => setLessonTitle(e.target.value)}
              />
            </Field>
            <Field label="Trình độ" htmlFor="studio-lesson-level">
              <Select
                id="studio-lesson-level"
                value={lessonLevel}
                onChange={(e) => setLessonLevel(e.target.value as JLPTLevel)}
              >
                {LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    JLPT {lv}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Mô tả ngắn (tùy chọn)" htmlFor="studio-lesson-desc">
            <Input
              id="studio-lesson-desc"
              placeholder="Ghi chú nội dung hoặc mục tiêu bài học..."
              value={lessonDescription}
              onChange={(e) => setLessonDescription(e.target.value)}
            />
          </Field>

          {/* VOCAB EDITOR + BULK PASTE */}
          {lessonKind === 'vocab' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-fg">
                  Danh sách từ vựng ({vocabDraft.length} dòng)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    leftIcon={<Upload className="size-3.5" aria-hidden />}
                    onClick={() => setShowBulkPaste((v) => !v)}
                  >
                    {showBulkPaste ? 'Đóng dán nhanh' : 'Dán nhanh từ Excel / Text'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus className="size-3.5" aria-hidden />}
                    onClick={() =>
                      setVocabDraft((prev) => [
                        ...prev,
                        { id: `v-${Date.now()}-${prev.length}`, kanji: '', hiragana: '', meaning: '' },
                      ])
                    }
                  >
                    Thêm dòng
                  </Button>
                </div>
              </div>

              {showBulkPaste && (
                <div className="space-y-2 rounded-xl border border-primary/40 bg-primary-soft/35 p-3">
                  <p className="text-xs text-muted">
                    Mỗi dòng 1 từ theo định dạng <strong className="text-fg">Kanji | Hiragana | Nghĩa</strong> (hoặc dán thẳng 2–4 cột từ Excel/Google Sheets):
                  </p>
                  <Textarea
                    rows={4}
                    placeholder={'食べる | たべる | ăn\n飲む | のむ | uống\n会議 | かいぎ | cuộc họp'}
                    value={bulkPasteText}
                    onChange={(e) => setBulkPasteText(e.target.value)}
                  />
                  <Button type="button" variant="primary" size="sm" onClick={handleApplyBulkPaste}>
                    Nhập vào danh sách
                  </Button>
                </div>
              )}

              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {vocabDraft.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-surface-2/50 p-2.5 sm:grid-cols-12 sm:items-center"
                  >
                    <Input
                      placeholder="Kanji / Từ"
                      value={row.kanji}
                      onChange={(e) =>
                        setVocabDraft((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, kanji: e.target.value } : item)),
                        )
                      }
                      className="sm:col-span-3"
                    />
                    <Input
                      placeholder="Hiragana *"
                      value={row.hiragana}
                      onChange={(e) =>
                        setVocabDraft((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, hiragana: e.target.value } : item)),
                        )
                      }
                      className="sm:col-span-3"
                    />
                    <Input
                      placeholder="Nghĩa tiếng Việt *"
                      value={row.meaning}
                      onChange={(e) =>
                        setVocabDraft((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, meaning: e.target.value } : item)),
                        )
                      }
                      className="sm:col-span-5"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setVocabDraft((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Xóa dòng từ vựng"
                      className="sm:col-span-1"
                    >
                      <Trash2 className="size-4 text-danger-fg" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* GRAMMAR EDITOR */}
          {lessonKind === 'grammar' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-fg">
                  Danh sách mẫu ngữ pháp ({grammarDraft.length})
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="size-3.5" aria-hidden />}
                  onClick={() =>
                    setGrammarDraft((prev) => [
                      ...prev,
                      { id: `g-${Date.now()}-${prev.length}`, structure: '', meaning: '' },
                    ])
                  }
                >
                  Thêm mẫu
                </Button>
              </div>
              <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                {grammarDraft.map((row, idx) => (
                  <div key={row.id} className="space-y-2 rounded-xl border border-line bg-surface-2/50 p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        placeholder="Cấu trúc (VD: ～てもいいですか) *"
                        value={row.structure}
                        onChange={(e) =>
                          setGrammarDraft((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, structure: e.target.value } : item)),
                          )
                        }
                      />
                      <Input
                        placeholder="Ý nghĩa (VD: Làm ~ có được không?) *"
                        value={row.meaning}
                        onChange={(e) =>
                          setGrammarDraft((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, meaning: e.target.value } : item)),
                          )
                        }
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Câu ví dụ tiếng Nhật"
                        value={row.exampleJp ?? ''}
                        onChange={(e) =>
                          setGrammarDraft((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, exampleJp: e.target.value } : item)),
                          )
                        }
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setGrammarDraft((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-4 text-danger-fg" aria-hidden />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KANJI EDITOR */}
          {lessonKind === 'kanji' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-fg">
                  Danh sách chữ Hán ({kanjiDraft.length})
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="size-3.5" aria-hidden />}
                  onClick={() =>
                    setKanjiDraft((prev) => [
                      ...prev,
                      { id: `k-${Date.now()}-${prev.length}`, kanji: '', hanViet: '', meaning: '' },
                    ])
                  }
                >
                  Thêm chữ Hán
                </Button>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {kanjiDraft.map((row, idx) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-surface-2/50 p-2.5 sm:grid-cols-12 sm:items-center"
                  >
                    <Input
                      placeholder="Hán *"
                      value={row.kanji}
                      onChange={(e) =>
                        setKanjiDraft((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, kanji: e.target.value } : item)),
                        )
                      }
                      className="sm:col-span-2"
                    />
                    <Input
                      placeholder="Hán Việt"
                      value={row.hanViet}
                      onChange={(e) =>
                        setKanjiDraft((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, hanViet: e.target.value } : item)),
                        )
                      }
                      className="sm:col-span-3"
                    />
                    <Input
                      placeholder="Âm đọc"
                      value={row.reading ?? ''}
                      onChange={(e) =>
                        setKanjiDraft((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, reading: e.target.value } : item)),
                        )
                      }
                      className="sm:col-span-3"
                    />
                    <Input
                      placeholder="Nghĩa *"
                      value={row.meaning}
                      onChange={(e) =>
                        setKanjiDraft((prev) =>
                          prev.map((item, i) => (i === idx ? { ...item, meaning: e.target.value } : item)),
                        )
                      }
                      className="sm:col-span-3"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setKanjiDraft((prev) => prev.filter((_, i) => i !== idx))}
                      className="sm:col-span-1"
                    >
                      <Trash2 className="size-4 text-danger-fg" aria-hidden />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* QUIZ EDITOR (4-OPTION MULTIPLE CHOICE) */}
          {lessonKind === 'quiz' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-fg">
                  Danh sách câu hỏi trắc nghiệm ({quizDraft.length})
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="size-3.5" aria-hidden />}
                  onClick={() =>
                    setQuizDraft((prev) => [
                      ...prev,
                      {
                        id: `q-${Date.now()}-${prev.length}`,
                        prompt: '',
                        options: ['', '', '', ''],
                        correctIndex: 0,
                        explanation: '',
                      },
                    ])
                  }
                >
                  Thêm câu hỏi
                </Button>
              </div>
              <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                {quizDraft.map((row, idx) => (
                  <div
                    key={row.id}
                    className="space-y-2 rounded-xl border border-line bg-surface-2/50 p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-primary-fg">Câu {idx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuizDraft((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-4 text-danger-fg" aria-hidden />
                      </Button>
                    </div>
                    <Input
                      placeholder="Nội dung câu hỏi *"
                      value={row.prompt}
                      onChange={(e) =>
                        setQuizDraft((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, prompt: e.target.value } : item,
                          ),
                        )
                      }
                    />
                    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {[0, 1, 2, 3].map((optIdx) => (
                        <div key={optIdx} className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setQuizDraft((prev) =>
                                prev.map((item, i) =>
                                  i === idx ? { ...item, correctIndex: optIdx } : item,
                                ),
                              )
                            }
                            aria-label={`Chọn đáp án ${String.fromCharCode(65 + optIdx)} là đáp án đúng`}
                            className={
                              row.correctIndex === optIdx
                                ? 'grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg bg-success text-xs font-bold text-on-primary'
                                : 'grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg border border-line bg-surface text-xs font-bold text-muted hover:border-primary'
                            }
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </button>
                          <Input
                            placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}${optIdx < 2 ? ' *' : ''}`}
                            value={row.options[optIdx] ?? ''}
                            onChange={(e) =>
                              setQuizDraft((prev) =>
                                prev.map((item, i) => {
                                  if (i !== idx) return item;
                                  const nextOpts = [...item.options];
                                  while (nextOpts.length <= optIdx) nextOpts.push('');
                                  nextOpts[optIdx] = e.target.value;
                                  return { ...item, options: nextOpts };
                                }),
                              )
                            }
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>
                    <Input
                      placeholder="Giải thích đáp án (tiếng Việt, tùy chọn)..."
                      value={row.explanation ?? ''}
                      onChange={(e) =>
                        setQuizDraft((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, explanation: e.target.value } : item,
                          ),
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* New Visual Roadmap Modal */}
      <Modal
        open={newMapModalOpen}
        onClose={() => setNewMapModalOpen(false)}
        size="sm"
        title="Tạo Bản đồ Lộ trình tự vẽ"
        footer={
          <>
            <Button type="button" variant="secondary" onClick={() => setNewMapModalOpen(false)}>
              Hủy
            </Button>
            <Button type="button" variant="primary" onClick={handleCreateVisualRoadmap}>
              Tạo bản đồ
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Tên lộ trình" htmlFor="new-vmap-name">
            <Input
              id="new-vmap-name"
              placeholder="VD: Lộ trình N5 cấp tốc 30 ngày..."
              value={newMapName}
              onChange={(e) => setNewMapName(e.target.value)}
            />
          </Field>
          <Field label="Trình độ mục tiêu" htmlFor="new-vmap-level">
            <Select
              id="new-vmap-level"
              value={newMapLevel}
              onChange={(e) => setNewMapLevel(e.target.value as JLPTLevel)}
            >
              {LEVELS.map((lv) => (
                <option key={lv} value={lv}>
                  JLPT {lv}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mẫu khởi tạo" htmlFor="new-vmap-template">
            <Select
              id="new-vmap-template"
              value={newMapTemplate}
              onChange={(e) => setNewMapTemplate(e.target.value as 'five-skill' | 'starter')}
            >
              <option value="five-skill">
                Chuẩn 5 Kỹ năng (7 chặng: Từ · Kanji · Ngữ · Nghe · Đọc · Dojo · Boss)
              </option>
              <option value="starter">Khung cơ bản (4 chặng gọn nhẹ để tự vẽ thêm)</option>
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Instant Flashcard & Quiz Player Modal */}
      <CustomLessonPlayerModal
        lesson={playingLesson?.lesson ?? null}
        onClose={() => setPlayingLesson(null)}
        onMarkStudied={
          playingLesson?.sourceNodeId && activeRoadmap
            ? () => {
                const nodeId = playingLesson.sourceNodeId;
                if (!nodeId) return;
                if (!activeRoadmap.completedNodeIds.includes(nodeId)) {
                  handleUpdateVisualRoadmap({
                    ...activeRoadmap,
                    completedNodeIds: [...activeRoadmap.completedNodeIds, nodeId],
                  });
                }
                toast({
                  title: 'Đã đánh dấu hoàn thành Node & mở khóa nhánh tiếp theo!',
                  tone: 'success',
                });
              }
            : undefined
        }
      />
    </PageContainer>
  );
};
