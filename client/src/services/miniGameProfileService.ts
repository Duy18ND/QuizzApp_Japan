/**
 * Nihongo 問 — Mini-game profile: Ninja belt XP + daily challenge completions.
 *
 * Signed-in users: stored in Supabase `user_progress` as one reserved row
 * (`item_type = 'mistake'`, `item_id = MINIGAME_PROFILE_ITEM_ID`, payload in `metadata_json.minigame`),
 * cached in memory per account. Guests keep an in-memory profile for the current session only
 * (guests never persist progress — see sessionScope.ts).
 */

import { MINIGAME_PROFILE_ITEM_ID } from './cloudProgressWriter';
import { isSupabaseAccountUuid } from './sessionScope';
import { supabase } from './supabaseClient';

export interface MiniGameProfile {
  xp: number;
  /** "YYYY-MM-DD" days on which the daily challenge was finished (most recent 60 kept) */
  dailyChallengeDates: string[];
}

export interface NinjaBelt {
  name: string;
  minXp: number;
  /** Semantic-token background class for the belt stripe (see DESIGN.md) */
  stripeClass: string;
}

export const NINJA_BELTS: NinjaBelt[] = [
  { name: 'Đai trắng', minXp: 0, stripeClass: 'bg-surface border border-line-strong' },
  { name: 'Đai vàng', minXp: 300, stripeClass: 'bg-warning' },
  { name: 'Đai anh đào', minXp: 800, stripeClass: 'bg-sakura' },
  { name: 'Đai xanh lá', minXp: 1600, stripeClass: 'bg-success' },
  { name: 'Đai xanh biển', minXp: 3000, stripeClass: 'bg-primary' },
  { name: 'Đai bạc', minXp: 5000, stripeClass: 'bg-subtle' },
  { name: 'Đai đen', minXp: 8000, stripeClass: 'bg-fg' },
];

export const DAILY_CHALLENGE_WORD_COUNT = 10;
export const DAILY_CHALLENGE_BONUS_XP = 50;
const MAX_STORED_DAILY_DATES = 60;

export interface BeltInfo {
  belt: NinjaBelt;
  next: NinjaBelt | null;
  /** 0..1 progress from the current belt to the next one (1 at the last belt) */
  progress: number;
  xpToNext: number;
}

export function getBeltInfo(xp: number): BeltInfo {
  let index = 0;
  for (let i = 0; i < NINJA_BELTS.length; i++) {
    if (xp >= NINJA_BELTS[i].minXp) index = i;
  }
  const belt = NINJA_BELTS[index];
  const next = NINJA_BELTS[index + 1] ?? null;
  if (!next) return { belt, next: null, progress: 1, xpToNext: 0 };
  const span = next.minXp - belt.minXp;
  return {
    belt,
    next,
    progress: Math.min(1, Math.max(0, (xp - belt.minXp) / span)),
    xpToNext: Math.max(0, next.minXp - xp),
  };
}

/** XP for one finished round: rewards correct answers, always gives a little for playing. */
export function computeRoundXp(correctAnswers: number): number {
  return Math.min(150, 10 + Math.max(0, Math.floor(correctAnswers)) * 5);
}

const EMPTY_PROFILE: MiniGameProfile = { xp: 0, dailyChallengeDates: [] };
const profileCache = new Map<string, MiniGameProfile>();
let guestProfile: MiniGameProfile = { ...EMPTY_PROFILE };

function sanitizeProfile(raw: unknown): MiniGameProfile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_PROFILE };
  const obj = raw as Record<string, unknown>;
  const xp = Math.max(0, Math.floor(Number(obj.xp) || 0));
  const dates = Array.isArray(obj.dailyChallengeDates)
    ? obj.dailyChallengeDates.filter(
        (d): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d),
      )
    : [];
  return { xp, dailyChallengeDates: Array.from(new Set(dates)).sort().slice(-MAX_STORED_DAILY_DATES) };
}

export async function loadMiniGameProfile(userId: string | null | undefined): Promise<MiniGameProfile> {
  if (!supabase || !isSupabaseAccountUuid(userId)) return guestProfile;
  const cached = profileCache.get(userId);
  if (cached) return cached;
  try {
    const { data } = await supabase
      .from('user_progress')
      .select('metadata_json')
      .eq('user_id', userId)
      .eq('item_type', 'mistake')
      .eq('item_id', MINIGAME_PROFILE_ITEM_ID)
      .maybeSingle();
    const meta = (data?.metadata_json ?? null) as Record<string, unknown> | null;
    const profile = sanitizeProfile(meta?.minigame);
    profileCache.set(userId, profile);
    return profile;
  } catch {
    return { ...EMPTY_PROFILE };
  }
}

async function persistProfile(userId: string, profile: MiniGameProfile): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.from('user_progress').upsert(
      {
        user_id: userId,
        item_type: 'mistake',
        item_id: MINIGAME_PROFILE_ITEM_ID,
        status: 'learning',
        score: profile.xp,
        attempts: 0,
        starred: false,
        wrong_count: 0,
        metadata_json: { minigame: profile },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,item_type,item_id' },
    );
  } catch (err) {
    console.warn('Could not save mini-game profile:', err);
  }
}

export interface AwardResult {
  profile: MiniGameProfile;
  gainedXp: number;
  dailyBonusXp: number;
  /** Set when this award crossed into a new belt */
  newBelt: NinjaBelt | null;
}

/**
 * Adds round XP and, when `dailyChallengeDateKey` is given and not done yet that day,
 * marks the daily challenge finished with its bonus.
 */
export async function awardMiniGameXp(
  userId: string | null | undefined,
  roundXp: number,
  dailyChallengeDateKey?: string,
): Promise<AwardResult> {
  const current = await loadMiniGameProfile(userId);
  const dailyBonusXp =
    dailyChallengeDateKey && !current.dailyChallengeDates.includes(dailyChallengeDateKey)
      ? DAILY_CHALLENGE_BONUS_XP
      : 0;
  const gainedXp = Math.max(0, Math.floor(roundXp));
  const next: MiniGameProfile = sanitizeProfile({
    xp: current.xp + gainedXp + dailyBonusXp,
    dailyChallengeDates:
      dailyBonusXp > 0
        ? [...current.dailyChallengeDates, dailyChallengeDateKey]
        : current.dailyChallengeDates,
  });

  const beforeBelt = getBeltInfo(current.xp).belt;
  const afterBelt = getBeltInfo(next.xp).belt;

  if (isSupabaseAccountUuid(userId) && supabase) {
    profileCache.set(userId, next);
    await persistProfile(userId, next);
  } else {
    guestProfile = next;
  }

  return {
    profile: next,
    gainedXp,
    dailyBonusXp,
    newBelt: afterBelt.minXp > beforeBelt.minXp ? afterBelt : null,
  };
}

/** Wipes cached profiles on logout / account switch. */
export function clearMiniGameProfileCache(): void {
  profileCache.clear();
  guestProfile = { ...EMPTY_PROFILE };
}

/** Deterministic pick of the day's challenge words: same list all day, new list tomorrow. */
export function pickDailyChallengeIds<T extends { id: number | string }>(
  words: T[],
  dateKey: string,
  seedSuffix: string,
): Array<T['id']> {
  if (words.length === 0) return [];
  let seed = 2166136261;
  for (const ch of `${dateKey}|${seedSuffix}`) {
    seed = Math.imul(seed ^ ch.charCodeAt(0), 16777619) >>> 0;
  }
  const random = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const ids = words.map((w) => w.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, DAILY_CHALLENGE_WORD_COUNT);
}
