import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Pause, Play, RotateCcw, SlidersHorizontal, Users, Volume2 } from 'lucide-react';
import { Badge, Button, Chip, Notice, Select, Switch } from '../ui';
import type { JLPTListeningLine } from '../../data/jlpt/jlptDataset';
import {
  CHARACTER_ROLE_PRESETS,
  DEFAULT_DIALOGUE_VOICE_PREFS,
  buildDialogueCast,
  discoverJapaneseVoices,
  loadDialogueVoicePrefs,
  normalizeJapaneseForTts,
  playJlptChime,
  saveDialogueVoicePrefs,
  splitLineIntoSpeechChunks,
  type CharacterArchetype,
  type ClassifiedJapaneseVoice,
  type DialogueVoicePrefs,
  type PausePacingMode,
  type SpeakerCastAssignment,
} from '../../utils/dialogueAudioEngine';
import { FuriganaText } from './FuriganaText';

const ARCHETYPE_OPTIONS: Array<{ value: CharacterArchetype; label: string }> = [
  { value: 'female_young', label: CHARACTER_ROLE_PRESETS.female_young.labelVi },
  { value: 'female_mature', label: CHARACTER_ROLE_PRESETS.female_mature.labelVi },
  { value: 'male_young', label: CHARACTER_ROLE_PRESETS.male_young.labelVi },
  { value: 'male_senior', label: CHARACTER_ROLE_PRESETS.male_senior.labelVi },
  { value: 'narrator', label: CHARACTER_ROLE_PRESETS.narrator.labelVi },
];

const PACING_OPTIONS: Array<{ value: PausePacingMode; label: string }> = [
  { value: 'natural', label: 'Tự nhiên' },
  { value: 'slow_dictation', label: 'Nghỉ dài · Dễ chép' },
  { value: 'jlpt_exam', label: 'Chuẩn thi JLPT' },
];

const ROLE_CHIP_STYLES: Record<SpeakerCastAssignment['roleMeta']['tone'], string> = {
  sakura: 'border-sakura-line bg-sakura-soft text-sakura-fg',
  primary: 'border-primary-line bg-primary-soft text-primary-fg',
  warning: 'border-warning-line bg-warning-soft text-warning-fg',
  success: 'border-success-line bg-success-soft text-success-fg',
  neutral: 'border-line bg-surface-3 text-fg',
};

const ROLE_ACTIVE_RING: Record<SpeakerCastAssignment['roleMeta']['tone'], string> = {
  sakura: 'ring-2 ring-sakura-line shadow-xs',
  primary: 'ring-2 ring-primary-line shadow-xs',
  warning: 'ring-2 ring-warning-line shadow-xs',
  success: 'ring-2 ring-success-line shadow-xs',
  neutral: 'ring-2 ring-line-strong shadow-xs',
};

const PREFS_SYNC_EVENT = 'nihongo-choukai-prefs-updated';

function useJapaneseVoicePool(): ClassifiedJapaneseVoice[] {
  const [voices, setVoices] = useState<ClassifiedJapaneseVoice[]>(() => discoverJapaneseVoices());

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const refresh = () => {
      setVoices(discoverJapaneseVoices());
    };
    window.speechSynthesis.addEventListener?.('voiceschanged', refresh);
    const retryTimer = window.setTimeout(refresh, 350);
    return () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', refresh);
      window.clearTimeout(retryTimer);
    };
  }, []);

  return voices;
}

function useSyncedDialogueVoicePrefs(): [DialogueVoicePrefs, (next: DialogueVoicePrefs) => void] {
  const [prefs, setPrefs] = useState<DialogueVoicePrefs>(() => loadDialogueVoicePrefs());

  useEffect(() => {
    const sync = () => setPrefs(loadDialogueVoicePrefs());
    window.addEventListener(PREFS_SYNC_EVENT, sync);
    return () => window.removeEventListener(PREFS_SYNC_EVENT, sync);
  }, []);

  const updatePrefs = useCallback((next: DialogueVoicePrefs) => {
    saveDialogueVoicePrefs(next);
    setPrefs(next);
    window.dispatchEvent(new Event(PREFS_SYNC_EVENT));
  }, []);

  return [prefs, updatePrefs];
}

export interface AudioSpeechPlayerProps {
  dialogue: JLPTListeningLine[];
  situation?: string;
  questionPrompt?: string;
  onActiveLineChange?: (lineIdx: number | null) => void;
  /** Optional external request to play a single line (e.g. clicked from Transcript) */
  playLineRequest?: { idx: number; nonce: number } | null;
}

export const AudioSpeechPlayer: React.FC<AudioSpeechPlayerProps> = ({
  dialogue,
  situation,
  questionPrompt,
  onActiveLineChange,
  playLineRequest,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [pauseHint, setPauseHint] = useState<string | null>(null);
  const [rate, setRate] = useState<number>(1.0);
  const [showCastPanel, setShowCastPanel] = useState(false);

  const voices = useJapaneseVoicePool();
  const [prefs, updatePrefs] = useSyncedDialogueVoicePrefs();

  const sessionIdRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const lastHandledNonceRef = useRef<number>(-1);

  const supportsSpeech =
    typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

  const castMap = useMemo(
    () => buildDialogueCast(dialogue, voices, prefs, { situation, questionPrompt }),
    [dialogue, voices, prefs, situation, questionPrompt],
  );

  const castList = useMemo(() => Array.from(castMap.values()), [castMap]);

  const setActiveLine = useCallback(
    (idx: number | null) => {
      setActiveLineIdx(idx);
      onActiveLineChange?.(idx);
    },
    [onActiveLineChange],
  );

  const clearScheduledTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopAudio = useCallback(() => {
    sessionIdRef.current += 1;
    clearScheduledTimer();
    if (supportsSpeech) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setPauseHint(null);
    setActiveLine(null);
  }, [clearScheduledTimer, setActiveLine, supportsSpeech]);

  useEffect(() => {
    return () => {
      sessionIdRef.current += 1;
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      if (supportsSpeech) {
        window.speechSynthesis.cancel();
      }
    };
  }, [supportsSpeech]);

  const createCharacterUtterance = useCallback(
    (text: string, assignment: SpeakerCastAssignment | undefined, baseRate: number): SpeechSynthesisUtterance => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = assignment?.voice?.lang || 'ja-JP';
      if (assignment?.voice) {
        utterance.voice = assignment.voice;
      }
      const effectiveRate = Math.max(0.6, Math.min(1.5, baseRate * (assignment?.rateFactor ?? 1)));
      const effectivePitch = Math.max(0.55, Math.min(1.75, assignment?.pitch ?? 1.0));
      utterance.rate = effectiveRate;
      utterance.pitch = effectivePitch;
      utterance.volume = 1;
      return utterance;
    },
    [],
  );

  const speakSequence = useCallback(
    (startLineIdx: number, endLineIdxExclusive: number, withChime: boolean) => {
      if (!supportsSpeech || dialogue.length === 0) return;

      const mySession = sessionIdRef.current + 1;
      sessionIdRef.current = mySession;
      clearScheduledTimer();
      window.speechSynthesis.cancel();

      setIsPlaying(true);
      setPauseHint(null);

      // Build flattened chunk queue with character cast & exact pause timings
      interface QueuedStep {
        lineIdx: number;
        speaker: string;
        text: string;
        pauseAfterMs: number;
        pauseReason: 'comma' | 'sentence' | 'turn' | 'narrator_shift' | 'end';
      }

      const steps: QueuedStep[] = [];
      for (let i = startLineIdx; i < Math.min(endLineIdxExclusive, dialogue.length); i += 1) {
        const line = dialogue[i];
        const nextLine = i + 1 < Math.min(endLineIdxExclusive, dialogue.length) ? dialogue[i + 1] : undefined;
        const chunks = splitLineIntoSpeechChunks(line, nextLine, prefs.pacing, rate);
        for (const chunk of chunks) {
          steps.push({
            lineIdx: i,
            speaker: line.speaker,
            text: chunk.text,
            pauseAfterMs: chunk.pauseAfterMs,
            pauseReason: chunk.pauseReason,
          });
        }
      }

      if (steps.length === 0) {
        setIsPlaying(false);
        setActiveLine(null);
        return;
      }

      const runStep = (stepIdx: number) => {
        if (sessionIdRef.current !== mySession) return;
        if (stepIdx >= steps.length) {
          if (withChime && prefs.playChime) {
            playJlptChime('end');
          }
          setIsPlaying(false);
          setPauseHint(null);
          setActiveLine(null);
          return;
        }

        const step = steps[stepIdx];
        const assignment = castMap.get(step.speaker);
        setActiveLine(step.lineIdx);
        setPauseHint(null);

        const utterance = createCharacterUtterance(step.text, assignment, rate);

        const scheduleNext = () => {
          if (sessionIdRef.current !== mySession) return;
          const isLastStep = stepIdx >= steps.length - 1;
          if (isLastStep || step.pauseAfterMs <= 0) {
            runStep(stepIdx + 1);
            return;
          }

          if (step.pauseReason === 'turn') {
            setPauseHint('Nghỉ chuyển vai...');
          } else if (step.pauseReason === 'narrator_shift') {
            setPauseHint('Nghỉ chuyển cảnh...');
          } else if (step.pauseReason === 'sentence') {
            setPauseHint('Ngắt câu...');
          } else {
            setPauseHint('Ngắt nhịp...');
          }

          timerRef.current = window.setTimeout(() => {
            timerRef.current = null;
            runStep(stepIdx + 1);
          }, step.pauseAfterMs);
        };

        utterance.onend = scheduleNext;
        utterance.onerror = (ev) => {
          if (sessionIdRef.current !== mySession) return;
          if (ev.error === 'interrupted' || ev.error === 'canceled') return;
          // Skip faulty chunk gracefully instead of locking up the player
          scheduleNext();
        };

        window.speechSynthesis.speak(utterance);
      };

      const startDelayMs = withChime && prefs.playChime ? 360 : 50;
      if (withChime && prefs.playChime) {
        playJlptChime('start');
        setPauseHint('Chuẩn bị vào hội thoại...');
      }

      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        runStep(0);
      }, startDelayMs);
    },
    [castMap, clearScheduledTimer, createCharacterUtterance, dialogue, prefs.pacing, prefs.playChime, rate, setActiveLine, supportsSpeech],
  );

  // Trigger single-line playback when requested from Transcript
  useEffect(() => {
    if (!playLineRequest) return;
    if (playLineRequest.nonce === lastHandledNonceRef.current) return;
    lastHandledNonceRef.current = playLineRequest.nonce;
    if (playLineRequest.idx < 0 || playLineRequest.idx >= dialogue.length) return;
    const lineIdx = playLineRequest.idx;
    const id = window.setTimeout(() => {
      speakSequence(lineIdx, lineIdx + 1, false);
    }, 0);
    return () => window.clearTimeout(id);
  }, [dialogue.length, playLineRequest, speakSequence]);

  const handleTogglePlay = () => {
    if (!supportsSpeech) return;
    if (isPlaying) {
      stopAudio();
      return;
    }
    speakSequence(0, dialogue.length, true);
  };

  const handlePreviewSpeaker = (speaker: string) => {
    if (!supportsSpeech) return;
    const firstLineIdx = dialogue.findIndex((l) => l.speaker === speaker);
    if (firstLineIdx >= 0) {
      speakSequence(firstLineIdx, firstLineIdx + 1, false);
      return;
    }
    const assignment = castMap.get(speaker);
    if (!assignment) return;
    stopAudio();
    const sample = normalizeJapaneseForTts('こんにちは。よろしくお願いします。');
    const utterance = createCharacterUtterance(sample, assignment, rate);
    window.setTimeout(() => window.speechSynthesis.speak(utterance), 45);
  };

  const activeSpeaker = activeLineIdx !== null ? dialogue[activeLineIdx]?.speaker : null;
  const activeCast = activeSpeaker ? castMap.get(activeSpeaker) : undefined;
  const distinctVoicesCount = new Set(castList.map((c) => c.voice?.voiceURI).filter(Boolean)).size;
  const hasMultipleSpeakers = castList.length >= 2;
  const onlyOneOsVoice = voices.length <= 1 && hasMultipleSpeakers;

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
      {/* Row 1: Main Playback Controls + Speed */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={isPlaying ? 'secondary' : 'primary'}
            size="md"
            leftIcon={isPlaying ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
            onClick={handleTogglePlay}
            disabled={!supportsSpeech}
          >
            {isPlaying ? 'Dừng phát' : 'Phát hội thoại'}
          </Button>

          <div className="flex items-center gap-2 text-sm text-muted">
            <Volume2
              className={`size-4 ${isPlaying && !pauseHint ? 'animate-pulse text-primary-fg' : 'text-primary-fg'}`}
              aria-hidden
            />
            <span>
              {isPlaying && activeLineIdx !== null ? (
                pauseHint ? (
                  <span className="font-medium text-warning-fg">{pauseHint}</span>
                ) : (
                  <>
                    Đang đọc:{' '}
                    <strong className="text-fg">
                      {activeSpeaker} ({activeCast?.roleMeta.shortTag ?? 'Nhân vật'})
                    </strong>{' '}
                    · lượt {activeLineIdx + 1}/{dialogue.length}
                  </>
                )
              ) : (
                `${dialogue.length} lượt thoại · ${castList.length} vai nhân vật`
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted">Tốc độ:</span>
          {[0.8, 0.9, 1.0, 1.15].map((speed) => (
            <Chip key={speed} selected={rate === speed} onClick={() => setRate(speed)} disabled={isPlaying}>
              {speed === 1 ? '1.0x' : `${speed}x`}
            </Chip>
          ))}
        </div>
      </div>

      {/* Row 2: Live Character Cast Bar (Đóng vai nhân vật) */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
            <Users className="size-3.5" aria-hidden />
            Đóng vai:
          </span>
          {castList.map((entry) => {
            const isSpeakingThis = isPlaying && activeSpeaker === entry.speaker && !pauseHint;
            return (
              <button
                key={entry.speaker}
                type="button"
                onClick={() => handlePreviewSpeaker(entry.speaker)}
                title={`Bấm để nghe thử vai ${entry.speaker} (${entry.roleMeta.labelVi} · ${entry.voiceLabel})`}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all',
                  ROLE_CHIP_STYLES[entry.roleMeta.tone],
                  isSpeakingThis ? ROLE_ACTIVE_RING[entry.roleMeta.tone] : 'hover:opacity-90',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className={[
                    'size-1.5 rounded-full bg-current',
                    isSpeakingThis ? 'animate-ping' : 'opacity-65',
                  ].join(' ')}
                />
                <span lang="ja">{entry.speaker}</span>
                <span className="opacity-75">· {entry.roleMeta.shortTag}</span>
              </button>
            );
          })}
        </div>

        <Button
          variant={showCastPanel ? 'soft' : 'ghost'}
          size="sm"
          leftIcon={<SlidersHorizontal className="size-3.5" aria-hidden />}
          onClick={() => setShowCastPanel((v) => !v)}
        >
          Giọng &amp; Nhịp nghỉ
        </Button>
      </div>

      {/* Collapsible Voice & Pause Customization Drawer */}
      {showCastPanel && (
        <div className="space-y-4 rounded-xl border border-line bg-surface p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted">Nhịp ngắt nghỉ:</span>
              {PACING_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  selected={prefs.pacing === opt.value}
                  onClick={() => updatePrefs({ ...prefs, pacing: opt.value })}
                  disabled={isPlaying}
                >
                  {opt.label}
                </Chip>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-fg">
                <Bell className="size-3.5 text-primary-fg" aria-hidden />
                <Switch
                  checked={prefs.playChime}
                  onChange={(checked) => updatePrefs({ ...prefs, playChime: checked })}
                  label="Chuông JLPT"
                />
              </label>

              {(Object.keys(prefs.speakerArchetypeOverrides).length > 0 ||
                Object.keys(prefs.archetypeVoiceUriOverrides).length > 0) && (
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<RotateCcw className="size-3.5" aria-hidden />}
                  onClick={() =>
                    updatePrefs({
                      ...DEFAULT_DIALOGUE_VOICE_PREFS,
                      pacing: prefs.pacing,
                      playChime: prefs.playChime,
                    })
                  }
                >
                  Mặc định
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">
                Phân vai nhân vật trong bài này
              </p>
              <Badge tone={distinctVoicesCount >= 2 || !hasMultipleSpeakers ? 'success' : 'warning'}>
                {voices.length > 0
                  ? `${voices.length} giọng tiếng Nhật trên máy`
                  : 'Dùng giọng Nhật mặc định của trình duyệt'}
              </Badge>
            </div>

            <div className="grid gap-2.5">
              {castList.map((entry) => {
                const selectedVoiceUri = prefs.archetypeVoiceUriOverrides[entry.archetype] ?? '';
                return (
                  <div
                    key={entry.speaker}
                    className="grid grid-cols-1 items-center gap-2 rounded-lg border border-line bg-surface-2 p-2.5 sm:grid-cols-[minmax(96px,auto)_1fr_1fr_auto]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        lang="ja"
                        className={[
                          'inline-flex rounded-md border px-2 py-0.5 text-xs font-bold',
                          ROLE_CHIP_STYLES[entry.roleMeta.tone],
                        ].join(' ')}
                      >
                        {entry.speaker}
                      </span>
                    </div>

                    <Select
                      aria-label={`Vai diễn cho ${entry.speaker}`}
                      value={entry.archetype}
                      onChange={(e) => {
                        const nextArch = e.target.value as CharacterArchetype;
                        updatePrefs({
                          ...prefs,
                          speakerArchetypeOverrides: {
                            ...prefs.speakerArchetypeOverrides,
                            [entry.speaker]: nextArch,
                          },
                        });
                      }}
                      disabled={isPlaying}
                    >
                      {ARCHETYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          Vai: {opt.label}
                        </option>
                      ))}
                    </Select>

                    <Select
                      aria-label={`Giọng đọc cho ${entry.speaker}`}
                      value={selectedVoiceUri}
                      onChange={(e) => {
                        const val = e.target.value;
                        const nextOverrides = { ...prefs.archetypeVoiceUriOverrides };
                        if (!val) {
                          delete nextOverrides[entry.archetype];
                        } else {
                          nextOverrides[entry.archetype] = val;
                        }
                        updatePrefs({
                          ...prefs,
                          archetypeVoiceUriOverrides: nextOverrides,
                        });
                      }}
                      disabled={isPlaying || voices.length === 0}
                    >
                      <option value="">Tự động ({entry.voiceLabel})</option>
                      {voices.map((v) => (
                        <option key={v.uri} value={v.uri}>
                          {v.displayLabel}
                        </option>
                      ))}
                    </Select>

                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<Volume2 className="size-3.5" aria-hidden />}
                      onClick={() => handlePreviewSpeaker(entry.speaker)}
                    >
                      Thử
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          {onlyOneOsVoice && (
            <Notice tone="info" title="Đang tách giọng Nam / Nữ tự động theo cao độ &amp; nhịp nói">
              Trình duyệt hiện tại chỉ có 1 giọng tiếng Nhật nên app tự động chỉnh cao độ trầm/sáng và tốc độ riêng cho
              từng vai. Để có giọng <strong>Nam (Keita / Ichiro / Otoya)</strong> và{' '}
              <strong>Nữ (Nanami / Kyoko)</strong> hoàn toàn tách biệt, bạn có thể mở bằng <strong>Microsoft Edge</strong>{' '}
              hoặc cài thêm gói giọng Nhật trong cài đặt hệ điều hành.
            </Notice>
          )}
        </div>
      )}

      {!supportsSpeech && (
        <Notice tone="warning" title="Trình duyệt chưa hỗ trợ giọng đọc tự động">
          Bạn vẫn có thể mở Transcript bên dưới để đọc nội dung hội thoại và làm bài tập bình thường.
        </Notice>
      )}
    </div>
  );
};

interface ListeningTranscriptPanelProps {
  dialogue: JLPTListeningLine[];
  translation: string;
  showTranslation: boolean;
  showFurigana: boolean;
  onToggleFurigana: (value: boolean) => void;
  situation?: string;
  questionPrompt?: string;
  activeLineIdx?: number | null;
  onPlayLine?: (lineIdx: number) => void;
}

export const ListeningTranscriptPanel: React.FC<ListeningTranscriptPanelProps> = ({
  dialogue,
  translation,
  showTranslation,
  showFurigana,
  onToggleFurigana,
  situation,
  questionPrompt,
  activeLineIdx = null,
  onPlayLine,
}) => {
  const voices = useJapaneseVoicePool();
  const [prefs] = useSyncedDialogueVoicePrefs();
  const castMap = useMemo(
    () => buildDialogueCast(dialogue, voices, prefs, { situation, questionPrompt }),
    [dialogue, voices, prefs, situation, questionPrompt],
  );

  return (
    <div className="space-y-3 rounded-xl border border-line bg-surface-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wide text-primary-fg uppercase">
            Transcript hội thoại theo vai
          </span>
          {onPlayLine && (
            <span className="text-xs text-muted">(Bấm từng câu để nghe lại đúng giọng vai)</span>
          )}
        </div>
        <Switch checked={showFurigana} onChange={onToggleFurigana} label="Furigana" />
      </div>

      <div className="space-y-2 text-base leading-loose">
        {dialogue.map((line, idx) => {
          const entry = castMap.get(line.speaker);
          const tone = entry?.roleMeta.tone ?? 'primary';
          const isActive = activeLineIdx === idx;

          return (
            <div
              key={idx}
              className={[
                'flex items-start gap-2.5 rounded-lg border px-3 py-2 transition-colors',
                isActive
                  ? 'border-primary-line bg-primary-soft/60'
                  : 'border-transparent hover:border-line hover:bg-surface',
              ].join(' ')}
            >
              {onPlayLine && (
                <button
                  type="button"
                  onClick={() => onPlayLine(idx)}
                  title={`Nghe lại lời thoại của ${line.speaker}`}
                  className="mt-1 grid size-7 shrink-0 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:border-primary-line hover:text-primary-fg"
                >
                  <Volume2 className="size-3.5" aria-hidden />
                </button>
              )}

              <div className="min-w-0 flex-1">
                <span
                  lang="ja"
                  className={[
                    'mr-2 inline-flex items-center gap-1 rounded-md border px-2 py-0.5 align-middle text-xs font-bold',
                    ROLE_CHIP_STYLES[tone],
                  ].join(' ')}
                >
                  {line.speaker}
                  {entry && <span className="font-medium opacity-75">· {entry.roleMeta.shortTag}</span>}
                </span>
                <FuriganaText segments={line.segments} showFurigana={showFurigana} />
              </div>
            </div>
          );
        })}
      </div>

      {showTranslation && (
        <p className="border-t border-line pt-2 text-sm leading-relaxed whitespace-pre-line text-muted">
          {translation}
        </p>
      )}
    </div>
  );
};
