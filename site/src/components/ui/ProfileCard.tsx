'use client';

import React, { memo, useEffect, useId, useState, useRef } from 'react';
import { Github, Linkedin, Mail } from 'lucide-react';

export interface ProfileCardProps {
  name: string;
  title: string;
  handle?: string;
  status?: string;
  avatarUrl?: string;
  roleBadge?: string;
  bio?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  email?: string;
  className?: string;
}

const GRAIN_SVG = `url("data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='g' x='0' y='0' width='100%' height='100%' color-interpolation-filters='sRGB'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0.55 0 0 0 -0.24 0.55 0 0 0 -0.24 0.55 0 0 0 -0.24 0 0 0 0 1'/></filter><rect width='100%' height='100%' filter='url(#g)'/></svg>"
)}")`;

const HOLO_MASK_PATTERN = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>" +
    "<rect width='120' height='120' fill='#000' fill-opacity='0.28'/>" +
    "<g fill='#000' fill-opacity='0.75'>" +
    "<path d='M30 8l5 12 12 5-12 5-5 12-5-12-12-5 12-5zM90 8l5 12 12 5-12 5-5 12-5-12-12-5 12-5zM60 38l6 14 14 6-14 6-6 14-6-14-14-6 14-6zM30 68l5 12 12 5-12 5-5 12-5-12-12-5 12-5zM90 68l5 12 12 5-12 5-5 12-5-12-12-5 12-5z'/>" +
    '</g>' +
    "<g stroke='#000' stroke-opacity='0.55' stroke-width='1.5' fill='none'>" +
    "<circle cx='60' cy='60' r='26'/><circle cx='60' cy='60' r='44'/>" +
    '</g></svg>'
)}`;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TH';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function ProfileCardInner({
  name,
  title,
  handle,
  status = 'Tango Horizon · 2026',
  avatarUrl,
  roleBadge,
  bio,
  linkedinUrl,
  githubUrl,
  email,
  className = '',
}: ProfileCardProps) {
  const crestUid = useId().replace(/:/g, '');
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [avatarUrl]);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;

    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const size = { width: root.offsetWidth || 340, height: root.offsetHeight || 460 };
    const x = { p: 0, v: 0, target: 0 };
    const y = { p: 0, v: 0, target: 0 };
    const light = { p: 0, target: 0 };

    let rafId = 0;
    let last = 0;
    let slowUntil = 0;
    let touchId: number | null = null;

    const writeVars = () => {
      const tiltStrength = reduced ? 0 : 12;
      const depth = reduced ? 0 : 8;
      const reach = Math.min(1, Math.hypot(x.p, y.p));
      const ptrX = (x.p + 1) * 50;
      const ptrY = (y.p + 1) * 50;
      const rotX = y.p * tiltStrength;
      const rotY = -x.p * tiltStrength;

      const s = root.style;
      s.setProperty('--pointer-x', `${ptrX.toFixed(2)}%`);
      s.setProperty('--pointer-y', `${ptrY.toFixed(2)}%`);
      s.setProperty('--pointer-from-center', reach.toFixed(4));
      s.setProperty('--pointer-from-top', ((y.p + 1) * 0.5).toFixed(4));
      s.setProperty('--pointer-from-left', ((x.p + 1) * 0.5).toFixed(4));
      s.setProperty('--card-opacity', light.p.toFixed(4));
      s.setProperty('--rotate-x', `${rotX.toFixed(3)}deg`);
      s.setProperty('--rotate-y', `${rotY.toFixed(3)}deg`);
      s.setProperty('--background-x', `${(50 + x.p * 18).toFixed(2)}%`);
      s.setProperty('--background-y', `${(50 + y.p * 18).toFixed(2)}%`);

      s.setProperty('--pc-light-x', `${((x.p + 1) * 0.5 * size.width).toFixed(1)}px`);
      s.setProperty('--pc-light-y', `${((y.p + 1) * 0.5 * size.height).toFixed(1)}px`);
      s.setProperty('--pc-shift-x', `${(x.p * depth).toFixed(2)}px`);
      s.setProperty('--pc-shift-y', `${(y.p * depth).toFixed(2)}px`);
      s.setProperty('--pc-active', light.p.toFixed(4));
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000 || 0.016));
      last = now;
      const slow = now < slowUntil;
      const stiffness = slow ? 24 : 120;
      const damping = slow ? 9 : 16;
      const substeps = Math.max(1, Math.ceil(dt / (1 / 120)));
      const h = dt / substeps;

      for (let i = 0; i < substeps; i++) {
        for (const axis of [x, y]) {
          axis.v += (stiffness * (axis.target - axis.p) - damping * axis.v) * h;
          axis.p += axis.v * h;
        }
      }

      const tau = light.target > light.p ? 0.18 : slow ? 0.85 : 0.42;
      light.p += (light.target - light.p) * (1 - Math.exp(-dt / tau));
      writeVars();

      const moving =
        Math.abs(x.target - x.p) > 0.0005 ||
        Math.abs(y.target - y.p) > 0.0005 ||
        Math.abs(x.v) > 0.0005 ||
        Math.abs(y.v) > 0.0005 ||
        Math.abs(light.target - light.p) > 0.002;

      if (moving) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        x.p = x.target;
        y.p = y.target;
        light.p = light.target;
        writeVars();
        rafId = 0;
      }
    };

    const wake = () => {
      if (rafId) return;
      last = performance.now();
      rafId = window.requestAnimationFrame(tick);
    };

    const aim = (nx: number, ny: number, on = true) => {
      x.target = clamp(nx, -1, 1);
      y.target = clamp(ny, -1, 1);
      light.target = on ? 1 : 0;
      slowUntil = 0;
      wake();
    };

    const aimAt = (event: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      aim(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        ((event.clientY - rect.top) / rect.height) * 2 - 1
      );
    };

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') aimAt(e);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || e.pointerId === touchId) aimAt(e);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') aim(0, 0, false);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      touchId = e.pointerId;
      aimAt(e);
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerId !== touchId) return;
      touchId = null;
      aim(0, 0, false);
    };

    root.addEventListener('pointerenter', onEnter);
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    root.addEventListener('pointerdown', onDown);
    root.addEventListener('pointerup', onUp);
    root.addEventListener('pointercancel', onUp);

    const observer = new ResizeObserver(() => {
      size.width = root.offsetWidth || 340;
      size.height = root.offsetHeight || 460;
      writeVars();
    });
    observer.observe(root);

    if (!reduced) {
      x.p = 0.55;
      y.p = -0.45;
      light.p = 0.9;
      slowUntil = performance.now() + 1200;
      writeVars();
      wake();
    } else {
      writeVars();
    }

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      root.removeEventListener('pointerenter', onEnter);
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      root.removeEventListener('pointerdown', onDown);
      root.removeEventListener('pointerup', onUp);
      root.removeEventListener('pointercancel', onUp);
    };
  }, []);

  const showPhoto = Boolean(avatarUrl) && !imgFailed;
  const initials = getInitials(name);
  const mailHref = email ? (email.startsWith('mailto:') ? email : `mailto:${email}`) : undefined;

  return (
    <div
      ref={wrapperRef}
      className={`pc-card-wrapper ${className}`.trim()}
      style={
        {
          '--pc-grain': GRAIN_SVG,
          '--pc-pattern': `url("${HOLO_MASK_PATTERN}")`,
        } as React.CSSProperties
      }
    >
      <style>{`
        :where(.pc-card-wrapper) {
          --pointer-x: 50%;
          --pointer-y: 50%;
          --pointer-from-center: 0;
          --pointer-from-top: 0.5;
          --pointer-from-left: 0.5;
          --card-opacity: 0;
          --rotate-x: 0deg;
          --rotate-y: 0deg;
          --background-x: 50%;
          --background-y: 50%;
          --pc-light-x: 50%;
          --pc-light-y: 50%;
          --pc-shift-x: 0px;
          --pc-shift-y: 0px;
          --pc-active: 0;
          perspective: 1000px;
          width: 100%;
          max-width: 340px;
          position: relative;
          touch-action: pan-y;
        }
        :where(.pc-card) {
          position: relative;
          border-radius: 2px;
          padding: 10px;
          background: linear-gradient(155deg, rgba(44, 20, 26, 0.78) 0%, rgba(17, 8, 12, 0.92) 100%);
          border: 1px solid rgba(255, 255, 255, 0.24);
          box-shadow:
            0 24px 52px -18px rgba(0, 0, 0, 0.85),
            0 0 28px rgba(249, 115, 22, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.14);
          backdrop-filter: blur(18px) saturate(1.4);
          transform: rotateX(var(--rotate-x)) rotateY(var(--rotate-y));
          transform-style: preserve-3d;
          will-change: transform;
        }
        :where(.pc-inside) {
          position: relative;
          border-radius: 2px;
          overflow: hidden;
          background: radial-gradient(circle at 30% 20%, #2a1219 0%, #11080c 70%, #090406 100%);
          display: flex;
          flex-direction: column;
        }
        :where(.pc-shine) {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          background-image:
            repeating-linear-gradient(
              0deg,
              hsl(12, 95%, 64%) 5%,
              hsl(32, 98%, 62%) 12%,
              hsl(45, 96%, 64%) 18%,
              hsl(350, 90%, 68%) 25%,
              hsl(20, 95%, 60%) 32%,
              hsl(12, 95%, 64%) 38%
            ),
            repeating-linear-gradient(
              -45deg,
              #1a0c12 0%,
              hsl(24, 22%, 52%) 3.8%,
              hsl(34, 34%, 62%) 4.5%,
              hsl(24, 22%, 52%) 5.2%,
              #1a0c12 10%,
              #1a0c12 12%
            ),
            var(--pc-grain);
          background-position:
            0 var(--background-y),
            var(--background-x) var(--background-y),
            0 0;
          background-size: 400% 400%, 300% 300%, 200px 200px;
          background-blend-mode: color, hard-light, overlay;
          mix-blend-mode: color-dodge;
          opacity: calc(0.28 + 0.55 * var(--pc-active));
          -webkit-mask-image: var(--pc-pattern);
          -webkit-mask-size: 160% auto;
          mask-image: var(--pc-pattern);
          mask-size: 160% auto;
        }
        :where(.pc-glare) {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          background: radial-gradient(
            farthest-corner circle at var(--pc-light-x) var(--pc-light-y),
            rgba(255, 248, 241, 0.65) 0%,
            rgba(251, 146, 60, 0.24) 24%,
            rgba(255, 255, 255, 0) 62%
          );
          mix-blend-mode: overlay;
          opacity: calc(0.25 + 0.65 * var(--pc-active));
        }
        :where(.pc-avatar-content) {
          position: relative;
          aspect-ratio: 4 / 4.4;
          width: 100%;
          overflow: hidden;
          isolation: isolate;
          background: radial-gradient(circle at 50% 35%, rgba(249, 115, 22, 0.18), rgba(9, 4, 6, 0.96) 75%);
        }
        :where(.pc-avatar-content img) {
          position: absolute;
          inset: -8px;
          width: calc(100% + 16px);
          height: calc(100% + 16px);
          object-fit: cover;
          object-position: center top;
          transform: translate3d(var(--pc-shift-x), var(--pc-shift-y), 0);
          pointer-events: none;
        }
        :where(.pc-role-badge) {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 6;
          padding: 0.28rem 0.72rem;
          border-radius: 2px;
          background: rgba(17, 8, 12, 0.84);
          border: 1px solid rgba(251, 146, 60, 0.48);
          backdrop-filter: blur(8px);
          color: #fbbf24;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        :where(.pc-scrim) {
          position: absolute;
          inset: 0;
          z-index: 3;
          background: linear-gradient(
            to top,
            rgba(9, 4, 6, 0.94) 0%,
            rgba(9, 4, 6, 0.68) 32%,
            rgba(9, 4, 6, 0.08) 65%,
            transparent 100%
          );
          pointer-events: none;
        }
        :where(.pc-details) {
          position: relative;
          z-index: 6;
          padding: 0.25rem 1.15rem 0.95rem 1.15rem;
          margin-top: -4.2rem;
          color: #fff8f1;
        }
        :where(.pc-details h3) {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #fff8f1;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.75);
        }
        :where(.pc-details p) {
          margin: 0.2rem 0 0 0;
          font-size: 0.86rem;
          font-weight: 500;
          color: #fdba74;
        }
        :where(.pc-bio) {
          margin: 0.55rem 0 0 0;
          font-size: 0.82rem;
          line-height: 1.5;
          color: #f3dfd1;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        :where(.pc-user-info) {
          position: relative;
          z-index: 6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
          margin: 0 0.75rem 0.75rem 0.75rem;
          padding: 0.65rem 0.8rem;
          border-radius: 2px;
          background: rgba(26, 12, 18, 0.82);
          border: 1px solid rgba(255, 255, 255, 0.24);
          backdrop-filter: blur(12px);
        }
        :where(.pc-user-details) {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          min-width: 0;
        }
        :where(.pc-mini-avatar) {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          border: 1px solid rgba(251, 146, 60, 0.42);
          background: linear-gradient(135deg, #2a1219, #11080c);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fbbf24;
          font-size: 0.74rem;
          font-weight: 700;
        }
        :where(.pc-mini-avatar img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center top;
        }
        :where(.pc-user-text) {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        :where(.pc-handle) {
          font-size: 0.82rem;
          font-weight: 600;
          color: #fff8f1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        :where(.pc-status) {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.72rem;
          color: #b89b8c;
          white-space: nowrap;
        }
        :where(.pc-status-dot) {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 8px rgba(34, 197, 94, 0.85);
        }
        :where(.pc-actions) {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-shrink: 0;
        }
        :where(.pc-action-link) {
          width: 32px;
          height: 32px;
          border-radius: 2px;
          background: rgba(28, 12, 18, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.24);
          color: #f3dfd1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: border-color 0.2s ease, color 0.2s ease, transform 0.2s ease;
        }
        :where(.pc-action-link:hover) {
          border-color: #f97316;
          color: #fbbf24;
          transform: translateY(-1px);
        }
        :where(.pc-action-link:focus-visible) {
          outline: 2px solid #f97316;
          outline-offset: 2px;
        }
      `}</style>

      <div className="pc-card">
        <div className="pc-inside">
          <div className="pc-shine" aria-hidden="true" />
          <div className="pc-glare" aria-hidden="true" />

          <div className="pc-content pc-avatar-content">
            {roleBadge && <span className="pc-role-badge">{roleBadge}</span>}

            {showPhoto ? (
              <img
                src={avatarUrl}
                alt={name}
                loading="lazy"
                draggable={false}
                onError={() => setImgFailed(true)}
              />
            ) : (
              <div
                className="pc-monogram-crest"
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: 'translate3d(var(--pc-shift-x), var(--pc-shift-y), 0)',
                }}
              >
                <svg
                  viewBox="0 0 260 280"
                  width="100%"
                  height="100%"
                  style={{ maxWidth: '240px', overflow: 'visible' }}
                >
                  <defs>
                    <radialGradient id={`crest-glow-${crestUid}`} cx="50%" cy="46%" r="50%">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.32" />
                      <stop offset="55%" stopColor="#f97316" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="#090406" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id={`crest-ring-${crestUid}`} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fbbf24" />
                      <stop offset="50%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#fb7185" />
                    </linearGradient>
                  </defs>

                  <circle cx="130" cy="126" r="110" fill={`url(#crest-glow-${crestUid})`} />

                  <g stroke={`url(#crest-ring-${crestUid})`} fill="none" opacity="0.72">
                    <circle cx="130" cy="126" r="88" strokeWidth="1" strokeDasharray="3 5" />
                    <ellipse
                      cx="130"
                      cy="126"
                      rx="96"
                      ry="36"
                      strokeWidth="1.2"
                      transform="rotate(-24 130 126)"
                    />
                    <ellipse
                      cx="130"
                      cy="126"
                      rx="96"
                      ry="36"
                      strokeWidth="1.1"
                      strokeOpacity="0.65"
                      transform="rotate(28 130 126)"
                    />
                    <circle cx="130" cy="126" r="56" strokeWidth="1.5" />
                  </g>

                  <circle cx="52" cy="88" r="3.5" fill="#fbbf24" />
                  <circle cx="208" cy="164" r="3.5" fill="#fda4af" />
                  <circle cx="182" cy="54" r="2.8" fill="#f97316" />

                  <circle
                    cx="130"
                    cy="126"
                    r="48"
                    fill="rgba(17, 8, 12, 0.88)"
                    stroke="rgba(251, 146, 60, 0.45)"
                    strokeWidth="1.2"
                  />
                  <text
                    x="130"
                    y="138"
                    textAnchor="middle"
                    fill={`url(#crest-ring-${crestUid})`}
                    fontSize="34"
                    fontWeight="800"
                    letterSpacing="3"
                    fontFamily="var(--font-raleway), 'Raleway', sans-serif"
                  >
                    {initials}
                  </text>
                </svg>
              </div>
            )}

            <div className="pc-scrim" aria-hidden="true" />
          </div>

          <div className="pc-content">
            <div className="pc-details">
              <h3>{name}</h3>
              <p>{title}</p>
              {bio && <div className="pc-bio">{bio}</div>}
            </div>
          </div>

          <div className="pc-user-info">
            <div className="pc-user-details">
              <div className="pc-mini-avatar" aria-hidden="true">
                {showPhoto ? (
                  <img src={avatarUrl} alt="" loading="lazy" draggable={false} />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="pc-user-text">
                {handle && (
                  <span className="pc-handle">{handle.startsWith('@') ? handle : `@${handle}`}</span>
                )}
                {status && (
                  <span className="pc-status">
                    <span className="pc-status-dot" aria-hidden="true" />
                    {status}
                  </span>
                )}
              </div>
            </div>

            {(linkedinUrl || githubUrl || mailHref) && (
              <div className="pc-actions">
                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pc-action-link"
                    aria-label={`LinkedIn de ${name}`}
                    title="LinkedIn"
                  >
                    <Linkedin size={15} />
                  </a>
                )}
                {githubUrl && (
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pc-action-link"
                    aria-label={`GitHub de ${name}`}
                    title="GitHub"
                  >
                    <Github size={15} />
                  </a>
                )}
                {mailHref && (
                  <a
                    href={mailHref}
                    className="pc-action-link pc-contact-btn"
                    aria-label={`Enviar correo a ${name}`}
                    title="Contactar"
                  >
                    <Mail size={15} />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const ProfileCard = memo(ProfileCardInner);
export default ProfileCard;
