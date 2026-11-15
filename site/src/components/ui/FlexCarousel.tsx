'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Pause, Play, X } from 'lucide-react';

export interface CarouselSlide {
  src: string;
  alt?: string;
  title?: string;
  description?: string;
  year?: string;
}

export interface FlexCarouselProps {
  images: CarouselSlide[];
  speed?: number;
  cardSize?: 'sm' | 'md' | 'lg';
  gap?: number;
  borderRadius?: number;
  className?: string;
}

const CARD_DIMENSIONS: Record<'sm' | 'md' | 'lg', { width: number; height: number }> = {
  sm: { width: 250, height: 185 },
  md: { width: 340, height: 245 },
  lg: { width: 430, height: 300 },
};

function wrapOffset(value: number, span: number): number {
  if (span <= 0) return 0;
  return ((((value + span / 2) % span) + span) % span) - span / 2;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function FlexCarousel({
  images,
  speed = 0.6,
  cardSize = 'md',
  gap = 24,
  borderRadius = 2,
  className = '',
}: FlexCarouselProps) {
  const carouselId = useId().replace(/:/g, '');
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isDraggingUI, setIsDraggingUI] = useState(false);
  const [failedSrcs, setFailedSrcs] = useState<Record<string, boolean>>({});
  const [viewportWidth, setViewportWidth] = useState(960);

  const count = images.length;
  const baseDims = CARD_DIMENSIONS[cardSize] ?? CARD_DIMENSIONS.md;
  const cardWidth = Math.min(baseDims.width, Math.max(210, Math.round(viewportWidth * 0.74)));
  const cardHeight = Math.round((cardWidth / baseDims.width) * baseDims.height);
  const stride = cardWidth + gap;
  const totalLoop = Math.max(stride * Math.max(count, 1), 1);

  const physicsRef = useRef({
    pos: 0,
    target: 0,
    vel: 0,
    dragging: false,
    pointerId: -1,
    startX: 0,
    startPos: 0,
    moved: false,
    hovered: false,
    focused: false,
    lastWheelAt: 0,
    mode: 'auto' as 'auto' | 'spring' | 'drag' | 'wheel',
    samples: [] as Array<{ x: number; t: number }>,
    reducedMotion: false,
    lastActive: 0,
  });

  const stateRef = useRef({
    count,
    stride,
    totalLoop,
    speed,
    isPaused,
    lightboxOpen: lightboxIndex !== null,
    viewportWidth,
  });

  stateRef.current = {
    count,
    stride,
    totalLoop,
    speed,
    isPaused,
    lightboxOpen: lightboxIndex !== null,
    viewportWidth,
  };

  useEffect(() => {
    if (activeIndex >= count && count > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, count]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateSize = () => {
      setViewportWidth(viewport.clientWidth || 960);
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);

    return () => observer.disconnect();
  }, []);

  const snapToNearest = useCallback((currentPos: number, loop: number, stepSize: number) => {
    if (stepSize <= 0) return currentPos;
    const snapped = Math.round(currentPos / stepSize) * stepSize;
    return currentPos + wrapOffset(snapped - currentPos, loop);
  }, []);

  const stepBy = useCallback((delta: number) => {
    const p = physicsRef.current;
    const { stride: st } = stateRef.current;
    if (st <= 0) return;
    const currentStep = Math.round(p.pos / st);
    p.target = (currentStep + delta) * st;
    p.mode = 'spring';
  }, []);

  const goToSlide = useCallback((index: number) => {
    const p = physicsRef.current;
    const { count: n, stride: st, totalLoop: loop } = stateRef.current;
    if (n <= 0 || st <= 0) return;
    const normalized = ((index % n) + n) % n;
    const desired = normalized * st;
    p.target = p.pos + wrapOffset(desired - p.pos, loop);
    p.mode = 'spring';
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || count === 0) return;

    const mediaQuery =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    physicsRef.current.reducedMotion = mediaQuery?.matches ?? false;

    const onMediaChange = (e: MediaQueryListEvent) => {
      physicsRef.current.reducedMotion = e.matches;
    };
    mediaQuery?.addEventListener('change', onMediaChange);

    let rafId = 0;
    let lastTime = performance.now();

    const renderFrame = (now: number) => {
      const dt = clamp((now - lastTime) / 1000, 0.001, 0.05);
      lastTime = now;

      const p = physicsRef.current;
      const { count: n, stride: st, totalLoop: loop, speed: spd, isPaused: paused, lightboxOpen, viewportWidth: vw } =
        stateRef.current;

      if (n > 0 && st > 0) {
        if (p.mode === 'wheel' && now - p.lastWheelAt > 180) {
          p.target = snapToNearest(p.pos, loop, st);
          p.mode = 'spring';
        }

        const canAutoScroll =
          spd > 0 &&
          !paused &&
          !lightboxOpen &&
          !p.dragging &&
          !p.hovered &&
          !p.focused &&
          !p.reducedMotion &&
          p.mode === 'auto';

        if (canAutoScroll) {
          const pxPerSec = spd * 64;
          p.pos += pxPerSec * dt;
          p.target = p.pos;
        } else if (p.mode === 'spring' && !p.dragging) {
          const stiffness = 95;
          const damping = 2 * Math.sqrt(stiffness) * 0.92;
          const substeps = Math.max(1, Math.ceil(dt / (1 / 120)));
          const h = dt / substeps;
          for (let i = 0; i < substeps; i++) {
            const acc = stiffness * (p.target - p.pos) - damping * p.vel;
            p.vel += acc * h;
            p.pos += p.vel * h;
          }
          if (Math.abs(p.target - p.pos) < 0.35 && Math.abs(p.vel) < 1.5) {
            p.pos = p.target;
            p.vel = 0;
            if (spd > 0 && !paused && !p.hovered && !p.focused && !p.reducedMotion) {
              p.mode = 'auto';
            }
          }
        } else if (p.mode === 'wheel' && !p.dragging) {
          p.pos += (p.target - p.pos) * Math.min(1, dt * 14);
        }

        if (Math.abs(p.pos) > loop * 6) {
          const shift = Math.round(p.pos / loop) * loop;
          p.pos -= shift;
          p.target -= shift;
          p.startPos -= shift;
        }

        let bestIdx = 0;
        let bestDist = Infinity;

        for (let i = 0; i < n; i++) {
          const el = slideRefs.current[i];
          const center = i * st;
          const rel = wrapOffset(center - p.pos, loop);
          const absDist = Math.abs(rel);
          if (absDist < bestDist) {
            bestDist = absDist;
            bestIdx = i;
          }
          if (!el) continue;

          const norm = clamp(rel / Math.max(vw * 0.52, st * 1.4), -1.6, 1.6);
          const focusFactor = clamp(1 - Math.abs(norm) * 0.65, 0.35, 1);
          const scale = p.reducedMotion ? 1 : 0.84 + 0.16 * focusFactor;
          const tiltY = p.reducedMotion ? 0 : clamp(-norm * 10, -14, 14);
          const liftY = p.reducedMotion ? 0 : (1 - focusFactor) * 8;
          const opacity = clamp(1.12 - Math.abs(norm) * 0.42, 0.18, 1);
          const zIndex = Math.round(100 - Math.abs(norm) * 40);
          const visible = absDist < vw * 0.85 + st;

          el.style.transform = `translate3d(${rel.toFixed(2)}px, ${liftY.toFixed(2)}px, 0) perspective(900px) rotateY(${tiltY.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
          el.style.opacity = visible ? opacity.toFixed(3) : '0';
          el.style.zIndex = String(zIndex);
          el.style.pointerEvents = visible ? 'auto' : 'none';
        }

        if (bestIdx !== p.lastActive) {
          p.lastActive = bestIdx;
          setActiveIndex(bestIdx);
        }
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      mediaQuery?.removeEventListener('change', onMediaChange);
    };
  }, [count, snapToNearest]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || stateRef.current.lightboxOpen) return;
      const dx = Math.abs(e.deltaX);
      const dy = Math.abs(e.deltaY);
      const isHorizontal = dx > dy || e.shiftKey;
      if (!isHorizontal && dy < 4) return;
      if (isHorizontal) {
        e.preventDefault();
        const p = physicsRef.current;
        const raw = e.shiftKey && dx < dy ? e.deltaY : e.deltaX;
        p.target += clamp(raw, -160, 160) * 1.15;
        p.lastWheelAt = performance.now();
        p.mode = 'wheel';
      }
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setLightboxIndex(null);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setLightboxIndex((prev) => (prev === null ? null : (prev + 1) % Math.max(count, 1)));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setLightboxIndex((prev) => (prev === null ? null : (prev - 1 + Math.max(count, 1)) % Math.max(count, 1)));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [count, lightboxIndex]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || count === 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    const p = physicsRef.current;
    p.dragging = true;
    p.pointerId = e.pointerId;
    p.startX = e.clientX;
    p.startPos = p.pos;
    p.moved = false;
    p.vel = 0;
    p.mode = 'drag';
    p.samples = [{ x: e.clientX, t: performance.now() }];
    setIsDraggingUI(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture is unsupported
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = physicsRef.current;
    if (!p.dragging || e.pointerId !== p.pointerId) return;

    const dx = e.clientX - p.startX;
    if (Math.abs(dx) > 6) {
      p.moved = true;
    }
    p.pos = p.startPos - dx;
    p.target = p.pos;

    const now = performance.now();
    p.samples.push({ x: e.clientX, t: now });
    while (p.samples.length > 2 && now - p.samples[0].t > 110) {
      p.samples.shift();
    }
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = physicsRef.current;
    if (!p.dragging || e.pointerId !== p.pointerId) return;

    p.dragging = false;
    p.pointerId = -1;
    setIsDraggingUI(false);

    const now = performance.now();
    const first = p.samples[0];
    const last = p.samples[p.samples.length - 1];
    let velocity = 0;
    if (first && last && last.t > first.t && now - last.t < 90) {
      velocity = -((last.x - first.x) / (last.t - first.t)) * 1000;
    }
    p.vel = clamp(velocity, -2400, 2400);
    p.target = snapToNearest(p.pos + p.vel * 0.22, totalLoop, stride);
    p.mode = 'spring';
  };

  const handleViewportKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepBy(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepBy(-1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goToSlide(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goToSlide(count - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      if ((e.target as HTMLElement).tagName !== 'BUTTON') {
        e.preventDefault();
        setLightboxIndex(activeIndex);
      }
    }
  };

  const activeSlide = images[activeIndex] ?? images[0];
  const lightboxSlide = lightboxIndex !== null ? images[lightboxIndex] : null;

  if (count === 0) {
    return (
      <div className={`fc-root fc-empty ${className}`.trim()}>
        <p className="fc-empty-text">No hay imágenes disponibles en el archivo.</p>
      </div>
    );
  }

  return (
    <div
      id={`fc-${carouselId}`}
      className={`fc-root ${className}`.trim()}
      data-dragging={isDraggingUI ? 'true' : undefined}
      onMouseEnter={() => {
        physicsRef.current.hovered = true;
      }}
      onMouseLeave={() => {
        physicsRef.current.hovered = false;
      }}
      onFocusCapture={() => {
        physicsRef.current.focused = true;
      }}
      onBlurCapture={() => {
        physicsRef.current.focused = false;
      }}
    >
      <style>{`
        :where(.fc-root) {
          position: relative;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.15rem;
          user-select: none;
          -webkit-user-select: none;
        }
        :where(.fc-viewport) {
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: 2px;
          background: radial-gradient(circle at 50% 45%, rgba(44, 18, 24, 0.46) 0%, rgba(9, 4, 6, 0.8) 100%);
          border: 1px solid rgba(255, 255, 255, 0.24);
          cursor: grab;
          touch-action: pan-y;
          outline: none;
        }
        :where(.fc-root[data-dragging='true'] .fc-viewport) {
          cursor: grabbing;
        }
        :where(.fc-viewport:focus-visible) {
          box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.8);
        }
        :where(.fc-track) {
          position: relative;
          width: 100%;
          height: 100%;
        }
        :where(.fc-slide) {
          position: absolute;
          top: 50%;
          left: 50%;
          transform-origin: center center;
          will-change: transform, opacity;
          overflow: hidden;
          background: #11080c;
          border: 1px solid rgba(255, 255, 255, 0.24);
          box-shadow: 0 18px 42px rgba(0, 0, 0, 0.6);
          transition: border-color 0.28s ease, box-shadow 0.28s ease;
        }
        :where(.fc-slide.fc-slide--active) {
          border-color: rgba(249, 115, 22, 0.72);
          box-shadow: 0 24px 56px rgba(0, 0, 0, 0.78), 0 0 28px rgba(249, 115, 22, 0.26);
        }
        :where(.fc-slide-media) {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        :where(.fc-slide-img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          pointer-events: none;
        }
        :where(.fc-slide-overlay) {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(9, 4, 6, 0.48) 0%, transparent 38%, rgba(9, 4, 6, 0.9) 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 0.85rem 1rem;
        }
        :where(.fc-slide-top) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }
        :where(.fc-slide-year) {
          padding: 0.2rem 0.65rem;
          border-radius: 2px;
          background: rgba(17, 8, 12, 0.86);
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: #fbbf24;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.08em;
        }
        :where(.fc-zoom-btn) {
          width: 32px;
          height: 32px;
          border-radius: 2px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(17, 8, 12, 0.85);
          color: #fff8f1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease, transform 0.2s ease;
        }
        :where(.fc-zoom-btn:hover) {
          background: rgba(249, 115, 22, 0.35);
          transform: scale(1.08);
        }
        :where(.fc-slide-title) {
          margin: 0;
          color: #fff8f1;
          font-size: 0.96rem;
          font-weight: 700;
          line-height: 1.3;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        :where(.fc-nav-btn) {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          z-index: 140;
          width: 42px;
          height: 42px;
          border-radius: 2px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(17, 8, 12, 0.85);
          backdrop-filter: blur(10px);
          color: #fff8f1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease, box-shadow 0.2s ease;
        }
        :where(.fc-nav-btn:hover) {
          background: rgba(249, 115, 22, 0.32);
          box-shadow: 0 0 18px rgba(249, 115, 22, 0.45);
        }
        :where(.fc-nav-btn--prev) { left: 0.85rem; }
        :where(.fc-nav-btn--next) { right: 0.85rem; }
        :where(.fc-controls) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.75rem;
          padding: 0 0.25rem;
        }
        :where(.fc-dots) {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0.42rem;
        }
        :where(.fc-dot) {
          width: 8px;
          height: 8px;
          padding: 0;
          border-radius: 2px;
          border: none;
          background: rgba(184, 155, 140, 0.4);
          cursor: pointer;
          transition: width 0.25s ease, background 0.25s ease;
        }
        :where(.fc-dot.is-active) {
          width: 24px;
          background: #f97316;
          box-shadow: 0 0 10px rgba(249, 115, 22, 0.65);
        }
        :where(.fc-play-toggle) {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.8rem;
          border-radius: 2px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(28, 12, 18, 0.82);
          color: #f3dfd1;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }
        :where(.fc-caption-card) {
          padding: 1.25rem 1.45rem;
          border-radius: 2px;
          background: linear-gradient(135deg, rgba(26, 12, 18, 0.86) 0%, rgba(17, 8, 12, 0.94) 100%);
          border: 1px solid rgba(255, 255, 255, 0.24);
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        :where(.fc-caption-header) {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        :where(.fc-caption-year) {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #fbbf24;
        }
        :where(.fc-caption-counter) {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          font-variant-numeric: tabular-nums;
          font-size: 0.8rem;
          color: #fb923c;
        }
        :where(.fc-caption-title) {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 700;
          color: #fff8f1;
        }
        :where(.fc-caption-desc) {
          margin: 0;
          font-size: 0.96rem;
          line-height: 1.65;
          color: #f3dfd1;
        }
        :where(.fc-lightbox) {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(9, 4, 6, 0.9);
          backdrop-filter: blur(14px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
        }
        :where(.fc-lightbox-dialog) {
          position: relative;
          width: 100%;
          max-width: 920px;
          max-height: 90vh;
          border-radius: 2px;
          background: rgba(17, 8, 12, 0.96);
          border: 1px solid rgba(255, 255, 255, 0.24);
          box-shadow: 0 32px 80px rgba(0, 0, 0, 0.85);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        :where(.fc-lightbox-media) {
          position: relative;
          width: 100%;
          height: clamp(240px, 52vh, 520px);
          background: #090406;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        :where(.fc-lightbox-media img) {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        :where(.fc-lightbox-close) {
          position: absolute;
          top: 0.9rem;
          right: 0.9rem;
          z-index: 10;
          width: 38px;
          height: 38px;
          border-radius: 2px;
          border: 1px solid rgba(255, 255, 255, 0.24);
          background: rgba(17, 8, 12, 0.88);
          color: #fff8f1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        :where(.fc-lightbox-info) {
          padding: 1.35rem 1.65rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
      `}</style>

      <div
        ref={viewportRef}
        className="fc-viewport"
        style={{ height: `${cardHeight + 64}px` }}
        role="region"
        aria-roledescription="carousel"
        aria-label="Archivo fotográfico de exploración espacial"
        tabIndex={0}
        onKeyDown={handleViewportKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <div className="fc-track">
          {images.map((slide, idx) => {
            const isActive = idx === activeIndex;
            const hasFailed = Boolean(failedSrcs[slide.src]);
            return (
              <div
                key={`${slide.src}-${idx}`}
                ref={(el) => {
                  slideRefs.current[idx] = el;
                }}
                className={`fc-slide ${isActive ? 'fc-slide--active' : ''}`}
                style={{
                  width: `${cardWidth}px`,
                  height: `${cardHeight}px`,
                  marginLeft: `${-cardWidth / 2}px`,
                  marginTop: `${-cardHeight / 2}px`,
                  borderRadius: `${borderRadius}px`,
                }}
                onClick={() => {
                  if (physicsRef.current.moved) return;
                  if (isActive) {
                    setLightboxIndex(idx);
                  } else {
                    goToSlide(idx);
                  }
                }}
              >
                <div className="fc-slide-media">
                  {!hasFailed ? (
                    <img
                      src={slide.src}
                      alt={slide.alt || slide.title || `Imagen ${idx + 1}`}
                      className="fc-slide-img"
                      loading="lazy"
                      draggable={false}
                      onError={() =>
                        setFailedSrcs((prev) => ({
                          ...prev,
                          [slide.src]: true,
                        }))
                      }
                    />
                  ) : (
                    <div
                      className="fc-slide-fallback"
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.25rem',
                        textAlign: 'center',
                        background:
                          'radial-gradient(circle at 35% 30%, rgba(249,115,22,0.22), rgba(9,4,6,0.96))',
                        color: '#fdba74',
                        fontSize: '0.88rem',
                      }}
                    >
                      <span style={{ fontWeight: 700, marginBottom: '0.35rem' }}>
                        {slide.title || 'Archivo NASA'}
                      </span>
                      <span style={{ opacity: 0.72, fontSize: '0.78rem' }}>
                        Vista previa no disponible offline
                      </span>
                    </div>
                  )}

                  <div className="fc-slide-overlay">
                    <div className="fc-slide-top">
                      {slide.year ? <span className="fc-slide-year">{slide.year}</span> : <span />}
                      <button
                        type="button"
                        className="fc-zoom-btn"
                        aria-label={`Ampliar ${slide.title || `imagen ${idx + 1}`}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLightboxIndex(idx);
                        }}
                      >
                        <Maximize2 size={14} />
                      </button>
                    </div>
                    {slide.title && <h4 className="fc-slide-title">{slide.title}</h4>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="fc-nav-btn fc-nav-btn--prev"
          aria-label="Imagen anterior"
          onClick={() => stepBy(-1)}
        >
          <ChevronLeft size={20} />
        </button>

        <button
          type="button"
          className="fc-nav-btn fc-nav-btn--next"
          aria-label="Imagen siguiente"
          onClick={() => stepBy(1)}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="fc-controls">
        <div className="fc-dots" role="tablist" aria-label="Seleccionar diapositiva">
          {images.map((slide, idx) => (
            <button
              key={`dot-${idx}`}
              type="button"
              role="tab"
              aria-selected={idx === activeIndex}
              aria-label={`Ir a ${slide.title || `diapositiva ${idx + 1}`}`}
              className={`fc-dot ${idx === activeIndex ? 'is-active' : ''}`}
              onClick={() => goToSlide(idx)}
            />
          ))}
        </div>

        {speed > 0 && (
          <button
            type="button"
            className="fc-play-toggle"
            onClick={() => setIsPaused((prev) => !prev)}
            aria-label={isPaused ? 'Reanudar desplazamiento automático' : 'Pausar desplazamiento automático'}
          >
            {isPaused ? <Play size={13} /> : <Pause size={13} />}
            <span>{isPaused ? 'Reanudar' : 'Pausar'}</span>
          </button>
        )}
      </div>

      {activeSlide && (
        <div className="fc-caption-card" aria-live="polite">
          <div className="fc-caption-header">
            <span className="fc-caption-year">{activeSlide.year || 'Archivo Espacial'}</span>
            <span className="fc-caption-counter">
              {String(activeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>
          </div>
          {activeSlide.title && <h3 className="fc-caption-title">{activeSlide.title}</h3>}
          {activeSlide.description && <p className="fc-caption-desc">{activeSlide.description}</p>}
        </div>
      )}

      {lightboxSlide && lightboxIndex !== null && (
        <div
          className="fc-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={lightboxSlide.title || 'Vista ampliada de archivo NASA'}
          onClick={() => setLightboxIndex(null)}
        >
          <div className="fc-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="fc-lightbox-close"
              aria-label="Cerrar vista ampliada"
              onClick={() => setLightboxIndex(null)}
            >
              <X size={18} />
            </button>

            <div className="fc-lightbox-media">
              {!failedSrcs[lightboxSlide.src] ? (
                <img
                  src={lightboxSlide.src}
                  alt={lightboxSlide.alt || lightboxSlide.title || 'Imagen ampliada'}
                />
              ) : (
                <div style={{ color: '#fdba74', padding: '2rem', textAlign: 'center' }}>
                  No se pudo cargar la imagen completa.
                </div>
              )}

              <button
                type="button"
                className="fc-nav-btn fc-nav-btn--prev"
                aria-label="Anterior en vista ampliada"
                onClick={() => setLightboxIndex((lightboxIndex - 1 + count) % count)}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                className="fc-nav-btn fc-nav-btn--next"
                aria-label="Siguiente en vista ampliada"
                onClick={() => setLightboxIndex((lightboxIndex + 1) % count)}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="fc-lightbox-info">
              <div className="fc-caption-header">
                <span className="fc-caption-year">{lightboxSlide.year || 'Archivo NASA'}</span>
                <span className="fc-caption-counter">
                  {String(lightboxIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
                </span>
              </div>
              {lightboxSlide.title && <h3 className="fc-caption-title">{lightboxSlide.title}</h3>}
              {lightboxSlide.description && (
                <p className="fc-caption-desc">{lightboxSlide.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlexCarousel;
