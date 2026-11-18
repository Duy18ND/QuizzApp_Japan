import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, FileText, Sparkles, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { SakuraBlossomIcon, useToast } from '../ui';

const RETURN_HOME_DELAY_MS = 5000;

interface ContactItem {
  id: 'github' | 'facebook' | 'threads' | 'cv';
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const GitHubMark: React.FC = () => (
  <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden="true">
    <path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.51.47-3.16-.63-3.36-1.21-.11-.29-.6-1.21-1.03-1.45-.35-.19-.85-.67-.01-.68.79-.01 1.36.75 1.55 1.06.9 1.55 2.34 1.11 2.91.84.09-.67.35-1.11.64-1.37-2.22-.26-4.55-1.14-4.55-5.08 0-1.12.39-2.05 1.03-2.77-.1-.26-.45-1.31.1-2.73 0 0 .84-.27 2.75 1.06a9.3 9.3 0 0 1 2.5-.34c.85 0 1.7.12 2.5.34 1.91-1.34 2.75-1.06 2.75-1.06.55 1.42.2 2.47.1 2.73.64.72 1.03 1.64 1.03 2.77 0 3.95-2.34 4.82-4.57 5.07.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.27 10.27 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
  </svg>
);

const FacebookMark: React.FC = () => (
  <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="currentColor" aria-hidden="true">
    <path d="M13.5 22v-8.2h2.75l.42-3.2H13.5V8.55c0-.93.26-1.56 1.59-1.56h1.7V4.13c-.3-.04-1.31-.13-2.49-.13-2.47 0-4.16 1.51-4.16 4.28v2.32H7.34v3.2h2.8V22h3.36Z" />
  </svg>
);

const ThreadsMark: React.FC = () => (
  <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12a7 7 0 1 0-2.1 5" />
    <path d="M15.2 12.2c0 2-1.3 3.4-3.1 3.4-1.7 0-2.9-1.2-2.9-2.8s1.2-2.8 2.9-2.8c1.9 0 3.2 1.2 3.2 3.3 0 1.4.8 2.2 1.8 2.2 1.1 0 1.9-1.1 1.9-3.5" />
    <path d="M15.2 12.2c-.1-2.5-1.4-4-3.6-4-1.2 0-2.3.4-3 1.1" />
  </svg>
);

const CONTACT_ITEMS: readonly ContactItem[] = [
  { id: 'github', label: 'GitHub', subtitle: 'Người Bí Ẩn', icon: <GitHubMark /> },
  { id: 'facebook', label: 'Facebook', subtitle: 'Người Bí Ẩn', icon: <FacebookMark /> },
  { id: 'threads', label: 'Threads', subtitle: 'Người Bí Ẩn', icon: <ThreadsMark /> },
  { id: 'cv', label: 'CV Cá nhân', subtitle: 'Người Bí Ẩn', icon: <FileText className="size-4 shrink-0" aria-hidden="true" /> },
];

/**
 * Draggable Bouncy Sakura Contact Ball + Anonymous ("Người Bí Ẩn") Contact Drawer.
 * - Rests cleanly over the bottom-right background Gemini watermark on PC / Tablet / iPad.
 * - Supports 1:1 drag/toss like a light bouncy ball with elastic screen-wall bounce and auto-springs
 *   back to its home spot after ~5 seconds idle.
 * - Small screens (`< md` / mobile iOS): collapsed to a slim corner button so mobile UI stays unobstructed.
 */
export const SakuraContactFloating: React.FC = () => {
  const [contactOpen, setContactOpen] = useState(false);
  const [mobileRevealed, setMobileRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const ballBtnRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const { toast } = useToast();

  // Direct DOM physics refs (zero React re-renders during drag/bounce frames)
  const posRef = useRef<{ x: number; y: number; rot: number }>({ x: 0, y: 0, rot: 0 });
  const dragRef = useRef<{
    active: boolean;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startBallX: number;
    startBallY: number;
    didMove: boolean;
    bounds: { minX: number; maxX: number; minY: number; maxY: number };
    samples: Array<{ x: number; y: number; t: number }>;
  }>({
    active: false,
    pointerId: -1,
    startClientX: 0,
    startClientY: 0,
    startBallX: 0,
    startBallY: 0,
    didMove: false,
    bounds: { minX: -300, maxX: 0, minY: -300, maxY: 0 },
    samples: [],
  });
  const rafRef = useRef<number | null>(null);
  const returnTimerRef = useRef<number | null>(null);
  const suppressNextClickRef = useRef(false);

  const applyBallTransform = useCallback((x: number, y: number, rot: number, sx = 1, sy = 1) => {
    posRef.current = { x, y, rot };
    const el = ballBtnRef.current;
    if (!el) return;
    if (x === 0 && y === 0 && rot === 0 && Math.abs(sx - 1) < 0.005 && Math.abs(sy - 1) < 0.005) {
      el.style.transform = '';
    } else {
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(3)}, ${sy.toFixed(3)})`;
    }
  }, []);

  const cancelPhysicsAndTimer = useCallback(() => {
    if (rafRef.current !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (returnTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(returnTimerRef.current);
      returnTimerRef.current = null;
    }
  }, []);

  const startSpringHome = useCallback(() => {
    cancelPhysicsAndTimer();
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      applyBallTransform(0, 0, 0);
      return;
    }

    let { x, y, rot } = posRef.current;
    rot = ((rot + 540) % 360) - 180;
    let vx = 0;
    let vy = 0;
    let vRot = 0;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      const stiffness = 220;
      const damping = 24;
      const ax = -stiffness * x - damping * vx;
      const ay = -stiffness * y - damping * vy;
      const aRot = -stiffness * rot - damping * vRot;

      vx += ax * dt;
      vy += ay * dt;
      vRot += aRot * dt;
      x += vx * dt;
      y += vy * dt;
      rot += vRot * dt;

      if (
        Math.abs(x) < 0.6 &&
        Math.abs(y) < 0.6 &&
        Math.abs(rot) < 1.5 &&
        Math.abs(vx) < 4 &&
        Math.abs(vy) < 4
      ) {
        applyBallTransform(0, 0, 0);
        rafRef.current = null;
        return;
      }

      applyBallTransform(x, y, rot);
      rafRef.current = window.requestAnimationFrame(step);
    };

    rafRef.current = window.requestAnimationFrame(step);
  }, [applyBallTransform, cancelPhysicsAndTimer]);

  const scheduleReturnHome = useCallback(() => {
    if (returnTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(returnTimerRef.current);
    }
    returnTimerRef.current = window.setTimeout(() => {
      returnTimerRef.current = null;
      startSpringHome();
    }, RETURN_HOME_DELAY_MS);
  }, [startSpringHome]);

  const computeDragBounds = useCallback(() => {
    const el = ballBtnRef.current;
    if (!el || typeof window === 'undefined') {
      return { minX: -280, maxX: 0, minY: -280, maxY: 0 };
    }
    const rect = el.getBoundingClientRect();
    const restLeft = rect.left - posRef.current.x;
    const restTop = rect.top - posRef.current.y;
    const margin = 8;
    return {
      minX: margin - restLeft,
      maxX: Math.max(0, window.innerWidth - margin - (restLeft + rect.width)),
      minY: margin + 56 - restTop,
      maxY: Math.max(0, window.innerHeight - margin - (restTop + rect.height)),
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    cancelPhysicsAndTimer();
    const el = e.currentTarget;
    el.setPointerCapture?.(e.pointerId);
    const now = performance.now();
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startBallX: posRef.current.x,
      startBallY: posRef.current.y,
      didMove: false,
      bounds: computeDragBounds(),
      samples: [{ x: posRef.current.x, y: posRef.current.y, t: now }],
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;

    const rawDx = e.clientX - d.startClientX;
    const rawDy = e.clientY - d.startClientY;
    if (!d.didMove && Math.hypot(rawDx, rawDy) >= 6) {
      d.didMove = true;
      setContactOpen(false);
    }

    const clampWithRubberBand = (val: number, min: number, max: number) => {
      if (val < min) return min + (val - min) * 0.2;
      if (val > max) return max + (val - max) * 0.2;
      return val;
    };

    const nextX = clampWithRubberBand(d.startBallX + rawDx, d.bounds.minX, d.bounds.maxX);
    const nextY = clampWithRubberBand(d.startBallY + rawDy, d.bounds.minY, d.bounds.maxY);
    const nextRot = (nextX * 0.35 + nextY * 0.15) % 360;

    const now = performance.now();
    d.samples.push({ x: nextX, y: nextY, t: now });
    if (d.samples.length > 5) d.samples.shift();

    applyBallTransform(nextX, nextY, nextRot);
  };

  const finishDragGesture = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    d.active = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    if (!d.didMove) {
      return;
    }

    suppressNextClickRef.current = true;

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      const { minX, maxX, minY, maxY } = d.bounds;
      applyBallTransform(
        Math.min(maxX, Math.max(minX, posRef.current.x)),
        Math.min(maxY, Math.max(minY, posRef.current.y)),
        0,
      );
      scheduleReturnHome();
      return;
    }

    // Always schedule return-home 5s after release so tossing + rest settles back cleanly around 5s
    scheduleReturnHome();

    const THROW_GAIN = 1.55;
    const MAX_THROW_SPEED = 3600;
    const WALL_RESTITUTION = 0.9;
    const AIR_DRAG_PER_SEC = 0.28;

    const releaseNow = performance.now();
    const latest = d.samples[d.samples.length - 1];
    const releaseIdleMs = latest ? releaseNow - latest.t : 999;
    const recentRef =
      d.samples.find((s) => latest && latest.t - s.t <= 95 && latest.t - s.t >= 8) ?? d.samples[0];
    const sampleSpanMs = latest && recentRef ? latest.t - recentRef.t : 0;
    let vx = 0;
    let vy = 0;
    if (latest && recentRef && releaseIdleMs <= 95 && sampleSpanMs > 0 && sampleSpanMs <= 140) {
      const elapsedSec = Math.max(0.014, sampleSpanMs / 1000);
      vx = ((latest.x - recentRef.x) / elapsedSec) * THROW_GAIN;
      vy = ((latest.y - recentRef.y) / elapsedSec) * THROW_GAIN;
    }
    vx = Math.max(-MAX_THROW_SPEED, Math.min(MAX_THROW_SPEED, vx));
    vy = Math.max(-MAX_THROW_SPEED, Math.min(MAX_THROW_SPEED, vy));

    let { x, y, rot } = posRef.current;
    const { minX, maxX, minY, maxY } = d.bounds;
    // Slingshot inward if released in rubber-band overscroll zone
    if (x < minX) {
      vx = Math.max(vx, (minX - x) * 18);
      x = minX;
    } else if (x > maxX) {
      vx = Math.min(vx, (maxX - x) * 18);
      x = maxX;
    }
    if (y < minY) {
      vy = Math.max(vy, (minY - y) * 18);
      y = minY;
    } else if (y > maxY) {
      vy = Math.min(vy, (maxY - y) * 18);
      y = maxY;
    }

    let scaleX = 1;
    let scaleY = 1;
    let spinSpeed = vx * 0.52 - vy * 0.22;
    let lastTime = performance.now();

    const bounceStep = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      x += vx * dt;
      y += vy * dt;
      rot = (rot + spinSpeed * dt) % 360;

      // High-energy rubber ball wall ricochets with subtle squash-and-stretch impulse
      if (x < minX) {
        x = minX;
        const hitSpeed = Math.abs(vx);
        vx = hitSpeed * WALL_RESTITUTION;
        spinSpeed = vy * 0.45 - spinSpeed * 0.65;
        if (hitSpeed > 180) {
          scaleX = 0.84;
          scaleY = 1.18;
        }
      } else if (x > maxX) {
        x = maxX;
        const hitSpeed = Math.abs(vx);
        vx = -hitSpeed * WALL_RESTITUTION;
        spinSpeed = -vy * 0.45 - spinSpeed * 0.65;
        if (hitSpeed > 180) {
          scaleX = 0.84;
          scaleY = 1.18;
        }
      }
      if (y < minY) {
        y = minY;
        const hitSpeed = Math.abs(vy);
        vy = hitSpeed * WALL_RESTITUTION;
        spinSpeed = -vx * 0.45 - spinSpeed * 0.65;
        if (hitSpeed > 180) {
          scaleX = 1.18;
          scaleY = 0.84;
        }
      } else if (y > maxY) {
        y = maxY;
        const hitSpeed = Math.abs(vy);
        vy = -hitSpeed * WALL_RESTITUTION;
        spinSpeed = vx * 0.45 - spinSpeed * 0.65;
        if (hitSpeed > 180) {
          scaleX = 1.18;
          scaleY = 0.84;
        }
      }

      const dampingFactor = Math.pow(AIR_DRAG_PER_SEC, dt);
      vx *= dampingFactor;
      vy *= dampingFactor;
      spinSpeed *= Math.pow(0.45, dt);

      const squashRecovery = Math.min(1, dt * 18);
      scaleX += (1 - scaleX) * squashRecovery;
      scaleY += (1 - scaleY) * squashRecovery;

      applyBallTransform(x, y, rot, scaleX, scaleY);

      if (Math.hypot(vx, vy) < 24 && Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01) {
        applyBallTransform(x, y, rot, 1, 1);
        rafRef.current = null;
        return;
      }
      rafRef.current = window.requestAnimationFrame(bounceStep);
    };

    rafRef.current = window.requestAnimationFrame(bounceStep);
  };

  useEffect(() => {
    return () => {
      cancelPhysicsAndTimer();
    };
  }, [cancelPhysicsAndTimer]);

  useEffect(() => {
    if (!contactOpen && !mobileRevealed) return;
    const handlePointerDownOutside = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setContactOpen(false);
        setMobileRevealed(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContactOpen(false);
        setMobileRevealed(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDownOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDownOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contactOpen, mobileRevealed]);

  const isExpanded = contactOpen;

  return (
    <div
      ref={containerRef}
      className={cn(
        'pointer-events-none fixed z-40 flex flex-col items-end gap-2 md:bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:right-[max(0.75rem,env(safe-area-inset-right))] lg:bottom-[max(3.6%,env(safe-area-inset-bottom))] lg:right-[max(2.4%,env(safe-area-inset-right))] print:hidden',
        mobileRevealed || contactOpen
          ? 'bottom-[max(0.5rem,env(safe-area-inset-bottom))] right-[max(0.5rem,env(safe-area-inset-right))]'
          : 'bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-0',
      )}
    >
      {/* Expandable Contact Card ("sổ ra") */}
      <section
        id={panelId}
        data-open={isExpanded ? 'true' : 'false'}
        aria-hidden={!isExpanded}
        inert={!isExpanded}
        aria-label="Thông tin liên hệ Người Bí Ẩn"
        className="sakura-popover-panel w-[min(19.5rem,calc(100vw-1rem))] rounded-2xl border border-line-strong bg-surface/95 p-3.5 text-fg shadow-pop"
      >
        <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-sakura-soft ring-1 ring-sakura/30">
              <SakuraBlossomIcon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">Người Bí Ẩn</p>
              <p className="truncate text-[11px] text-muted">Kênh liên hệ ẩn danh</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setContactOpen(false);
              setMobileRevealed(false);
            }}
            aria-label="Đóng bảng liên hệ"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {CONTACT_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                toast({
                  title: `${item.label} — Người Bí Ẩn`,
                  description: 'Thông tin liên hệ tạm thời đang giữ ẩn danh.',
                  tone: 'info',
                })
              }
              className="group flex items-center gap-2.5 rounded-xl border border-line bg-surface-2/70 px-2.5 py-2 text-left transition-colors hover:border-primary hover:bg-primary-soft/60"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-surface text-primary-fg ring-1 ring-line transition-transform duration-150 group-hover:scale-105">
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-fg">{item.label}</span>
                <span className="block truncate text-[10px] text-muted">{item.subtitle}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-xl border border-line bg-sakura-soft px-3 py-1.5 text-xs text-fg">
          <span className="flex min-w-0 items-center gap-1.5 font-medium">
            <Sparkles className="size-3.5 shrink-0 text-sakura" aria-hidden="true" />
            <span className="truncate">Liên hệ: Người Bí Ẩn</span>
          </span>
          <span className="shrink-0 text-[10px] text-muted">Thả bóng 5s tự về</span>
        </div>
      </section>

      {/* Small screen (< md) flush right-edge arrow handle -> zero overlap on mobile data */}
      {!mobileRevealed && (
        <button
          type="button"
          onClick={() => {
            setMobileRevealed(true);
            setContactOpen(true);
          }}
          aria-label="Hiện hoa anh đào & mở liên hệ"
          className="pointer-events-auto inline-flex h-11 w-[18px] items-center justify-center rounded-l-full rounded-r-none border border-r-0 border-line-strong bg-surface/90 text-muted shadow-card backdrop-blur-sm transition-colors hover:border-primary hover:bg-surface hover:text-fg md:hidden"
        >
          <ChevronLeft className="size-3.5 -mr-0.5" aria-hidden="true" />
        </button>
      )}

      {/* Draggable Bouncy Sakura Ball Medallion */}
      <button
        ref={ballBtnRef}
        type="button"
        data-open={contactOpen ? 'true' : 'false'}
        aria-expanded={contactOpen}
        aria-controls={panelId}
        aria-label={contactOpen ? 'Thu gọn liên hệ' : 'Liên hệ Người Bí Ẩn'}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDragGesture}
        onPointerCancel={finishDragGesture}
        onClick={() => {
          if (suppressNextClickRef.current) {
            suppressNextClickRef.current = false;
            return;
          }
          if (posRef.current.x !== 0 || posRef.current.y !== 0) {
            startSpringHome();
          }
          if (contactOpen) {
            setContactOpen(false);
            setMobileRevealed(false);
          } else {
            setContactOpen(true);
          }
        }}
        className={cn(
          'sakura-contact-trigger sakura-ball-draggable pointer-events-auto relative size-12 items-center justify-center rounded-full border border-line-strong bg-surface/95 shadow-pop ring-2 ring-sakura/30 transition-colors hover:border-primary md:size-[58px]',
          mobileRevealed ? 'inline-flex' : 'hidden md:inline-flex',
        )}
      >
        <SakuraBlossomIcon className="sakura-contact-flower pointer-events-none size-8 md:size-10" />
      </button>
    </div>
  );
};
