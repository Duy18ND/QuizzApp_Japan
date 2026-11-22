import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Flame,
  Play,
  RotateCcw,
  Trophy,
  Volume2,
  XCircle,
} from 'lucide-react';
import { Badge, Button, Card, Chip, ProgressBar } from '../ui';
import { cn } from '../../lib/cn';
import type { SmartGrammarRule } from '../../types/grammarEngine';
import type { KanjiItem } from '../../types/kanji';
import type { VocabularyItem } from '../../types/vocabulary';
import type { StageSkill } from '../../services/stageRoadmapService';
import { shuffleArray } from '../../utils/shuffle';
import { speakJapanese } from '../../utils/tts';

export interface MiniGamePair {
  id: string;
  leftText: string;
  leftSub?: string;
  rightText: string;
  speakText?: string;
  skill: StageSkill;
}

/* ============================================================================
   GAME 2: NỐI CẶP 2 CỘT (LIÊN KẾT BÙA — 4 CHẾ ĐỘ: KANJI / TỪ VỰNG / NGỮ PHÁP)
   ============================================================================ */

export type PairMatchSourceMode =
  | 'kanji-meaning'
  | 'kanji-reading'
  | 'vocab-meaning'
  | 'grammar-meaning';

export const PairMatchGame: React.FC<{
  words: VocabularyItem[];
  kanjis: KanjiItem[];
  grammars: SmartGrammarRule[];
  levelLabel: string;
  onCompleteRound: (stats: { score: number; skill: StageSkill; seconds: number }) => void;
}> = ({ words, kanjis, grammars, levelLabel, onCompleteRound }) => {
  const [sourceMode, setSourceMode] = useState<PairMatchSourceMode>('kanji-meaning');
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const [selectedRightId, setSelectedRightId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [finished, setFinished] = useState(false);
  const [roundSeed, setRoundSeed] = useState(0);

  const allPairs = useMemo<MiniGamePair[]>(() => {
    if (sourceMode === 'kanji-meaning') {
      return kanjis.map((k) => ({
        id: `km-${k.id}`,
        leftText: k.kanji,
        leftSub: k.hanViet ? `[${k.hanViet}]` : undefined,
        rightText: k.meanings.slice(0, 2).join(', '),
        speakText: k.examples?.[0]?.hiragana || k.kunReadings?.[0] || k.kanji,
        skill: 'kanji',
      }));
    }
    if (sourceMode === 'kanji-reading') {
      return kanjis
        .filter((k) => k.kunReadings.length > 0 || k.onReadings.length > 0)
        .map((k) => ({
          id: `kr-${k.id}`,
          leftText: k.kanji,
          leftSub: k.hanViet ? `[${k.hanViet}]` : undefined,
          rightText: [...k.kunReadings.slice(0, 1), ...k.onReadings.slice(0, 1)].join(' · '),
          speakText: k.kunReadings?.[0] || k.kanji,
          skill: 'kanji',
        }));
    }
    if (sourceMode === 'grammar-meaning') {
      return grammars.map((g) => ({
        id: `gm-${g.id}`,
        leftText: g.name,
        leftSub: g.hiragana,
        rightText: g.meaning,
        skill: 'grammar',
      }));
    }
    return words.map((w) => ({
      id: `vm-${w.id}`,
      leftText: w.kanji || w.hiragana,
      leftSub: w.kanji && w.kanji !== w.hiragana ? w.hiragana : undefined,
      rightText: w.meaning,
      speakText: w.hiragana || w.kanji || '',
      skill: 'vocab',
    }));
  }, [grammars, kanjis, sourceMode, words]);

  const wavePairs = useMemo(() => {
    if (roundSeed < 0 || allPairs.length === 0) return [];
    const shuffled = shuffleArray(allPairs);
    const start = ((wave - 1) * 6) % Math.max(1, shuffled.length);
    const slice = shuffled.slice(start, start + 6);
    return slice.length >= 4 ? slice : shuffled.slice(0, Math.min(6, shuffled.length));
  }, [allPairs, roundSeed, wave]);

  const leftItems = useMemo(() => shuffleArray(wavePairs), [wavePairs]);
  const rightItems = useMemo(() => shuffleArray(wavePairs), [wavePairs]);

  useEffect(() => {
    if (finished) return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [finished]);

  const resetGame = (nextMode = sourceMode) => {
    setSourceMode(nextMode);
    setWave(1);
    setScore(0);
    setCombo(0);
    setSeconds(0);
    setSelectedLeftId(null);
    setSelectedRightId(null);
    setMatchedIds([]);
    setFinished(false);
    setRoundSeed((s) => s + 1);
  };

  const verifyMatch = useCallback(
    (leftId: string, rightId: string) => {
      if (leftId === rightId) {
        const pair = wavePairs.find((p) => p.id === leftId);
        if (pair?.speakText) speakJapanese(pair.speakText);
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        const nextScore = score + 100 + nextCombo * 20;
        setScore(nextScore);
        setSelectedLeftId(null);
        setSelectedRightId(null);

        setMatchedIds((prev) => {
          const next = [...prev, leftId];
          if (next.length >= wavePairs.length) {
            if (wave < 3) {
              window.setTimeout(() => {
                setWave((w) => w + 1);
                setMatchedIds([]);
              }, 360);
            } else {
              setFinished(true);
              const skill: StageSkill =
                sourceMode === 'grammar-meaning'
                  ? 'grammar'
                  : sourceMode.startsWith('kanji')
                    ? 'kanji'
                    : 'vocab';
              onCompleteRound({ score: nextScore, skill, seconds });
            }
          }
          return next;
        });
      } else {
        setCombo(0);
        setWrongFlash(true);
        window.setTimeout(() => {
          setWrongFlash(false);
          setSelectedLeftId(null);
          setSelectedRightId(null);
        }, 320);
      }
    },
    [combo, onCompleteRound, score, seconds, sourceMode, wave, wavePairs],
  );

  const handlePickLeft = (id: string) => {
    if (matchedIds.includes(id)) return;
    setSelectedLeftId(id);
    if (selectedRightId) verifyMatch(id, selectedRightId);
  };

  const handlePickRight = (id: string) => {
    if (matchedIds.includes(id)) return;
    setSelectedRightId(id);
    if (selectedLeftId) verifyMatch(selectedLeftId, id);
  };

  return (
    <div className="space-y-4">
      <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'kanji-meaning', label: 'Chữ Hán ↔ Nghĩa Việt' },
              { id: 'kanji-reading', label: 'Chữ Hán ↔ Âm đọc' },
              { id: 'vocab-meaning', label: 'Từ vựng ↔ Nghĩa Việt' },
              { id: 'grammar-meaning', label: 'Ngữ pháp ↔ Ý nghĩa' },
            ] as const
          ).map((m) => (
            <Chip
              key={m.id}
              selected={sourceMode === m.id}
              onClick={() => resetGame(m.id)}
            >
              {m.label}
            </Chip>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="primary" className="tabular">
            Đợt {wave}/3
          </Badge>
          <Badge tone="neutral" className="tabular">
            <Clock className="size-3.5" aria-hidden />
            {seconds}s
          </Badge>
          {combo > 1 && (
            <Badge tone="sakura" className="tabular">
              <Flame className="size-3.5" aria-hidden />
              x{combo}
            </Badge>
          )}
          <Badge tone="success" className="tabular">
            {score} điểm
          </Badge>
        </div>
      </Card>

      {finished ? (
        <Card padding="lg" className="space-y-4 text-center">
          <Badge tone="success" className="mx-auto">
            ★ Hoàn thành 3 đợt Liên Kết Bùa ({levelLabel})
          </Badge>
          <h3 className="text-2xl font-bold text-fg">{score.toLocaleString('vi-VN')} điểm</h3>
          <p className="text-sm text-muted">
            Thời gian hoàn thành: <strong className="text-fg">{seconds} giây</strong> · Đã tự động cập nhật tiến độ học hôm nay!
          </p>
          <Button
            type="button"
            variant="primary"
            leftIcon={<RotateCcw className="size-4" aria-hidden />}
            onClick={() => resetGame(sourceMode)}
          >
            Chơi lại vòng mới
          </Button>
        </Card>
      ) : (
        <Card padding="lg" className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>Chọn 1 thẻ cột Trái rồi nối với thẻ tương ứng ở cột Phải:</span>
            <span className="tabular font-semibold text-fg">
              Đã nối: {matchedIds.length}/{wavePairs.length} cặp
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {/* Left Column: Japanese / Kanji / Grammar */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold tracking-wider text-primary-fg uppercase">
                Cột A · Tiếng Nhật
              </p>
              {leftItems.map((item) => {
                const isMatched = matchedIds.includes(item.id);
                const isSelected = selectedLeftId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handlePickLeft(item.id)}
                    className={cn(
                      'flex min-h-[60px] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 px-3 py-2 text-center transition-all duration-150',
                      isMatched
                        ? 'border-success-line bg-success-soft/35 text-success-fg opacity-45'
                        : isSelected && wrongFlash
                          ? 'border-danger bg-danger-soft text-danger-fg'
                          : isSelected
                            ? 'border-primary bg-primary-soft text-primary-fg ring-2 ring-primary/30'
                            : 'border-line bg-surface-2/60 text-fg hover:border-primary/60 hover:bg-surface',
                    )}
                  >
                    <span lang="ja" className="text-base font-bold sm:text-lg">
                      {item.leftText}
                    </span>
                    {item.leftSub && (
                      <span className="text-[11px] font-medium text-muted">
                        {item.leftSub}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Column: Vietnamese Meaning / Reading */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold tracking-wider text-sakura uppercase">
                Cột B · Ý nghĩa / Cách đọc
              </p>
              {rightItems.map((item) => {
                const isMatched = matchedIds.includes(item.id);
                const isSelected = selectedRightId === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isMatched}
                    onClick={() => handlePickRight(item.id)}
                    className={cn(
                      'flex min-h-[60px] w-full cursor-pointer items-center justify-center rounded-xl border-2 px-3 py-2 text-center text-sm font-semibold transition-all duration-150',
                      isMatched
                        ? 'border-success-line bg-success-soft/35 text-success-fg opacity-45'
                        : isSelected && wrongFlash
                          ? 'border-danger bg-danger-soft text-danger-fg'
                          : isSelected
                            ? 'border-sakura bg-sakura-soft text-fg ring-2 ring-sakura/30'
                            : 'border-line bg-surface-2/60 text-fg hover:border-sakura/60 hover:bg-surface',
                    )}
                  >
                    <span>{item.rightText}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

/* ============================================================================
   GAME 3: LẬT THẺ KÝ ỨC (MEMORY FLIP — CẶP BÙA NHẬT)
   ============================================================================ */

interface MemoryCardTile {
  uid: string;
  pairId: string;
  content: string;
  sub?: string;
  isJapanese: boolean;
  speakText?: string;
}

export const MemoryFlipGame: React.FC<{
  words: VocabularyItem[];
  kanjis: KanjiItem[];
  onCompleteRound: (stats: { score: number; skill: StageSkill; moves: number }) => void;
}> = ({ words, kanjis, onCompleteRound }) => {
  const [poolType, setPoolType] = useState<'vocab' | 'kanji'>('vocab');
  const [seed, setSeed] = useState(0);
  const [flippedUids, setFlippedUids] = useState<string[]>([]);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);

  const tiles = useMemo<MemoryCardTile[]>(() => {
    if (seed < 0) return [];
    const basePairs: Array<{
      pairId: string;
      jp: string;
      jpSub?: string;
      vi: string;
      speak?: string;
    }> =
      poolType === 'kanji'
        ? shuffleArray(kanjis)
            .slice(0, 6)
            .map((k) => ({
              pairId: `k-${k.id}`,
              jp: k.kanji,
              jpSub: k.hanViet,
              vi: k.meanings[0] ?? '',
              speak: k.kunReadings?.[0] || k.kanji,
            }))
        : shuffleArray(words)
            .slice(0, 6)
            .map((w) => ({
              pairId: `v-${w.id}`,
              jp: w.kanji || w.hiragana,
              jpSub: w.kanji && w.kanji !== w.hiragana ? w.hiragana : undefined,
              vi: w.meaning,
              speak: w.hiragana || w.kanji || '',
            }));

    const deck: MemoryCardTile[] = [];
    for (const p of basePairs) {
      deck.push({
        uid: `${p.pairId}-jp`,
        pairId: p.pairId,
        content: p.jp,
        sub: p.jpSub,
        isJapanese: true,
        speakText: p.speak,
      });
      deck.push({
        uid: `${p.pairId}-vi`,
        pairId: p.pairId,
        content: p.vi,
        isJapanese: false,
      });
    }
    return shuffleArray(deck);
  }, [kanjis, poolType, seed, words]);

  const totalPairs = Math.floor(tiles.length / 2);
  const isFinished = totalPairs > 0 && matchedPairIds.length === totalPairs;

  const handleFlip = (tile: MemoryCardTile) => {
    if (
      flippedUids.length >= 2 ||
      flippedUids.includes(tile.uid) ||
      matchedPairIds.includes(tile.pairId)
    ) {
      return;
    }
    if (tile.speakText) speakJapanese(tile.speakText);

    const nextFlipped = [...flippedUids, tile.uid];
    setFlippedUids(nextFlipped);

    if (nextFlipped.length === 2) {
      const nextMoves = moves + 1;
      setMoves(nextMoves);
      const t1 = tiles.find((t) => t.uid === nextFlipped[0]);
      const t2 = tiles.find((t) => t.uid === nextFlipped[1]);
      if (t1 && t2 && t1.pairId === t2.pairId) {
        const nextMatched = [...matchedPairIds, t1.pairId];
        setMatchedPairIds(nextMatched);
        setFlippedUids([]);
        if (nextMatched.length === totalPairs) {
          const finalScore = Math.max(300, 1200 - nextMoves * 40);
          onCompleteRound({
            score: finalScore,
            skill: poolType === 'kanji' ? 'kanji' : 'vocab',
            moves: nextMoves,
          });
        }
      } else {
        window.setTimeout(() => setFlippedUids([]), 680);
      }
    }
  };

  const reset = (nextType = poolType) => {
    setPoolType(nextType);
    setFlippedUids([]);
    setMatchedPairIds([]);
    setMoves(0);
    setSeed((s) => s + 1);
  };

  return (
    <div className="space-y-4">
      <Card padding="md" className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Chip selected={poolType === 'vocab'} onClick={() => reset('vocab')}>
            Bộ Từ vựng (6 cặp)
          </Chip>
          <Chip selected={poolType === 'kanji'} onClick={() => reset('kanji')}>
            Bộ Chữ Hán (6 cặp)
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone="primary" className="tabular">
            Đã mở: {matchedPairIds.length}/{totalPairs} cặp
          </Badge>
          <Badge tone="neutral" className="tabular">
            Số lượt lật: {moves}
          </Badge>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw className="size-3.5" aria-hidden />}
            onClick={() => reset(poolType)}
          >
            Trộn bài mới
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {tiles.map((tile) => {
          const isOpen =
            flippedUids.includes(tile.uid) || matchedPairIds.includes(tile.pairId);
          const isDone = matchedPairIds.includes(tile.pairId);
          return (
            <button
              key={tile.uid}
              type="button"
              onClick={() => handleFlip(tile)}
              className={cn(
                'flex h-24 sm:h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 p-2.5 text-center shadow-card transition-all duration-150',
                isDone
                  ? 'border-success-line bg-success-soft/45 text-success-fg'
                  : isOpen
                    ? 'border-primary bg-surface text-fg ring-2 ring-primary/25'
                    : 'border-line bg-glass hover:border-primary/60',
              )}
            >
              {isOpen ? (
                <>
                  <span
                    lang={tile.isJapanese ? 'ja' : undefined}
                    className={cn(
                      'font-bold',
                      tile.isJapanese ? 'text-base sm:text-lg text-fg' : 'text-xs sm:text-sm text-fg',
                    )}
                  >
                    {tile.content}
                  </span>
                  {tile.sub && (
                    <span className="mt-0.5 text-[11px] text-muted">{tile.sub}</span>
                  )}
                </>
              ) : (
                <span
                  lang="ja"
                  className="grid size-10 place-items-center rounded-xl bg-primary-soft text-base font-bold text-primary-fg"
                >
                  問
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isFinished && (
        <Card padding="md" className="flex flex-wrap items-center justify-between gap-3 border-success-line bg-success-soft/35">
          <div>
            <p className="text-sm font-bold text-fg">
              ★ Tuyệt vời! Bạn đã lật mở toàn bộ {totalPairs} cặp bùa sau {moves} lượt!
            </p>
            <p className="text-xs text-muted">
              Đã tự động ghi nhận hoạt động luyện tập hôm nay trên Bản đồ Màn.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            leftIcon={<RotateCcw className="size-4" aria-hidden />}
            onClick={() => reset(poolType)}
          >
            Chơi tiếp ván mới
          </Button>
        </Card>
      )}
    </div>
  );
};

/* ============================================================================
   GAME 4: PHẢN XẠ ĐÚNG / SAI 60s (○ / × SPEED RUN)
   ============================================================================ */

export const SpeedTrueFalseGame: React.FC<{
  words: VocabularyItem[];
  kanjis: KanjiItem[];
  onCompleteRound: (stats: { score: number; skill: StageSkill; correctCount: number }) => void;
}> = ({ words, kanjis, onCompleteRound }) => {
  const [running, setRunning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [qIndex, setQIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const scoreRef = useRef(0);
  const correctRef = useRef(0);
  const onCompleteRef = useRef(onCompleteRound);

  useEffect(() => {
    onCompleteRef.current = onCompleteRound;
  }, [onCompleteRound]);

  const questions = useMemo(() => {
    const list: Array<{
      prompt: string;
      sub?: string;
      shownMeaning: string;
      actualMeaning: string;
      isTrue: boolean;
    }> = [];

    const shuffledW = shuffleArray(words);
    for (let i = 0; i < shuffledW.length; i += 1) {
      const w = shuffledW[i];
      const isTrue = i % 2 === 0;
      const other = shuffledW[(i + 3) % shuffledW.length] ?? w;
      list.push({
        prompt: w.kanji || w.hiragana,
        sub: w.kanji && w.kanji !== w.hiragana ? w.hiragana : undefined,
        shownMeaning: isTrue ? w.meaning : other.meaning,
        actualMeaning: w.meaning,
        isTrue: isTrue || other.meaning === w.meaning,
      });
    }

    const shuffledK = shuffleArray(kanjis);
    for (let i = 0; i < Math.min(20, shuffledK.length); i += 1) {
      const k = shuffledK[i];
      const isTrue = i % 2 === 1;
      const other = shuffledK[(i + 2) % shuffledK.length] ?? k;
      const actual = `${k.hanViet ? `[${k.hanViet}] ` : ''}${k.meanings[0] ?? ''}`;
      const shown = isTrue
        ? actual
        : `${other.hanViet ? `[${other.hanViet}] ` : ''}${other.meanings[0] ?? ''}`;
      list.push({
        prompt: k.kanji,
        sub: 'Chữ Hán (Kanji)',
        shownMeaning: shown,
        actualMeaning: actual,
        isTrue: isTrue || shown === actual,
      });
    }

    return shuffleArray(list);
  }, [kanjis, words]);

  const currentQ = questions[qIndex % Math.max(1, questions.length)];

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          setRunning(false);
          onCompleteRef.current({
            score: scoreRef.current,
            skill: 'quiz',
            correctCount: correctRef.current,
          });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  const start = () => {
    scoreRef.current = 0;
    correctRef.current = 0;
    setTimeLeft(45);
    setScore(0);
    setCombo(0);
    setCorrectCount(0);
    setQIndex((i) => i + 1);
    setRunning(true);
  };

  const answer = useCallback(
    (userSaysTrue: boolean) => {
      if (!running || !currentQ) return;
      const ok = userSaysTrue === currentQ.isTrue;
      setFeedback(ok ? 'correct' : 'wrong');
      window.setTimeout(() => setFeedback(null), 220);

      if (ok) {
        const nextCombo = combo + 1;
        setCombo(nextCombo);
        correctRef.current += 1;
        setCorrectCount(correctRef.current);
        scoreRef.current += 100 + nextCombo * 15;
        setScore(scoreRef.current);
      } else {
        setCombo(0);
      }
      setQIndex((i) => i + 1);
    },
    [combo, currentQ, running],
  );

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        answer(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        answer(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answer, running]);

  return (
    <Card padding="lg" className="space-y-4 text-center">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge tone="primary" className="tabular">
          <Clock className="size-3.5" aria-hidden />
          Còn {timeLeft}s
        </Badge>
        <div className="flex items-center gap-2">
          {combo > 1 && <Badge tone="sakura">Combo x{combo}</Badge>}
          <Badge tone="success" className="tabular">
            <Trophy className="size-3.5" aria-hidden />
            {score} điểm ({correctCount} câu đúng)
          </Badge>
        </div>
      </div>

      <ProgressBar value={timeLeft} max={45} size="sm" label="Thời gian còn lại" />

      {!running ? (
        <div className="space-y-3 py-6">
          <h3 className="text-xl font-bold text-fg">
            {timeLeft === 0
              ? `Hết giờ! Bạn đạt ${score.toLocaleString('vi-VN')} điểm (${correctCount} câu đúng)`
              : 'Phản Xạ Đúng / Sai 45 Giây (○ / ×)'}
          </h3>
          <p className="text-sm text-muted">
            Phán đoán thật nhanh cặp Từ vựng / Kanji và Nghĩa bên dưới là Đúng (○) hay Sai (×)!
          </p>
          <Button
            type="button"
            variant="primary"
            leftIcon={<Play className="size-4" aria-hidden />}
            onClick={start}
          >
            {timeLeft === 0 ? 'Chơi lại 45s' : 'Bắt đầu thử thách 45s'}
          </Button>
        </div>
      ) : (
        currentQ && (
          <div className="space-y-5 py-3">
            <div
              className={cn(
                'mx-auto max-w-md rounded-2xl border-2 p-6 transition-colors',
                feedback === 'correct'
                  ? 'border-success bg-success-soft/45'
                  : feedback === 'wrong'
                    ? 'border-danger bg-danger-soft/45'
                    : 'border-line bg-surface-2/60',
              )}
            >
              <p lang="ja" className="text-3xl font-bold text-fg">
                {currentQ.prompt}
              </p>
              {currentQ.sub && (
                <p lang="ja" className="mt-1 text-sm text-muted">
                  {currentQ.sub}
                </p>
              )}
              <div className="my-3 border-t border-line" />
              <p className="text-xs uppercase tracking-wider text-muted">Nghĩa hiển thị:</p>
              <p className="mt-1 text-lg font-bold text-primary-fg">
                “{currentQ.shownMeaning}”
              </p>
            </div>

            <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => answer(false)}
                leftIcon={<XCircle className="size-5 text-danger-fg" aria-hidden />}
                className="border-danger/40 hover:border-danger"
              >
                Sai (×)
              </Button>
              <Button
                type="button"
                variant="primary"
                size="lg"
                onClick={() => answer(true)}
                leftIcon={<CheckCircle2 className="size-5" aria-hidden />}
              >
                Đúng (○)
              </Button>
            </div>
          </div>
        )
      )}
    </Card>
  );
};

/* ============================================================================
   GAME 5: THÍNH GIÁC NINJA (NGHE PHÁT ÂM TTS & BẮT MỤC TIÊU)
   ============================================================================ */

export const ListeningDojoGame: React.FC<{
  words: VocabularyItem[];
  onCompleteRound: (stats: { score: number; skill: StageSkill; correctCount: number }) => void;
}> = ({ words, onCompleteRound }) => {
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [pickedId, setPickedId] = useState<number | null>(null);
  const totalRounds = 10;

  const questions = useMemo(() => {
    const pool = shuffleArray(words).slice(0, totalRounds);
    return pool.map((target) => {
      const distractors = shuffleArray(words.filter((w) => w.id !== target.id)).slice(0, 3);
      return {
        target,
        options: shuffleArray([target, ...distractors]),
      };
    });
  }, [words]);

  const current = questions[roundIdx];
  const isFinished = roundIdx >= questions.length;

  useEffect(() => {
    if (current && !isFinished) {
      speakJapanese(current.target.hiragana || current.target.kanji || '');
    }
  }, [current, isFinished]);

  const handleSelect = (opt: VocabularyItem) => {
    if (!current || pickedId !== null) return;
    setPickedId(opt.id);
    const isOk = opt.id === current.target.id;
    const nextScore = isOk ? score + 120 : score;
    const nextCorrect = isOk ? correctCount + 1 : correctCount;
    if (isOk) {
      setScore(nextScore);
      setCorrectCount(nextCorrect);
    }

    window.setTimeout(() => {
      setPickedId(null);
      if (roundIdx + 1 >= questions.length) {
        onCompleteRound({
          score: nextScore,
          skill: 'listening',
          correctCount: nextCorrect,
        });
      }
      setRoundIdx((r) => r + 1);
    }, 650);
  };

  const restart = () => {
    setScore(0);
    setCorrectCount(0);
    setPickedId(null);
    setRoundIdx(0);
  };

  if (isFinished) {
    return (
      <Card padding="lg" className="space-y-4 text-center">
        <Badge tone="success" className="mx-auto">
          ★ Hoàn thành khóa Thính Giác Ninja ({correctCount}/{totalRounds} câu đúng)
        </Badge>
        <h3 className="text-2xl font-bold text-fg">{score.toLocaleString('vi-VN')} điểm</h3>
        <Button
          type="button"
          variant="primary"
          leftIcon={<RotateCcw className="size-4" aria-hidden />}
          onClick={restart}
        >
          Luyện nghe tiếp 10 từ mới
        </Button>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="space-y-5 text-center">
      <div className="flex items-center justify-between text-xs">
        <Badge tone="primary">
          Câu {roundIdx + 1}/{totalRounds}
        </Badge>
        <Badge tone="success">{score} điểm</Badge>
      </div>

      {current && (
        <>
          <div className="space-y-2 py-2">
            <Button
              type="button"
              variant="soft"
              size="lg"
              leftIcon={<Volume2 className="size-5 text-primary-fg" aria-hidden />}
              onClick={() => speakJapanese(current.target.hiragana || current.target.kanji || '')}
            >
              Nghe lại phát âm tiếng Nhật
            </Button>
            <p className="text-xs text-muted">
              Nghe kỹ âm thanh vừa phát và chọn đúng từ + nghĩa tương ứng:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {current.options.map((opt) => {
              const isPicked = pickedId === opt.id;
              const isCorrect = opt.id === current.target.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={cn(
                    'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 p-3.5 text-center transition-colors',
                    pickedId !== null && isCorrect
                      ? 'border-success bg-success-soft/50 text-success-fg'
                      : isPicked && !isCorrect
                        ? 'border-danger bg-danger-soft text-danger-fg'
                        : 'border-line bg-surface-2/60 hover:border-primary',
                  )}
                >
                  <span lang="ja" className="text-base font-bold text-fg">
                    {opt.kanji || opt.hiragana}{' '}
                    {opt.kanji && opt.kanji !== opt.hiragana ? `(${opt.hiragana})` : ''}
                  </span>
                  <span className="mt-0.5 text-xs text-muted">{opt.meaning}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </Card>
  );
};
