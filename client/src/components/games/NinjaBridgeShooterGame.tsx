import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Flame,
  Heart,
  Keyboard,
  Pause,
  Play,
  Puzzle,
  RotateCcw,
  Smartphone,
  Sparkles,
  Star,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Badge, Button, Card, Chip } from '../ui';
import { cn } from '../../lib/cn';
import type { VocabularyItem } from '../../types/vocabulary';
import {
  buildKanaTileRack,
  cleanReadingForGame,
  computeMoraRomajiEnds,
  countCompletedMorasByRomajiLen,
  kanaToRomaji,
  katakanaToHiragana,
  normalizeRomajiInput,
  splitKanaToMoras,
  type KanaMora,
} from '../../utils/kanaToRomaji';
import { shuffleArray } from '../../utils/shuffle';
import { speakJapanese, stopJapaneseSpeech } from '../../utils/tts';

export type ShooterControlMode = 'romaji' | 'tiles' | 'tap4';
type MonsterKind = 'lantern' | 'ninja' | 'oni';

interface PreparedWord {
  id: number;
  word: string;
  kanjiTarget: string;
  reading: string;
  normalizedReading: string;
  meaning: string;
  romaji: string;
  normalizedRomaji: string;
  moras: KanaMora[];
  moraRomajiEnds: number[];
}

interface ActiveMonster {
  uid: string;
  kind: MonsterKind;
  lane: 0 | 1 | 2;
  yPct: number; // 19 .. 80
  speedPctPerSec: number;
  hp: number;
  maxHp: number;
  currentWord: PreparedWord;
  wordQueue: PreparedWord[];
}

interface ActiveProjectile {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  angleDeg: number;
  progress: number; // 0..1
  isFinal: boolean;
}

interface HitBurst {
  id: string;
  x: number;
  y: number;
  meaning: string;
  wordLabel: string;
  isBoss: boolean;
}

export interface NinjaBridgeShooterProps {
  words: VocabularyItem[];
  contextLabel: string;
  starredIds?: number[];
  onToggleStar?: (vocabId: number) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onSessionFinish?: (stats: {
    score: number;
    defeatedCount: number;
    missedWords: PreparedWord[];
    durationSeconds: number;
  }) => void;
}

const INPUT_PREF_STORAGE_KEY = 'nihonmaster_shooter_input_mode_v1';

const LANE_X_PCT: Record<0 | 1 | 2, number> = {
  0: 25,
  1: 50,
  2: 75,
};

const MONSTER_META: Record<
  MonsterKind,
  { name: string; sprite: string; badgeTone: 'neutral' | 'warning' | 'danger'; points: number }
> = {
  lantern: {
    name: 'Đèn lồng ma',
    sprite: 'game/quai_lantern.png',
    badgeTone: 'neutral',
    points: 100,
  },
  ninja: {
    name: 'Ảnhẫn Ninja',
    sprite: 'game/quai_ninja.png',
    badgeTone: 'warning',
    points: 150,
  },
  oni: {
    name: 'Đại Quỷ Oni (Boss)',
    sprite: 'game/quai_oni.png',
    badgeTone: 'danger',
    points: 400,
  },
};

function detectInitialShooterControlMode(): ShooterControlMode {
  if (typeof window === 'undefined') return 'romaji';
  try {
    const saved = window.localStorage.getItem(INPUT_PREF_STORAGE_KEY);
    if (saved === 'romaji' || saved === 'tiles' || saved === 'tap4') {
      return saved;
    }
  } catch {
    // ignore
  }

  const hasFineHover =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const isTouchPrimary =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const isSmallOrTablet = window.innerWidth < 1024;

  if (isTouchPrimary || (!hasFineHover && (navigator.maxTouchPoints > 0 || isSmallOrTablet))) {
    return 'tiles';
  }
  return 'romaji';
}

/**
 * Deterministic shuffle based on a string key so 4 amulet choices NEVER flicker
 * or re-order across 60fps animation frames.
 */
function deterministicPickChoices(
  seedKey: string,
  targetWord: PreparedWord,
  otherActiveWords: PreparedWord[],
  pool: PreparedWord[],
): PreparedWord[] {
  let hash = 2166136261;
  for (let i = 0; i < seedKey.length; i += 1) {
    hash ^= seedKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const nextRand = () => {
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return ((hash >>> 0) % 10000) / 10000;
  };

  const picked: PreparedWord[] = [targetWord];
  const seenIds = new Set<number>([targetWord.id]);

  for (const w of otherActiveWords) {
    if (picked.length >= 4) break;
    if (!seenIds.has(w.id)) {
      seenIds.add(w.id);
      picked.push(w);
    }
  }

  const candidates = pool.filter((w) => !seenIds.has(w.id));
  const poolCopy = [...candidates];
  while (picked.length < 4 && poolCopy.length > 0) {
    const idx = Math.floor(nextRand() * poolCopy.length);
    const [item] = poolCopy.splice(idx, 1);
    if (item && !seenIds.has(item.id)) {
      seenIds.add(item.id);
      picked.push(item);
    }
  }

  for (let i = picked.length - 1; i > 0; i -= 1) {
    const j = Math.floor(nextRand() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  return picked;
}

export const NinjaBridgeShooterGame: React.FC<NinjaBridgeShooterProps> = ({
  words,
  contextLabel,
  starredIds = [],
  onToggleStar,
  soundEnabled: externalSoundEnabled,
  onToggleSound,
  onSessionFinish,
}) => {
  const baseUrl = import.meta.env.BASE_URL || '/';

  const preparedPool = useMemo<PreparedWord[]>(() => {
    const out: PreparedWord[] = [];
    for (const item of words) {
      const reading = cleanReadingForGame(item.hiragana || item.kanji || '');
      const meaning = (item.meaning || '').trim();
      if (!reading || !meaning) continue;
      const kanjiTarget = cleanReadingForGame(item.kanji || reading) || reading;
      const romaji = kanaToRomaji(reading);
      const moras = splitKanaToMoras(reading);
      if (!romaji || moras.length === 0) continue;
      out.push({
        id: Number(item.id),
        word: item.kanji || reading,
        kanjiTarget,
        reading,
        normalizedReading: katakanaToHiragana(reading),
        meaning,
        romaji,
        normalizedRomaji: normalizeRomajiInput(romaji),
        moras,
        moraRomajiEnds: computeMoraRomajiEnds(moras),
      });
    }
    return out;
  }, [words]);

  const [controlMode, setControlMode] = useState<ShooterControlMode>(() =>
    detectInitialShooterControlMode(),
  );
  const [hwKeyboardDetected, setHwKeyboardDetected] = useState(false);
  const [showRomajiOnTiles, setShowRomajiOnTiles] = useState(true);
  const [composingText, setComposingText] = useState('');
  const [internalSoundEnabled, setInternalSoundEnabled] = useState(true);
  const soundEnabled = externalSoundEnabled ?? internalSoundEnabled;

  const handleToggleSound = useCallback(() => {
    if (onToggleSound) {
      onToggleSound();
      return;
    }
    setInternalSoundEnabled((prev) => {
      const next = !prev;
      if (!next) stopJapaneseSpeech();
      return next;
    });
  }, [onToggleSound]);

  const [phase, setPhase] = useState<'ready' | 'playing' | 'paused' | 'ended'>('ready');
  const [targetKills, setTargetKills] = useState<15 | 25>(15);

  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [rageGauge, setRageGauge] = useState(0); // 0..100 (100 = Sakura Ultimate Ready!)
  const [defeatedCount, setDefeatedCount] = useState(0);
  const [playerFrame, setPlayerFrame] = useState<1 | 2 | 3>(1);
  const [playerLane, setPlayerLane] = useState<0 | 1 | 2>(1);
  const [typedInput, setTypedInput] = useState('');
  const [tileStepIndex, setTileStepIndex] = useState(0);
  const [usedTileUids, setUsedTileUids] = useState<string[]>([]);
  const [wrongTileUid, setWrongTileUid] = useState<string | null>(null);
  const [wrongKeyMonsterId, setWrongKeyMonsterId] = useState<string | null>(null);
  const [lockedMonsterId, setLockedMonsterId] = useState<string | null>(null);
  const [monsters, setMonsters] = useState<ActiveMonster[]>([]);
  const [projectiles, setProjectiles] = useState<ActiveProjectile[]>([]);
  const [bursts, setBursts] = useState<HitBurst[]>([]);
  const [missedWords, setMissedWords] = useState<PreparedWord[]>([]);

  const deckRef = useRef<PreparedWord[]>([]);
  const deckCursorRef = useRef(0);
  const spawnCountRef = useRef(0);
  const lastSpawnAtRef = useRef(0);
  const startTimeRef = useRef(0);
  const slashTimerRef = useRef<number | null>(null);
  const finishNotifiedRef = useRef(false);
  const monstersRef = useRef<ActiveMonster[]>([]);
  const livesRef = useRef(3);
  const lastDefeatedLaneRef = useRef<0 | 1 | 2 | null>(null);
  const imeInputRef = useRef<HTMLInputElement | null>(null);
  const isComposingRef = useRef(false);

  const selectControlMode = useCallback((nextMode: ShooterControlMode) => {
    setControlMode(nextMode);
    setTypedInput('');
    setComposingText('');
    if (imeInputRef.current) imeInputRef.current.value = '';
    setTileStepIndex(0);
    setUsedTileUids([]);
    try {
      window.localStorage.setItem(INPUT_PREF_STORAGE_KEY, nextMode);
    } catch {
      // ignore
    }
  }, []);

  const drawNextWord = useCallback((): PreparedWord => {
    if (deckRef.current.length === 0 || deckCursorRef.current >= deckRef.current.length) {
      deckRef.current = shuffleArray(preparedPool);
      deckCursorRef.current = 0;
    }
    const word = deckRef.current[deckCursorRef.current] ?? preparedPool[0];
    deckCursorRef.current += 1;
    return word;
  }, [preparedPool]);

  /**
   * Launches a Kiếm Khí projectile angled smoothly from the Ninja defender
   * directly along the vector toward the locked monster's word card (ZType-style).
   */
  const triggerPlayerSlash = useCallback(
    (
      lane: 0 | 1 | 2,
      targetYPct: number,
      isFinalKill: boolean,
    ) => {
      setPlayerLane(lane);
      setPlayerFrame((prev) => (isFinalKill ? 3 : prev === 2 ? 3 : 2));
      if (slashTimerRef.current) window.clearTimeout(slashTimerRef.current);
      slashTimerRef.current = window.setTimeout(
        () => {
          setPlayerFrame(1);
        },
        isFinalKill ? 280 : 160,
      );

      const fromX = 50 + (LANE_X_PCT[lane] - 50) * 0.35;
      const fromY = 84;
      const toX = LANE_X_PCT[lane];
      const toY = Math.max(12, targetYPct - 5);
      const angleDeg = Math.atan2(toX - fromX, fromY - toY) * (180 / Math.PI);

      const projId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setProjectiles((prev) => [
        ...prev.slice(-14),
        {
          id: projId,
          fromX,
          fromY,
          toX,
          toY,
          angleDeg,
          progress: 0,
          isFinal: isFinalKill,
        },
      ]);
    },
    [],
  );

  const startNewGame = useCallback(() => {
    if (preparedPool.length === 0) return;
    deckRef.current = shuffleArray(preparedPool);
    deckCursorRef.current = 0;
    spawnCountRef.current = 0;
    lastSpawnAtRef.current = 0;
    startTimeRef.current = Date.now();
    finishNotifiedRef.current = false;
    monstersRef.current = [];
    livesRef.current = 3;

    setLives(3);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setRageGauge(0);
    setDefeatedCount(0);
    setPlayerFrame(1);
    setPlayerLane(1);
    setTypedInput('');
    setComposingText('');
    if (imeInputRef.current) imeInputRef.current.value = '';
    setTileStepIndex(0);
    setUsedTileUids([]);
    setLockedMonsterId(null);
    setMonsters([]);
    setProjectiles([]);
    setBursts([]);
    setMissedWords([]);
    setPhase('playing');
  }, [preparedPool]);

  useEffect(() => {
    monstersRef.current = monsters;
  }, [monsters]);

  // Spawn & movement loop at 60fps
  useEffect(() => {
    if (phase !== 'playing' || preparedPool.length === 0) return;

    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      setProjectiles((prev) =>
        prev
          .map((p) => ({ ...p, progress: p.progress + dt * (p.isFinal ? 5.6 : 7.4) }))
          .filter((p) => p.progress < 1),
      );

      const prevMonsters = monstersRef.current;
      const breached: ActiveMonster[] = [];
      const moved: ActiveMonster[] = [];

      for (const m of prevMonsters) {
        const nextY = m.yPct + m.speedPctPerSec * dt;
        if (nextY >= 80) {
          breached.push(m);
        } else {
          moved.push({ ...m, yPct: nextY });
        }
      }

      if (breached.length > 0) {
        setCombo(0);
        setTypedInput('');
        setComposingText('');
        if (imeInputRef.current) imeInputRef.current.value = '';
        setTileStepIndex(0);
        setUsedTileUids([]);
        setLockedMonsterId((curr) =>
          breached.some((b) => b.uid === curr) ? null : curr,
        );
        setMissedWords((old) => {
          const seen = new Set(old.map((w) => w.id));
          const added = [...old];
          for (const b of breached) {
            if (!seen.has(b.currentWord.id)) {
              seen.add(b.currentWord.id);
              added.push(b.currentWord);
            }
          }
          return added;
        });
        livesRef.current = Math.max(0, livesRef.current - breached.length);
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          monstersRef.current = moved;
          setMonsters(moved);
          setPhase('ended');
          return;
        }
      }

      const elapsedSinceSpawn = now - lastSpawnAtRef.current;
      const shouldSpawn =
        moved.length === 0 || (moved.length < 3 && elapsedSinceSpawn > 3200);

      if (shouldSpawn) {
        lastSpawnAtRef.current = now;
        spawnCountRef.current += 1;
        const idx = spawnCountRef.current;
        const isBoss = idx % 5 === 0;
        const isFastNinja = !isBoss && idx % 3 === 0;
        const kind: MonsterKind = isBoss ? 'oni' : isFastNinja ? 'ninja' : 'lantern';

        const busyLanes = new Set(moved.filter((m) => m.yPct < 38).map((m) => m.lane));
        if (lastDefeatedLaneRef.current !== null && busyLanes.size < 2) {
          busyLanes.add(lastDefeatedLaneRef.current);
        }
        const candidateLanes = ([0, 1, 2] as const).filter((l) => !busyLanes.has(l));
        const lane =
          candidateLanes.length > 0
            ? candidateLanes[Math.floor(Math.random() * candidateLanes.length)]
            : ((idx % 3) as 0 | 1 | 2);

        const w1 = drawNextWord();
        const queue = isBoss ? [drawNextWord(), drawNextWord()] : [];

        moved.push({
          uid: `m-${idx}-${Date.now()}`,
          kind,
          lane,
          yPct: 20,
          speedPctPerSec: isBoss ? 2.1 : isFastNinja ? 3.6 : 2.8,
          hp: isBoss ? 3 : 1,
          maxHp: isBoss ? 3 : 1,
          currentWord: w1,
          wordQueue: queue,
        });
      }

      monstersRef.current = moved;
      setMonsters(moved);

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [drawNextWord, phase, preparedPool.length]);

  useEffect(() => {
    if (phase !== 'ended' || finishNotifiedRef.current) return;
    finishNotifiedRef.current = true;
    const durationSeconds = Math.max(5, Math.round((Date.now() - startTimeRef.current) / 1000));
    onSessionFinish?.({
      score,
      defeatedCount,
      missedWords,
      durationSeconds,
    });
  }, [defeatedCount, missedWords, onSessionFinish, phase, score]);

  const hitOrDefeatMonster = useCallback(
    (target: ActiveMonster) => {
      const spokenWord = target.currentWord.reading || target.currentWord.word;
      if (soundEnabled) {
        speakJapanese(spokenWord);
      }

      const isFinalHit = target.hp <= 1;
      triggerPlayerSlash(target.lane, target.yPct, isFinalHit);

      const nextCombo = combo + 1;
      setCombo(nextCombo);
      setMaxCombo((m) => Math.max(m, nextCombo));
      setRageGauge((r) => Math.min(100, r + 25));

      const basePts = isFinalHit ? MONSTER_META[target.kind].points : 80;
      const isQuickCrit = target.yPct < 42;
      const gained = basePts + Math.min(200, nextCombo * 15) + (isQuickCrit ? 50 : 0);
      setScore((s) => s + gained);

      // Show Vietnamese Meaning burst upon completing the word (instead of raw score points)
      lastDefeatedLaneRef.current = target.lane;
      const burstId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      setBursts((prev) => [
        ...prev.slice(-5),
        {
          id: burstId,
          x: LANE_X_PCT[target.lane],
          y: Math.max(18, target.yPct - 2),
          meaning: target.currentWord.meaning,
          wordLabel:
            target.currentWord.word !== target.currentWord.reading
              ? `${target.currentWord.word} (${target.currentWord.reading})`
              : target.currentWord.reading,
          isBoss: target.kind === 'oni' || isQuickCrit,
        },
      ]);
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burstId));
      }, 1150);

      setTypedInput('');
      setComposingText('');
      if (imeInputRef.current) imeInputRef.current.value = '';
      setTileStepIndex(0);
      setUsedTileUids([]);

      if (!isFinalHit) {
        const nextWord = target.wordQueue[0] ?? drawNextWord();
        const nextMonsters = monstersRef.current.map((m) =>
          m.uid === target.uid
            ? {
                ...m,
                hp: m.hp - 1,
                yPct: Math.max(20, m.yPct - 6),
                currentWord: nextWord,
                wordQueue: m.wordQueue.slice(1),
              }
            : m,
        );
        monstersRef.current = nextMonsters;
        setMonsters(nextMonsters);
        setLockedMonsterId(target.uid);
      } else {
        const nextMonsters = monstersRef.current.filter((m) => m.uid !== target.uid);
        monstersRef.current = nextMonsters;
        setMonsters(nextMonsters);
        setLockedMonsterId(null);
        setDefeatedCount((c) => {
          const next = c + 1;
          if (next >= targetKills) {
            setPhase('ended');
          }
          return next;
        });
      }
    },
    [combo, drawNextWord, soundEnabled, targetKills, triggerPlayerSlash],
  );

  // Sakura Ultimate (Tuyệt Kỹ Anh Đào Trảm) — wipes or damages all monsters on the bridge!
  const triggerSakuraUltimate = useCallback(() => {
    if (phase !== 'playing' || rageGauge < 100 || monstersRef.current.length === 0) return;
    setRageGauge(0);
    setTypedInput('');
    setComposingText('');
    if (imeInputRef.current) imeInputRef.current.value = '';
    setTileStepIndex(0);
    setUsedTileUids([]);

    const currentList = [...monstersRef.current];
    for (const m of currentList) {
      triggerPlayerSlash(m.lane, m.yPct, true);
    }
    if (soundEnabled && currentList[0]) {
      speakJapanese(currentList[0].currentWord.reading || currentList[0].currentWord.word);
    }

    const totalGained = currentList.length * 220;
    setScore((s) => s + totalGained);
    const burstId = `ult-${Date.now()}`;
    setBursts((prev) => [
      ...prev,
      {
        id: burstId,
        x: 50,
        y: 42,
        meaning: currentList.map((m) => m.currentWord.meaning).join(' · '),
        wordLabel: '🌸 ANH ĐÀO TRẢM',
        isBoss: true,
      },
    ]);
    window.setTimeout(() => {
      setBursts((prev) => prev.filter((b) => b.id !== burstId));
    }, 1250);

    monstersRef.current = [];
    setMonsters([]);
    setLockedMonsterId(null);
    setDefeatedCount((c) => {
      const next = c + currentList.length;
      if (next >= targetKills) {
        setPhase('ended');
      }
      return next;
    });
  }, [phase, rageGauge, soundEnabled, targetKills, triggerPlayerSlash]);

  // Closest monster (default lock priority)
  const primaryMonster = useMemo(() => {
    if (monsters.length === 0) return null;
    if (lockedMonsterId) {
      const locked = monsters.find((m) => m.uid === lockedMonsterId);
      if (locked) return locked;
    }
    return [...monsters].sort((a, b) => b.yPct - a.yPct)[0] ?? null;
  }, [lockedMonsterId, monsters]);

  // Auto-focus hidden IME input while playing in PC Keyboard mode so Japanese IME & A-Z both work directly
  useEffect(() => {
    if (phase === 'playing' && controlMode === 'romaji') {
      const t = window.setTimeout(() => {
        imeInputRef.current?.focus({ preventScroll: true });
      }, 40);
      return () => window.clearTimeout(t);
    }
  }, [controlMode, phase]);

  // Direct Japanese (Hiragana / Kanji IME) OR Romaji Keystroke Handler — highlights Hiragana / Kanji slots!
  const handleDirectKeystroke = useCallback(
    (nextRawInput: string) => {
      if (phase !== 'playing') return;
      const trimmed = nextRawInput.trim();
      if (!trimmed) {
        setTypedInput('');
        if (imeInputRef.current) imeInputRef.current.value = '';
        return;
      }

      const hasJapaneseChars = /[\u3040-\u30ff\u4e00-\u9faf]/.test(trimmed);
      const normKanaInput = katakanaToHiragana(trimmed);
      const normRomaji = normalizeRomajiInput(trimmed);
      const rawLower = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');

      // Prioritize currently locked monster, otherwise auto-lock onto closest monster matching the prefix
      const orderedCandidates = [...monstersRef.current].sort((a, b) => {
        if (a.uid === lockedMonsterId) return -1;
        if (b.uid === lockedMonsterId) return 1;
        return b.yPct - a.yPct;
      });

      const prefixMatch = orderedCandidates.find((m) => {
        if (hasJapaneseChars) {
          return (
            m.currentWord.kanjiTarget.startsWith(trimmed) ||
            m.currentWord.normalizedReading.startsWith(normKanaInput)
          );
        }
        return (
          rawLower.length > 0 &&
          (m.currentWord.romaji.startsWith(rawLower) ||
            m.currentWord.normalizedRomaji.startsWith(normRomaji))
        );
      });

      if (prefixMatch) {
        setLockedMonsterId(prefixMatch.uid);

        const isComplete = hasJapaneseChars
          ? trimmed === prefixMatch.currentWord.kanjiTarget ||
            normKanaInput === prefixMatch.currentWord.normalizedReading
          : rawLower === prefixMatch.currentWord.romaji ||
            normRomaji === prefixMatch.currentWord.normalizedRomaji;

        if (isComplete) {
          hitOrDefeatMonster(prefixMatch);
        } else {
          const acceptedValue = hasJapaneseChars ? trimmed : rawLower;
          const isAdvancing = acceptedValue.length > typedInput.length;
          setTypedInput(acceptedValue);
          if (imeInputRef.current && imeInputRef.current.value !== acceptedValue) {
            imeInputRef.current.value = acceptedValue;
          }
          if (isAdvancing) {
            setRageGauge((r) => Math.min(100, r + 4));
            triggerPlayerSlash(
              prefixMatch.lane,
              prefixMatch.yPct,
              false,
            );
          }
        }
      } else {
        // Wrong key -> revert hidden IME input & flash red directly on the target monster's card!
        if (imeInputRef.current) {
          imeInputRef.current.value = typedInput;
        }
        const targetUid = primaryMonster?.uid ?? null;
        setWrongKeyMonsterId(targetUid);
        window.setTimeout(() => setWrongKeyMonsterId(null), 220);
      }
    },
    [hitOrDefeatMonster, lockedMonsterId, phase, primaryMonster?.uid, triggerPlayerSlash, typedInput],
  );

  // Global keyboard fallback when focus is outside our hidden IME input
  useEffect(() => {
    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const targetEl = e.target as HTMLElement | null;
      const tag = targetEl?.tagName;
      if (targetEl === imeInputRef.current) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setPhase('paused');
        } else if (e.key === ' ' && rageGauge >= 100) {
          e.preventDefault();
          triggerSakuraUltimate();
        }
        return;
      }
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (phase === 'ready' && e.key === 'Enter') {
        e.preventDefault();
        startNewGame();
        return;
      }

      if (phase !== 'playing') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        setPhase('paused');
        return;
      }

      if (e.key === ' ' && rageGauge >= 100) {
        e.preventDefault();
        triggerSakuraUltimate();
        return;
      }

      if (e.key === 'Backspace' && controlMode === 'romaji') {
        e.preventDefault();
        setTypedInput((prev) => {
          const next = prev.slice(0, -1);
          if (imeInputRef.current) imeInputRef.current.value = next;
          return next;
        });
        return;
      }

      if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
        e.preventDefault();
        const ch = e.key.toLowerCase();
        imeInputRef.current?.focus({ preventScroll: true });
        if (controlMode !== 'romaji') {
          setHwKeyboardDetected(true);
          setControlMode('romaji');
          handleDirectKeystroke(ch);
        } else {
          handleDirectKeystroke(`${typedInput}${ch}`);
        }
      }
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [
    controlMode,
    handleDirectKeystroke,
    phase,
    rageGauge,
    startNewGame,
    triggerSakuraUltimate,
    typedInput,
  ]);

  // Stable keys for the currently targeted monster's word (ONLY changes when target/word/active-set changes, NEVER on 60fps movement!)
  const targetWordKey = primaryMonster
    ? `${primaryMonster.uid}-${primaryMonster.hp}-${primaryMonster.currentWord.id}`
    : '';
  const targetWordId = primaryMonster?.currentWord.id ?? null;
  const otherWordIdsKey = primaryMonster
    ? monsters
        .filter((m) => m.uid !== primaryMonster.uid)
        .map((m) => m.currentWord.id)
        .sort((a, b) => a - b)
        .join(',')
    : '';

  // Kana Tile Rack (Kiểu A) — locked strictly to targetWordKey
  const kanaTileRack = useMemo(() => {
    if (!targetWordKey || targetWordId === null) return [];
    const targetWord = preparedPool.find((w) => w.id === targetWordId);
    if (!targetWord) return [];
    return buildKanaTileRack(targetWordKey, targetWord.moras);
  }, [preparedPool, targetWordId, targetWordKey]);

  const handleTapKanaTile = (tileUid: string, tileKana: string) => {
    if (phase !== 'playing' || !primaryMonster) return;
    if (usedTileUids.includes(tileUid)) return;

    const moras = primaryMonster.currentWord.moras;
    const expectedMora = moras[tileStepIndex];
    if (!expectedMora) return;

    if (tileKana === expectedMora.kana) {
      const nextStep = tileStepIndex + 1;
      setPlayerLane(primaryMonster.lane);

      if (nextStep >= moras.length) {
        hitOrDefeatMonster(primaryMonster);
      } else {
        setTileStepIndex(nextStep);
        setUsedTileUids((prev) => [...prev, tileUid]);
        setRageGauge((r) => Math.min(100, r + 8));
        triggerPlayerSlash(
          primaryMonster.lane,
          primaryMonster.yPct,
          false,
        );
      }
    } else {
      setCombo(0);
      setWrongTileUid(tileUid);
      setWrongKeyMonsterId(primaryMonster.uid);
      window.setTimeout(() => {
        setWrongTileUid(null);
        setWrongKeyMonsterId(null);
      }, 260);
    }
  };

  // Fixed Hình 5 & Hình 6 ("Chạm 4 Bùa") — locked strictly to targetWordKey so it NEVER scrambles on 60fps movement!
  const tapChoices = useMemo(() => {
    if (!targetWordKey || targetWordId === null || preparedPool.length === 0) return [];
    const targetWord = preparedPool.find((w) => w.id === targetWordId);
    if (!targetWord) return [];
    const otherIds = otherWordIdsKey
      ? otherWordIdsKey.split(',').map((s) => Number(s))
      : [];
    const otherWords = otherIds
      .map((id) => preparedPool.find((w) => w.id === id))
      .filter((w): w is PreparedWord => Boolean(w));
    return deterministicPickChoices(targetWordKey, targetWord, otherWords, preparedPool);
  }, [otherWordIdsKey, preparedPool, targetWordId, targetWordKey]);

  const handleTapAmulet = (word: PreparedWord) => {
    if (phase !== 'playing') return;
    const matchedMonster = [...monstersRef.current]
      .sort((a, b) => b.yPct - a.yPct)
      .find((m) => m.currentWord.id === word.id);

    if (matchedMonster) {
      hitOrDefeatMonster(matchedMonster);
    } else {
      setCombo(0);
      setWrongKeyMonsterId(primaryMonster?.uid ?? null);
      window.setTimeout(() => setWrongKeyMonsterId(null), 260);
    }
  };

  // Hình 2: Always displays full Hiragana cells inside [ ... ]
  const renderHiraganaSlotsOnMonsterCard = (monster: ActiveMonster, isTarget: boolean) => {
    const slots = monster.currentWord.moras.map((m) => m.kana);

    const hasJapaneseTyped = /[\u3040-\u30ff\u4e00-\u9faf]/.test(typedInput);
    const normTypedKana = katakanaToHiragana(typedInput);
    const normTypedRomaji = normalizeRomajiInput(typedInput);

    let matchedSlotCount = 0;
    if (isTarget && typedInput.length > 0) {
      if (hasJapaneseTyped) {
        if (monster.currentWord.normalizedReading.startsWith(normTypedKana)) {
          let charTotal = 0;
          for (const m of monster.currentWord.moras) {
            charTotal += m.kana.length;
            if (normTypedKana.length >= charTotal) {
              matchedSlotCount += 1;
            } else {
              break;
            }
          }
        }
      } else {
        matchedSlotCount = countCompletedMorasByRomajiLen(
          normTypedRomaji.length,
          monster.currentWord.moraRomajiEnds,
        );
      }
    }

    const isWrongFlash = wrongKeyMonsterId === monster.uid;
    const activeBufferLabel = isTarget ? composingText || typedInput : '';

    return (
      <div className="mt-1.5 space-y-1">
        <div className="flex flex-wrap items-center justify-center gap-1" lang="ja">
          {isTarget && (
            <span aria-hidden className="mr-0.5 font-bold text-primary-fg">
              [
            </span>
          )}
          {slots.map((ch, idx) => {
            const isTyped = idx < matchedSlotCount;
            const isCurrentCursor = isTarget && idx === matchedSlotCount;

            return (
              <span
                key={idx}
                className={cn(
                  'inline-flex h-6 min-w-[20px] items-center justify-center rounded-md px-1 text-sm font-bold transition-colors duration-75',
                  isTyped
                    ? 'bg-success text-on-primary'
                    : isCurrentCursor && isWrongFlash
                      ? 'bg-danger text-on-primary'
                      : isCurrentCursor
                        ? 'border-b-2 border-primary bg-primary-soft text-primary-fg'
                        : 'text-primary-fg',
                )}
              >
                {ch}
              </span>
            );
          })}
          {isTarget && (
            <span aria-hidden className="ml-0.5 font-bold text-primary-fg">
              ]
            </span>
          )}
        </div>

        {/* Live IME / keystroke composition preview */}
        {isTarget && activeBufferLabel && (
          <p lang="ja" className="text-[11px] font-semibold text-primary-fg">
            Đang gõ: <span className="rounded bg-primary-soft px-1.5 py-0.5">{activeBufferLabel}</span>
          </p>
        )}
      </div>
    );
  };

  const renderTileSlotsOnMonster = (monster: ActiveMonster, isTarget: boolean) => {
    const matchedCount = isTarget ? tileStepIndex : 0;
    return (
      <div className="mt-1 flex flex-wrap items-center justify-center gap-0.5">
        {monster.currentWord.moras.map((mora, idx) => {
          const filled = idx < matchedCount;
          const isNext = isTarget && idx === matchedCount;
          return (
            <span
              key={idx}
              lang="ja"
              className={cn(
                'inline-flex min-w-[22px] items-center justify-center rounded border px-1 py-0.5 text-[11px] font-bold',
                filled
                  ? 'border-success bg-success text-on-primary'
                  : isNext
                    ? 'border-primary bg-primary-soft text-primary-fg'
                    : 'border-line bg-surface-2 text-muted',
              )}
            >
              {filled ? mora.kana : '＿'}
            </span>
          );
        })}
      </div>
    );
  };

  const isVictory = phase === 'ended' && lives > 0 && defeatedCount >= targetKills;

  return (
    <div className="space-y-3">
      {/* Compact Control Bar — only input device mode */}
      <Card
        padding="sm"
        className="flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {hwKeyboardDetected && (
            <Badge tone="success">⌨ Bàn phím rời</Badge>
          )}
          <Chip
            selected={controlMode === 'romaji'}
            onClick={() => selectControlMode('romaji')}
          >
            <Keyboard className="size-3.5" aria-hidden />
            Gõ Phím (PC)
          </Chip>
          <Chip
            selected={controlMode === 'tiles'}
            onClick={() => selectControlMode('tiles')}
          >
            <Puzzle className="size-3.5" aria-hidden />
            Ghép Mảnh (Touch)
          </Chip>
          <Chip
            selected={controlMode === 'tap4'}
            onClick={() => selectControlMode('tap4')}
          >
            <Smartphone className="size-3.5" aria-hidden />
            Chạm 4 Bùa
          </Chip>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {controlMode === 'tiles' && (
            <Chip
              selected={showRomajiOnTiles}
              onClick={() => setShowRomajiOnTiles((v) => !v)}
            >
              Romaji trên mảnh ({showRomajiOnTiles ? 'BẬT' : 'TẮT'})
            </Chip>
          )}

          {!onToggleSound && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleToggleSound}
              leftIcon={
                soundEnabled ? (
                  <Volume2 className="size-4 text-primary-fg" aria-hidden />
                ) : (
                  <VolumeX className="size-4 text-muted" aria-hidden />
                )
              }
            >
              {soundEnabled ? 'Âm đọc BẬT' : 'Âm đọc TẮT'}
            </Button>
          )}
        </div>
      </Card>

      {/* Main Sakura Stone Bridge Arena */}
      <div
        onClick={() => {
          if (phase === 'playing' && controlMode === 'romaji') {
            imeInputRef.current?.focus({ preventScroll: true });
          }
        }}
        className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-primary/40 bg-surface shadow-card"
      >
        {/* Hidden IME capture input (enables Japanese IME Hiragana AND A-Z typing without any bottom box) */}
        {controlMode === 'romaji' && (
          <input
            ref={imeInputRef}
            type="text"
            aria-label="Nhập Hiragana"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="sr-only"
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionUpdate={(e) => {
              setComposingText(e.data || e.currentTarget.value);
            }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false;
              setComposingText('');
              handleDirectKeystroke(e.currentTarget.value);
            }}
            onChange={(e) => {
              if (isComposingRef.current) return;
              handleDirectKeystroke(e.currentTarget.value);
            }}
          />
        )}
        <div
          className="relative h-[390px] w-full select-none bg-cover bg-center sm:h-[520px] md:h-[580px]"
          style={{
            backgroundImage: `url(${baseUrl}game/bg_bridge.jpg)`,
          }}
        >
          {/* Top HUD Overlay */}
          <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface/85 px-3.5 py-2 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1" aria-label={`Còn ${lives} mạng`}>
                {[1, 2, 3].map((idx) => (
                  <Heart
                    key={idx}
                    className={cn(
                      'size-5 transition-transform',
                      idx <= lives
                        ? 'scale-100 fill-current text-danger-fg'
                        : 'scale-90 text-line-strong',
                    )}
                  />
                ))}
              </div>
              <Badge tone="primary" className="tabular">
                Hạ quái: {defeatedCount}/{targetKills}
              </Badge>
              {combo > 1 && (
                <Badge tone="sakura" className="tabular">
                  <Flame className="size-3.5" aria-hidden />
                  Combo x{combo}
                </Badge>
              )}

              {/* Sakura Ultimate Rage Button */}
              {phase === 'playing' && (
                <Button
                  type="button"
                  variant={rageGauge >= 100 ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={rageGauge < 100}
                  onClick={triggerSakuraUltimate}
                  leftIcon={<Sparkles className="size-3.5" aria-hidden />}
                >
                  {rageGauge >= 100
                    ? '🌸 Anh Đào Trảm [Space]!'
                    : `Nộ kiếm: ${rageGauge}%`}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {controlMode === 'romaji' && phase === 'playing' && (
                <span className="hidden text-xs font-medium text-muted md:inline">
                  ⌨ Gõ phím trực tiếp để phóng kiếm khí chém chữ trên đầu Yōkai
                </span>
              )}
              <Badge tone="success" className="tabular text-sm">
                <Trophy className="size-3.5" aria-hidden />
                {score.toLocaleString('vi-VN')} điểm
              </Badge>
              {phase === 'playing' && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPhase('paused')}
                  leftIcon={<Pause className="size-3.5" aria-hidden />}
                >
                  Tạm dừng
                </Button>
              )}
            </div>
          </div>

          {/* Bridge Defense Line */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[12%] top-[81%] z-10 border-t-2 border-dashed border-sakura/70"
          />

          {/* Active Yōkai Monsters descending the bridge */}
          {monsters.map((m) => {
            const isTarget = primaryMonster?.uid === m.uid;
            const isWrongShake = wrongKeyMonsterId === m.uid;
            const meta = MONSTER_META[m.kind];
            return (
              <div
                key={m.uid}
                onClick={(e) => {
                  e.stopPropagation();
                  setLockedMonsterId(m.uid);
                  setTypedInput('');
                  setComposingText('');
                  if (imeInputRef.current) {
                    imeInputRef.current.value = '';
                    imeInputRef.current.focus({ preventScroll: true });
                  }
                  setTileStepIndex(0);
                  setUsedTileUids([]);
                }}
                style={{
                  left: `${LANE_X_PCT[m.lane]}%`,
                  top: `${m.yPct}%`,
                }}
                className={cn(
                  'absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer will-change-transform',
                  isTarget && 'z-20',
                )}
              >
                {/* Hình 2: Enlarged, high-contrast interactive word card above monster */}
                <div
                  className={cn(
                    'mb-1 min-w-[116px] max-w-[168px] rounded-xl border-2 px-2 py-1.5 text-center shadow-card backdrop-blur-md transition-all sm:min-w-[160px] sm:max-w-[235px] sm:rounded-2xl sm:px-3 sm:py-2',
                    isWrongShake
                      ? 'border-danger bg-danger-soft/90 ring-4 ring-danger/35'
                      : isTarget
                        ? 'border-primary bg-surface ring-4 ring-primary/30'
                        : 'border-line bg-surface/95',
                  )}
                >
                  {m.maxHp > 1 && (
                    <div className="mb-1 flex items-center justify-center gap-1">
                      <span className="text-[10px] font-bold text-danger-fg uppercase">
                        ĐẠI QUỶ ONI
                      </span>
                      {Array.from({ length: m.maxHp }).map((_, hpIdx) => (
                        <span
                          key={hpIdx}
                          className={cn(
                            'size-2.5 rounded-full',
                            hpIdx < m.hp ? 'bg-danger' : 'bg-line-strong',
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Vietnamese Meaning */}
                  <p className="truncate text-xs font-bold text-fg sm:text-sm">
                    {m.currentWord.meaning}
                  </p>

                  {/* Companion Kanji subline (when different from Hiragana reading) */}
                  {controlMode !== 'tiles' && m.currentWord.kanjiTarget !== m.currentWord.reading && (
                    <p lang="ja" className="text-[11px] font-bold text-muted sm:text-xs">
                      {m.currentWord.word}
                    </p>
                  )}

                  {/* Direct Interactive Hiragana Cells inside [ ... ] */}
                  {controlMode === 'romaji' && renderHiraganaSlotsOnMonsterCard(m, isTarget)}
                  {controlMode === 'tiles' && renderTileSlotsOnMonster(m, isTarget)}
                </div>

                <img
                  src={`${baseUrl}${meta.sprite}`}
                  alt={meta.name}
                  draggable={false}
                  className={cn(
                    'mx-auto object-contain drop-shadow-md',
                    m.kind === 'oni' ? 'size-24 sm:size-28' : 'size-16 sm:size-20',
                  )}
                />
              </div>
            );
          })}

          {/* Flying Kiếm Khí Projectiles streaming along vector straight into Hình 2 */}
          {projectiles.map((p) => {
            const curX = p.fromX + (p.toX - p.fromX) * p.progress;
            const curY = p.fromY + (p.toY - p.fromY) * p.progress;
            return (
              <img
                key={p.id}
                src={`${baseUrl}game/kiem_khi.png`}
                alt=""
                aria-hidden
                style={{
                  left: `${curX}%`,
                  top: `${curY}%`,
                  transform: `translate(-50%, -50%) rotate(${p.angleDeg}deg)`,
                }}
                className={cn(
                  'pointer-events-none absolute z-30 object-contain will-change-transform',
                  p.isFinal ? 'size-24 sm:size-28' : 'size-14 sm:size-16',
                )}
              />
            );
          })}

          {/* Floating Vietnamese Meaning Burst upon completing a word (like reference video) */}
          {bursts.map((b) => (
            <div
              key={b.id}
              data-testid="meaning-burst"
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
              className="pointer-events-none absolute z-40 -translate-x-1/2 -translate-y-1/2 animate-fade-up"
            >
              <div
                className={cn(
                  'flex flex-col items-center rounded-2xl border-2 px-4 py-2 text-center shadow-card',
                  b.isBoss
                    ? 'border-sakura bg-surface text-fg ring-4 ring-sakura/35'
                    : 'border-success bg-surface text-fg ring-4 ring-success/30',
                )}
              >
                <span lang="ja" className="text-xs font-semibold text-muted">
                  🌸 {b.wordLabel}
                </span>
                <span className="text-sm font-bold text-success-fg sm:text-base">
                  “{b.meaning}”
                </span>
              </div>
            </div>
          ))}

          {/* Ninja Defender at the foot of the bridge */}
          <div
            style={{ left: `${50 + (LANE_X_PCT[playerLane] - 50) * 0.35}%` }}
            className="pointer-events-none absolute bottom-2 z-10 -translate-x-1/2 transition-all duration-150"
          >
            <img
              src={`${baseUrl}game/player${playerFrame}.png`}
              alt="Ninja thủ cầu"
              draggable={false}
              className="size-24 object-contain drop-shadow-md sm:size-28"
            />
          </div>

          {/* Ready / Paused / End Screen Overlay */}
          {phase !== 'playing' && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-surface/85 p-4 backdrop-blur-md">
              <Card padding="lg" className="w-full max-w-md space-y-4 text-center">
                {phase === 'ready' && (
                  <>
                    <div className="mx-auto flex items-center justify-center gap-3">
                      <img
                        src={`${baseUrl}game/player3.png`}
                        alt="Ninja"
                        className="size-20 object-contain"
                      />
                      <img
                        src={`${baseUrl}game/quai_oni.png`}
                        alt="Boss Oni"
                        className="size-20 object-contain"
                      />
                    </div>
                    <div className="space-y-1">
                      <Badge tone="sakura">{contextLabel} · {preparedPool.length} từ</Badge>
                      <h2 className="text-xl font-bold text-fg">
                        Chém Từ Vựng — Bảo vệ Cầu Anh Đào
                      </h2>
                      <p className="text-xs text-muted sm:text-sm">
                        {controlMode === 'romaji'
                          ? 'Gõ trực tiếp Hiragana (IME tiếng Nhật) hoặc phím A–Z để Ninja phóng kiếm khí chém thẳng lên ô chữ trên đầu Yōkai!'
                          : controlMode === 'tiles'
                            ? 'Chạm ghép đúng thứ tự các mảnh chữ Kana bên dưới chân cầu để phóng kiếm khí chém chữ trên đầu Yōkai!'
                            : 'Chạm nhanh vào lá bùa đáp án đúng ở chân cầu để phóng kiếm khí hạ quái!'}
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <span className="text-xs font-medium text-muted">Độ dài màn:</span>
                      <Chip
                        selected={targetKills === 15}
                        onClick={() => setTargetKills(15)}
                      >
                        15 Quái (Nhanh)
                      </Chip>
                      <Chip
                        selected={targetKills === 25}
                        onClick={() => setTargetKills(25)}
                      >
                        25 Quái (Chuẩn)
                      </Chip>
                    </div>

                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
                      leftIcon={<Play className="size-4" aria-hidden />}
                      onClick={startNewGame}
                    >
                      Bắt đầu xuất kiếm
                    </Button>
                  </>
                )}

                {phase === 'paused' && (
                  <>
                    <h2 className="text-lg font-bold text-fg">Đang tạm dừng</h2>
                    <p className="text-xs text-muted">
                      Đã hạ {defeatedCount}/{targetKills} quái · Điểm hiện tại: {score}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        leftIcon={<Play className="size-4" aria-hidden />}
                        onClick={() => setPhase('playing')}
                      >
                        Tiếp tục chơi
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        leftIcon={<RotateCcw className="size-4" aria-hidden />}
                        onClick={startNewGame}
                      >
                        Chơi lại
                      </Button>
                    </div>
                  </>
                )}

                {phase === 'ended' && (
                  <>
                    <Badge tone={isVictory ? 'success' : 'warning'} className="mx-auto">
                      {isVictory ? '★ Bảo vệ Cầu Anh Đào thành công!' : 'Quái đã vượt qua cầu!'}
                    </Badge>
                    <h2 className="text-xl font-bold text-fg">
                      {score.toLocaleString('vi-VN')} điểm
                    </h2>
                    <div className="flex flex-wrap justify-center gap-2 text-xs">
                      <Badge tone="primary">Hạ gục: {defeatedCount} quái</Badge>
                      <Badge tone="sakura">Max Combo: x{maxCombo}</Badge>
                      <Badge tone="success">✓ Đã cộng vào tiến độ Màn hôm nay</Badge>
                    </div>

                    {missedWords.length > 0 && (
                      <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-line bg-surface-2/60 p-2.5 text-left">
                        <p className="text-xs font-semibold text-muted">
                          Từ cần ôn lại ({missedWords.length}):
                        </p>
                        {missedWords.map((w) => {
                          const isStarred = starredIds.includes(w.id);
                          return (
                            <div
                              key={w.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2.5 py-1.5 text-xs"
                            >
                              <div>
                                <span lang="ja" className="font-bold text-fg">
                                  {w.word}
                                </span>{' '}
                                <span lang="ja" className="text-muted">
                                  ({w.reading} · {w.romaji})
                                </span>{' '}
                                — <span className="text-fg">{w.meaning}</span>
                              </div>
                              {onToggleStar && (
                                <button
                                  type="button"
                                  onClick={() => onToggleStar(w.id)}
                                  className={cn(
                                    'cursor-pointer rounded p-1',
                                    isStarred ? 'text-warning-fg' : 'text-muted',
                                  )}
                                  title="Đánh dấu sao để ôn"
                                >
                                  <Star
                                    className={cn('size-4', isStarred && 'fill-current')}
                                  />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
                      leftIcon={<RotateCcw className="size-4" aria-hidden />}
                      onClick={startNewGame}
                    >
                      Chơi ván mới
                    </Button>
                  </>
                )}
              </Card>
            </div>
          )}
        </div>

        {/* Hình 4 Removed in PC Keyboard Mode! Bottom dock ONLY renders for Touch Modes (Kana Tiles / Tap 4 Amulets) */}
        {controlMode === 'tiles' && (
          <div className="shrink-0 border-t border-line bg-surface p-3">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Ghép từ cho:</span>
                  <Badge tone="primary">
                    {primaryMonster
                      ? `${primaryMonster.currentWord.meaning}${
                          primaryMonster.currentWord.word !== primaryMonster.currentWord.reading
                            ? ` (${primaryMonster.currentWord.word})`
                            : ''
                        }`
                      : 'Đang chờ Yōkai...'}
                  </Badge>
                </div>
                {primaryMonster && (
                  <div className="flex flex-wrap items-center gap-1">
                    {primaryMonster.currentWord.moras.map((mora, idx) => {
                      const filled = idx < tileStepIndex;
                      const isNext = idx === tileStepIndex;
                      return (
                        <span
                          key={idx}
                          lang="ja"
                          className={cn(
                            'inline-flex min-w-[28px] items-center justify-center rounded-lg border-2 px-1.5 py-0.5 text-sm font-bold transition-colors',
                            filled
                              ? 'border-success bg-success text-on-primary'
                              : isNext
                                ? 'border-primary bg-primary-soft/50 text-primary-fg'
                                : 'border-line bg-surface text-muted',
                          )}
                        >
                          {filled ? mora.kana : '＿'}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {kanaTileRack.map((tile) => {
                  const used = usedTileUids.includes(tile.uid);
                  const isWrong = wrongTileUid === tile.uid;
                  return (
                    <button
                      key={tile.uid}
                      type="button"
                      disabled={phase !== 'playing' || used}
                      onClick={() => handleTapKanaTile(tile.uid, tile.kana)}
                      className={cn(
                        'flex min-h-[52px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-2 py-1.5 text-center shadow-card transition-all duration-100 active:scale-95',
                        used
                          ? 'border-success-line bg-success-soft/35 text-success-fg opacity-35'
                          : isWrong
                            ? 'border-danger bg-danger-soft text-danger-fg'
                            : 'border-line bg-surface-2 text-fg hover:border-primary hover:bg-primary-soft/45',
                      )}
                    >
                      <span lang="ja" className="text-lg font-bold leading-none">
                        {tile.kana}
                      </span>
                      {showRomajiOnTiles && (
                        <span className="mt-1 font-mono text-[10px] font-semibold text-muted">
                          {tile.romaji}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {controlMode === 'tap4' && (
          <div className="shrink-0 border-t border-line bg-surface p-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted">
                <span>Chạm đúng lá bùa khớp với nghĩa trên đầu Yōkai:</span>
                {primaryMonster && (
                  <strong className="text-primary-fg">
                    Mục tiêu: {primaryMonster.currentWord.meaning}
                  </strong>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tapChoices.map((choice) => (
                  <Button
                    key={choice.id}
                    type="button"
                    variant="soft"
                    disabled={phase !== 'playing'}
                    onClick={() => handleTapAmulet(choice)}
                    className="flex h-auto flex-col items-center py-2.5 text-center"
                  >
                    <span lang="ja" className="text-sm font-bold text-fg">
                      {choice.word}
                    </span>
                    <span lang="ja" className="text-[11px] text-muted">
                      {choice.reading} ({choice.romaji})
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
