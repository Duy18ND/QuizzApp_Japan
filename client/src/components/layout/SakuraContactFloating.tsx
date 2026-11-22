import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, FileText, Mail, ShieldCheck, Sparkles, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { SakuraBlossomIcon, useToast } from '../ui';

const RETURN_HOME_DELAY_MS = 5000;
const SUPPORT_EMAIL = 'support@nihongo-dojo.vn';

interface SupportItem {
  id: 'feedback' | 'guide' | 'terms' | 'privacy';
  label: string;
  subtitle: string;
  icon: React.ReactNode;
}

const SUPPORT_ITEMS: readonly SupportItem[] = [
  {
    id: 'feedback',
    label: 'Báo lỗi / Góp ý',
    subtitle: 'Gửi email hỗ trợ',
    icon: <Mail className="size-4 shrink-0" aria-hidden="true" />,
  },
  {
    id: 'guide',
    label: 'Bản đồ Lộ trình',
    subtitle: 'Học theo Màn N5',
    icon: <BookOpen className="size-4 shrink-0" aria-hidden="true" />,
  },
  {
    id: 'terms',
    label: 'Điều khoản',
    subtitle: 'Quy định sử dụng',
    icon: <FileText className="size-4 shrink-0" aria-hidden="true" />,
  },
  {
    id: 'privacy',
    label: 'Bảo mật',
    subtitle: 'Quyền riêng tư',
    icon: <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />,
  },
];

/**
 * Draggable Bouncy Sakura Support Ball + Quick Support & Legal Drawer.
 */
export const SakuraContactFloating: React.FC = () => {
  const navigate = useNavigate();
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

    const THROW_GAIN = 1.8;
    const MAX_THROW_SPEED = 4200;
    const WALL_RESTITUTION = 0.94;
    const FLOOR_RESTITUTION = 0.89;
    const AIR_DRAG_PER_SEC = 0.78;
    const GROUND_DRAG_PER_SEC = 0.45;
    const GRAVITY = 1380;

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
      vx = Math.max(vx, (minX - x) * 20);
      x = minX;
    } else if (x > maxX) {
      vx = Math.min(vx, (maxX - x) * 20);
      x = maxX;
    }
    if (y < minY) {
      vy = Math.max(vy, (minY - y) * 20);
      y = minY;
    } else if (y > maxY) {
      vy = Math.min(vy, (maxY - y) * 20);
      y = maxY;
    }

    // Sideways flick near bottom hops into a bouncy arc instead of skimming flat
    if (Math.abs(vx) > 200 && vy > -220 && y > maxY - 28) {
      vy = Math.min(vy, -Math.min(620, Math.abs(vx) * 0.3));
    }

    let scaleX = 1;
    let scaleY = 1;
    let spinSpeed = vx * 0.56 - vy * 0.24;
    let lastTime = performance.now();

    const applyWallSquash = (hitSpeed: number, horizontalWall: boolean) => {
      if (hitSpeed < 95) return;
      const deform = 0.08 + 0.16 * Math.min(1, hitSpeed / 1200);
      if (horizontalWall) {
        scaleX = 1 - deform;
        scaleY = 1 + deform;
      } else {
        scaleX = 1 + deform;
        scaleY = 1 - deform;
      }
    };

    const bounceStep = (now: number) => {
      const dt = Math.min(0.032, Math.max(0.008, (now - lastTime) / 1000));
      lastTime = now;

      vy += GRAVITY * dt;
      x += vx * dt;
      y += vy * dt;
      rot = (rot + spinSpeed * dt) % 360;

      if (x < minX) {
        x = minX;
        const hitSpeed = Math.abs(vx);
        vx = hitSpeed * WALL_RESTITUTION;
        spinSpeed = vy * 0.48 - spinSpeed * 0.6;
        applyWallSquash(hitSpeed, true);
      } else if (x > maxX) {
        x = maxX;
        const hitSpeed = Math.abs(vx);
        vx = -hitSpeed * WALL_RESTITUTION;
        spinSpeed = -vy * 0.48 - spinSpeed * 0.6;
        applyWallSquash(hitSpeed, true);
      }

      if (y < minY) {
        y = minY;
        const hitSpeed = Math.abs(vy);
        vy = hitSpeed * WALL_RESTITUTION;
        spinSpeed = -vx * 0.48 - spinSpeed * 0.6;
        applyWallSquash(hitSpeed, false);
      } else if (y >= maxY) {
        y = maxY;
        const hitSpeed = Math.abs(vy);
        if (hitSpeed > 95) {
          vy = -hitSpeed * FLOOR_RESTITUTION;
          spinSpeed = vx * 0.58;
          applyWallSquash(hitSpeed, false);
        } else {
          vy = 0;
        }
      }

      const grounded = y >= maxY - 0.5 && vy === 0;
      const dragFactor = Math.pow(grounded ? GROUND_DRAG_PER_SEC : AIR_DRAG_PER_SEC, dt);
      vx *= dragFactor;
      if (!grounded) {
        vy *= dragFactor;
      }
      spinSpeed = grounded ? vx * 0.55 : spinSpeed * Math.pow(0.55, dt);

      const squashRecovery = Math.min(1, dt * 18);
      scaleX += (1 - scaleX) * squashRecovery;
      scaleY += (1 - scaleY) * squashRecovery;

      applyBallTransform(x, y, rot, scaleX, scaleY);

      if (
        grounded &&
        Math.abs(vx) < 20 &&
        Math.abs(scaleX - 1) < 0.01 &&
        Math.abs(scaleY - 1) < 0.01
      ) {
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
          ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-[max(0.5rem,env(safe-area-inset-right))]'
          : 'bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-0',
      )}
    >
      {/* Expandable Support & Legal Drawer */}
      <section
        id={panelId}
        data-open={isExpanded ? 'true' : 'false'}
        aria-hidden={!isExpanded}
        inert={!isExpanded}
        aria-label="Trung tâm Hỗ trợ Nihongo 問"
        className="sakura-popover-panel w-[min(19.5rem,calc(100vw-1rem))] rounded-2xl border border-line-strong bg-surface/95 p-3.5 text-fg shadow-pop"
      >
        <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-sakura-soft ring-1 ring-sakura/30">
              <SakuraBlossomIcon className="size-4.5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-fg">Hỗ trợ Nihongo 問</p>
              <p className="truncate text-[11px] text-muted">Trợ giúp, góp ý &amp; pháp lý</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setContactOpen(false);
              setMobileRevealed(false);
            }}
            aria-label="Đóng bảng hỗ trợ"
            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {SUPPORT_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setContactOpen(false);
                setMobileRevealed(false);
                if (item.id === 'terms') {
                  navigate('/terms');
                } else if (item.id === 'privacy') {
                  navigate('/privacy');
                } else if (item.id === 'guide') {
                  navigate('/roadmap');
                } else {
                  if (navigator.clipboard?.writeText) {
                    void navigator.clipboard.writeText(SUPPORT_EMAIL).catch(() => {});
                  }
                  toast({
                    title: `Hỗ trợ & Góp ý: ${SUPPORT_EMAIL}`,
                    description: 'Đã sao chép địa chỉ email hỗ trợ. Bạn có thể gửi góp ý hoặc báo lỗi bất cứ lúc nào!',
                    tone: 'info',
                  });
                }
              }}
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
            <span className="truncate">{SUPPORT_EMAIL}</span>
          </span>
          <span className="shrink-0 text-[10px] text-muted">Beta v1.0</span>
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
        aria-label={contactOpen ? 'Thu gọn hỗ trợ' : 'Mở Trung tâm Hỗ trợ Nihongo 問'}
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
