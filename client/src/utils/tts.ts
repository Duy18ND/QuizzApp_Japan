import { loadAppSettings } from '../hooks/useAppSettings';

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

export function speakJapanese(text: string, rateOverride?: number): boolean {
  const trimmed = text.trim();
  if (!trimmed || !isSpeechSupported()) return false;

  const { ttsRate } = loadAppSettings();
  const rate =
    typeof rateOverride === 'number' && Number.isFinite(rateOverride)
      ? Math.max(0.6, Math.min(1.5, rateOverride))
      : ttsRate;

  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
