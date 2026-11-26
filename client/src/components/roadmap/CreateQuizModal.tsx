import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  PenLine,
  Plus,
  Trash2,
  Upload,
  Volume2,
  Wand2,
} from 'lucide-react';
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  Notice,
  Select,
  Textarea,
  useToast,
} from '../ui';
import { cn } from '../../lib/cn';
import {
  CUSTOM_ROLE_META,
  type CustomLesson,
  type CustomLessonRole,
  type CustomQuizEntry,
} from '../../services/customStudioService';
import { extractJsonBlock } from '../../services/roadmapJsonService';
import type { StudyLevel } from '../../services/userLevelService';
import { parseCustomDialogueLines, speakJapanese } from '../../utils/tts';

interface CreateQuizModalProps {
  open: boolean;
  onClose: () => void;
  defaultLevel: StudyLevel;
  onSaveQuiz: (lesson: CustomLesson, openRoadmapAfter: boolean) => void;
  /** When set, the dialog edits this quiz in place (same id) */
  editingLesson?: CustomLesson | null;
}

const LEVELS: StudyLevel[] = ['N5', 'N4', 'N3', 'N2', 'N1'];
const ROLES: CustomLessonRole[] = ['vocab', 'kanji', 'grammar', 'reading', 'listening', 'mixed'];
const AI_COUNT_OPTIONS = [5, 8, 10, 15];

let quizRowSeq = 0;
function makeEmptyQuestion(): CustomQuizEntry {
  quizRowSeq += 1;
  return {
    id: `cq-row-${quizRowSeq}`,
    prompt: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    explanation: '',
  };
}

function buildQuizOnlyAiPrompt(options: {
  topic: string;
  role: CustomLessonRole;
  level: StudyLevel;
  count: number;
}): string {
  const roleLabel = CUSTOM_ROLE_META[options.role].label;
  const topic = options.topic.trim() || `${roleLabel} tiếng Nhật ${options.level}`;
  const isListening = options.role === 'listening';
  const sampleItem = isListening
    ? {
        speakText: '女: すみません、このりんごはいくらですか。\n男: 一つ百五十円です。\n女: じゃ、三つください。',
        prompt: 'Người khách mua mấy quả táo?',
        options: ['3 quả', '1 quả', '2 quả', '5 quả'],
        correctIndex: 0,
        explanation: 'Trong đoạn nghe khách nói 「じゃ、三つください」 (Vậy cho tôi 3 quả).',
      }
    : {
        prompt: 'Chữ Hán 「食べる」 đọc là gì và có nghĩa là gì?',
        options: ['たべる · Ăn', 'のむ · Uống', 'みる · Xem', 'きく · Nghe'],
        correctIndex: 0,
        explanation: '食 (THỰC) đọc là たべる nghĩa là ăn.',
      };

  return [
    `Bạn là giáo viên tiếng Nhật JLPT. Hãy tạo đúng ${options.count} câu hỏi trắc nghiệm 4 đáp án bằng JSON để tôi nhập vào app Nihongo 問.`,
    `- Vai trò / kỹ năng (Role): ${roleLabel}`,
    `- Chủ đề: ${topic}`,
    `- Trình độ: JLPT ${options.level}`,
    ...(isListening
      ? [
          `- BẮT BUỘC cho bài Nghe hiểu: mỗi câu PHẢI có trường "speakText" là đoạn đối thoại nhiều nhân vật (dùng định dạng "女: ...\\n男: ..." hoặc "店員: ...\\n客: ...") để app tự đọc bằng nhiều giọng Nam/Nữ khác nhau và ẩn chữ khi làm bài; "prompt" là câu hỏi kiểm tra ý hiểu.`,
        ]
      : []),
    ``,
    `QUY TẮC: Chỉ trả về 1 khối JSON hợp lệ dạng { "title": "...", "quizzes": [ ... ] }, mỗi câu có đúng 4 "options", "correctIndex" từ 0..3 và "explanation" giải thích ngắn bằng tiếng Việt.`,
    '```json',
    JSON.stringify(
      {
        title: `${roleLabel} · ${topic.slice(0, 40)}`,
        quizzes: [sampleItem],
      },
      null,
      2,
    ),
    '```',
  ].join('\n');
}

const SAMPLE_LISTENING_QUIZ_JSON = JSON.stringify(
  {
    title: 'Nghe hiểu N5 · Hội thoại 2 giọng Nam–Nữ',
    quizzes: [
      {
        speakText:
          '女: すみません、このりんごはいくらですか。\n男: 一つ百五十円です。\n女: じゃ、三つください。',
        prompt: 'Nghe đoạn hội thoại — Người khách muốn mua mấy quả táo?',
        options: ['3 quả', '1 quả', '2 quả', '4 quả'],
        correctIndex: 0,
        explanation: 'Khách nữ nói 「三つください」 (みっつください) = Cho tôi 3 quả.',
      },
      {
        speakText:
          '男: あした、何時に駅で会いましょうか。\n女: 九時はどうですか。\n男: ちょっと早いですね。十時にしましょう。',
        prompt: 'Hai người hẹn gặp nhau ở nhà ga lúc mấy giờ?',
        options: ['10 giờ', '9 giờ', '8 giờ', '11 giờ'],
        correctIndex: 0,
        explanation: '9 giờ hơi sớm nên hai người chốt 「十時にしましょう」 (10 giờ nhé).',
      },
      {
        speakText:
          '店員: いらっしゃいませ。何名様ですか。\n女: 二人です。\n店員: かしこまりました。あちらの窓の席へどうぞ。',
        prompt: 'Khách đi mấy người và ngồi ở đâu?',
        options: ['2 người · bàn cạnh cửa sổ', '3 người · bàn cạnh cửa sổ', '2 người · quầy bar', '1 người · tầng 2'],
        correctIndex: 0,
        explanation: 'Khách nói 「二人です」 (2 người) và nhân viên mời ra 「窓の席」 (chỗ cạnh cửa sổ).',
      },
      {
        speakText:
          '男: 週末はどこへ行きましたか。\n女: 友達と京都へ行きました。お寺を見て、美味しい抹茶を飲みました。',
        prompt: 'Cuối tuần người nữ đã làm gì ở Kyoto?',
        options: ['Tham quan chùa và uống trà xanh Matcha', 'Đi biển bơi lội', 'Ở nhà học bài', 'Đi siêu thị mua quần áo'],
        correctIndex: 0,
        explanation: '「お寺を見て、美味しい抹茶を飲みました」 = Xem chùa và uống Matcha ngon.',
      },
      {
        speakText:
          '女: すみません、郵便局はどこですか。\n男: この道をまっすぐ行って、二つ目の角を右に曲がってください。',
        prompt: 'Để đến bưu điện cần rẽ hướng nào?',
        options: ['Đi thẳng rồi rẽ phải ở ngã rẽ thứ 2', 'Rẽ trái ngay góc đầu tiên', 'Đi thẳng 3 góc rồi rẽ trái', 'Quay lại phía sau nhà ga'],
        correctIndex: 0,
        explanation: '「まっすぐ行って、二つ目の角を右に曲がってください」 = Đi thẳng, rẽ phải ở góc thứ 2.',
      },
    ],
  },
  null,
  2,
);

const SAMPLE_KANJI_QUIZ_JSON = JSON.stringify(
  {
    title: 'Chữ Hán N5 · Đời sống & Ăn uống',
    quizzes: [
      {
        prompt: 'Chữ Hán 「食」 trong từ 「食べる」 có nghĩa là gì?',
        options: ['Ăn', 'Uống', 'Đi bộ', 'Ngủ'],
        correctIndex: 0,
        explanation: '食 (THỰC) mang nghĩa ăn uống — 食べる (たべる) = ăn.',
      },
      {
        prompt: 'Từ 「駅」 (DỊCH) đọc bằng Hiragana là gì?',
        options: ['えき', 'みち', 'くるま', 'でんしゃ'],
        correctIndex: 0,
        explanation: '駅 (えき) nghĩa là nhà ga tàu điện.',
      },
      {
        prompt: 'Chữ Hán nào dưới đây có nghĩa là "Nước"?',
        options: ['水', '火', '木', '金'],
        correctIndex: 0,
        explanation: '水 (THỦY · みず) là nước; 火 là lửa, 木 là cây, 金 là tiền/vàng.',
      },
      {
        prompt: 'Cụm từ 「毎日」 (MỖI NHẬT) đọc là gì?',
        options: ['まいにち', 'まいあさ', 'まいばん', 'まいしゅう'],
        correctIndex: 0,
        explanation: '毎日 (まいにち) = mỗi ngày.',
      },
      {
        prompt: 'Từ 「新しい」 có nghĩa là gì?',
        options: ['Mới', 'Cũ', 'Đắt', 'Rẻ'],
        correctIndex: 0,
        explanation: '新 (TÂN) trong 新しい (あたらしい) nghĩa là mới.',
      },
    ],
  },
  null,
  2,
);

function parseAiQuizReply(raw: string): {
  ok: true;
  title?: string;
  items: CustomQuizEntry[];
} | {
  ok: false;
  error: string;
} {
  const extracted = extractJsonBlock(raw);
  if (!extracted) {
    return { ok: false, error: 'Ô dán đang trống.' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(extracted);
  } catch {
    return {
      ok: false,
      error: 'Không đọc được kết quả từ AI. Hãy copy trọn vẹn khung câu trả lời có dấu { ... }.',
    };
  }

  let rawList: unknown[] = [];
  let suggestedTitle: string | undefined;

  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    if (typeof obj.title === 'string' && obj.title.trim()) {
      suggestedTitle = obj.title.trim();
    }
    if (Array.isArray(obj.quizzes)) {
      rawList = obj.quizzes;
    } else if (Array.isArray(obj.questions)) {
      rawList = obj.questions;
    }
  }

  const items: CustomQuizEntry[] = [];
  rawList.forEach((entry) => {
    if (!entry || typeof entry !== 'object') return;
    const q = entry as Record<string, unknown>;
    const prompt = typeof q.prompt === 'string' ? q.prompt.trim() : '';
    const options = Array.isArray(q.options)
      ? q.options.map((o) => String(o ?? '').trim()).filter(Boolean)
      : [];
    const correctIndex = Number(q.correctIndex);
    if (!prompt || options.length < 2) return;
    const safeIdx =
      Number.isInteger(correctIndex) && correctIndex >= 0 && correctIndex < options.length
        ? correctIndex
        : 0;
    quizRowSeq += 1;
    items.push({
      id: `cq-ai-${quizRowSeq}`,
      prompt,
      options: options.slice(0, 4),
      correctIndex: safeIdx,
      explanation:
        typeof q.explanation === 'string' && q.explanation.trim()
          ? q.explanation.trim()
          : undefined,
      speakText:
        typeof q.speakText === 'string' && q.speakText.trim()
          ? q.speakText.trim()
          : undefined,
    });
  });

  if (items.length === 0) {
    return {
      ok: false,
      error: 'Chưa tìm thấy câu hỏi hợp lệ nào (mỗi câu cần nội dung và ít nhất 2 đáp án).',
    };
  }
  return { ok: true, title: suggestedTitle, items };
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  open,
  onClose,
  defaultLevel,
  onSaveQuiz,
  editingLesson = null,
}) => {
  const { toast } = useToast();
  const [wasOpen, setWasOpen] = useState(false);

  const [role, setRole] = useState<CustomLessonRole>('vocab');
  const [level, setLevel] = useState<StudyLevel>(defaultLevel);
  const [title, setTitle] = useState('');
  const [inputTab, setInputTab] = useState<'manual' | 'ai'>('manual');
  const [questions, setQuestions] = useState<CustomQuizEntry[]>(() => [makeEmptyQuestion()]);

  // AI Quick Helper inside CreateQuizModal
  const [aiTopic, setAiTopic] = useState('');
  const [aiCount, setAiCount] = useState<number>(5);
  const [aiReplyText, setAiReplyText] = useState('');

  if (open && !wasOpen) {
    setWasOpen(true);
    setLevel(editingLesson ? (editingLesson.level as StudyLevel) : defaultLevel);
    setRole(editingLesson?.role ?? 'vocab');
    setTitle(editingLesson?.title ?? '');
    setInputTab('manual');
    setQuestions(
      editingLesson?.quizItems?.length
        ? editingLesson.quizItems.map((q) => ({
            ...q,
            // the form always shows four answer boxes
            options: [0, 1, 2, 3].map((i) => q.options[i] ?? ''),
          }))
        : [makeEmptyQuestion()],
    );
    setAiTopic('');
    setAiReplyText('');
  } else if (!open && wasOpen) {
    setWasOpen(false);
  }

  const aiPrompt = useMemo(
    () => buildQuizOnlyAiPrompt({ topic: aiTopic, role, level, count: aiCount }),
    [aiTopic, role, level, aiCount],
  );

  const validQuestionCount = useMemo(
    () =>
      questions.filter(
        (q) => q.prompt.trim() && q.options.map((o) => o.trim()).filter(Boolean).length >= 2,
      ).length,
    [questions],
  );

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(aiPrompt);
      toast({
        title: 'Đã copy yêu cầu tạo câu hỏi! Dán sang ChatGPT / Gemini rồi copy kết quả về đây.',
        tone: 'success',
      });
    } catch {
      toast({ title: 'Không thể tự copy — hãy thử lại.', tone: 'warning' });
    }
  };

  const handleApplyAiQuestions = (rawText: string) => {
    const parsed = parseAiQuizReply(rawText);
    if (!parsed.ok) {
      toast({ title: parsed.error, tone: 'warning' });
      return;
    }
    if (!title.trim() && parsed.title) {
      setTitle(parsed.title);
    }
    setQuestions(parsed.items);
    setInputTab('manual');
    setAiReplyText('');
    toast({
      title: `Đã nạp ${parsed.items.length} câu hỏi! Bạn có thể xem lại hoặc sửa rồi bấm Lưu.`,
      tone: 'success',
    });
  };

  const handleUploadAudioForQuestion = (qIdx: number, ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    ev.target.value = '';
    if (!file) return;
    if (file.size > 1_500_000) {
      toast({
        title: 'File audio nên nhỏ hơn 1.5MB (hoặc nhập đoạn tiếng Nhật để App tự đọc giọng Nhật không tốn dung lượng!).',
        tone: 'warning',
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      setQuestions((prev) =>
        prev.map((q, i) =>
          i === qIdx ? { ...q, audioDataUrl: dataUrl, audioFileName: file.name } : q,
        ),
      );
      toast({ title: `Đã gắn file nghe "${file.name}" cho Câu ${qIdx + 1}!`, tone: 'success' });
    };
    reader.readAsDataURL(file);
  };

  const handleCommit = (openRoadmapAfter: boolean) => {
    const cleanItems: CustomQuizEntry[] = questions
      .map((q) => {
        const cleanOpts = q.options.map((o) => o.trim()).filter(Boolean);
        return {
          ...q,
          prompt: q.prompt.trim(),
          options: cleanOpts,
          correctIndex: Math.max(0, Math.min(cleanOpts.length - 1, q.correctIndex)),
          explanation: q.explanation?.trim() || undefined,
          speakText: q.speakText?.trim() || undefined,
          audioDataUrl: q.audioDataUrl || undefined,
          audioFileName: q.audioFileName || undefined,
        };
      })
      .filter((q) => q.prompt && q.options.length >= 2);

    if (cleanItems.length === 0) {
      toast({
        title: 'Hãy nhập ít nhất 1 câu hỏi có tối thiểu 2 đáp án!',
        tone: 'warning',
      });
      return;
    }

    const roleMeta = CUSTOM_ROLE_META[role];
    const cleanTitle = title.trim() || `Quiz ${roleMeta.label} · ${level}`;
    const nowIso = new Date().toISOString();
    quizRowSeq += 1;

    const lesson: CustomLesson = {
      id: editingLesson?.id ?? `cl-quiz-${Date.now().toString(36)}-${quizRowSeq}`,
      kind: 'quiz',
      role,
      title: cleanTitle,
      level,
      description: `Bộ Quiz ${roleMeta.label} (${cleanItems.length} câu)`,
      quizItems: cleanItems,
      createdAt: editingLesson?.createdAt ?? nowIso,
      updatedAt: nowIso,
    };

    onSaveQuiz(lesson, openRoadmapAfter);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editingLesson ? 'Sửa quiz' : 'Tạo quiz'}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="soft"
            disabled={validQuestionCount === 0}
            leftIcon={<Check className="size-4" aria-hidden />}
            onClick={() => handleCommit(false)}
          >
            Lưu ({validQuestionCount} câu)
          </Button>
          {!editingLesson && (
          <Button
            type="button"
            variant="primary"
            disabled={validQuestionCount === 0}
            rightIcon={<ArrowRight className="size-4" aria-hidden />}
            onClick={() => handleCommit(true)}
          >
            Lưu &amp; thêm vào lộ trình
          </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
          <div className="col-span-2 sm:col-span-6">
            <Field label="Tên quiz" htmlFor="create-quiz-title">
              <Input
                id="create-quiz-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Từ vựng quán ăn"
              />
            </Field>
          </div>
          <div className="sm:col-span-3">
            <Field label="Kỹ năng" htmlFor="create-quiz-role">
              <Select
                id="create-quiz-role"
                value={role}
                onChange={(e) => setRole(e.target.value as CustomLessonRole)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {CUSTOM_ROLE_META[r].label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-3">
            <Field label="Trình độ" htmlFor="create-quiz-level">
              <Select
                id="create-quiz-level"
                value={level}
                onChange={(e) => setLevel(e.target.value as StudyLevel)}
              >
                {LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>

        {/* 3. Switch Input Method: Manual vs ChatGPT/Gemini */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={inputTab === 'manual' ? 'primary' : 'secondary'}
            leftIcon={<PenLine className="size-3.5" aria-hidden />}
            onClick={() => setInputTab('manual')}
          >
            Tự nhập ({questions.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={inputTab === 'ai' ? 'primary' : 'secondary'}
            leftIcon={<Wand2 className="size-3.5" aria-hidden />}
            onClick={() => setInputTab('ai')}
          >
            Nhờ AI tạo
          </Button>
        </div>

        {inputTab === 'manual' ? (
          <div className="space-y-3">
            {role === 'listening' && (
              <Notice tone="info">
                <p className="text-xs leading-relaxed">
                  <strong className="text-fg">2 cách làm bài Nghe hiểu:</strong> (1) Chỉ cần gõ hoặc để AI tạo{' '}
                  <strong className="text-fg">Đoạn tiếng Nhật</strong> → App <strong className="text-fg">tự đọc giọng Nhật &amp; ẩn chữ</strong> khi làm bài (không cần file MP3!). (2) Hoặc bấm{' '}
                  <strong className="text-fg">Tải file audio (.mp3 / .m4a / .wav)</strong> có sẵn từ máy.
                </p>
              </Notice>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted">
                Bấm A / B / C / D để chọn đáp án đúng.
              </span>
              <Button
                type="button"
                size="sm"
                variant="soft"
                leftIcon={<Plus className="size-3.5" aria-hidden />}
                onClick={() => setQuestions((prev) => [...prev, makeEmptyQuestion()])}
              >
                Thêm câu hỏi
              </Button>
            </div>

            <div className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {questions.map((row, idx) => (
                <div
                  key={row.id}
                  className="space-y-2 rounded-xl border border-line bg-surface-2/45 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-primary-fg">Câu {idx + 1}</span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== idx))}
                        className="cursor-pointer rounded p-1 text-muted hover:text-danger-fg"
                        aria-label={`Xóa câu ${idx + 1}`}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    )}
                  </div>

                  {/* Listening Audio / Multi-Voice Dialogue TTS Block */}
                  {(role === 'listening' || row.speakText || row.audioDataUrl) && (
                    <div className="space-y-2 rounded-lg border border-primary/35 bg-primary-soft/15 p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="text-[11px] font-semibold text-fg">
                          Đoạn nghe tiếng Nhật (gõ dạng <code>女: ...</code> xuống dòng <code>男: ...</code> để tự đọc 2 giọng Nam–Nữ)
                        </span>
                        {parseCustomDialogueLines(row.speakText) && (
                          <Badge tone="sakura" className="px-1.5 py-0 text-[10px]">
                            Đối thoại nhiều giọng ✓
                          </Badge>
                        )}
                      </div>
                      <Textarea
                        rows={2}
                        value={row.speakText ?? ''}
                        onChange={(e) =>
                          setQuestions((prev) =>
                            prev.map((q, i) =>
                              i === idx ? { ...q, speakText: e.target.value } : q,
                            ),
                          )
                        }
                        placeholder={'女: すみません、これはいくらですか。\n男: 百五十円です。'}
                        className="text-xs"
                      />
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="soft"
                          disabled={!row.speakText?.trim()}
                          leftIcon={<Volume2 className="size-3.5" aria-hidden />}
                          onClick={() => row.speakText?.trim() && speakJapanese(row.speakText)}
                        >
                          {parseCustomDialogueLines(row.speakText) ? 'Nghe thử nhiều giọng' : 'Nghe thử'}
                        </Button>
                        <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-xs font-semibold text-fg hover:border-primary hover:text-primary-fg">
                          <Upload className="size-3.5" aria-hidden />
                          <span>Tải file audio</span>
                          <input
                            type="file"
                            accept="audio/*,.mp3,.m4a,.wav,.ogg"
                            onChange={(ev) => handleUploadAudioForQuestion(idx, ev)}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {row.audioDataUrl && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs">
                          <span className="truncate font-medium text-fg">
                            🎵 {row.audioFileName || 'File audio đã tải lên'}
                          </span>
                          <div className="flex items-center gap-2">
                            <audio controls src={row.audioDataUrl} className="h-7 max-w-[200px]" />
                            <button
                              type="button"
                              onClick={() =>
                                setQuestions((prev) =>
                                  prev.map((q, i) =>
                                    i === idx
                                      ? { ...q, audioDataUrl: undefined, audioFileName: undefined }
                                      : q,
                                  ),
                                )
                              }
                              className="cursor-pointer text-danger-fg hover:underline"
                            >
                              Gỡ file
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <Input
                    value={row.prompt}
                    onChange={(e) =>
                      setQuestions((prev) =>
                        prev.map((q, i) => (i === idx ? { ...q, prompt: e.target.value } : q)),
                      )
                    }
                    placeholder={
                      role === 'listening'
                        ? 'Câu hỏi kiểm tra ý hiểu (VD: Người khách mua mấy quả táo?)...'
                        : 'Nhập nội dung câu hỏi...'
                    }
                  />
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {[0, 1, 2, 3].map((optIdx) => (
                      <div key={optIdx} className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setQuestions((prev) =>
                              prev.map((q, i) =>
                                i === idx ? { ...q, correctIndex: optIdx } : q,
                              ),
                            )
                          }
                          aria-label={`Đáp án ${String.fromCharCode(65 + optIdx)} đúng`}
                          className={cn(
                            'grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-xs font-bold transition-colors',
                            row.correctIndex === optIdx
                              ? 'bg-success text-on-primary'
                              : 'border border-line bg-surface text-muted hover:border-primary',
                          )}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </button>
                        <Input
                          value={row.options[optIdx] ?? ''}
                          onChange={(e) =>
                            setQuestions((prev) =>
                              prev.map((q, i) => {
                                if (i !== idx) return q;
                                const opts = [...q.options];
                                while (opts.length <= optIdx) opts.push('');
                                opts[optIdx] = e.target.value;
                                return { ...q, options: opts };
                              }),
                            )
                          }
                          placeholder={`Đáp án ${String.fromCharCode(65 + optIdx)}${optIdx < 2 ? ' *' : ''}`}
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                  <Input
                    value={row.explanation ?? ''}
                    onChange={(e) =>
                      setQuestions((prev) =>
                        prev.map((q, i) =>
                          i === idx ? { ...q, explanation: e.target.value } : q,
                        ),
                      )
                    }
                    placeholder="Giải thích ngắn sau khi trả lời (tùy chọn)..."
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-line bg-surface-2/45 p-3.5">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <Field label="Chủ đề" htmlFor="quiz-ai-topic">
                  <Input
                    id="quiz-ai-topic"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder={`VD: ${CUSTOM_ROLE_META[role].label} quán ăn, mua sắm, công sở...`}
                  />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="Số câu hỏi" htmlFor="quiz-ai-count">
                  <Select
                    id="quiz-ai-count"
                    value={aiCount}
                    onChange={(e) => setAiCount(Number(e.target.value))}
                  >
                    {AI_COUNT_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} câu hỏi
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="primary"
                leftIcon={<ClipboardCopy className="size-3.5" aria-hidden />}
                onClick={() => void handleCopyPrompt()}
              >
                Copy yêu cầu
              </Button>
              <a
                href="https://chatgpt.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:border-primary hover:text-primary-fg"
              >
                Mở ChatGPT
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
              <a
                href="https://gemini.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-xs font-semibold text-fg hover:border-primary hover:text-primary-fg"
              >
                Mở Gemini
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </div>

            <div className="space-y-2 border-t border-line pt-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-fg">
                  Dán câu trả lời
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="soft"
                  leftIcon={<Wand2 className="size-3.5" aria-hidden />}
                  onClick={() => {
                    if (role === 'listening') {
                      handleApplyAiQuestions(SAMPLE_LISTENING_QUIZ_JSON);
                    } else {
                      setRole('kanji');
                      handleApplyAiQuestions(SAMPLE_KANJI_QUIZ_JSON);
                    }
                  }}
                >
                  {role === 'listening'
                    ? 'Nạp thử 5 câu Nghe hiểu mẫu'
                    : 'Dùng thử mẫu'}
                </Button>
              </div>
              <Textarea
                rows={4}
                value={aiReplyText}
                onChange={(e) => setAiReplyText(e.target.value)}
                placeholder="Dán câu trả lời của AI vào đây"
                className="text-xs"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={!aiReplyText.trim()}
                  leftIcon={<CheckCircle2 className="size-3.5" aria-hidden />}
                  onClick={() => handleApplyAiQuestions(aiReplyText)}
                >
                  Nạp câu hỏi
                </Button>
              </div>
            </div>

          </div>
        )}
      </div>
    </Modal>
  );
};
