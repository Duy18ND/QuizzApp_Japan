import type { JLPTListeningLine } from '../data/jlpt/jlptDataset';

export type CharacterArchetype =
  | 'female_young'
  | 'female_mature'
  | 'male_young'
  | 'male_senior'
  | 'narrator';

export type PausePacingMode = 'natural' | 'slow_dictation' | 'jlpt_exam';

export interface CharacterRoleMeta {
  archetype: CharacterArchetype;
  labelVi: string;
  shortTag: string;
  gender: 'female' | 'male' | 'neutral';
  tone: 'sakura' | 'primary' | 'success' | 'warning' | 'neutral';
  /** Pitch when speaker has their own distinct OS voice matching gender */
  distinctPitch: number;
  /** Pitch when speakers must share the same single fallback OS voice */
  fallbackPitch: number;
  /** Relative speaking cadence multiplier */
  rateFactor: number;
}

export const CHARACTER_ROLE_PRESETS: Record<CharacterArchetype, CharacterRoleMeta> = {
  female_young: {
    archetype: 'female_young',
    labelVi: 'Nữ (trẻ · sáng)',
    shortTag: 'Nữ trẻ',
    gender: 'female',
    tone: 'sakura',
    distinctPitch: 1.07,
    fallbackPitch: 1.24,
    rateFactor: 1.03,
  },
  female_mature: {
    archetype: 'female_mature',
    labelVi: 'Nữ (điềm đạm)',
    shortTag: 'Nữ điềm đạm',
    gender: 'female',
    tone: 'warning',
    distinctPitch: 0.98,
    fallbackPitch: 1.12,
    rateFactor: 0.96,
  },
  male_young: {
    archetype: 'male_young',
    labelVi: 'Nam (trẻ · rõ)',
    shortTag: 'Nam trẻ',
    gender: 'male',
    tone: 'primary',
    distinctPitch: 0.97,
    fallbackPitch: 0.78,
    rateFactor: 0.99,
  },
  male_senior: {
    archetype: 'male_senior',
    labelVi: 'Nam (trầm · quản lý)',
    shortTag: 'Nam trầm',
    gender: 'male',
    tone: 'success',
    distinctPitch: 0.87,
    fallbackPitch: 0.68,
    rateFactor: 0.92,
  },
  narrator: {
    archetype: 'narrator',
    labelVi: 'Dẫn chuyện / Thông báo',
    shortTag: 'Dẫn chuyện',
    gender: 'neutral',
    tone: 'neutral',
    distinctPitch: 1.0,
    fallbackPitch: 1.0,
    rateFactor: 0.94,
  },
};

export interface ClassifiedJapaneseVoice {
  voice: SpeechSynthesisVoice;
  uri: string;
  name: string;
  lang: string;
  gender: 'female' | 'male' | 'unknown';
  qualityScore: number;
  displayLabel: string;
}

export interface SpeakerCastAssignment {
  speaker: string;
  archetype: CharacterArchetype;
  roleMeta: CharacterRoleMeta;
  voice: SpeechSynthesisVoice | null;
  voiceLabel: string;
  pitch: number;
  rateFactor: number;
  isDistinctVoice: boolean;
}

export interface SpeechChunk {
  text: string;
  /** Milliseconds to pause AFTER this chunk before the next chunk (base at 1.0x speed) */
  pauseAfterMs: number;
  pauseReason: 'comma' | 'sentence' | 'turn' | 'narrator_shift' | 'end';
}

export interface DialogueVoicePrefs {
  pacing: PausePacingMode;
  playChime: boolean;
  /** Optional user override mapping speaker label -> chosen archetype */
  speakerArchetypeOverrides: Record<string, CharacterArchetype>;
  /** Optional user override mapping archetype -> specific SpeechSynthesisVoice.voiceURI */
  archetypeVoiceUriOverrides: Partial<Record<CharacterArchetype, string>>;
}

const VOICE_PREFS_STORAGE_KEY = 'nihongo_choukai_voice_prefs_v1';

export const DEFAULT_DIALOGUE_VOICE_PREFS: DialogueVoicePrefs = {
  pacing: 'natural',
  playChime: true,
  speakerArchetypeOverrides: {},
  archetypeVoiceUriOverrides: {},
};

export function loadDialogueVoicePrefs(): DialogueVoicePrefs {
  if (typeof window === 'undefined') return DEFAULT_DIALOGUE_VOICE_PREFS;
  try {
    const raw = window.localStorage.getItem(VOICE_PREFS_STORAGE_KEY);
    if (!raw) return DEFAULT_DIALOGUE_VOICE_PREFS;
    const parsed = JSON.parse(raw) as Partial<DialogueVoicePrefs>;
    const pacing: PausePacingMode =
      parsed.pacing === 'slow_dictation' || parsed.pacing === 'jlpt_exam' || parsed.pacing === 'natural'
        ? parsed.pacing
        : 'natural';
    return {
      pacing,
      playChime: typeof parsed.playChime === 'boolean' ? parsed.playChime : true,
      speakerArchetypeOverrides:
        parsed.speakerArchetypeOverrides && typeof parsed.speakerArchetypeOverrides === 'object'
          ? parsed.speakerArchetypeOverrides
          : {},
      archetypeVoiceUriOverrides:
        parsed.archetypeVoiceUriOverrides && typeof parsed.archetypeVoiceUriOverrides === 'object'
          ? parsed.archetypeVoiceUriOverrides
          : {},
    };
  } catch {
    return DEFAULT_DIALOGUE_VOICE_PREFS;
  }
}

export function saveDialogueVoicePrefs(prefs: DialogueVoicePrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOICE_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage quota errors
  }
}

/* ============================================================================
   1. JAPANESE VOICE DISCOVERY & GENDER/QUALITY CLASSIFICATION
   ============================================================================ */

const MALE_VOICE_PATTERNS = [
  'keita',
  'ichiro',
  'otoya',
  'hattori',
  'takumi',
  'daichi',
  'naoki',
  'kenji',
  'shohei',
  'eddy',
  'reed',
  'rocko',
  'grandpa',
  'male',
  '男',
  'ja-jp-x-jac',
  'ja-jp-x-htm',
  'ja-jp-x-jad-network',
];

const FEMALE_VOICE_PATTERNS = [
  'nanami',
  'haruka',
  'ayumi',
  'sayaka',
  'mayu',
  'shiori',
  'aoi',
  'kyoko',
  'o-ren',
  'mizuki',
  'kazuha',
  'tomoko',
  'flo',
  'sandy',
  'shelley',
  'grandma',
  'female',
  '女',
  'google 日本語',
  'ja-jp-x-jab',
  'ja-jp-x-jad-local',
];

function classifyVoiceGender(voice: SpeechSynthesisVoice): 'female' | 'male' | 'unknown' {
  const hay = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  if (MALE_VOICE_PATTERNS.some((p) => hay.includes(p))) return 'male';
  if (FEMALE_VOICE_PATTERNS.some((p) => hay.includes(p))) return 'female';
  return 'unknown';
}

function scoreVoiceQuality(voice: SpeechSynthesisVoice): number {
  const hay = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  let score = 10;
  if (hay.includes('natural') || hay.includes('online')) score += 40;
  if (hay.includes('enhanced') || hay.includes('premium')) score += 35;
  if (hay.includes('google')) score += 25;
  if (hay.includes('nanami') || hay.includes('keita')) score += 20;
  if (hay.includes('kyoko') || hay.includes('otoya') || hay.includes('hattori')) score += 18;
  if (hay.includes('ayumi') || hay.includes('ichiro') || hay.includes('haruka') || hay.includes('sayaka')) {
    score += 12;
  }
  if (voice.localService) score += 2;
  return score;
}

function formatVoiceShortName(voice: SpeechSynthesisVoice): string {
  return voice.name
    .replace(/Microsoft\s+/i, '')
    .replace(/\s+Online\s+\(Natural\)\s*-\s*Japanese\s*\(Japan\)/i, ' (Natural)')
    .replace(/\s*-\s*Japanese\s*\(Japan\)/i, '')
    .replace(/\s+Desktop/i, '')
    .trim();
}

export function discoverJapaneseVoices(): ClassifiedJapaneseVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  const raw = window.speechSynthesis.getVoices();
  const seen = new Set<string>();
  const results: ClassifiedJapaneseVoice[] = [];

  for (const voice of raw) {
    if (!voice.lang.toLowerCase().startsWith('ja')) continue;
    const key = voice.voiceURI || voice.name;
    if (seen.has(key)) continue;
    seen.add(key);

    const gender = classifyVoiceGender(voice);
    const shortName = formatVoiceShortName(voice);
    const genderBadge = gender === 'male' ? 'Nam' : gender === 'female' ? 'Nữ' : 'Nhật';
    results.push({
      voice,
      uri: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      gender,
      qualityScore: scoreVoiceQuality(voice),
      displayLabel: `${shortName} (${genderBadge})`,
    });
  }

  return results.sort((a, b) => b.qualityScore - a.qualityScore);
}

/* ============================================================================
   2. CONTEXTUAL CHARACTER ROLE CASTING (ALL N5–N3 SPEAKERS + CUSTOM)
   ============================================================================ */

const NARRATOR_SPEAKERS = ['ナレーション', '案内', '放送', 'アナウンス', '司会', 'ナレーター'];
const EXPLICIT_FEMALE_SPEAKERS = ['女', '女子', '彼女', '母', 'お母さん', '奥さん', '妹', '姉', '娘', '妻'];
const EXPLICIT_MALE_SPEAKERS = ['男', '男子', '彼', '父', 'お父さん', '夫', '兄', '弟', '息子', '田中', '佐藤', '鈴木', '山田'];
const SENIOR_MALE_SPEAKERS = ['部長', '課長', '上司', '店長', '社長', '駅員', '医者', '運転手', '警備員'];

function matchesAny(speaker: string, keywords: string[]): boolean {
  const s = speaker.trim();
  return keywords.some((kw) => s === kw || s.includes(kw));
}

/**
 * Automatically casts every speaker in a listening dialogue into a distinct,
 * realistic CharacterArchetype using speaker labels + dialogue situation/prompt context.
 */
export function inferSpeakerArchetypes(
  dialogue: JLPTListeningLine[],
  context?: { situation?: string; questionPrompt?: string },
): Map<string, CharacterArchetype> {
  const uniqueSpeakers: string[] = [];
  for (const line of dialogue) {
    const sp = (line.speaker || '話者').trim();
    if (!uniqueSpeakers.includes(sp)) uniqueSpeakers.push(sp);
  }

  const contextText = `${context?.situation ?? ''} ${context?.questionPrompt ?? ''}`;
  const map = new Map<string, CharacterArchetype>();

  // Pass 1: Cast unmistakable explicit roles first
  for (const sp of uniqueSpeakers) {
    if (matchesAny(sp, NARRATOR_SPEAKERS)) {
      map.set(sp, 'narrator');
    } else if (matchesAny(sp, SENIOR_MALE_SPEAKERS)) {
      map.set(sp, 'male_senior');
    } else if (matchesAny(sp, EXPLICIT_FEMALE_SPEAKERS)) {
      map.set(sp, 'female_young');
    } else if (matchesAny(sp, EXPLICIT_MALE_SPEAKERS)) {
      // If context says this male speaker is a manager/boss (e.g. Trưởng phòng dặn nhân viên)
      const isBossMale =
        sp === '男' && /trưởng phòng|quản lý|sếp|giám đốc|課長|部長|上司/i.test(contextText);
      map.set(sp, isBossMale ? 'male_senior' : 'male_young');
    }
  }

  // Pass 2: Cast context-dependent roles so paired speakers ALWAYS contrast naturally
  const hasAssignedFemale = () =>
    Array.from(map.values()).some((a) => a === 'female_young' || a === 'female_mature');
  const hasAssignedMale = () =>
    Array.from(map.values()).some((a) => a === 'male_young' || a === 'male_senior');

  for (const sp of uniqueSpeakers) {
    if (map.has(sp)) continue;

    if (sp.includes('先生')) {
      // Teacher: mature female by default unless prompt mentions male teacher or female student
      if (/男の先生|thầy giáo/i.test(contextText)) {
        map.set(sp, 'male_senior');
      } else {
        map.set(sp, 'female_mature');
      }
      continue;
    }

    if (sp.includes('学生')) {
      if (/女の学生|nữ sinh/i.test(contextText)) {
        map.set(sp, 'female_young');
      } else if (/男の学生|nam sinh/i.test(contextText)) {
        map.set(sp, 'male_young');
      } else {
        map.set(sp, hasAssignedFemale() ? 'male_young' : 'female_young');
      }
      continue;
    }

    if (sp.includes('客')) {
      if (/女の人|女の客|khách nữ/i.test(contextText)) {
        map.set(sp, 'female_young');
      } else {
        map.set(sp, 'male_young');
      }
      continue;
    }

    if (sp.includes('店員') || sp.includes('職員')) {
      // Contrast with customer / student
      if (hasAssignedFemale() && !hasAssignedMale()) {
        map.set(sp, 'male_young');
      } else {
        map.set(sp, 'female_mature');
      }
      continue;
    }

    if (sp.includes('社員')) {
      if (/男の社員|nam nhân viên/i.test(contextText)) {
        map.set(sp, 'male_young');
      } else {
        map.set(sp, hasAssignedMale() ? 'female_young' : 'male_young');
      }
      continue;
    }

    if (sp.includes('記者')) {
      map.set(sp, hasAssignedMale() ? 'female_young' : 'male_young');
      continue;
    }

    if (sp.includes('同僚') || sp.includes('友達')) {
      map.set(sp, hasAssignedFemale() && !hasAssignedMale() ? 'male_young' : 'female_young');
      continue;
    }

    // Generic fallback: alternate genders for maximum contrast between roles
    if (!hasAssignedFemale()) {
      map.set(sp, 'female_young');
    } else if (!hasAssignedMale()) {
      map.set(sp, 'male_young');
    } else {
      map.set(sp, 'female_mature');
    }
  }

  // Pass 3: Contrast guard — if a 2+ person dialogue ended up with identical archetypes (e.g. 男 + 駅員),
  // ensure each speaker gets a distinct archetype!
  if (uniqueSpeakers.length >= 2) {
    const usedArchetypes = new Set<CharacterArchetype>();
    for (const sp of uniqueSpeakers) {
      const arch = map.get(sp) ?? 'female_young';
      if (!usedArchetypes.has(arch)) {
        usedArchetypes.add(arch);
        continue;
      }
      // Pick an unused contrasting archetype
      const fallbackOrder: CharacterArchetype[] =
        arch.startsWith('male')
          ? ['male_senior', 'female_mature', 'female_young', 'male_young']
          : ['male_young', 'female_mature', 'male_senior', 'female_young'];
      const next = fallbackOrder.find((cand) => !usedArchetypes.has(cand)) ?? arch;
      map.set(sp, next);
      usedArchetypes.add(next);
    }
  }

  return map;
}

/**
 * Builds the full voice cast for a dialogue, assigning DISTINCT OS Japanese voices
 * wherever >= 2 ja-JP voices exist, and widened pitch/rate separation when voices are scarce.
 */
export function buildDialogueCast(
  dialogue: JLPTListeningLine[],
  availableVoices: ClassifiedJapaneseVoice[],
  prefs: DialogueVoicePrefs,
  context?: { situation?: string; questionPrompt?: string },
): Map<string, SpeakerCastAssignment> {
  const inferred = inferSpeakerArchetypes(dialogue, context);
  const cast = new Map<string, SpeakerCastAssignment>();
  const usedVoiceUris = new Set<string>();

  const maleVoices = availableVoices.filter((v) => v.gender === 'male');
  const femaleVoices = availableVoices.filter((v) => v.gender === 'female');
  const unknownVoices = availableVoices.filter((v) => v.gender === 'unknown');

  const pickVoiceForArchetype = (archetype: CharacterArchetype): {
    chosen: ClassifiedJapaneseVoice | null;
    matchedGender: boolean;
    isDistinct: boolean;
  } => {
    // 1. Respect explicit user voice override for this archetype
    const overrideUri = prefs.archetypeVoiceUriOverrides[archetype];
    if (overrideUri) {
      const found = availableVoices.find((v) => v.uri === overrideUri);
      if (found) {
        const isDistinct = !usedVoiceUris.has(found.uri);
        usedVoiceUris.add(found.uri);
        const roleGender = CHARACTER_ROLE_PRESETS[archetype].gender;
        return {
          chosen: found,
          matchedGender: roleGender === 'neutral' || found.gender === roleGender,
          isDistinct,
        };
      }
    }

    if (availableVoices.length === 0) {
      return { chosen: null, matchedGender: false, isDistinct: false };
    }

    const roleGender = CHARACTER_ROLE_PRESETS[archetype].gender;

    // 2. Try unused voice from the exact matching gender pool first
    const primaryPool =
      roleGender === 'male'
        ? maleVoices
        : roleGender === 'female'
          ? femaleVoices
          : [...femaleVoices, ...unknownVoices, ...maleVoices];

    const unusedSameGender = primaryPool.find((v) => !usedVoiceUris.has(v.uri));
    if (unusedSameGender) {
      usedVoiceUris.add(unusedSameGender.uri);
      return { chosen: unusedSameGender, matchedGender: true, isDistinct: true };
    }

    // 3. Try ANY unused Japanese voice so Speaker A & Speaker B NEVER share the same voice model
    const secondaryPool = [...unknownVoices, ...femaleVoices, ...maleVoices];
    const unusedAny = secondaryPool.find((v) => !usedVoiceUris.has(v.uri));
    if (unusedAny) {
      usedVoiceUris.add(unusedAny.uri);
      return {
        chosen: unusedAny,
        matchedGender: roleGender === 'neutral' || unusedAny.gender === roleGender,
        isDistinct: true,
      };
    }

    // 4. Only 1 voice (or fewer voices than speakers) available on this browser: reuse best matching voice
    const fallback = primaryPool[0] ?? availableVoices[0];
    return {
      chosen: fallback,
      matchedGender: roleGender === 'neutral' || fallback.gender === roleGender,
      isDistinct: false,
    };
  };

  for (const [speaker, autoArch] of inferred.entries()) {
    const archetype = prefs.speakerArchetypeOverrides[speaker] ?? autoArch;
    const roleMeta = CHARACTER_ROLE_PRESETS[archetype];
    const { chosen, matchedGender, isDistinct } = pickVoiceForArchetype(archetype);

    // If this speaker got a real gender-matched voice (e.g. Keita for male, Nanami for female),
    // use natural subtle pitch; if sharing a fallback/opposite-gender voice, use wider role pitch!
    const useNaturalPitch = Boolean(chosen && matchedGender && isDistinct);
    const pitch = useNaturalPitch ? roleMeta.distinctPitch : roleMeta.fallbackPitch;

    cast.set(speaker, {
      speaker,
      archetype,
      roleMeta,
      voice: chosen?.voice ?? null,
      voiceLabel: chosen ? chosen.displayLabel : 'Giọng Nhật mặc định',
      pitch,
      rateFactor: roleMeta.rateFactor,
      isDistinctVoice: isDistinct && Boolean(chosen),
    });
  }

  return cast;
}

/* ============================================================================
   3. NATURAL JAPANESE PROSODY & PAUSE CHUNKING ("CÓ NGẮT VÀ CÓ NGHỈ")
   ============================================================================ */

const PACING_MULTIPLIER: Record<PausePacingMode, number> = {
  natural: 1.0,
  slow_dictation: 1.5,
  jlpt_exam: 0.88,
};

/**
 * Cleans artificial bunsetsu spaces between Japanese characters (e.g. "あしたの しゅくだいは")
 * so Japanese TTS voices deliver smooth native intonation instead of staccato word-by-word breaks.
 */
export function normalizeJapaneseForTts(rawText: string): string {
  return rawText
    .replace(/\s+/g, ' ')
    .replace(/([\u3000-\u30ff\u4e00-\u9faf\uff01-\uff60]) (?=[\u3000-\u30ff\u4e00-\u9faf\uff01-\uff60])/g, '$1')
    .trim();
}

/**
 * Splits a single speaker's line into natural spoken clauses with authentic
 * intra-sentence breath pauses and inter-turn handoff pauses.
 */
export function splitLineIntoSpeechChunks(
  line: JLPTListeningLine,
  nextLine: JLPTListeningLine | undefined,
  pacing: PausePacingMode,
  playbackRate: number,
): SpeechChunk[] {
  const clean = normalizeJapaneseForTts(line.plainText);
  if (!clean) return [];

  const paceScale = PACING_MULTIPLIER[pacing];
  // When playing slower (0.85x), extend pauses slightly so rhythm feels balanced
  const speedCompensation = playbackRate < 1 ? 1 / Math.max(0.75, playbackRate) : 1;
  const scaleMs = (baseMs: number) => Math.round(baseMs * paceScale * speedCompensation);

  // Split by sentence terminators while keeping punctuation attached for proper intonation (? rises!)
  const rawSentences = clean
    .split(/(?<=[。！？!?]+)/)
    .map((s) => s.trim())
    .filter(Boolean);

  // For long sentences (> 36 chars), split once or more on Japanese commas (、) for natural breath pauses
  const phrasePieces: Array<{ text: string; isSentenceEnd: boolean }> = [];
  for (const sentence of rawSentences) {
    if (sentence.length > 36 && /[、，]/.test(sentence)) {
      const commaParts = sentence
        .split(/(?<=[、，])/)
        .map((p) => p.trim())
        .filter(Boolean);

      // Re-group short comma fragments so we don't over-fragment short clauses
      let buffer = '';
      for (let i = 0; i < commaParts.length; i += 1) {
        const part = commaParts[i];
        const isLastPart = i === commaParts.length - 1;
        const candidate = buffer + part;
        if (buffer && candidate.length > 34) {
          phrasePieces.push({ text: buffer, isSentenceEnd: false });
          buffer = part;
        } else {
          buffer = candidate;
        }
        if (isLastPart && buffer) {
          phrasePieces.push({ text: buffer, isSentenceEnd: true });
          buffer = '';
        }
      }
      if (buffer) {
        phrasePieces.push({ text: buffer, isSentenceEnd: true });
      }
    } else {
      phrasePieces.push({ text: sentence, isSentenceEnd: true });
    }
  }

  const currentIsNarrator = matchesAny(line.speaker, NARRATOR_SPEAKERS);
  const nextIsNarrator = nextLine ? matchesAny(nextLine.speaker, NARRATOR_SPEAKERS) : false;
  const sameSpeakerNext = nextLine ? nextLine.speaker === line.speaker : false;

  return phrasePieces.map((piece, idx) => {
    const isLastChunkInLine = idx === phrasePieces.length - 1;
    if (!isLastChunkInLine) {
      return {
        text: piece.text,
        pauseAfterMs: piece.isSentenceEnd ? scaleMs(380) : scaleMs(210),
        pauseReason: piece.isSentenceEnd ? 'sentence' : 'comma',
      };
    }

    if (!nextLine) {
      return {
        text: piece.text,
        pauseAfterMs: 0,
        pauseReason: 'end',
      };
    }

    if (currentIsNarrator || nextIsNarrator) {
      return {
        text: piece.text,
        pauseAfterMs: scaleMs(1000),
        pauseReason: 'narrator_shift',
      };
    }

    if (sameSpeakerNext) {
      return {
        text: piece.text,
        pauseAfterMs: scaleMs(480),
        pauseReason: 'sentence',
      };
    }

    // Standard turn-taking pause between Character A and Character B
    return {
      text: piece.text,
      pauseAfterMs: scaleMs(760),
      pauseReason: 'turn',
    };
  });
}

/* ============================================================================
   4. SUBTLE JLPT CHIME (WEB AUDIO API — ZERO EXTERNAL ASSETS)
   ============================================================================ */

export function playJlptChime(kind: 'start' | 'end' = 'start'): void {
  if (typeof window === 'undefined') return;
  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = kind === 'start' ? [523.25, 659.25] : [659.25, 523.25];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.055, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });

    window.setTimeout(() => {
      void ctx.close().catch(() => {});
    }, 650);
  } catch {
    // Ignore autoplay restriction errors silently
  }
}

/* ============================================================================
   5. HELPER TO PARSE PLAIN MULTI-LINE SCRIPT FOR ADMIN/CMS PREVIEW
   ============================================================================ */

export function parsePlainDialogueScript(rawScript: string): JLPTListeningLine[] {
  return rawScript
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const colonIdx = line.search(/[:：]/);
      const hasSpeaker = colonIdx > 0 && colonIdx < 16;
      const speaker = hasSpeaker ? line.slice(0, colonIdx).trim() : '話者';
      const plainText = hasSpeaker ? line.slice(colonIdx + 1).trim() : line;
      return {
        speaker,
        plainText,
        segments: [{ text: plainText }],
      };
    });
}
