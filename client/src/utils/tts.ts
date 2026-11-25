import type { JLPTListeningLine } from '../data/jlpt/jlptDataset';
import { loadAppSettings } from '../hooks/useAppSettings';
import {
  buildDialogueCast,
  discoverJapaneseVoices,
  loadDialogueVoicePrefs,
  normalizeJapaneseForTts,
} from './dialogueAudioEngine';

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

export function stopJapaneseSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Parses a multi-line dialogue script (e.g. "女: すみません...\n男: はい...") into
 * `JLPTListeningLine[]` so custom Listening Quizzes automatically play with
 * multi-voice Male/Female speakers via AudioSpeechPlayer.
 * Returns null if the text is a single-speaker sentence without speaker prefixes.
 */
export function parseCustomDialogueLines(rawText: string | undefined | null): JLPTListeningLine[] | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return null;

  const parsed: JLPTListeningLine[] = [];
  const speakerRe = /^([^:：]{1,18})\s*[:：]\s*(.+)$/;
  const speakers = new Set<string>();

  for (const line of lines) {
    const m = line.match(speakerRe);
    if (!m) continue;
    const speaker = m[1].trim();
    const plainText = m[2].trim();
    if (!speaker || !plainText) continue;
    speakers.add(speaker);
    parsed.push({
      speaker,
      plainText,
      segments: [{ text: plainText }],
    });
  }

  if (parsed.length < 2 || speakers.size < 2) return null;
  return parsed;
}

/**
 * Plays a short multi-speaker dialogue directly via Web Speech Synthesis using the user's
 * saved `dialogueAudioEngine` cast & voice preferences (used for Preview buttons).
 */
export function speakJapaneseDialoguePreview(
  dialogue: JLPTListeningLine[],
  rateOverride?: number,
): boolean {
  if (!isSpeechSupported() || dialogue.length === 0) return false;
  const { ttsRate } = loadAppSettings();
  const baseRate =
    typeof rateOverride === 'number' && Number.isFinite(rateOverride)
      ? Math.max(0.6, Math.min(1.5, rateOverride))
      : ttsRate;
  const voices = discoverJapaneseVoices();
  const prefs = loadDialogueVoicePrefs();
  const cast = buildDialogueCast(dialogue, voices, prefs);

  try {
    window.speechSynthesis.cancel();
    dialogue.forEach((line) => {
      const assignment = cast.get(line.speaker);
      const utterance = new SpeechSynthesisUtterance(normalizeJapaneseForTts(line.plainText));
      utterance.lang = assignment?.voice?.lang || 'ja-JP';
      if (assignment?.voice) {
        utterance.voice = assignment.voice;
      }
      utterance.rate = Math.max(0.6, Math.min(1.5, baseRate * (assignment?.rateFactor ?? 1)));
      utterance.pitch = Math.max(0.55, Math.min(1.75, assignment?.pitch ?? 1.0));
      window.speechSynthesis.speak(utterance);
    });
    return true;
  } catch {
    return false;
  }
}

export function speakJapanese(text: string, rateOverride?: number): boolean {
  const trimmed = text.trim();
  if (!trimmed || !isSpeechSupported()) return false;

  // If text contains a multi-speaker dialogue ("女: ...\n男: ..."), play with multi-voice cast!
  const multiLines = parseCustomDialogueLines(trimmed);
  if (multiLines) {
    return speakJapaneseDialoguePreview(multiLines, rateOverride);
  }

  const { ttsRate, ttsVoiceUri, ttsGenderPref } = loadAppSettings();
  const rate =
    typeof rateOverride === 'number' && Number.isFinite(rateOverride)
      ? Math.max(0.6, Math.min(1.5, rateOverride))
      : ttsRate;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;

    const pool = discoverJapaneseVoices();
    if (pool.length > 0) {
      let chosen = ttsVoiceUri ? pool.find((v) => v.uri === ttsVoiceUri) : undefined;
      if (!chosen && ttsGenderPref !== 'auto') {
        chosen = pool.find((v) => v.gender === ttsGenderPref);
      }
      if (!chosen) {
        chosen = pool[0];
      }
      if (chosen) {
        utterance.voice = chosen.voice;
        utterance.lang = chosen.lang || 'ja-JP';
        // Subtle pitch distinction when user requested male/female but OS only has 1 voice
        if (!ttsVoiceUri && ttsGenderPref !== 'auto' && chosen.gender !== ttsGenderPref) {
          utterance.pitch = ttsGenderPref === 'male' ? 0.82 : 1.15;
        }
      }
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
