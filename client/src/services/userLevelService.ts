import { isSupabaseAccountUuid } from './sessionScope';
import { supabase } from './supabaseClient';
import { saveStudySchedule } from './notificationService';
import {
  resolveActiveVocabTextbook,
  savePreferredVocabLevel,
  savePreferredVocabTextbookId,
} from '../data/vocabTextbooks';

export type StudyLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface StudyLevelMeta {
  level: StudyLevel;
  title: string;
  japaneseLabel: string;
  summary: string;
}

export const STUDY_LEVEL_OPTIONS: StudyLevelMeta[] = [
  {
    level: 'N5',
    title: 'Sơ cấp 1',
    japaneseLabel: '初級 I',
    summary: 'Dành cho người mới bắt đầu: nền tảng từ vựng cơ bản, ngữ pháp giao tiếp và ~100 Kanji đầu tiên.',
  },
  {
    level: 'N4',
    title: 'Sơ cấp 2',
    japaneseLabel: '初級 II',
    summary: 'Mở rộng câu hội thoại hằng ngày, chia thể động từ linh hoạt và ~300 Kanji thông dụng.',
  },
  {
    level: 'N3',
    title: 'Trung cấp',
    japaneseLabel: '中級',
    summary: 'Đọc hiểu văn bản đời sống, ngữ pháp trung cấp và ~650 Kanji chuẩn kỳ thi JLPT N3.',
  },
  {
    level: 'N2',
    title: 'Trung cao cấp',
    japaneseLabel: '中上級',
    summary: 'Đọc báo chí, tài liệu công việc, sắc thái ngữ pháp nâng cao và ~1.000 Kanji.',
  },
  {
    level: 'N1',
    title: 'Cao cấp',
    japaneseLabel: '上級',
    summary: 'Tiếng Nhật chuyên sâu, bài luận học thuật và ~2.000 Kanji toàn diện.',
  },
];

export const STUDY_LEVEL_SYNC_EVENT = 'nihonmaster:study-level-sync';
export const ROADMAP_PROGRESS_SYNC_EVENT = 'nihonmaster:roadmap-progress-sync';
export const OPEN_LEVEL_MODAL_EVENT = 'nihonmaster:open-level-modal';

const USER_LEVEL_KEY_PREFIX = 'nihonmaster_study_level_v1:';
const LEGACY_GUEST_LEVEL_STORAGE_KEY = 'nihonmaster_study_level_guest_v1';
const ROADMAP_STEPS_KEY_PREFIX = 'nihonmaster_roadmap_steps_v1:';
const DISMISSED_MODAL_PREFIX = 'nihonmaster_level_modal_dismissed_v1:';

export function sanitizeStudyLevel(raw: unknown): StudyLevel | null {
  if (typeof raw !== 'string') return null;
  const upper = raw.trim().toUpperCase();
  if (upper === 'N5' || upper === 'N4' || upper === 'N3' || upper === 'N2' || upper === 'N1') {
    return upper;
  }
  return null;
}

export function sanitizeCompletedRoadmapSteps(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const clean: string[] = [];
  for (const item of raw) {
    if (typeof item === 'string' && item.trim() && !seen.has(item.trim())) {
      seen.add(item.trim());
      clean.push(item.trim());
    }
  }
  return clean;
}

export function getStudyLevelMeta(level: StudyLevel | null | undefined): StudyLevelMeta | null {
  if (!level) return null;
  return STUDY_LEVEL_OPTIONS.find((item) => item.level === level) ?? null;
}

export function purgeGuestStudyLevelStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.removeItem(LEGACY_GUEST_LEVEL_STORAGE_KEY);
    window.sessionStorage?.removeItem(`${DISMISSED_MODAL_PREFIX}guest`);
  } catch {
    // Ignore storage errors
  }
}

export function loadCachedStudyLevel(userId?: string | null): StudyLevel | null {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage?.getItem(`${USER_LEVEL_KEY_PREFIX}${userId}`);
    return sanitizeStudyLevel(raw);
  } catch {
    return null;
  }
}

export function cacheStudyLevel(level: StudyLevel | null, userId?: string | null): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    const key = `${USER_LEVEL_KEY_PREFIX}${userId}`;
    if (level) {
      window.localStorage?.setItem(key, level);
    } else {
      window.localStorage?.removeItem(key);
    }
  } catch {
    // Ignore storage quota errors
  }
  try {
    window.dispatchEvent(
      new CustomEvent<{ level: StudyLevel | null; userId: string }>(
        STUDY_LEVEL_SYNC_EVENT,
        { detail: { level, userId } },
      ),
    );
  } catch {
    // Ignore SSR event errors
  }
}

export function loadRoadmapCompletedSteps(userId?: string | null): string[] {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage?.getItem(`${ROADMAP_STEPS_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    return sanitizeCompletedRoadmapSteps(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function cacheRoadmapCompletedSteps(steps: string[], userId?: string | null): string[] {
  const clean = sanitizeCompletedRoadmapSteps(steps);
  if (!userId || typeof window === 'undefined') return clean;
  try {
    window.localStorage?.setItem(`${ROADMAP_STEPS_KEY_PREFIX}${userId}`, JSON.stringify(clean));
  } catch {
    // Ignore quota errors
  }
  try {
    window.dispatchEvent(
      new CustomEvent<{ steps: string[]; userId: string }>(ROADMAP_PROGRESS_SYNC_EVENT, {
        detail: { steps: clean, userId },
      }),
    );
  } catch {
    // Ignore SSR event errors
  }
  return clean;
}

export async function toggleRoadmapStepCompletion(
  stepId: string,
  userId?: string | null,
): Promise<string[]> {
  if (!userId) return [];
  const current = loadRoadmapCompletedSteps(userId);
  const exists = current.includes(stepId);
  const next = exists ? current.filter((id) => id !== stepId) : [...current, stepId];
  const clean = cacheRoadmapCompletedSteps(next, userId);

  if (supabase && isSupabaseAccountUuid(userId)) {
    try {
      await supabase.auth.updateUser({
        data: { roadmap_completed_steps: clean },
      });
    } catch {
      // Non-blocking cloud sync fallback
    }
  }

  return clean;
}

export function hasDismissedLevelModal(userId?: string | null): boolean {
  if (!userId || typeof window === 'undefined') return false;
  try {
    return window.sessionStorage?.getItem(`${DISMISSED_MODAL_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function markLevelModalDismissed(userId?: string | null, dismissed = true): void {
  if (!userId || typeof window === 'undefined') return;
  try {
    const key = `${DISMISSED_MODAL_PREFIX}${userId}`;
    if (dismissed) {
      window.sessionStorage?.setItem(key, '1');
    } else {
      window.sessionStorage?.removeItem(key);
    }
  } catch {
    // Ignore storage errors
  }
}

export function requestOpenLevelModal(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_LEVEL_MODAL_EVENT));
}

export async function persistStudyLevel(
  level: StudyLevel,
  userId?: string | null,
  textbookId?: string | null,
): Promise<StudyLevel | null> {
  if (!userId) return null;
  const resolvedBook = resolveActiveVocabTextbook(level, userId, textbookId);
  cacheStudyLevel(level, userId);
  savePreferredVocabLevel(level, userId);
  savePreferredVocabTextbookId(level, resolvedBook.id, userId);
  markLevelModalDismissed(userId, false);

  if (supabase && isSupabaseAccountUuid(userId)) {
    try {
      await supabase.auth.updateUser({
        data: {
          study_level: level,
          study_textbook: resolvedBook.id,
        },
      });
    } catch {
      // Non-blocking fallback — cache remains up to date locally
    }
    try {
      await supabase
        .from('profiles')
        .update({ study_level: level })
        .eq('id', userId);
    } catch {
      // Ignore if column migration has not been applied yet on older DB instances
    }
    try {
      await saveStudySchedule({ targetExamLevel: level }, userId);
    } catch {
      // Non-blocking sync with exam level goal
    }
  }

  return level;
}
