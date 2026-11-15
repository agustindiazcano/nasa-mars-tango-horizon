'use client';

import { useId } from 'react';

interface VisualFrameProps {
  title: string;
  subtitle: string;
  accent?: string;
  children: React.ReactNode;
}

function VisualFrame({ title, subtitle, accent = '#fde68a', children }: VisualFrameProps) {
  return (
    <figure className="th-visual-figure ancient-celestial-figure">
      <div className="th-visual-stage">{children}</div>
      <figcaption className="th-visual-caption ancient-celestial-caption">
        <span style={{ color: accent }}>{title}</span>
        <small>{subtitle}</small>
      </figcaption>
      <style>{`
        .th-visual-figure {
          width: 100%;
          max-width: 460px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: transparent;
          filter: drop-shadow(0 0 24px rgba(56, 189, 248, 0.18));
        }
        .th-visual-stage {
          width: 100%;
          position: relative;
        }
        .th-visual-svg {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }
        .th-visual-caption {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.45rem 0.5rem 0;
          text-align: center;
        }
        .th-visual-caption span {
          font-size: 0.96rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }
        .th-visual-caption small {
          font-size: 0.82rem;
          color: #bae6fd;
          font-style: italic;
        }
        @keyframes thFloatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes thPulse {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        @keyframes thDashFlow {
          to { stroke-dashoffset: -48; }
        }
        @keyframes thSpinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .th-anim-float {
          animation: thFloatSlow 6s ease-in-out infinite;
        }
        .th-anim-pulse {
          animation: thPulse 2.6s ease-in-out infinite;
        }
        .th-anim-flow {
          animation: thDashFlow 3.2s linear infinite;
        }
        .th-anim-spin {
          transform-box: fill-box;
          transform-origin: center;
          animation: thSpinSlow 18s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .th-anim-float,
          .th-anim-pulse,
          .th-anim-flow,
          .th-anim-spin {
            animation: none !important;
          }
        }
      `}</style>
    </figure>
  );
}

export function ThesisVisual({ type }: { type: string }) {
  const uid = useId().replace(/:/g, '');

  // ============================================================================
  // TESIS LUNAR (4 CAPÍTULOS)
  // ============================================================================
  if (type === 'moon-saros-parallax') {
    return (
      <VisualFrame
        title="Ciclo de Saros y Paralaje Lunar de Hiparco"
        subtitle="Determinación trigonométrica de 60.27 radios terrestres (384,400 km)"
        accent="#fde68a"
      >
        <svg viewBox="0 0 460 360" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={`${uid}-earth`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="48%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#082f49" />
            </radialGradient>
            <radialGradient id={`${uid}-moon`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="55%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>
          </defs>

          {/* Arco superior de fases sinódicas */}
          {[
            { x: 95, y: 66, clip: -10, label: 'Creciente' },
            { x: 162, y: 48, clip: -4, label: 'Cuarto' },
            { x: 230, y: 42, clip: 0, label: 'Plenilunio' },
            { x: 298, y: 48, clip: 4, label: 'Gibosa' },
            { x: 365, y: 66, clip: 10, label: 'Menguante' },
          ].map((ph, i) => (
            <g key={i} transform={`translate(${ph.x}, ${ph.y})`}>
              <circle r="15" fill={`url(#${uid}-moon)`} stroke="rgba(253,230,138,0.45)" strokeWidth="1" />
              {ph.clip !== 0 && (
                <ellipse
                  cx={ph.clip}
                  cy="0"
                  rx="10"
                  ry="14.5"
                  fill="rgba(3, 7, 18, 0.85)"
                />
              )}
              <text x="0" y="28" textAnchor="middle" fill="#cbd5e1" fontSize="9">
                {ph.label}
              </text>
            </g>
          ))}

          {/* Tierra a la izquierda */}
          <g transform="translate(86, 224)">
            <circle r="48" fill={`url(#${uid}-earth)`} stroke="#7df9ff" strokeWidth="1.5" />
            <path d="M-22,-22 C-5,-30 18,-12 10,8 C2,22 -18,24 -24,6 Z" fill="#4ade80" opacity="0.6" />
            <circle cx="-6" cy="-38" r="4" fill="#fde047" />
            <circle cx="-6" cy="38" r="4" fill="#fde047" />
            <text x="0" y="68" textAnchor="middle" fill="#bae6fd" fontSize="11" fontWeight="bold">
              Tierra (R_T)
            </text>
          </g>

          {/* Líneas de paralaje diurna */}
          <line x1="80" y1="186" x2="366" y2="224" stroke="#fde68a" strokeWidth="1.6" strokeDasharray="5 4" className="th-anim-flow" />
          <line x1="80" y1="262" x2="366" y2="224" stroke="#fde68a" strokeWidth="1.6" strokeDasharray="5 4" className="th-anim-flow" />
          <line x1="134" y1="224" x2="366" y2="224" stroke="#7df9ff" strokeWidth="1.4" strokeOpacity="0.7" />
          <path d="M 326 218 A 40 40 0 0 0 326 230" fill="none" stroke="#7df9ff" strokeWidth="1.5" />
          <text x="235" y="196" textAnchor="middle" fill="#fde68a" fontSize="11.5" fontFamily="Georgia, serif">
            d ≈ 60.27 R_T (384,400 km)
          </text>
          <text x="235" y="246" textAnchor="middle" fill="#7df9ff" fontSize="10">
            Paralaje π ≈ 57′ · Saros = 223 lunaciones
          </text>

          {/* Luna a la derecha */}
          <g transform="translate(384, 224)">
            <circle r="24" fill={`url(#${uid}-moon)`} stroke="#fde68a" strokeWidth="1.4" />
            <circle cx="-7" cy="-6" r="4.5" fill="rgba(51,65,85,0.45)" />
            <circle cx="8" cy="6" r="6" fill="rgba(51,65,85,0.35)" />
            <text x="0" y="42" textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="bold">
              Luna
            </text>
          </g>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'moon-galileo-optics') {
    return (
      <VisualFrame
        title="Refractor Óptico de Galileo Galilei y Relieve Selenita (1609)"
        subtitle="Observación de cráteres, mares basálticos y sombras en el terminador lunar"
        accent="#fde68a"
      >
        <svg viewBox="0 0 460 360" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`${uid}-brass`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fffbeb" />
              <stop offset="30%" stopColor="#fde047" />
              <stop offset="65%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
            <linearGradient id={`${uid}-wood`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="50%" stopColor="#78350f" />
              <stop offset="100%" stopColor="#451a03" />
            </linearGradient>
            <radialGradient id={`${uid}-moondisc`} cx="32%" cy="32%" r="72%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="52%" stopColor="#cbd5e1" />
              <stop offset="82%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          {/* Disco lunar con terminador y cráteres */}
          <g transform="translate(345, 108)">
            <circle r="76" fill={`url(#${uid}-moondisc)`} stroke="rgba(253,230,138,0.45)" strokeWidth="1.5" />
            <path d="M 10 -75 A 76 76 0 0 1 10 75 A 42 75 0 0 0 10 -75 Z" fill="rgba(2, 6, 23, 0.78)" />
            <ellipse cx="-24" cy="-16" rx="14" ry="12" fill="rgba(71, 85, 105, 0.45)" stroke="rgba(255,255,255,0.45)" strokeWidth="1" />
            <ellipse cx="-6" cy="24" rx="11" ry="9" fill="rgba(51, 65, 85, 0.55)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <circle cx="-38" cy="18" r="6" fill="rgba(71, 85, 105, 0.5)" />
            <text x="0" y="96" textAnchor="middle" fill="#fde68a" fontSize="10.5" fontFamily="Georgia, serif">
              Sidereus Nuncius (1610)
            </text>
          </g>

          {/* Haz óptico hacia el terminador */}
          <polygon
            points="232,148 272,62 325,168"
            fill="rgba(125, 249, 255, 0.09)"
            stroke="rgba(125, 249, 255, 0.45)"
            strokeDasharray="4 4"
            className="th-anim-pulse"
          />

          {/* Telescopio refractor de madera y latón sobre trípode */}
          <g transform="translate(150, 202) rotate(-28)">
            <rect x="-118" y="-12" width="210" height="24" rx="3" fill={`url(#${uid}-wood)`} />
            <rect x="-118" y="-13" width="24" height="26" rx="2" fill={`url(#${uid}-brass)`} />
            <rect x="-36" y="-13" width="12" height="26" fill={`url(#${uid}-brass)`} />
            <rect x="34" y="-13" width="12" height="26" fill={`url(#${uid}-brass)`} />
            <rect x="86" y="-16" width="30" height="32" rx="4" fill={`url(#${uid}-brass)`} />
            <ellipse cx="116" cy="0" rx="5" ry="14" fill="#7df9ff" opacity="0.7" />
            <rect x="-144" y="-8" width="26" height="16" rx="2" fill={`url(#${uid}-brass)`} />
          </g>
          <circle cx="150" cy="212" r="11" fill={`url(#${uid}-brass)`} stroke="#fef08a" />
          <path d="M146,221 L88,334 L98,336 L150,224 Z" fill={`url(#${uid}-wood)`} />
          <path d="M148,221 L146,338 L156,338 L154,221 Z" fill={`url(#${uid}-wood)`} />
          <path d="M154,221 L208,336 L218,334 L158,221 Z" fill={`url(#${uid}-wood)`} />
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'moon-saturnv-lor') {
    return (
      <VisualFrame
        title="Lanzador Saturno V · Inyección Translunar (34.5 MN)"
        subtitle="Etapas S-IC, S-II y S-IVB en trayectoria de Encuentro en Órbita Lunar (LOR)"
        accent="#fde68a"
      >
        <svg viewBox="0 0 460 390" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`${uid}-cyl`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="30%" stopColor="#ffffff" />
              <stop offset="68%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#334155" />
            </linearGradient>
            <radialGradient id={`${uid}-plume`} cx="50%" cy="18%" r="72%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fef08a" />
              <stop offset="62%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Curva translunar en el fondo */}
          <path
            d="M 55 335 C 145 170, 295 245, 395 66"
            fill="none"
            stroke="#7df9ff"
            strokeWidth="1.8"
            strokeDasharray="6 5"
            className="th-anim-flow"
          />
          <circle cx="395" cy="66" r="22" fill="#cbd5e1" opacity="0.25" stroke="#fde68a" strokeWidth="1.2" />
          <text x="380" y="102" textAnchor="middle" fill="#fde68a" fontSize="10">
            Órbita LOR
          </text>

          {/* Saturno V */}
          <g transform="translate(215, 196) rotate(18)">
            <ellipse cx="0" cy="148" rx="30" ry="52" fill={`url(#${uid}-plume)`} className="th-anim-pulse" />
            <ellipse cx="0" cy="128" rx="14" ry="26" fill="#ffffff" />
            <line x1="0" y1="-155" x2="0" y2="-130" stroke="#e2e8f0" strokeWidth="2.5" />
            <polygon points="0,-130 12,-106 -12,-106" fill={`url(#${uid}-cyl)`} />
            <polygon points="-12,-106 12,-106 20,-70 -20,-70" fill={`url(#${uid}-cyl)`} />
            <rect x="-20" y="-70" width="40" height="44" fill={`url(#${uid}-cyl)`} />
            <rect x="-20" y="-36" width="40" height="10" fill="#0f172a" />
            <polygon points="-20,-26 20,-26 28,-12 -28,-12" fill="#1e293b" />
            <rect x="-28" y="-12" width="56" height="58" fill={`url(#${uid}-cyl)`} />
            <rect x="-28" y="34" width="56" height="14" fill="#0f172a" />
            <rect x="-28" y="48" width="56" height="72" fill={`url(#${uid}-cyl)`} />
            <rect x="-28" y="48" width="12" height="46" fill="#0f172a" />
            <rect x="-5" y="48" width="10" height="46" fill="#0f172a" />
            <rect x="16" y="48" width="12" height="46" fill="#0f172a" />
            <polygon points="-28,98 -42,122 -28,120" fill="#0f172a" />
            <polygon points="28,98 42,122 28,120" fill="#0f172a" />
          </g>
          <text x="115" y="64" fill="#7df9ff" fontSize="11" fontFamily="Georgia, serif">
            Δv = v_e · ln(m₀ / m_f)
          </text>
          <text x="115" y="82" fill="#fde68a" fontSize="10.5">
            v_TLI ≈ 10.9 km/s
          </text>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'moon-eagle-alsep') {
    return (
      <VisualFrame
        title="Módulo Lunar Eagle (LM-5) y Retrorreflector Láser LRRR"
        subtitle="Aislamiento térmico Kapton y estaciones ALSEP sobre el Mare Tranquillitatis"
        accent="#fde68a"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`${uid}-kapton`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="35%" stopColor="#facc15" />
              <stop offset="70%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
            <linearGradient id={`${uid}-alloy`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          {/* Superficie lunar */}
          <path d="M 15 292 Q 230 264 445 292 L 445 355 L 15 355 Z" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.4" />
          <ellipse cx="95" cy="322" rx="34" ry="8" fill="#0f172a" stroke="#475569" />

          {/* Haz láser hacia la Tierra desde el retrorreflector LRRR */}
          <line x1="365" y1="286" x2="432" y2="42" stroke="#7df9ff" strokeWidth="2.2" strokeDasharray="6 4" className="th-anim-flow" />
          <rect x="348" y="280" width="32" height="12" transform="rotate(-10 364 286)" fill="#0284c7" stroke="#ffffff" />
          <text x="355" y="314" textAnchor="middle" fill="#7df9ff" fontSize="10">
            LRRR (+3.82 cm/año)
          </text>

          {/* Módulo Lunar Eagle */}
          <g transform="translate(200, 184)">
            <line x1="0" y1="-84" x2="0" y2="-62" stroke="#e2e8f0" strokeWidth="2" />
            <circle cx="0" cy="-88" r="9" fill="none" stroke="#f8fafc" strokeWidth="1.8" />
            <polygon points="-38,-62 38,-62 54,-20 38,14 -38,14 -54,-20" fill={`url(#${uid}-alloy)`} stroke="#cbd5e1" />
            <polygon points="-30,-40 -10,-40 -14,-18 -34,-22" fill="#020617" stroke="#7df9ff" strokeWidth="1" />
            <polygon points="30,-40 10,-40 14,-18 34,-22" fill="#020617" stroke="#7df9ff" strokeWidth="1" />
            <rect x="-10" y="-12" width="20" height="20" rx="2" fill="#1e293b" stroke="#94a3b8" />
            <rect x="-58" y="14" width="116" height="44" rx="3" fill={`url(#${uid}-kapton)`} stroke="#fef08a" />
            <line x1="0" y1="16" x2="0" y2="104" stroke="#e2e8f0" strokeWidth="3.5" />
            <line x1="-56" y1="22" x2="-108" y2="98" stroke={`url(#${uid}-kapton)`} strokeWidth="4" />
            <line x1="56" y1="22" x2="108" y2="98" stroke={`url(#${uid}-kapton)`} strokeWidth="4" />
            <ellipse cx="-108" cy="100" rx="17" ry="4.5" fill={`url(#${uid}-kapton)`} stroke="#fef08a" />
            <ellipse cx="108" cy="100" rx="17" ry="4.5" fill={`url(#${uid}-kapton)`} stroke="#fef08a" />
            <ellipse cx="0" cy="106" rx="14" ry="4" fill={`url(#${uid}-kapton)`} stroke="#fef08a" />
          </g>
        </svg>
      </VisualFrame>
    );
  }

  // ============================================================================
  // TESIS MARTE (4 CAPÍTULOS)
  // ============================================================================
  if (type === 'mars-kepler-tycho') {
    return (
      <VisualFrame
        title="Cuadrante de Tycho Brahe, Paralaje de Cassini y Albedo de Marte"
        subtitle="El bucle retrógrado marciano que condujo a la elipse de Kepler (e = 0.0934)"
        accent="#fb923c"
      >
        <svg viewBox="0 0 460 360" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`${uid}-brass`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="45%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#713f12" />
            </linearGradient>
            <radialGradient id={`${uid}-mars`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="45%" stopColor="#ea580c" />
              <stop offset="85%" stopColor="#7c2d12" />
              <stop offset="100%" stopColor="#2a0a04" />
            </radialGradient>
          </defs>

          {/* Bucle de retrogradación */}
          <path
            d="M 28 112 C 115 96, 195 36, 165 96 C 142 142, 105 114, 148 70 C 195 26, 275 46, 345 28"
            fill="none"
            stroke="#fde68a"
            strokeWidth="2.2"
            strokeDasharray="6 4"
            className="th-anim-flow"
          />
          <circle cx="155" cy="84" r="5.5" fill="#fb923c" stroke="#ffffff" strokeWidth="1.5" />
          <text x="155" y="24" textAnchor="middle" fill="#fde68a" fontSize="11" fontFamily="Georgia, serif">
            Bucle Retrógrado (cada 780 días)
          </text>

          {/* Globo marciano + Fobos y Deimos */}
          <g transform="translate(362, 102)">
            <ellipse cx="0" cy="0" rx="86" ry="32" transform="rotate(-16)" fill="none" stroke="#7df9ff" strokeWidth="1.1" strokeDasharray="3 4" />
            <circle r="56" fill={`url(#${uid}-mars)`} stroke="#fdba74" strokeWidth="1.4" />
            <ellipse cx="0" cy="-49" rx="18" ry="4.5" fill="#ffffff" opacity="0.9" />
            <path d="M-8,-22 L20,18 L-18,22 Z" fill="#2a0a04" opacity="0.65" />
            <ellipse cx="-78" cy="20" rx="6.5" ry="4.5" fill="#cbd5e1" />
            <ellipse cx="76" cy="-24" rx="4.5" ry="3.5" fill="#94a3b8" />
          </g>

          {/* Cuadrante mural de Tycho Brahe */}
          <g transform="translate(115, 250)">
            <path d="M -65 -75 L -65 55 L 65 55 A 130 130 0 0 0 -65 -75 Z" fill="none" stroke={`url(#${uid}-brass)`} strokeWidth="8" />
            <line x1="-65" y1="55" x2="112" y2="-68" stroke={`url(#${uid}-brass)`} strokeWidth="4" />
            <line x1="112" y1="-68" x2="215" y2="-132" stroke="#7df9ff" strokeWidth="1.4" strokeDasharray="4 4" className="th-anim-flow" />
            <circle cx="-65" cy="55" r="8" fill={`url(#${uid}-brass)`} />
            <rect x="-82" y="55" width="95" height="12" rx="3" fill="#78350f" stroke="#b45309" />
          </g>
          <text x="230" y="336" textAnchor="middle" fill="#fed7aa" fontSize="11" fontFamily="Georgia, serif">
            Paralaje París–Cayena (1672): π = 25″ → 1 UA ≈ 149.6 M km
          </text>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-hohmann-transfer') {
    return (
      <VisualFrame
        title="Órbita de Transferencia Heliocéntrica de Hohmann"
        subtitle="Ventana sinódica cada 780 días entre la Tierra (1.00 UA) y Marte (1.524 UA)"
        accent="#fb923c"
      >
        <svg viewBox="0 0 460 380" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={`${uid}-sun`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="30%" stopColor="#fef08a" />
              <stop offset="68%" stopColor="#f59e0b" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${uid}-earth`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#082f49" />
            </radialGradient>
            <radialGradient id={`${uid}-mars`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="50%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#2a0a04" />
            </radialGradient>
          </defs>

          <ellipse cx="230" cy="196" rx="188" ry="148" fill="none" stroke="rgba(251, 146, 60, 0.38)" strokeWidth="1.6" strokeDasharray="6 6" />
          <ellipse cx="230" cy="196" rx="116" ry="92" fill="none" stroke="rgba(56, 189, 248, 0.45)" strokeWidth="1.6" />
          <path d="M 114 196 A 152 120 0 0 1 418 196" fill="none" stroke="#fde047" strokeWidth="3" strokeDasharray="8 5" className="th-anim-flow" />

          <circle cx="230" cy="196" r="36" fill={`url(#${uid}-sun)`} className="th-anim-pulse" />
          <circle cx="230" cy="196" r="13" fill="#ffffff" />
          <text x="230" y="244" textAnchor="middle" fill="#fde68a" fontSize="11" fontFamily="Georgia, serif">
            Sol (Foco Heliocéntrico)
          </text>

          <g transform="translate(114, 196)">
            <circle r="15" fill={`url(#${uid}-earth)`} stroke="#7df9ff" />
            <text x="-8" y="32" textAnchor="middle" fill="#bae6fd" fontSize="11" fontWeight="bold">
              Tierra (1.00 UA)
            </text>
            <text x="-8" y="46" textAnchor="middle" fill="#7df9ff" fontSize="9.5">
              Δv_TMI ≈ 3.6 km/s
            </text>
          </g>

          <g transform="translate(418, 196)">
            <circle r="18" fill={`url(#${uid}-mars)`} stroke="#fdba74" />
            <ellipse cx="0" cy="-14" rx="7" ry="2.2" fill="#ffffff" opacity="0.85" />
            <text x="-18" y="36" textAnchor="middle" fill="#fed7aa" fontSize="11" fontWeight="bold">
              Marte (1.524 UA)
            </text>
          </g>

          <g transform="translate(268, 78) rotate(12)">
            <polygon points="-14,6 18,0 -14,-6" fill="#f8fafc" stroke="#38bdf8" />
            <ellipse cx="-18" cy="0" rx="8" ry="3.5" fill="#7df9ff" opacity="0.85" />
          </g>
          <text x="268" y="50" textAnchor="middle" fill="#fde68a" fontSize="11.5" fontFamily="Georgia, serif">
            Crucero Interplanetario · T_trans ≈ 259 días (a = 1.262 UA)
          </text>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-jezero-perseverance' || type === 'mars-perseverance-ingenuity' || type === 'mars-ii-skycrane-ingenuity') {
    const isSkyCrane = type === 'mars-ii-skycrane-ingenuity';
    return (
      <VisualFrame
        title={isSkyCrane ? 'Maniobra Sky Crane e Ingenuity en Jezero' : 'Rover Perseverance, SuperCam e Ingenuity'}
        subtitle="Búsqueda de biosignaturas en el antiguo delta lacustre del Cráter Jezero (2021)"
        accent="#fb923c"
      >
        <svg viewBox="0 0 460 390" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1c0d06" stopOpacity="0.15" />
              <stop offset="58%" stopColor="#7c2d12" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#c2410c" stopOpacity="0.82" />
            </linearGradient>
            <linearGradient id={`${uid}-terrain`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="48%" stopColor="#7c2d12" />
              <stop offset="100%" stopColor="#2a0a04" />
            </linearGradient>
            <linearGradient id={`${uid}-metal`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#475569" />
            </linearGradient>
          </defs>

          <rect x="15" y="20" width="430" height="340" rx="26" fill={`url(#${uid}-sky)`} />
          <path d="M 25 250 L 125 182 L 210 176 L 315 250 Z" fill="rgba(124, 45, 18, 0.55)" stroke="rgba(253, 186, 116, 0.35)" />
          <path d="M 15 250 Q 160 232 445 258 L 445 360 L 15 360 Z" fill={`url(#${uid}-terrain)`} />

          {/* Sky Crane superior opcional */}
          {isSkyCrane && (
            <g transform="translate(155, 74)">
              <polygon points="-52,-14 52,-14 66,14 -66,14" fill="#f8fafc" stroke="#94a3b8" />
              <polygon points="-60,14 -92,82 -72,82" fill="rgba(253, 224, 71, 0.72)" className="th-anim-pulse" />
              <polygon points="60,14 92,82 72,82" fill="rgba(253, 224, 71, 0.72)" className="th-anim-pulse" />
              <line x1="-26" y1="14" x2="-22" y2="132" stroke="#7df9ff" strokeWidth="1.6" />
              <line x1="0" y1="14" x2="0" y2="132" stroke="#fde68a" strokeWidth="1.8" strokeDasharray="4 3" />
              <line x1="26" y1="14" x2="22" y2="132" stroke="#7df9ff" strokeWidth="1.6" />
            </g>
          )}

          {/* Helicóptero Ingenuity */}
          <g transform="translate(352, 108) rotate(-6)">
            <ellipse cx="0" cy="-14" rx="38" ry="4" fill="rgba(125, 249, 255, 0.5)" className="th-anim-pulse" />
            <ellipse cx="0" cy="-8" rx="34" ry="3.5" fill="rgba(253, 230, 138, 0.55)" />
            <line x1="0" y1="-18" x2="0" y2="6" stroke="#e2e8f0" strokeWidth="2.2" />
            <rect x="-10" y="2" width="20" height="16" rx="3" fill="#facc15" stroke="#fef08a" />
            <line x1="-8" y1="18" x2="-22" y2="36" stroke="#cbd5e1" strokeWidth="1.6" />
            <line x1="8" y1="18" x2="22" y2="36" stroke="#cbd5e1" strokeWidth="1.6" />
            <text x="0" y="50" textAnchor="middle" fill="#fde68a" fontSize="9.5">
              Ingenuity (2,400 RPM)
            </text>
          </g>

          {/* Rover Perseverance */}
          <g transform="translate(155, 240)">
            <polygon points="-86,-12 -52,-22 -52,6 -82,12" fill="#e2e8f0" stroke="#64748b" />
            <rect x="-54" y="-26" width="108" height="36" rx="5" fill={`url(#${uid}-metal)`} stroke="#f8fafc" />
            <rect x="-36" y="-20" width="72" height="16" rx="2" fill="#ca8a04" opacity="0.82" />
            <line x1="34" y1="-26" x2="38" y2="-78" stroke={`url(#${uid}-metal)`} strokeWidth="6" />
            <rect x="22" y="-92" width="32" height="18" rx="4" fill={`url(#${uid}-metal)`} stroke="#0f172a" />
            <circle cx="44" cy="-83" r="5" fill="#0ea5e9" stroke="#ffffff" />
            <line x1="52" y1="-82" x2="188" y2="48" stroke="#ef4444" strokeWidth="2.4" strokeDasharray="6 3" className="th-anim-flow" />
            <circle cx="188" cy="48" r="9" fill="#fef08a" className="th-anim-pulse" />
            <polyline points="54,-10 98,-18 124,18 118,38" fill="none" stroke="#cbd5e1" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="110" y="34" width="16" height="14" rx="2" fill="#334155" stroke="#fde047" />
            <polyline points="-42,10 -62,36 -18,10 2,36" fill="none" stroke="#94a3b8" strokeWidth="3.5" />
            <polyline points="12,10 48,36" fill="none" stroke="#94a3b8" strokeWidth="3.5" />
            {[-62, -6, 48].map((wx, idx) => (
              <g key={idx} transform={`translate(${wx}, 38)`}>
                <circle r="16" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />
                <circle r="6" fill="#fb923c" />
              </g>
            ))}
          </g>

          <polygon points="322,292 355,272 392,286 384,308 318,308" fill="#451a03" stroke="#fb923c" />
          <text x="355" y="326" textAnchor="middle" fill="#fde68a" fontSize="10">
            Lutitas y Carbonatos (Noéico)
          </text>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-isru-sabatier') {
    return (
      <VisualFrame
        title="Arquitectura ISRU (Sabatier / MOXIE), Descenso Propulsivo y Hábitat"
        subtitle="Producción in situ de metano y oxígeno líquido a partir de la atmósfera marciana"
        accent="#fb923c"
      >
        <svg viewBox="0 0 460 380" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={`${uid}-hull`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#64748b" />
              <stop offset="35%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <radialGradient id={`${uid}-methalox`} cx="50%" cy="15%" r="70%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#7df9ff" />
              <stop offset="70%" stopColor="#a855f7" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path d="M 10 278 Q 230 242 450 278 L 450 365 L 10 365 Z" fill="#7c2d12" stroke="#fb923c" strokeWidth="1.5" />

          {/* Nave inoxidable aterrizando */}
          <g transform="translate(108, 152)">
            <ellipse cx="0" cy="108" rx="18" ry="44" fill={`url(#${uid}-methalox)`} className="th-anim-pulse" />
            <path d="M 0 -95 C -18 -68 -22 -32 -22 58 L 22 58 C 22 -32 18 -68 0 -95 Z" fill={`url(#${uid}-hull)`} stroke="#e2e8f0" />
            <path d="M -22 -35 L -22 58 L -4 58 L -4 -68 Z" fill="#0f172a" opacity="0.8" />
            <polygon points="-22,25 -42,68 -22,58" fill="#475569" stroke="#cbd5e1" />
            <polygon points="22,25 42,68 22,58" fill="#475569" stroke="#cbd5e1" />
          </g>

          {/* Reactor ISRU */}
          <g transform="translate(238, 228)">
            <rect x="-36" y="-22" width="72" height="54" rx="6" fill="#1e293b" stroke="#fde68a" strokeWidth="1.5" />
            <circle cx="-14" cy="-2" r="10" fill="#0284c7" stroke="#7df9ff" />
            <circle cx="14" cy="-2" r="10" fill="#ea580c" stroke="#fed7aa" />
            <text x="0" y="22" textAnchor="middle" fill="#fde68a" fontSize="8.5" fontWeight="bold">
              ISRU SABATIER
            </text>
            <path d="M -36 14 L -108 14" stroke="#7df9ff" strokeWidth="2.5" strokeDasharray="4 3" className="th-anim-flow" />
          </g>

          {/* Domo presurizado */}
          <g transform="translate(366, 258)">
            <path d="M -56 12 A 56 48 0 0 1 56 12 Z" fill="rgba(56, 189, 248, 0.22)" stroke="#7df9ff" strokeWidth="1.8" />
            <line x1="-46" y1="-10" x2="46" y2="-10" stroke="rgba(125,249,255,0.45)" />
            <line x1="0" y1="-36" x2="0" y2="12" stroke="rgba(125,249,255,0.45)" />
            <rect x="-62" y="10" width="124" height="10" rx="4" fill="#94a3b8" />
          </g>

          <text x="275" y="64" textAnchor="middle" fill="#fde68a" fontSize="12.5" fontFamily="Georgia, serif">
            CO₂ (95.3%) + 4 H₂ → CH₄ + 2 H₂O (Sabatier)
          </text>
          <text x="275" y="86" textAnchor="middle" fill="#7df9ff" fontSize="11" fontFamily="Georgia, serif">
            MOXIE: 2 CO₂ → 2 CO + O₂
          </text>
        </svg>
      </VisualFrame>
    );
  }

  // ============================================================================
  // MARTE I: OBSERVACIÓN Y ÓRBITA (3 SECCIONES)
  // ============================================================================
  if (type === 'mars-i-kepler-retrograde') {
    return (
      <VisualFrame
        title="Órbita Elíptica de Marte (e = 0.0934) y Bucle Retrógrado"
        subtitle="Primera y segunda ley de Johannes Kepler en Astronomia Nova (1609)"
        accent="#fde68a"
      >
        <svg viewBox="0 0 460 380" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={`${uid}-sun`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path
            d="M 45 85 C 145 80, 235 40, 205 102 C 180 148, 130 120, 175 72 C 225 28, 340 58, 420 42"
            fill="none"
            stroke="#fb923c"
            strokeWidth="2.4"
            strokeDasharray="6 4"
            className="th-anim-flow"
          />
          <circle cx="192" cy="92" r="6" fill="#fb923c" stroke="#fff" strokeWidth="1.5" />
          <text x="230" y="26" textAnchor="middle" fill="#fed7aa" fontSize="12" fontFamily="Georgia, serif" fontStyle="italic">
            Trayectoria aparente de retrogradación en la eclíptica
          </text>

          <ellipse cx="230" cy="242" rx="165" ry="100" fill="none" stroke="#fde68a" strokeWidth="1.8" />
          <path d="M 185 242 L 65 242 A 165 100 0 0 1 112 160 Z" fill="rgba(251, 146, 60, 0.22)" stroke="#fdba74" />
          <circle cx="185" cy="242" r="24" fill={`url(#${uid}-sun)`} className="th-anim-pulse" />
          <circle cx="185" cy="242" r="8" fill="#fffbeb" />
          <circle cx="275" cy="242" r="3.5" fill="#94a3b8" />
          <text x="185" y="276" textAnchor="middle" fill="#fde68a" fontSize="11">Sol (Foco F₁)</text>
          <text x="275" y="266" textAnchor="middle" fill="#94a3b8" fontSize="10">Foco vacío F₂</text>
          <circle cx="122" cy="242" r="10" fill="#0284c7" stroke="#bae6fd" />
          <circle cx="65" cy="242" r="13" fill="#ea580c" stroke="#fed7aa" />
          <line x1="185" y1="242" x2="65" y2="242" stroke="#7df9ff" strokeDasharray="3 3" />
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-i-huygens-parallax') {
    return (
      <VisualFrame
        title="Dibujo de Syrtis Major (Huygens, 1659) y Paralaje de Cassini (1672)"
        subtitle="Primera calibración trigonométrica de la distancia Tierra–Marte–Sol"
        accent="#fde68a"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={`${uid}-mars`} cx="35%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="45%" stopColor="#ea580c" />
              <stop offset="85%" stopColor="#7c2d12" />
              <stop offset="100%" stopColor="#2a0a04" />
            </radialGradient>
          </defs>
          <g transform="translate(88, 195)">
            <circle r="54" fill="#0369a1" stroke="#7df9ff" strokeWidth="1.5" />
            <path d="M-22,-32 C-5,-38 14,-20 8,5 C2,24 -18,30 -25,10 Z" fill="#4ade80" opacity="0.65" />
            <circle cx="-6" cy="-34" r="4" fill="#fde047" />
            <text x="-6" y="-44" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="bold">París</text>
            <circle cx="-14" cy="12" r="4" fill="#fde047" />
            <text x="-14" y="28" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="bold">Cayena</text>
          </g>
          <line x1="82" y1="161" x2="328" y2="195" stroke="#fde68a" strokeWidth="1.6" strokeDasharray="5 4" className="th-anim-flow" />
          <line x1="74" y1="207" x2="328" y2="195" stroke="#7df9ff" strokeWidth="1.6" strokeDasharray="5 4" className="th-anim-flow" />
          <text x="205" y="158" textAnchor="middle" fill="#fde68a" fontSize="11" fontFamily="Georgia, serif">
            π_Marte = 25″ → 1 UA ≈ 140 M km
          </text>
          <g transform="translate(338, 195)">
            <circle r="76" fill={`url(#${uid}-mars)`} stroke="#fdba74" strokeWidth="1.5" />
            <ellipse cx="0" cy="-66" rx="28" ry="7" fill="#ffffff" opacity="0.9" />
            <path d="M-8,-36 L26,22 L-24,28 Z" fill="#2a0a04" opacity="0.72" />
            <text x="0" y="100" textAnchor="middle" fill="#fed7aa" fontSize="11" fontFamily="Georgia, serif">
              Syrtis Major · 24h 39m 35s
            </text>
          </g>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-i-phobos-deimos') {
    return (
      <VisualFrame
        title="Descubrimiento de Fobos y Deimos (Asaph Hall, 1877)"
        subtitle="Lunas asteroidales capturadas y cartografía areográfica de Schiaparelli"
        accent="#fde68a"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={`${uid}-phobos`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="55%" stopColor="#64748b" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <radialGradient id={`${uid}-deimos`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="60%" stopColor="#94a3b8" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>
          </defs>
          <ellipse cx="230" cy="194" rx="195" ry="72" fill="none" stroke="#7df9ff" strokeOpacity="0.42" strokeDasharray="4 5" />
          <ellipse cx="230" cy="194" rx="132" ry="48" fill="none" stroke="#fde68a" strokeOpacity="0.58" strokeDasharray="6 4" />
          <g transform="translate(230, 194)">
            <circle r="66" fill="#c2410c" stroke="#fdba74" strokeWidth="1.5" />
            <path d="M-46,-18 Q0,12 46,-14 M-35,28 Q10,-5 42,24 M-15,-54 L12,50" stroke="#431407" strokeWidth="2.5" opacity="0.65" fill="none" />
            <ellipse cx="0" cy="56" rx="24" ry="6.5" fill="#f8fafc" opacity="0.88" />
          </g>
          <g transform="translate(102, 162)">
            <path d="M-32,-18 C-12,-32 24,-28 34,-8 C42,14 22,28 -8,26 C-30,24 -42,2 -32,-18 Z" fill={`url(#${uid}-phobos)`} stroke="#cbd5e1" />
            <ellipse cx="-12" cy="-2" rx="11" ry="9" fill="#1e293b" stroke="#94a3b8" />
            <text x="0" y="44" textAnchor="middle" fill="#fde68a" fontSize="10.5" fontWeight="bold">
              Fobos (Cráter Stickney)
            </text>
          </g>
          <g transform="translate(385, 138)">
            <path d="M-18,-12 C-4,-20 16,-16 20,-2 C24,10 10,18 -6,16 C-20,14 -24,-2 -18,-12 Z" fill={`url(#${uid}-deimos)`} stroke="#e2e8f0" />
            <text x="-10" y="34" textAnchor="middle" fill="#bae6fd" fontSize="10.5" fontWeight="bold">
              Deimos (12.6 km)
            </text>
          </g>
        </svg>
      </VisualFrame>
    );
  }

  // ============================================================================
  // MARTE II: SONDAS, ROVERS Y ESPECTROSCOPÍA
  // ============================================================================
  if (type === 'mars-ii-mariner-canyons') {
    return (
      <VisualFrame
        title="Sondas Mariner 4 (1965) y Mariner 9 (1971) en Órbita Marciana"
        subtitle="Cartografía orbital del volcán Olympus Mons y el cañón Valles Marineris"
        accent="#fb923c"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <path d="M 10 265 Q 230 205 450 265 L 450 355 L 10 355 Z" fill="#9a3412" stroke="#fdba74" strokeWidth="1.5" />
          <path d="M 65 246 L 145 188 L 195 188 L 265 238 Z" fill="#7c2d12" stroke="#fed7aa" />
          <ellipse cx="170" cy="188" rx="24" ry="4.5" fill="#431407" stroke="#fdba74" />
          <path d="M 155 285 C 225 272, 315 282, 395 268 L 380 302 C 305 308, 220 300, 145 305 Z" fill="#2a0a04" stroke="#f97316" />
          <text x="170" y="172" textAnchor="middle" fill="#fde68a" fontSize="11">Olympus Mons (21.9 km)</text>
          <text x="275" y="330" textAnchor="middle" fill="#fed7aa" fontSize="11">Valles Marineris (4,000 km)</text>

          <g transform="translate(275, 100) rotate(-14)">
            <rect x="-112" y="-12" width="80" height="24" fill="#1d4ed8" stroke="#93c5fd" />
            <rect x="32" y="-12" width="80" height="24" fill="#1d4ed8" stroke="#93c5fd" />
            <rect x="-12" y="-92" width="24" height="62" fill="#1e40af" stroke="#93c5fd" />
            <rect x="-12" y="30" width="24" height="62" fill="#1e40af" stroke="#93c5fd" />
            <polygon points="-22,-22 22,-22 32,0 22,22 -22,22 -32,0" fill="#eab308" stroke="#fef08a" />
            <ellipse cx="18" cy="-34" rx="22" ry="9" fill="#e2e8f0" stroke="#94a3b8" />
            <polygon points="-8,22 -75,132 45,132" fill="rgba(125, 249, 255, 0.14)" stroke="#7df9ff" strokeDasharray="4 3" className="th-anim-pulse" />
          </g>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-vikings' || type === 'mars-ii-viking-landers') {
    return (
      <VisualFrame
        title="Módulos Viking 1 y 2 en Chryse y Utopia Planitia (1976)"
        subtitle="Cromatografía de gases GC-MS y primeros experimentos biológicos in situ"
        accent="#fb923c"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <path d="M 10 258 Q 230 238 450 258 L 450 355 L 10 355 Z" fill="#9a3412" stroke="#fdba74" strokeWidth="1.5" />
          <ellipse cx="95" cy="306" rx="28" ry="12" fill="#431407" />
          <ellipse cx="370" cy="316" rx="34" ry="14" fill="#431407" />
          <g transform="translate(220, 208)">
            <line x1="-55" y1="20" x2="-105" y2="78" stroke="#cbd5e1" strokeWidth="5" />
            <line x1="55" y1="20" x2="105" y2="78" stroke="#cbd5e1" strokeWidth="5" />
            <line x1="0" y1="25" x2="0" y2="84" stroke="#cbd5e1" strokeWidth="5" />
            <ellipse cx="-105" cy="80" rx="18" ry="5" fill="#eab308" stroke="#fef08a" />
            <ellipse cx="105" cy="80" rx="18" ry="5" fill="#eab308" stroke="#fef08a" />
            <ellipse cx="0" cy="86" rx="18" ry="5" fill="#eab308" stroke="#fef08a" />
            <rect x="-65" y="-22" width="130" height="44" rx="6" fill="#e2e8f0" stroke="#94a3b8" />
            <rect x="-42" y="-42" width="32" height="20" rx="3" fill="#ca8a04" stroke="#fde047" />
            <rect x="12" y="-42" width="32" height="20" rx="3" fill="#ca8a04" stroke="#fde047" />
            <line x1="0" y1="-22" x2="0" y2="-78" stroke="#cbd5e1" strokeWidth="3.5" />
            <path d="M -38 -82 Q 0 -52 38 -82 Z" fill="#f8fafc" stroke="#7df9ff" strokeWidth="1.5" />
            <line x1="-65" y1="5" x2="-145" y2="62" stroke="#fde047" strokeWidth="4" />
            <polygon points="-145,62 -162,56 -156,72" fill="#eab308" stroke="#fff" />
          </g>
          <text x="230" y="64" textAnchor="middle" fill="#7df9ff" fontSize="11">
            Chryse Planitia · Telemetría Banda S · GC-MS
          </text>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-sojourner') {
    return (
      <VisualFrame
        title="Mars Pathfinder y Rover Sojourner (Ares Vallis, 1997)"
        subtitle="Pétalos tetraédricos de aterrizaje y espectrómetro APXS frente a la roca Yogi"
        accent="#fb923c"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <path d="M 10 264 Q 230 242 450 264 L 450 355 L 10 355 Z" fill="#9a3412" stroke="#fdba74" />
          {/* Lander Pathfinder con pétalos abiertos */}
          <g transform="translate(120, 232)">
            <polygon points="-75,28 -25,18 -40,42" fill="#eab308" stroke="#fef08a" />
            <polygon points="75,28 25,18 40,42" fill="#eab308" stroke="#fef08a" />
            <polygon points="-30,18 30,18 0,-26" fill="#e2e8f0" stroke="#94a3b8" />
            <rect x="-24" y="2" width="48" height="16" fill="#1d4ed8" stroke="#93c5fd" />
            <line x1="0" y1="-26" x2="0" y2="-66" stroke="#cbd5e1" strokeWidth="2.5" />
            <circle cx="0" cy="-70" r="8" fill="#0f172a" stroke="#7df9ff" />
          </g>
          {/* Rover Sojourner de 6 ruedas */}
          <g transform="translate(278, 248)">
            <rect x="-44" y="-20" width="88" height="10" rx="2" fill="#1e3a8a" stroke="#7df9ff" />
            <rect x="-36" y="-10" width="72" height="22" rx="3" fill="#e2e8f0" stroke="#64748b" />
            {[-32, 0, 32].map((wx, k) => (
              <circle key={k} cx={wx} cy="22" r="10" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
            ))}
            <line x1="36" y1="2" x2="72" y2="12" stroke="#fde047" strokeWidth="3" />
            <circle cx="76" cy="14" r="5" fill="#7df9ff" className="th-anim-pulse" />
          </g>
          {/* Roca Yogi */}
          <polygon points="365,274 395,244 428,256 420,286 358,286" fill="#451a03" stroke="#fb923c" />
          <text x="394" y="305" textAnchor="middle" fill="#fde68a" fontSize="10">Roca Yogi (APXS)</text>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-water-spectroscopy') {
    return (
      <VisualFrame
        title="Espectroscopía Orbital de Filosilicatos y Hielo Subsuperficial"
        subtitle="Bandas de absorción H₂O/OH (1.9 y 2.3 μm) y radar penetrante MARSIS/SHARAD"
        accent="#7df9ff"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          {/* Estratos geológicos + acuífero */}
          <rect x="20" y="230" width="420" height="45" fill="#9a3412" stroke="#fb923c" />
          <rect x="20" y="275" width="420" height="45" fill="#0369a1" opacity="0.8" stroke="#7df9ff" />
          <text x="230" y="302" textAnchor="middle" fill="#e0f2fe" fontSize="10.5" fontWeight="bold">
            RADAR SHARAD / MARSIS · HIELO SUBSUPERFICIAL (ε_r ≈ 3.1)
          </text>

          {/* Orbitador MRO arriba */}
          <g transform="translate(230, 68)">
            <rect x="-85" y="-10" width="55" height="20" fill="#1d4ed8" stroke="#93c5fd" />
            <rect x="30" y="-10" width="55" height="20" fill="#1d4ed8" stroke="#93c5fd" />
            <rect x="-22" y="-16" width="44" height="32" rx="4" fill="#eab308" stroke="#fef08a" />
            <ellipse cx="0" cy="-26" rx="20" ry="7" fill="#f8fafc" stroke="#7df9ff" />
            <polygon points="-14,16 -96,162 96,162 14,16" fill="rgba(125, 249, 255, 0.12)" stroke="#7df9ff" strokeDasharray="4 4" className="th-anim-pulse" />
          </g>

          {/* Curva espectral CRISM superpuesta */}
          <polyline
            points="75,180 135,172 180,206 215,174 265,212 315,176 385,172"
            fill="none"
            stroke="#fde047"
            strokeWidth="2.4"
          />
          <text x="180" y="220" textAnchor="middle" fill="#fde68a" fontSize="9.5">1.9 μm H₂O</text>
          <text x="265" y="224" textAnchor="middle" fill="#fde68a" fontSize="9.5">2.3 μm Fe/Mg-OH</text>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-spirit-opportunity') {
    return (
      <VisualFrame
        title="Rovers Gemelos MER: Spirit y Opportunity (2004–2018)"
        subtitle="Confirmación mineralógica de hematita y evaporitas formadas en agua líquida"
        accent="#fb923c"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <path d="M 10 270 Q 230 245 450 270 L 450 355 L 10 355 Z" fill="#7c2d12" stroke="#fdba74" />
          {/* Rover MER con alas solares amplias */}
          <g transform="translate(215, 212)">
            <polygon points="-92,-16 92,-16 74,4 -74,4" fill="#1e3a8a" stroke="#93c5fd" strokeWidth="1.5" />
            <rect x="-42" y="4" width="84" height="26" rx="4" fill="#e2e8f0" stroke="#64748b" />
            <line x1="-22" y1="-16" x2="-22" y2="-68" stroke="#cbd5e1" strokeWidth="4" />
            <rect x="-38" y="-82" width="32" height="16" rx="3" fill="#f8fafc" stroke="#0f172a" />
            <circle cx="-28" cy="-74" r="3.5" fill="#38bdf8" />
            <circle cx="-16" cy="-74" r="3.5" fill="#38bdf8" />
            {[-40, 0, 40].map((wx, idx) => (
              <circle key={idx} cx={wx} cy="44" r="14" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />
            ))}
          </g>
          {/* Esférulas de hematita ("blueberries") */}
          {[
            [355, 290],
            [374, 298],
            [392, 286],
            [365, 308],
          ].map(([bx, by], i) => (
            <circle key={i} cx={bx} cy={by} r="5.5" fill="#60a5fa" stroke="#e0f2fe" strokeWidth="1" />
          ))}
          <text x="372" y="328" textAnchor="middle" fill="#bae6fd" fontSize="10">
            Esférulas de Hematita (Fe₂O₃)
          </text>
          <text x="230" y="72" textAnchor="middle" fill="#fde68a" fontSize="11.5" fontFamily="Georgia, serif">
            Opportunity · 45.16 km recorridos en Meridiani Planum
          </text>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-curiosity-gale') {
    return (
      <VisualFrame
        title="Rover Curiosity en el Cráter Gale y Monte Sharp (2012–Presente)"
        subtitle="Laboratorio analítico SAM, láser ChemCam y estratigrafía lacustre de Aeolis Mons"
        accent="#fb923c"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          {/* Monte Sharp estratificado */}
          <path d="M 15 268 L 115 128 L 210 118 L 325 268 Z" fill="#7c2d12" stroke="#fb923c" />
          <line x1="85" y1="172" x2="245" y2="172" stroke="#fdba74" strokeOpacity="0.45" strokeDasharray="4 4" />
          <line x1="60" y1="208" x2="278" y2="208" stroke="#fde68a" strokeOpacity="0.45" strokeDasharray="4 4" />
          <path d="M 10 268 Q 230 250 450 268 L 450 355 L 10 355 Z" fill="#451a03" stroke="#fb923c" />

          {/* Curiosity */}
          <g transform="translate(245, 240)">
            <rect x="-52" y="-22" width="104" height="32" rx="4" fill="#e2e8f0" stroke="#64748b" />
            <polygon points="-78,-8 -52,-18 -52,6 -76,10" fill="#cbd5e1" stroke="#475569" />
            <line x1="32" y1="-22" x2="36" y2="-70" stroke="#cbd5e1" strokeWidth="5" />
            <rect x="20" y="-84" width="28" height="16" rx="3" fill="#f8fafc" stroke="#0f172a" />
            <line x1="48" y1="-76" x2="145" y2="28" stroke="#7df9ff" strokeWidth="2" strokeDasharray="5 3" className="th-anim-flow" />
            <circle cx="145" cy="28" r="7" fill="#7df9ff" className="th-anim-pulse" />
            {[-46, 0, 46].map((wx, idx) => (
              <circle key={idx} cx={wx} cy="28" r="14" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2.5" />
            ))}
          </g>
          <text x="160" y="104" textAnchor="middle" fill="#fed7aa" fontSize="10.5">
            Aeolis Mons (Monte Sharp · 5.5 km)
          </text>
        </svg>
      </VisualFrame>
    );
  }

  // ============================================================================
  // MARTE III: EDL, ISRU, RADIACIÓN, POLVO ELECTROSTÁTICO & TANGO HORIZON 2026
  // ============================================================================
  if (type === 'mars-iii-edl-hypersonic') {
    return (
      <VisualFrame
        title="Entrada, Descenso y Aterrizaje (EDL) de Gran Tonelaje"
        subtitle="Disipación térmica por escudo ablativo a 1,600 °C y retropropulsión supersónica"
        accent="#7df9ff"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id={`${uid}-plasma`} cx="50%" cy="60%" r="55%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="32%" stopColor="#fde047" />
              <stop offset="68%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>
          </defs>
          <path d="M 15 302 Q 230 228 445 302" fill="none" stroke="#fb923c" strokeWidth="2" strokeDasharray="6 4" />
          <path d="M 35 242 Q 230 168 425 242" fill="none" stroke="#7df9ff" strokeOpacity="0.45" strokeDasharray="4 6" />
          <g transform="translate(230, 170) rotate(28)">
            <path d="M -95 25 Q 0 95 95 25 Q 45 65 0 65 Q -45 65 -95 25 Z" fill={`url(#${uid}-plasma)`} className="th-anim-pulse" />
            <path d="M 0 -92 C -26 -55 -28 0 -28 38 L 28 38 C 28 0 26 -55 0 -92 Z" fill="#cbd5e1" stroke="#f8fafc" />
            <path d="M -28 -20 L -28 38 L 0 38 L 0 -55 Z" fill="#0f172a" />
            <polygon points="-28,10 -52,32 -28,36" fill="#334155" stroke="#94a3b8" />
            <polygon points="28,10 52,32 28,36" fill="#334155" stroke="#94a3b8" />
          </g>
          <text x="230" y="340" textAnchor="middle" fill="#fde68a" fontSize="11.5" fontFamily="Georgia, serif">
            Aerofrenado Hipersónico (99% ΔE_k) · Plasma CO₂ a 1,600 °C
          </text>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-iii-isru-sabatier') {
    return (
      <VisualFrame
        title="Planta Química ISRU: Proceso de Sabatier y Unidad MOXIE"
        subtitle="Producción in situ de metano líquido (CH₄) y oxígeno (O₂) para el retorno"
        accent="#7df9ff"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="276" width="420" height="32" rx="4" fill="#9a3412" />
          <rect x="20" y="308" width="420" height="28" rx="4" fill="#0284c7" opacity="0.78" />
          <text x="230" y="326" textAnchor="middle" fill="#e0f2fe" fontSize="10" fontWeight="bold">
            ACUÍFERO SUBSUPERFICIAL / HIELO GLACIAR (H₂O)
          </text>
          <line x1="95" y1="196" x2="95" y2="318" stroke="#7df9ff" strokeWidth="5" strokeDasharray="4 2" className="th-anim-flow" />
          <rect x="55" y="136" width="80" height="65" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
          <text x="95" y="166" textAnchor="middle" fill="#7df9ff" fontSize="10" fontWeight="bold">ELECTRÓLISIS</text>
          <text x="95" y="182" textAnchor="middle" fill="#bae6fd" fontSize="9">2H₂O → 2H₂ + O₂</text>

          <rect x="175" y="106" width="110" height="105" rx="12" fill="#334155" stroke="#fde68a" strokeWidth="2" />
          <text x="230" y="138" textAnchor="middle" fill="#fde68a" fontSize="11" fontWeight="bold">REACTOR SABATIER</text>
          <text x="230" y="158" textAnchor="middle" fill="#f8fafc" fontSize="9.5">CO₂ + 4H₂ →</text>
          <text x="230" y="175" textAnchor="middle" fill="#fb923c" fontSize="10" fontWeight="bold">CH₄ + 2H₂O (400 °C)</text>
          <text x="230" y="194" textAnchor="middle" fill="#94a3b8" fontSize="8.5">Catalizador Ru / Ni</text>

          <circle cx="365" cy="134" r="32" fill="#e2e8f0" stroke="#fb923c" strokeWidth="2" />
          <text x="365" y="138" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">CH₄ (l)</text>
          <circle cx="365" cy="212" r="32" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
          <text x="365" y="216" textAnchor="middle" fill="#0f172a" fontSize="11" fontWeight="bold">LOX (O₂)</text>

          <line x1="135" y1="166" x2="175" y2="166" stroke="#7df9ff" strokeWidth="3" />
          <line x1="285" y1="142" x2="333" y2="134" stroke="#fb923c" strokeWidth="3" />
          <line x1="285" y1="186" x2="333" y2="212" stroke="#38bdf8" strokeWidth="3" />
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-radiation-hazard') {
    return (
      <VisualFrame
        title="Riesgo Radiológico: Rayos Cósmicos Galácticos (GCR) y SPE"
        subtitle="Ausencia de magnetosfera global (~250 mSv/año) frente al blindaje de regolito"
        accent="#f43f5e"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <path d="M 10 250 Q 230 226 450 250 L 450 355 L 10 355 Z" fill="#7c2d12" stroke="#fb923c" />
          {/* Rayos cósmicos */}
          {[75, 145, 230, 315, 385].map((rx, i) => (
            <line
              key={i}
              x1={rx - 30}
              y1="28"
              x2={rx}
              y2={i === 2 ? 168 : 238}
              stroke="#fb7185"
              strokeWidth="2"
              strokeDasharray="5 4"
              className="th-anim-flow"
            />
          ))}
          <text x="230" y="24" textAnchor="middle" fill="#fda4af" fontSize="11" fontWeight="bold">
            Partículas Solares (SPE) y Rayos Cósmicos Galácticos (GCR)
          </text>
          {/* Arco de regolito protector */}
          <path d="M 135 245 A 95 76 0 0 1 325 245" fill="none" stroke="#a8a29e" strokeWidth="14" />
          <path d="M 150 245 A 80 62 0 0 1 310 245 Z" fill="rgba(56, 189, 248, 0.2)" stroke="#7df9ff" strokeWidth="2" />
          <text x="230" y="226" textAnchor="middle" fill="#e0f2fe" fontSize="10.5" fontWeight="bold">
            Blindaje &gt; 2.5 m Regolito
          </text>
          <text x="230" y="302" textAnchor="middle" fill="#fde68a" fontSize="11">
            Atenuación dosimétrica bajo tubo de lava basáltico
          </text>
        </svg>
      </VisualFrame>
    );
  }

  if (type === 'mars-dust-electrostatic') {
    return (
      <VisualFrame
        title="Tormentas de Polvo Electrostático y Tribocarga Marciana"
        subtitle="Partículas de óxido de hierro (Fe₂O₃) de ~2 μm cargadas por fricción eólica"
        accent="#fb923c"
      >
        <svg viewBox="0 0 460 370" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
          <path d="M 10 282 Q 230 264 450 282 L 450 355 L 10 355 Z" fill="#9a3412" stroke="#fdba74" />
          {/* Remolino convectivo (Dust Devil) */}
          <g transform="translate(150, 172)">
            <ellipse cx="0" cy="-90" rx="54" ry="12" fill="rgba(251, 146, 60, 0.25)" stroke="#fdba74" />
            <ellipse cx="0" cy="-52" rx="40" ry="10" fill="rgba(251, 146, 60, 0.32)" stroke="#fb923c" />
            <ellipse cx="0" cy="-14" rx="26" ry="8" fill="rgba(234, 88, 12, 0.42)" stroke="#f97316" />
            <ellipse cx="0" cy="24" rx="16" ry="6" fill="rgba(194, 65, 12, 0.52)" stroke="#fb923c" />
            <path d="M -12 85 Q 0 10 -44 -90 M 12 85 Q 0 10 44 -90" fill="none" stroke="#fed7aa" strokeDasharray="4 4" className="th-anim-flow" />
          </g>
          {/* Cargas triboeléctricas */}
          {[
            [270, 130, '+'],
            [315, 165, '−'],
            [285, 200, '+'],
            [355, 145, '−'],
          ].map(([cx, cy, sign], i) => (
            <g key={i} transform={`translate(${cx}, ${cy})`} className="th-anim-pulse">
              <circle r="11" fill="rgba(125, 249, 255, 0.16)" stroke="#7df9ff" />
              <text x="0" y="4" textAnchor="middle" fill="#fde68a" fontSize="12" fontWeight="bold">
                {String(sign)}
              </text>
            </g>
          ))}
          {/* Panel solar con mitigación electrostática EDS */}
          <g transform="translate(330, 254)">
            <rect x="-52" y="-12" width="104" height="22" rx="3" fill="#1e3a8a" stroke="#7df9ff" />
            <text x="0" y="3" textAnchor="middle" fill="#e0f2fe" fontSize="9.5" fontWeight="bold">
              Escudo Electrodinámico (EDS)
            </text>
          </g>
        </svg>
      </VisualFrame>
    );
  }

  // mars-terraforming-horizon / mars-iii-lava-habitat / default
  return (
    <VisualFrame
      title="Tubos de Lava, Robótica Autónoma y Operaciones Humano–IA"
      subtitle="Refugio subsuperficial, invernadero ECLSS y teleoperación EVA (Tango Horizon · 2026)"
      accent="#7df9ff"
    >
      <svg viewBox="0 0 460 380" className="th-visual-svg th-anim-float" xmlns="http://www.w3.org/2000/svg">
        <path d="M 10 226 Q 230 202 450 226 L 450 360 L 10 360 Z" fill="#7c2d12" stroke="#fb923c" strokeWidth="1.5" />

        {/* Radiación bloqueada arriba */}
        <line x1="72" y1="32" x2="132" y2="132" stroke="#f43f5e" strokeWidth="1.8" strokeDasharray="4 4" className="th-anim-flow" />
        <line x1="152" y1="24" x2="185" y2="124" stroke="#f43f5e" strokeWidth="1.8" strokeDasharray="4 4" className="th-anim-flow" />
        <text x="132" y="20" textAnchor="middle" fill="#fda4af" fontSize="10">
          Radiación GCR / SPE (~250 mSv/año)
        </text>

        {/* Domo geodésico con arco de regolito sinterizado e invernadero */}
        <path d="M 78 218 A 88 70 0 0 1 254 218" fill="none" stroke="#a8a29e" strokeWidth="11" opacity="0.88" />
        <path d="M 90 218 A 76 58 0 0 1 242 218 Z" fill="rgba(56, 189, 248, 0.2)" stroke="#7df9ff" strokeWidth="1.8" />
        <ellipse cx="166" cy="210" rx="46" ry="12" fill="#15803d" />
        <circle cx="144" cy="198" r="8" fill="#4ade80" />
        <circle cx="166" cy="194" r="10" fill="#22c55e" />
        <circle cx="188" cy="198" r="8" fill="#4ade80" />

        {/* Rover autónomo EVA en superficie con enlace de IA */}
        <g transform="translate(362, 198)">
          <rect x="-24" y="-12" width="48" height="18" rx="3" fill="#e2e8f0" stroke="#7df9ff" />
          <circle cx="-16" cy="12" r="7" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="0" cy="12" r="7" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
          <circle cx="16" cy="12" r="7" fill="#1e293b" stroke="#cbd5e1" strokeWidth="2" />
          <line x1="8" y1="-12" x2="8" y2="-28" stroke="#7df9ff" strokeWidth="2" />
          <circle cx="8" cy="-31" r="4" fill="#7df9ff" className="th-anim-pulse" />
        </g>
        <path d="M 245 162 Q 305 135 366 164" fill="none" stroke="#7df9ff" strokeDasharray="4 4" className="th-anim-flow" />

        {/* Hábitat subterráneo en tubo de lava marciano */}
        <ellipse cx="318" cy="300" rx="102" ry="38" fill="#0f172a" stroke="#fde68a" strokeWidth="2" />
        <rect x="256" y="284" width="124" height="32" rx="8" fill="#1e293b" stroke="#7df9ff" strokeWidth="1.2" />
        <text x="318" y="304" textAnchor="middle" fill="#fde68a" fontSize="9.8" fontWeight="bold">
          TUBO DE LAVA · TANGO HORIZON
        </text>
        <rect x="234" y="208" width="14" height="90" fill="#cbd5e1" stroke="#0f172a" />
      </svg>
    </VisualFrame>
  );
}
