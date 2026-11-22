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
  kanaToRomaji,
  normalizeRomajiInput,
  splitKanaToMoras,
  type KanaMora,
} from '../../utils/kanaToRomaji';
import { shuffleArray } from '../../utils/shuffle';
import { speakJapanese } from '../../utils/tts';

export type ShooterControlMode = 'romaji' | 'tiles' | 'tap4';
export type ShooterHintMode = 'full' | 'masked' | 'hidden';
type MonsterKind = 'lantern' | 'ninja' | 'oni';

interface PreparedWord {
  id: number;
  word: string;
  reading: string;
  meaning: string;
  romaji: string;
  normalizedRomaji: string;
  moras: KanaMora[];
}

interface ActiveMonster {
  uid: string;
  kind: MonsterKind;
  lane: 0 | 1 | 2;
  yPct: number; // 18 .. 80
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
  progress: number; // 0..1
}

interface HitBurst {
  id: string;
  x: number;
  y: number;
  label: string;
  isBoss: boolean;
}

export interface NinjaBridgeShooterProps {
  words: VocabularyItem[];
  contextLabel: string;
  starredIds?: number[];
  onToggleStar?: (vocabId: number) => void;
  onSessionFinish?: (stats: {
    score: number;
    defeatedCount: number;
    missedWords: PreparedWord[];
    durationSeconds: number;
  }) => void;
}

const INPUT_PREF_STORAGE_KEY = 'nihonmaster_shooter_input_mode_v1';

const LANE_X_PCT: Record<0 | 1 | 2, number> = {
  0: 27,
  1: 50,
  2: 73,
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

/**
 * Tier 1 Device Detection:
 * - PC / Laptop (fine pointer + hover + non-touch primary): defaults to 'romaji' keyboard
 * - Tablet / iPad / Phone (coarse pointer or touch-first): defaults to 'tiles' Kana Tile Builder
 *   (NEVER triggers the on-screen virtual keyboard unless user manually taps Keyboard mode)
 */
function detectInitialShooterControlMode(): ShooterControlMode {
  if (typeof window === 'undefined') return 'romaji';
  try {
    const saved = window.localStorage.getItem(INPUT_PREF_STORAGE_KEY);
    if (saved === 'romaji' || saved === 'tiles' || saved === 'tap4') {
      return saved;
    }
  } catch {
    // ignore storage errors
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

export const NinjaBridgeShooterGame: React.FC<NinjaBridgeShooterProps> = ({
  words,
  contextLabel,
  starredIds = [],
  onToggleStar,
  onSessionFinish,
}) => {
  const baseUrl = import.meta.env.BASE_URL || '/';

  const preparedPool = useMemo<PreparedWord[]>(() => {
    const out: PreparedWord[] = [];
    for (const item of words) {
      const reading = cleanReadingForGame(item.hiragana || item.kanji || '');
      const meaning = (item.meaning || '').trim();
      if (!reading || !meaning) continue;
      const romaji = kanaToRomaji(reading);
      const moras = splitKanaToMoras(reading);
      if (!romaji || moras.length === 0) continue;
      out.push({
        id: Number(item.id),
        word: item.kanji || reading,
        reading,
        meaning,
        romaji,
        normalizedRomaji: normalizeRomajiInput(romaji),
        moras,
      });
    }
    return out;
  }, [words]);

  const [controlMode, setControlMode] = useState<ShooterControlMode>(() =>
    detectInitialShooterControlMode(),
  );
  const [hwKeyboardDetected, setHwKeyboardDetected] = useState(false);
  const [showRomajiOnTiles, setShowRomajiOnTiles] = useState(true);
  const [hintMode, setHintMode] = useState<ShooterHintMode>('masked');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [phase, setPhase] = useState<'ready' | 'playing' | 'paused' | 'ended'>('ready');
  const [targetKills, setTargetKills] = useState<15 | 25>(15);

  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [defeatedCount, setDefeatedCount] = useState(0);
  const [playerFrame, setPlayerFrame] = useState<1 | 2 | 3>(1);
  const [playerLane, setPlayerLane] = useState<0 | 1 | 2>(1);
  const [typedInput, setTypedInput] = useState('');
  const [tileStepIndex, setTileStepIndex] = useState(0);
  const [usedTileUids, setUsedTileUids] = useState<string[]>([]);
  const [wrongTileUid, setWrongTileUid] = useState<string | null>(null);
  const [inputShake, setInputShake] = useState(false);
  const [lockedMonsterId, setLockedMonsterId] = useState<string | null>(null);
  const [monsters, setMonsters] = useState<ActiveMonster[]>([]);
  const [projectiles, setProjectiles] = useState<ActiveProjectile[]>([]);
  const [bursts, setBursts] = useState<HitBurst[]>([]);
  const [missedWords, setMissedWords] = useState<PreparedWord[]>([]);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const deckRef = useRef<PreparedWord[]>([]);
  const deckCursorRef = useRef(0);
  const spawnCountRef = useRef(0);
  const lastSpawnAtRef = useRef(0);
  const startTimeRef = useRef(0);
  const slashTimerRef = useRef<number | null>(null);
  const finishNotifiedRef = useRef(false);
  const monstersRef = useRef<ActiveMonster[]>([]);
  const livesRef = useRef(3);

  const selectControlMode = useCallback((nextMode: ShooterControlMode) => {
    setControlMode(nextMode);
    setTypedInput('');
    setTileStepIndex(0);
    setUsedTileUids([]);
    try {
      window.localStorage.setItem(INPUT_PREF_STORAGE_KEY, nextMode);
    } catch {
      // ignore
    }
    if (nextMode === 'romaji') {
      window.setTimeout(() => inputRef.current?.focus(), 40);
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

  const triggerPlayerSlash = useCallback(
    (lane: 0 | 1 | 2, targetYPct: number, isFinalKill: boolean) => {
      setPlayerLane(lane);
      setPlayerFrame(isFinalKill ? 3 : 2);
      if (slashTimerRef.current) window.clearTimeout(slashTimerRef.current);
      slashTimerRef.current = window.setTimeout(
        () => {
          setPlayerFrame(1);
        },
        isFinalKill ? 320 : 180,
      );

      const projId = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setProjectiles((prev) => [
        ...prev.slice(-6),
        {
          id: projId,
          fromX: LANE_X_PCT[lane],
          fromY: 84,
          toX: LANE_X_PCT[lane],
          toY: Math.max(18, targetYPct),
          progress: 0,
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
    setDefeatedCount(0);
    setPlayerFrame(1);
    setPlayerLane(1);
    setTypedInput('');
    setTileStepIndex(0);
    setUsedTileUids([]);
    setLockedMonsterId(null);
    setMonsters([]);
    setProjectiles([]);
    setBursts([]);
    setMissedWords([]);
    setPhase('playing');

    // Only focus text input on PC / explicit romaji mode — NEVER pop virtual keyboard on iPad/Mobile!
    if (controlMode === 'romaji') {
      window.setTimeout(() => {
        inputRef.current?.focus();
      }, 60);
    }
  }, [controlMode, preparedPool]);

  useEffect(() => {
    monstersRef.current = monsters;
  }, [monsters]);

  // Spawn & movement loop at 60fps (StrictMode-safe: never calls side-effect setStates inside an updater)
  useEffect(() => {
    if (phase !== 'playing' || preparedPool.length === 0) return;

    let rafId = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      setProjectiles((prev) =>
        prev
          .map((p) => ({ ...p, progress: p.progress + dt * 5.2 }))
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
        moved.length === 0 || (moved.length < 3 && elapsedSinceSpawn > 2500);

      if (shouldSpawn) {
        lastSpawnAtRef.current = now;
        spawnCountRef.current += 1;
        const idx = spawnCountRef.current;
        const isBoss = idx % 5 === 0;
        const isFastNinja = !isBoss && idx % 3 === 0;
        const kind: MonsterKind = isBoss ? 'oni' : isFastNinja ? 'ninja' : 'lantern';

        const busyLanes = new Set(moved.filter((m) => m.yPct < 34).map((m) => m.lane));
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
          yPct: 19,
          speedPctPerSec: isBoss ? 3.8 : isFastNinja ? 7.0 : 5.3,
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

      const basePts = isFinalHit ? MONSTER_META[target.kind].points : 80;
      const gained = basePts + Math.min(200, nextCombo * 15);
      setScore((s) => s + gained);

      const burstId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
      setBursts((prev) => [
        ...prev.slice(-4),
        {
          id: burstId,
          x: LANE_X_PCT[target.lane],
          y: target.yPct,
          label: isFinalHit ? `+${gained} · Hạ gục!` : `+${gained} · Phá giáp!`,
          isBoss: target.kind === 'oni',
        },
      ]);
      window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burstId));
      }, 650);

      setTypedInput('');
      setTileStepIndex(0);
      setUsedTileUids([]);

      if (!isFinalHit) {
        const nextWord = target.wordQueue[0] ?? drawNextWord();
        const nextMonsters = monstersRef.current.map((m) =>
          m.uid === target.uid
            ? {
                ...m,
                hp: m.hp - 1,
                yPct: Math.max(18, m.yPct - 8),
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

  // Closest monster (default lock priority)
  const primaryMonster = useMemo(() => {
    if (monsters.length === 0) return null;
    if (lockedMonsterId) {
      const locked = monsters.find((m) => m.uid === lockedMonsterId);
      if (locked) return locked;
    }
    return [...monsters].sort((a, b) => b.yPct - a.yPct)[0] ?? null;
  }, [lockedMonsterId, monsters]);

  // Handle Romaji or Japanese typing
  const handleInputChange = useCallback(
    (rawVal: string) => {
      if (phase !== 'playing') return;
      const trimmed = rawVal.trimStart();
      if (!trimmed) {
        setTypedInput('');
        return;
      }

      const directMatch = monsters.find(
        (m) => m.currentWord.reading === trimmed || m.currentWord.word === trimmed,
      );
      if (directMatch) {
        hitOrDefeatMonster(directMatch);
        return;
      }

      const norm = normalizeRomajiInput(trimmed);
      const rawLower = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');

      const orderedCandidates = [...monsters].sort((a, b) => {
        if (a.uid === lockedMonsterId) return -1;
        if (b.uid === lockedMonsterId) return 1;
        return b.yPct - a.yPct;
      });

      const prefixMatch = orderedCandidates.find(
        (m) =>
          m.currentWord.romaji.startsWith(rawLower) ||
          m.currentWord.normalizedRomaji.startsWith(norm),
      );

      if (prefixMatch) {
        setLockedMonsterId(prefixMatch.uid);
        setPlayerLane(prefixMatch.lane);

        const isComplete =
          rawLower === prefixMatch.currentWord.romaji ||
          norm === prefixMatch.currentWord.normalizedRomaji;

        if (isComplete) {
          hitOrDefeatMonster(prefixMatch);
        } else {
          setTypedInput(rawLower);
          setPlayerFrame(2);
        }
      } else {
        setInputShake(true);
        window.setTimeout(() => setInputShake(false), 220);
      }
    },
    [hitOrDefeatMonster, lockedMonsterId, monsters, phase],
  );

  // Tier 2 Auto-Wake Hardware Keyboard Detector (works seamlessly on iPad/Tablet with Bluetooth/Magic Keyboard!)
  useEffect(() => {
    if (phase !== 'playing') return;

    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        setPhase('paused');
        return;
      }

      if (e.key === 'Backspace' && controlMode === 'romaji') {
        e.preventDefault();
        setTypedInput((prev) => prev.slice(0, -1));
        return;
      }

      if (e.key.length === 1 && /^[a-zA-Z0-9]$/.test(e.key)) {
        e.preventDefault();
        if (controlMode !== 'romaji') {
          // Hardware keyboard detected on iPad / Tablet! Auto-switch seamlessly and consume first letter!
          setHwKeyboardDetected(true);
          setControlMode('romaji');
          handleInputChange(e.key.toLowerCase());
        } else {
          handleInputChange(`${typedInput}${e.key.toLowerCase()}`);
        }
      }
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [controlMode, handleInputChange, phase, typedInput]);

  // Kana Tile Rack for the currently targeted monster (Kiểu A: sequential in-order matching!)
  const tileRackKey = primaryMonster
    ? `${primaryMonster.uid}-${primaryMonster.hp}-${primaryMonster.currentWord.id}`
    : '';
  const kanaTileRack = useMemo(() => {
    if (!primaryMonster) return [];
    return buildKanaTileRack(tileRackKey, primaryMonster.currentWord.moras);
  }, [primaryMonster, tileRackKey]);

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
        // Completed the full word -> full Sakura Slash!
        hitOrDefeatMonster(primaryMonster);
      } else {
        // Partial hit -> mini blade swing + gentle knockback!
        setTileStepIndex(nextStep);
        setUsedTileUids((prev) => [...prev, tileUid]);
        triggerPlayerSlash(primaryMonster.lane, primaryMonster.yPct, false);
        const knockedBack = monstersRef.current.map((m) =>
          m.uid === primaryMonster.uid
            ? { ...m, yPct: Math.max(18, m.yPct - 2.5) }
            : m,
        );
        monstersRef.current = knockedBack;
        setMonsters(knockedBack);
      }
    } else {
      // Wrong mora tapped -> brief red shake without clogging slots (Kiểu A!)
      setCombo(0);
      setWrongTileUid(tileUid);
      window.setTimeout(() => setWrongTileUid(null), 260);
    }
  };

  // Generate 4 amulet choices for Tap-4 Quick Mode
  const tapChoices = useMemo(() => {
    if (!primaryMonster || preparedPool.length === 0) return [];
    const activeWords = monsters.map((m) => m.currentWord);
    const distractors = preparedPool.filter(
      (w) => !activeWords.some((aw) => aw.id === w.id),
    );
    const picked: PreparedWord[] = [...activeWords];
    const shuffledDistractors = shuffleArray(distractors);
    for (const d of shuffledDistractors) {
      if (picked.length >= 4) break;
      picked.push(d);
    }
    return shuffleArray(picked.slice(0, 4));
  }, [monsters, preparedPool, primaryMonster]);

  const handleTapAmulet = (word: PreparedWord) => {
    if (phase !== 'playing') return;
    const matchedMonster = [...monsters]
      .sort((a, b) => b.yPct - a.yPct)
      .find((m) => m.currentWord.id === word.id);

    if (matchedMonster) {
      hitOrDefeatMonster(matchedMonster);
    } else {
      setCombo(0);
      setInputShake(true);
      window.setTimeout(() => setInputShake(false), 240);
    }
  };

  const renderRomajiHint = (monster: ActiveMonster, isTarget: boolean) => {
    const romaji = monster.currentWord.romaji;
    const normTyped = normalizeRomajiInput(typedInput);
    const matchedLen = !isTarget
      ? 0
      : romaji.startsWith(typedInput)
        ? typedInput.length
        : monster.currentWord.normalizedRomaji.startsWith(normTyped)
          ? Math.min(romaji.length, normTyped.length)
          : 0;

    return (
      <div className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5 font-mono text-xs font-bold tracking-wider">
        {romaji.split('').map((ch, idx) => {
          const isTyped = idx < matchedLen;
          const isVisible =
            isTyped ||
            hintMode === 'full' ||
            (hintMode === 'masked' && idx < Math.max(2, Math.ceil(romaji.length * 0.45)));
          return (
            <span
              key={idx}
              className={cn(
                'inline-block rounded px-0.5 transition-colors',
                isTyped
                  ? 'bg-success-soft text-success-fg'
                  : isVisible
                    ? 'text-primary-fg'
                    : 'text-muted',
              )}
            >
              {isVisible ? ch : '_'}
            </span>
          );
        })}
      </div>
    );
  };

  const renderTileSlotsOnMonster = (monster: ActiveMonster, isTarget: boolean) => {
    const matchedCount = isTarget ? tileStepIndex : 0;
    return (
      <div className="mt-0.5 flex flex-wrap items-center justify-center gap-0.5">
        {monster.currentWord.moras.map((mora, idx) => {
          const filled = idx < matchedCount;
          return (
            <span
              key={idx}
              lang="ja"
              className={cn(
                'inline-flex min-w-[20px] items-center justify-center rounded border px-1 py-0.5 text-[11px] font-bold',
                filled
                  ? 'border-success-line bg-success-soft text-success-fg'
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
    <div className="space-y-4">
      {/* Top Control & 3-Tier Adaptive Input Bar */}
      <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{contextLabel}</Badge>
          {hwKeyboardDetected && (
            <Badge tone="success">⌨ Đã tự nhận bàn phím rời</Badge>
          )}
          <Chip
            selected={controlMode === 'romaji'}
            onClick={() => selectControlMode('romaji')}
          >
            <Keyboard className="size-3.5" aria-hidden />
            Gõ Bàn Phím (PC)
          </Chip>
          <Chip
            selected={controlMode === 'tiles'}
            onClick={() => selectControlMode('tiles')}
          >
            <Puzzle className="size-3.5" aria-hidden />
            Ghép Mảnh Chữ (iPad/Mobile)
          </Chip>
          <Chip
            selected={controlMode === 'tap4'}
            onClick={() => selectControlMode('tap4')}
          >
            <Smartphone className="size-3.5" aria-hidden />
            Chạm 4 Bùa
          </Chip>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {controlMode === 'romaji' && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted">Gợi ý:</span>
              {(
                [
                  { id: 'full', label: 'Đầy đủ' },
                  { id: 'masked', label: 'Nửa từ' },
                  { id: 'hidden', label: 'Ẩn' },
                ] as const
              ).map((h) => (
                <Chip
                  key={h.id}
                  selected={hintMode === h.id}
                  onClick={() => setHintMode(h.id)}
                >
                  {h.label}
                </Chip>
              ))}
            </div>
          )}

          {controlMode === 'tiles' && (
            <Chip
              selected={showRomajiOnTiles}
              onClick={() => setShowRomajiOnTiles((v) => !v)}
            >
              Romaji trên mảnh ({showRomajiOnTiles ? 'BẬT' : 'TẮT'})
            </Chip>
          )}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setSoundEnabled((s) => !s)}
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
        </div>
      </Card>

      {/* Main Sakura Stone Bridge Arena */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-primary/40 bg-surface shadow-card">
        <div
          className="relative h-[500px] w-full select-none bg-cover bg-center sm:h-[550px]"
          style={{
            backgroundImage: `url(${baseUrl}game/bg_bridge.jpg)`,
          }}
          onClick={() => {
            if (phase === 'playing' && controlMode === 'romaji') {
              inputRef.current?.focus();
            }
          }}
        >
          {/* Top HUD Overlay */}
          <div className="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface/85 px-3.5 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
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
            </div>

            <div className="flex items-center gap-2">
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
            className="pointer-events-none absolute inset-x-[14%] top-[80%] z-10 border-t-2 border-dashed border-sakura/70"
          />

          {/* Active Yōkai Monsters descending the bridge */}
          {monsters.map((m) => {
            const isTarget = primaryMonster?.uid === m.uid;
            const meta = MONSTER_META[m.kind];
            return (
              <div
                key={m.uid}
                onClick={(e) => {
                  e.stopPropagation();
                  setLockedMonsterId(m.uid);
                  setTypedInput('');
                  setTileStepIndex(0);
                  setUsedTileUids([]);
                  if (controlMode === 'romaji') inputRef.current?.focus();
                }}
                style={{
                  left: `${LANE_X_PCT[m.lane]}%`,
                  top: `${m.yPct}%`,
                }}
                className={cn(
                  'absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-75',
                  isTarget && 'scale-105',
                )}
              >
                <div
                  className={cn(
                    'mb-1 min-w-[140px] max-w-[196px] rounded-xl border-2 px-2.5 py-1.5 text-center shadow-card backdrop-blur-md transition-colors',
                    isTarget
                      ? 'border-primary bg-surface ring-2 ring-primary/35'
                      : 'border-line bg-surface/90',
                  )}
                >
                  {m.maxHp > 1 && (
                    <div className="mb-1 flex items-center justify-center gap-1">
                      <span className="text-[10px] font-bold text-danger-fg uppercase">
                        BOSS
                      </span>
                      {Array.from({ length: m.maxHp }).map((_, hpIdx) => (
                        <span
                          key={hpIdx}
                          className={cn(
                            'size-2 rounded-full',
                            hpIdx < m.hp ? 'bg-danger' : 'bg-line-strong',
                          )}
                        />
                      ))}
                    </div>
                  )}

                  <p className="truncate text-xs font-bold text-fg">
                    {m.currentWord.meaning}
                  </p>
                  {controlMode !== 'tiles' && (
                    <p lang="ja" className="text-[11px] font-semibold text-muted">
                      {m.currentWord.word !== m.currentWord.reading
                        ? `${m.currentWord.word} (${m.currentWord.reading})`
                        : m.currentWord.reading}
                    </p>
                  )}

                  {controlMode === 'romaji' && renderRomajiHint(m, isTarget)}
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

          {/* Flying Kiếm Khí Projectiles */}
          {projectiles.map((p) => {
            const curX = p.fromX + (p.toX - p.fromX) * p.progress;
            const curY = p.fromY + (p.toY - p.fromY) * p.progress;
            return (
              <img
                key={p.id}
                src={`${baseUrl}game/kiem_khi.png`}
                alt=""
                aria-hidden
                style={{ left: `${curX}%`, top: `${curY}%` }}
                className="pointer-events-none absolute z-20 size-20 -translate-x-1/2 -translate-y-1/2 object-contain"
              />
            );
          })}

          {/* Floating Score Bursts */}
          {bursts.map((b) => (
            <div
              key={b.id}
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
              className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-1/2 animate-fade-up"
            >
              <Badge tone={b.isBoss ? 'sakura' : 'success'} className="shadow-card">
                {b.label}
              </Badge>
            </div>
          ))}

          {/* Ninja Defender */}
          <div
            style={{ left: `${LANE_X_PCT[playerLane]}%` }}
            className="pointer-events-none absolute bottom-3 z-10 -translate-x-1/2 transition-all duration-150"
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
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface/85 p-4 backdrop-blur-md">
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
                      <Badge tone="sakura">Ninja Cầu Anh Đào · {preparedPool.length} từ</Badge>
                      <h2 className="text-xl font-bold text-fg">
                        Chém Từ Vựng — Bảo vệ Cầu Anh Đào
                      </h2>
                      <p className="text-xs text-muted sm:text-sm">
                        {controlMode === 'romaji'
                          ? 'Gõ chữ cái Romaji trên bàn phím (VD: tabemasu) để phóng kiếm khí tiêu diệt Yōkai!'
                          : controlMode === 'tiles'
                            ? 'Chạm ghép đúng thứ tự các mảnh chữ Kana bên dưới chân cầu (nếu iPad/Tablet có gắn bàn phím rời, chỉ cần gõ phím là tự chuyển sang chế độ Bàn phím!).'
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
                    <div className="flex justify-center gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        leftIcon={<Play className="size-4" aria-hidden />}
                        onClick={() => {
                          setPhase('playing');
                          if (controlMode === 'romaji') {
                            window.setTimeout(() => inputRef.current?.focus(), 40);
                          }
                        }}
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

        {/* Bottom Dock: 1. PC Keyboard | 2. Kana Syllable Tile Builder (iPad/Mobile) | 3. Tap 4 Amulets */}
        <div className="border-t border-line bg-surface p-3.5">
          {controlMode === 'romaji' ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-xs font-bold text-primary-fg">
                  剣
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={typedInput}
                  disabled={phase !== 'playing'}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder={
                    primaryMonster
                      ? `Gõ Romaji cho "${primaryMonster.currentWord.meaning}" (VD: ${primaryMonster.currentWord.romaji})...`
                      : 'Nhấn Bắt đầu để gõ Romaji phóng kiếm khí...'
                  }
                  className={cn(
                    'h-10 w-full rounded-xl border bg-surface-2 px-3.5 font-mono text-sm font-bold tracking-wider text-fg outline-none transition-colors focus:border-primary',
                    inputShake ? 'border-danger bg-danger-soft/40' : 'border-line',
                  )}
                />
              </div>
              {primaryMonster && (
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span>Mục tiêu gần nhất:</span>
                  <Badge tone="primary">
                    {primaryMonster.currentWord.meaning} ({primaryMonster.currentWord.reading})
                  </Badge>
                </div>
              )}
            </div>
          ) : controlMode === 'tiles' ? (
            <div className="space-y-3">
              {/* Answer Slot Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface-2/60 px-3 py-2">
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
                            'inline-flex min-w-[30px] items-center justify-center rounded-lg border-2 px-2 py-0.5 text-sm font-bold transition-colors',
                            filled
                              ? 'border-success-line bg-success-soft text-success-fg'
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

              {/* Tactile Kana Tile Rack (Kiểu A: sequential matching, no virtual keyboard!) */}
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
                        'flex min-h-[54px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-2 py-1.5 text-center shadow-card transition-all duration-100 active:scale-95',
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
              <p className="text-center text-[11px] text-muted">
                Chạm đúng thứ tự từng mảnh Kana để phóng kiếm khí (nếu dùng iPad/Tablet có bàn phím rời, cứ gõ phím A–Z để tự chuyển chế độ Bàn phím!).
              </p>
            </div>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};
