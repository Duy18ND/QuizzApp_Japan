import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Flame,
  Heart,
  Infinity as InfinityIcon,
  Play,
  RotateCcw,
  Star,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Badge, Button, Card, Chip } from '../ui';
import { cn } from '../../lib/cn';
import type { VocabularyItem } from '../../types/vocabulary';
import { cleanReadingForGame } from '../../utils/kanaToRomaji';
import { shuffleArray } from '../../utils/shuffle';
import { speakJapanese, stopJapaneseSpeech } from '../../utils/tts';

interface SlashWord {
  id: number;
  word: string;
  reading: string;
  meaning: string;
}

interface FlyingOrb {
  uid: string;
  word: SlashWord | null; // null = Bomb
  isTarget: boolean;
  isBomb: boolean;
  x: number; // canvas px
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  sliced: boolean;
}

interface SlicedHalf {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  vAngle: number;
  radius: number;
  color: string;
  life: number; // 1..0
}

interface TrailPoint {
  x: number;
  y: number;
  age: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

export interface FruitSlashVocabGameProps {
  words: VocabularyItem[];
  contextLabel: string;
  starredIds?: number[];
  onToggleStar?: (vocabId: number) => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onSessionFinish?: (stats: {
    score: number;
    correctCount: number;
    missedWords: SlashWord[];
    durationSeconds: number;
  }) => void;
}

const ORB_PALETTE = ['#0284c7', '#db2777', '#059669', '#d97706', '#7c3aed'];
const CANVAS_W = 900;
const CANVAS_H = 520;
// Lower gravity + apex slow-motion zone so orbs hover gracefully in the middle of the screen for easy glance-and-slash
const GRAVITY = 210;

export const FruitSlashVocabGame: React.FC<FruitSlashVocabGameProps> = ({
  words,
  contextLabel,
  starredIds = [],
  onToggleStar,
  soundEnabled: externalSoundEnabled,
  onToggleSound,
  onSessionFinish,
}) => {
  const baseUrl = import.meta.env.BASE_URL || '/';

  const pool = useMemo<SlashWord[]>(() => {
    const out: SlashWord[] = [];
    for (const w of words) {
      const reading = cleanReadingForGame(w.hiragana || w.kanji || '');
      const meaning = (w.meaning || '').trim();
      if (!reading || !meaning) continue;
      out.push({
        id: Number(w.id),
        word: w.kanji || reading,
        reading,
        meaning,
      });
    }
    return out;
  }, [words]);

  const [phase, setPhase] = useState<'ready' | 'playing' | 'ended'>('ready');
  const [runMode, setRunMode] = useState<'lesson' | 'endless'>('lesson');
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
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [clearedCount, setClearedCount] = useState(0);
  const [currentTarget, setCurrentTarget] = useState<SlashWord | null>(null);
  const [missedWords, setMissedWords] = useState<SlashWord[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const arenaContainerRef = useRef<HTMLDivElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const orbsRef = useRef<FlyingOrb[]>([]);
  const halvesRef = useRef<SlicedHalf[]>([]);
  const trailRef = useRef<TrailPoint[]>([]);
  const textsRef = useRef<FloatingText[]>([]);
  const isPointerDownRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const deckRef = useRef<SlashWord[]>([]);
  const deckIdxRef = useRef(0);
  const roundResolvedRef = useRef(false);
  const nextWaveTimerRef = useRef(0);
  const startTimeRef = useRef(0);
  const livesRef = useRef(3);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const clearedRef = useRef(0);
  const runModeRef = useRef<'lesson' | 'endless'>('lesson');
  const soundRef = useRef(true);
  const finishNotifiedRef = useRef(false);
  const currentTargetRef = useRef<SlashWord | null>(null);

  useEffect(() => {
    runModeRef.current = runMode;
  }, [runMode]);

  useEffect(() => {
    soundRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    const img = new Image();
    img.src = `${baseUrl}game/bg_bridge.jpg`;
    img.onload = () => {
      bgImgRef.current = img;
    };
  }, [baseUrl]);

  const launchNextWave = useCallback(() => {
    if (pool.length === 0) return;
    if (deckRef.current.length === 0 || deckIdxRef.current >= deckRef.current.length) {
      if (runModeRef.current === 'lesson' && deckRef.current.length > 0) {
        setPhase('ended');
        return;
      }
      deckRef.current = shuffleArray(pool);
      deckIdxRef.current = 0;
    }
    const target = deckRef.current[deckIdxRef.current] ?? pool[0];
    deckIdxRef.current += 1;

    currentTargetRef.current = target;
    setCurrentTarget(target);
    roundResolvedRef.current = false;

    // Auto-speak Japanese pronunciation immediately when each new question wave begins!
    if (soundRef.current) {
      speakJapanese(target.reading || target.word);
    }

    const distractors = shuffleArray(pool.filter((w) => w.id !== target.id)).slice(0, 2);
    const waveWords = shuffleArray([target, ...distractors]);
    const includeBomb = clearedRef.current >= 2 && Math.random() < 0.35;

    const totalItems = waveWords.length + (includeBomb ? 1 : 0);
    const spacing = (CANVAS_W - 240) / Math.max(1, totalItems - 1);

    const newOrbs: FlyingOrb[] = waveWords.map((w, idx) => {
      const startX = 120 + idx * spacing + (Math.random() * 28 - 14);
      const centerPull = (CANVAS_W / 2 - startX) * 0.16;
      return {
        uid: `orb-${Date.now()}-${idx}`,
        word: w,
        isTarget: w.id === target.id,
        isBomb: false,
        x: startX,
        y: CANVAS_H + 20 + idx * 8,
        vx: centerPull + (Math.random() * 24 - 12),
        // Gentle launch velocity so orbs rise to upper-middle sightline and hover slowly
        vy: -(385 + Math.random() * 35),
        radius: 58,
        color: ORB_PALETTE[(idx + clearedRef.current) % ORB_PALETTE.length],
        sliced: false,
      };
    });

    if (includeBomb) {
      const bombX = 170 + Math.random() * (CANVAS_W - 340);
      newOrbs.push({
        uid: `bomb-${Date.now()}`,
        word: null,
        isTarget: false,
        isBomb: true,
        x: bombX,
        y: CANVAS_H + 28,
        vx: (CANVAS_W / 2 - bombX) * 0.15,
        vy: -(370 + Math.random() * 28),
        radius: 42,
        color: '#1e293b',
        sliced: false,
      });
    }

    orbsRef.current = newOrbs;
  }, [pool]);

  const startNewGame = useCallback(() => {
    if (pool.length < 3) return;
    deckRef.current = shuffleArray(pool);
    deckIdxRef.current = 0;
    orbsRef.current = [];
    halvesRef.current = [];
    trailRef.current = [];
    textsRef.current = [];
    livesRef.current = 3;
    scoreRef.current = 0;
    comboRef.current = 0;
    clearedRef.current = 0;
    startTimeRef.current = Date.now();
    finishNotifiedRef.current = false;

    setLives(3);
    setScore(0);
    setCombo(0);
    setClearedCount(0);
    setMissedWords([]);
    setPhase('playing');
    launchNextWave();
    window.setTimeout(() => {
      arenaContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }, [launchNextWave, pool]);

  const spawnSlicedHalves = (orb: FlyingOrb) => {
    halvesRef.current.push(
      {
        x: orb.x - 10,
        y: orb.y,
        vx: orb.vx - 95,
        vy: orb.vy - 40,
        angle: -0.25,
        vAngle: -3.2,
        radius: orb.radius,
        color: orb.color,
        life: 1,
      },
      {
        x: orb.x + 10,
        y: orb.y,
        vx: orb.vx + 95,
        vy: orb.vy - 40,
        angle: 0.25,
        vAngle: 3.2,
        radius: orb.radius,
        color: orb.color,
        life: 1,
      },
    );
  };

  const registerMiss = useCallback((wordMissed: SlashWord | null, reasonLabel: string, x: number, y: number) => {
    comboRef.current = 0;
    setCombo(0);
    textsRef.current.push({
      x,
      y,
      text: reasonLabel,
      color: '#f43f5e',
      life: 1,
    });
    if (wordMissed) {
      setMissedWords((prev) =>
        prev.some((w) => w.id === wordMissed.id) ? prev : [...prev, wordMissed],
      );
    }
    livesRef.current = Math.max(0, livesRef.current - 1);
    setLives(livesRef.current);
    if (livesRef.current <= 0) {
      setPhase('ended');
    }
  }, []);

  const handleSliceOrb = useCallback(
    (orb: FlyingOrb) => {
      if (orb.sliced || roundResolvedRef.current) return;
      orb.sliced = true;
      spawnSlicedHalves(orb);

      if (orb.isBomb) {
        roundResolvedRef.current = true;
        nextWaveTimerRef.current = 0.65;
        registerMiss(currentTargetRef.current, '💣 Chém trúng bom! -1 ❤️', orb.x, orb.y);
        return;
      }

      if (orb.isTarget && orb.word) {
        roundResolvedRef.current = true;
        if (soundRef.current) {
          speakJapanese(orb.word.reading || orb.word.word);
        }
        comboRef.current += 1;
        setCombo(comboRef.current);
        const gained = 120 + Math.min(200, comboRef.current * 20);
        scoreRef.current += gained;
        setScore(scoreRef.current);
        clearedRef.current += 1;
        setClearedCount(clearedRef.current);

        textsRef.current.push({
          x: orb.x,
          y: orb.y - 12,
          text: `🌸 “${orb.word.meaning}” (${orb.word.reading})`,
          color: '#34d399',
          life: 1.25,
        });

        if (runModeRef.current === 'lesson' && deckIdxRef.current >= deckRef.current.length) {
          setPhase('ended');
        } else {
          nextWaveTimerRef.current = 0.55;
        }
      } else {
        roundResolvedRef.current = true;
        nextWaveTimerRef.current = 0.7;
        registerMiss(currentTargetRef.current, '✗ Chém nhầm từ! -1 ❤️', orb.x, orb.y);
      }
    },
    [registerMiss],
  );

  // Main 60fps Canvas Loop
  useEffect(() => {
    if (phase !== 'playing') return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      // Update wave cooldown
      if (roundResolvedRef.current && nextWaveTimerRef.current > 0) {
        nextWaveTimerRef.current -= dt;
        if (nextWaveTimerRef.current <= 0 && livesRef.current > 0) {
          launchNextWave();
        }
      }

      // Physics update for orbs (with Apex Hover Slow-Motion so players can glance & slice comfortably)
      let targetFellOut = false;
      for (const orb of orbsRef.current) {
        if (orb.sliced) continue;
        const isInApexHoverZone = orb.y < CANVAS_H * 0.65 && Math.abs(orb.vy) < 135;
        const effDt = isInApexHoverZone ? dt * 0.42 : dt;

        orb.x += orb.vx * effDt;
        orb.y += orb.vy * effDt;
        orb.vy += GRAVITY * effDt;

        // Bounce softly off side walls
        if (orb.x < orb.radius + 12) {
          orb.x = orb.radius + 12;
          orb.vx = Math.abs(orb.vx);
        } else if (orb.x > CANVAS_W - orb.radius - 12) {
          orb.x = CANVAS_W - orb.radius - 12;
          orb.vx = -Math.abs(orb.vx);
        }

        if (orb.isTarget && orb.vy > 0 && orb.y > CANVAS_H + orb.radius + 20) {
          targetFellOut = true;
        }
      }

      if (targetFellOut && !roundResolvedRef.current) {
        roundResolvedRef.current = true;
        nextWaveTimerRef.current = 0.65;
        registerMiss(currentTargetRef.current, 'Bỏ lỡ mục tiêu! -1 ❤️', CANVAS_W / 2, CANVAS_H - 90);
      }

      // Update halves, trails, floating texts
      halvesRef.current = halvesRef.current
        .map((h) => ({
          ...h,
          x: h.x + h.vx * dt,
          y: h.y + h.vy * dt,
          vy: h.vy + GRAVITY * 1.15 * dt,
          angle: h.angle + h.vAngle * dt,
          life: h.life - dt * 1.4,
        }))
        .filter((h) => h.life > 0);

      trailRef.current = trailRef.current
        .map((pt) => ({ ...pt, age: pt.age + dt }))
        .filter((pt) => pt.age < 0.22);

      textsRef.current = textsRef.current
        .map((t) => ({ ...t, y: t.y - dt * 55, life: t.life - dt * 1.1 }))
        .filter((t) => t.life > 0);

      // Render Canvas
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Background
        if (bgImgRef.current) {
          ctx.drawImage(bgImgRef.current, 0, 0, CANVAS_W, CANVAS_H);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        } else {
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        }

        // In-Canvas Sightline Target Banner (right above the apex where orbs hover, so eyes never jump far!)
        if (currentTargetRef.current) {
          ctx.save();
          const pillW = 520;
          const pillH = 44;
          const pillX = (CANVAS_W - pillW) / 2;
          const pillY = 14;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(pillX, pillY, pillW, pillH, 22);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#e0f2fe';
          ctx.font = 'bold 17px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            `⚔ Chém từ: “${currentTargetRef.current.meaning}”`,
            CANVAS_W / 2,
            pillY + pillH / 2,
            pillW - 28,
          );
          ctx.restore();
        }

        // Draw Sliced Halves
        for (const h of halvesRef.current) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, h.life);
          ctx.translate(h.x, h.y);
          ctx.rotate(h.angle);
          ctx.beginPath();
          ctx.arc(0, 0, h.radius, 0, Math.PI);
          ctx.closePath();
          ctx.fillStyle = h.color;
          ctx.fill();
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
          ctx.restore();
        }

        // Draw Active Orbs
        for (const orb of orbsRef.current) {
          if (orb.sliced) continue;
          ctx.save();
          ctx.translate(orb.x, orb.y);

          // Outer glow + fruit/lantern circle
          ctx.beginPath();
          ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
          ctx.fillStyle = orb.color;
          ctx.fill();
          ctx.lineWidth = 4;
          ctx.strokeStyle = orb.isBomb ? '#f43f5e' : 'rgba(255,255,255,0.92)';
          ctx.stroke();

          // Gloss highlight
          ctx.beginPath();
          ctx.arc(-orb.radius * 0.28, -orb.radius * 0.28, orb.radius * 0.22, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.22)';
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          if (orb.isBomb) {
            ctx.font = 'bold 28px sans-serif';
            ctx.fillText('💣', 0, -4);
            ctx.font = 'bold 11px sans-serif';
            ctx.fillStyle = '#fda4af';
            ctx.fillText('TRÁNH!', 0, 22);
          } else if (orb.word) {
            const mainText = orb.word.word;
            const subText = orb.word.word !== orb.word.reading ? orb.word.reading : '';
            const mainFont = mainText.length >= 6 ? 15 : mainText.length >= 4 ? 18 : 22;
            ctx.font = `bold ${mainFont}px "Noto Sans JP", sans-serif`;
            ctx.fillText(mainText, 0, subText ? -8 : 0, orb.radius * 1.72);
            if (subText) {
              ctx.font = '600 12px "Noto Sans JP", sans-serif';
              ctx.fillStyle = 'rgba(255,255,255,0.88)';
              ctx.fillText(subText, 0, 15, orb.radius * 1.72);
            }
          }
          ctx.restore();
        }

        // Draw Katana Swipe Trail
        if (trailRef.current.length > 1) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          for (let i = 1; i < trailRef.current.length; i += 1) {
            const p0 = trailRef.current[i - 1];
            const p1 = trailRef.current[i];
            const alpha = Math.max(0, 1 - p1.age / 0.22);
            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
            ctx.lineWidth = Math.max(2, alpha * 11);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p1.x, p1.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
            ctx.lineWidth = Math.max(1, alpha * 4);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Floating Texts
        for (const ft of textsRef.current) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, ft.life);
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = ft.color;
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.lineWidth = 4;
          ctx.strokeText(ft.text, ft.x, ft.y);
          ctx.fillText(ft.text, ft.x, ft.y);
          ctx.restore();
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [launchNextWave, phase, registerMiss]);

  useEffect(() => {
    if (phase !== 'ended' || finishNotifiedRef.current) return;
    finishNotifiedRef.current = true;
    const durationSeconds = Math.max(5, Math.round((Date.now() - startTimeRef.current) / 1000));
    onSessionFinish?.({
      score: scoreRef.current,
      correctCount: clearedRef.current,
      missedWords,
      durationSeconds,
    });
  }, [missedWords, onSessionFinish, phase]);

  const toCanvasCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_W,
      y: ((clientY - rect.top) / rect.height) * CANVAS_H,
    };
  };

  const checkSlashHit = (x: number, y: number) => {
    for (const orb of orbsRef.current) {
      if (orb.sliced) continue;
      const dx = x - orb.x;
      const dy = y - orb.y;
      if (dx * dx + dy * dy <= (orb.radius + 10) * (orb.radius + 10)) {
        handleSliceOrb(orb);
        break;
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing') return;
    isPointerDownRef.current = true;
    const pt = toCanvasCoords(e.clientX, e.clientY);
    if (!pt) return;
    lastPointerRef.current = pt;
    trailRef.current.push({ x: pt.x, y: pt.y, age: 0 });
    // Also allow instant tap-to-slash for quick mobile play!
    checkSlashHit(pt.x, pt.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (phase !== 'playing' || !isPointerDownRef.current) return;
    const pt = toCanvasCoords(e.clientX, e.clientY);
    if (!pt) return;
    trailRef.current.push({ x: pt.x, y: pt.y, age: 0 });

    // Interpolate along fast swipes so blade never skips over an orb
    const prev = lastPointerRef.current;
    if (prev) {
      const steps = 4;
      for (let s = 1; s <= steps; s += 1) {
        const ix = prev.x + ((pt.x - prev.x) * s) / steps;
        const iy = prev.y + ((pt.y - prev.y) * s) / steps;
        checkSlashHit(ix, iy);
      }
    } else {
      checkSlashHit(pt.x, pt.y);
    }
    lastPointerRef.current = pt;
  };

  const handlePointerUp = () => {
    isPointerDownRef.current = false;
    lastPointerRef.current = null;
  };

  const isVictory = phase === 'ended' && runMode === 'lesson' && lives > 0;

  return (
    <div className="space-y-3">
      {/* Main Fruit Slash Arena */}
      <div
        ref={arenaContainerRef}
        className="relative overflow-hidden rounded-2xl border-2 border-sakura/50 bg-surface shadow-card"
      >
        {/* Target Word Banner on Top */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-2.5 py-2 sm:px-4 sm:py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" aria-label={`Còn ${lives} mạng`}>
              {[1, 2, 3].map((idx) => (
                <Heart
                  key={idx}
                  className={cn(
                    'size-5',
                    idx <= lives ? 'fill-current text-danger-fg' : 'text-line-strong',
                  )}
                />
              ))}
            </div>
            <Badge tone={runMode === 'endless' ? 'sakura' : 'primary'} className="tabular">
              {runMode === 'endless' ? (
                <>
                  <InfinityIcon className="size-3.5" aria-hidden />
                  Vô hạn · {clearedCount} từ
                </>
              ) : (
                <>Đã chém: {clearedCount}/{pool.length}</>
              )}
            </Badge>
            {combo > 1 && (
              <Badge tone="sakura" className="tabular">
                <Flame className="size-3.5" aria-hidden />
                x{combo}
              </Badge>
            )}
          </div>

          {/* Center Target Prompt + Replay Japanese Audio */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Chém từ nghĩa là:
            </span>
            <span className="rounded-xl border border-primary/40 bg-primary-soft px-3.5 py-1 text-base font-bold text-primary-fg sm:text-lg">
              {currentTarget ? `“${currentTarget.meaning}”` : 'Sẵn sàng!'}
            </span>
            {currentTarget && phase === 'playing' && (
              <Button
                type="button"
                variant="soft"
                size="sm"
                onClick={() => speakJapanese(currentTarget.reading || currentTarget.word)}
                leftIcon={<Volume2 className="size-3.5 text-primary-fg" aria-hidden />}
              >
                Nghe lại
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Badge tone="success" className="tabular text-sm">
              <Trophy className="size-3.5" aria-hidden />
              {score.toLocaleString('vi-VN')} điểm
            </Badge>
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
                {soundEnabled ? 'BẬT' : 'TẮT'}
              </Button>
            )}
          </div>
        </div>

        {/* 60fps Canvas */}
        <div className="relative w-full">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="block aspect-[900/520] w-full touch-none select-none cursor-crosshair"
          />

          {phase !== 'playing' && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-surface/85 p-4 backdrop-blur-md">
              <Card padding="lg" className="w-full max-w-md space-y-4 text-center">
                {phase === 'ready' ? (
                  <>
                    <Badge tone="sakura" className="mx-auto">
                      {contextLabel} · {pool.length} từ
                    </Badge>
                    <h2 className="text-xl font-bold text-fg">
                      Chém Hoa Quả Từ Vựng (Fruit Slash)
                    </h2>
                    <p className="text-xs text-muted sm:text-sm">
                      Nhìn nghĩa tiếng Việt hiển thị ở thanh trên cùng → vuốt ngang (hoặc chạm nhanh) chém đôi quả cầu tiếng Nhật đúng nghĩa và tránh bom 💣!
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="text-xs text-muted">Chế độ:</span>
                        <Chip
                          selected={runMode === 'lesson'}
                          onClick={() => setRunMode('lesson')}
                        >
                          Theo bài ({pool.length} từ)
                        </Chip>
                        <Chip
                          selected={runMode === 'endless'}
                          onClick={() => setRunMode('endless')}
                        >
                          <InfinityIcon className="size-3.5" aria-hidden />
                          Random vô hạn
                        </Chip>
                      </div>
                      <p className="text-[11px] text-muted">
                        {runMode === 'lesson'
                          ? `Chém lần lượt hết trọn bộ ${pool.length} từ trong bài đã chọn.`
                          : 'Từ bay lên ngẫu nhiên vô hạn — chỉ thua khi hết 3 HP.'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      className="w-full"
                      leftIcon={<Play className="size-4" aria-hidden />}
                      onClick={startNewGame}
                    >
                      Rút kiếm bắt đầu
                    </Button>
                  </>
                ) : (
                  <>
                    <Badge
                      tone={
                        runMode === 'endless'
                          ? 'sakura'
                          : isVictory
                            ? 'success'
                            : 'warning'
                      }
                      className="mx-auto"
                    >
                      {runMode === 'endless'
                        ? `∞ Hết HP · Chém được ${clearedCount} từ!`
                        : isVictory
                          ? `★ Hoàn thành trọn bộ ${pool.length} từ!`
                          : 'Hết HP rồi!'}
                    </Badge>
                    <h2 className="text-2xl font-bold text-fg">
                      {score.toLocaleString('vi-VN')} điểm
                    </h2>
                    <p className="text-xs text-muted">
                      Chém chuẩn:{' '}
                      <strong className="text-fg">
                        {runMode === 'endless' ? `${clearedCount}` : `${clearedCount}/${pool.length}`}
                      </strong>{' '}
                      từ · Đã tự động tích tiến độ học hôm nay.
                    </p>

                    {missedWords.length > 0 && (
                      <div className="max-h-36 space-y-1.5 overflow-y-auto rounded-xl border border-line bg-surface-2/60 p-2.5 text-left">
                        <p className="text-xs font-semibold text-muted">
                          Từ cần ôn lại ({missedWords.length}):
                        </p>
                        {missedWords.map((w) => {
                          const isStarred = starredIds.includes(w.id);
                          return (
                            <div
                              key={w.id}
                              className="flex items-center justify-between gap-2 rounded-lg bg-surface px-2.5 py-1 text-xs"
                            >
                              <span>
                                <strong lang="ja">{w.word}</strong> ({w.reading}) — {w.meaning}
                              </span>
                              {onToggleStar && (
                                <button
                                  type="button"
                                  onClick={() => onToggleStar(w.id)}
                                  className={cn(
                                    'cursor-pointer p-1',
                                    isStarred ? 'text-warning-fg' : 'text-muted',
                                  )}
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
                      Chơi lại ván mới
                    </Button>
                  </>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
