'use client';

import { useId } from 'react';
import type { ReactNode } from 'react';

const STARS: ReadonlyArray<readonly [number, number]> = [
  [40, 50],
  [110, 30],
  [330, 40],
  [380, 110],
  [30, 190],
  [390, 250],
  [60, 330],
  [350, 360],
  [200, 20],
  [250, 395],
];

const EARTH_TEXTURE = '/images/earth-texture.jpg';
const EARTH_RATIO = 1024 / 575;

interface FrameProps {
  id: string;
  label: string;
  viewBox?: string;
  children: ReactNode;
}

function Frame({ id, label, viewBox = '0 0 420 420', children }: FrameProps) {
  return (
    <svg
      viewBox={viewBox}
      className="cv-celestial-svg"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor="#fffbe6" />
          <stop offset="0.45" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-planet`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#bae6fd" />
          <stop offset="0.55" stopColor="#1d78b8" />
          <stop offset="1" stopColor="#0b2a55" />
        </radialGradient>
        <radialGradient id={`${id}-moon`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="0.6" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#334155" />
        </radialGradient>
        <radialGradient id={`${id}-mars`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fdba74" />
          <stop offset="0.6" stopColor="#c2410c" />
          <stop offset="1" stopColor="#4a1a08" />
        </radialGradient>
        <radialGradient id={`${id}-gas`} cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#fde7c8" />
          <stop offset="0.6" stopColor="#c08a5a" />
          <stop offset="1" stopColor="#5b3a22" />
        </radialGradient>
        <linearGradient id={`${id}-metal`} x1="0" x2="1">
          <stop offset="0" stopColor="#f8fafc" />
          <stop offset="0.5" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id={`${id}-brass`} x1="0" x2="1">
          <stop offset="0" stopColor="#fef3c7" />
          <stop offset="0.5" stopColor="#d97706" />
          <stop offset="1" stopColor="#fef3c7" />
        </linearGradient>
        <linearGradient id={`${id}-flame`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#7df9ff" />
          <stop offset="1" stopColor="#0ea5e9" stopOpacity="0" />
        </linearGradient>
      </defs>
      {STARS.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 2 : 1.3}
          fill="#e0f2fe"
          opacity="0.75"
        >
          <animate
            attributeName="opacity"
            values="0.35;0.95;0.35"
            dur={`${3 + (i % 4)}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
      {children}
    </svg>
  );
}

interface LabelTextProps {
  x: number;
  y: number;
  children: ReactNode;
  size?: number;
  fill?: string;
  anchor?: 'start' | 'middle' | 'end';
}

function LabelText({
  x,
  y,
  children,
  size = 13,
  fill = '#e0f2fe',
  anchor = 'middle',
}: LabelTextProps) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill={fill}
      fontSize={size}
      fontFamily="Georgia, serif"
      fontStyle="italic"
    >
      {children}
    </text>
  );
}

interface OrbitProps {
  cx?: number;
  cy?: number;
  rx: number;
  ry: number;
  stroke?: string;
  op?: number;
  dash?: string;
}

function Orbit({
  cx = 210,
  cy = 210,
  rx,
  ry,
  stroke = '#7dd3fc',
  op = 0.4,
  dash,
}: OrbitProps) {
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill="none"
      stroke={stroke}
      strokeOpacity={op}
      strokeDasharray={dash}
    />
  );
}

type BodyKind = 'sun' | 'planet' | 'moon' | 'mars' | 'gas';

function Body({
  id,
  kind,
  cx,
  cy,
  r,
}: {
  id: string;
  kind: BodyKind;
  cx: number;
  cy: number;
  r: number;
}) {
  return <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-${kind})`} />;
}

function EarthSphere({
  id,
  cx,
  cy,
  r,
  spin = 0,
}: {
  id: string;
  cx: number;
  cy: number;
  r: number;
  spin?: number;
}) {
  const h = r * 2;
  const w = h * EARTH_RATIO * 1.1;
  const start = -(w * 0.18) - spin;
  const uid = `${id}-${Math.round(cx)}-${Math.round(cy)}`;

  return (
    <g>
      <circle cx={cx} cy={cy} r={r + 5} fill="#38bdf8" opacity="0.18" />
      <defs>
        <clipPath id={`ec-${uid}`}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>
        <radialGradient id={`es-${uid}`} cx="34%" cy="30%" r="80%">
          <stop offset="0.45" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.72" />
        </radialGradient>
        <radialGradient id={`eh-${uid}`} cx="30%" cy="26%" r="40%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g clipPath={`url(#ec-${uid})`}>
        <g>
          <image
            href={EARTH_TEXTURE}
            x={cx - r + start}
            y={cy - r}
            width={w}
            height={h}
            preserveAspectRatio="none"
          />
          <image
            href={EARTH_TEXTURE}
            x={cx - r + start + w}
            y={cy - r}
            width={w}
            height={h}
            preserveAspectRatio="none"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            from="0 0"
            to={`${-w} 0`}
            dur="60s"
            repeatCount="indefinite"
          />
        </g>
        <circle cx={cx} cy={cy} r={r} fill={`url(#es-${uid})`} />
        <circle cx={cx} cy={cy} r={r} fill={`url(#eh-${uid})`} />
      </g>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#7dd3fc"
        strokeOpacity="0.5"
        strokeWidth="1"
      />
    </g>
  );
}

/* ---------- Individual Animated SVG Visuals ---------- */

function CelestialMapSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Mapa celeste de Orión" viewBox="0 0 460 480">
      <defs>
        <radialGradient id={`${id}-betel`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="25%" stopColor="#ffedd5" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#fb923c" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#ea580c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-rigel`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="30%" stopColor="#e0f2fe" stopOpacity="0.95" />
          <stop offset="60%" stopColor="#38bdf8" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
        </radialGradient>
      </defs>
      <text
        x="230"
        y="38"
        textAnchor="middle"
        fill="#f8fafc"
        fontFamily="Georgia, serif"
        fontSize="24"
        fontStyle="italic"
      >
        Orión · El Cazador Celeste
      </text>
      <g
        fill="rgba(56, 189, 248, 0.05)"
        stroke="rgba(186, 230, 253, 0.36)"
        strokeWidth="1.25"
      >
        <path d="M218,122 C228,116 242,120 244,134 C245,144 238,154 228,156 C216,156 212,142 218,122 Z" />
        <path d="M180,172 C202,162 252,160 272,174 L256,262 L198,266 Z" />
        <path d="M180,172 L148,128 L158,72 L174,74 L168,128 L196,164" />
        <path d="M272,174 L322,168 L342,156 L338,176 L270,192" />
        <path d="M336,116 C362,138 366,190 344,232 C334,214 334,148 336,116 Z" />
        <path d="M198,266 L176,336 L192,408 L210,406 L204,336 L228,294 L268,334 L288,392 L304,388 L286,322 L256,262 Z" />
      </g>
      <g
        stroke="#7df9ff"
        strokeOpacity="0.65"
        strokeWidth="1.2"
        strokeDasharray="3 3"
        fill="none"
      >
        <line x1="230" y1="126" x2="180" y2="172" />
        <line x1="230" y1="126" x2="272" y2="174" />
        <line x1="180" y1="172" x2="206" y2="272" />
        <line x1="272" y1="174" x2="250" y2="260" />
        <line
          x1="206"
          y1="272"
          x2="250"
          y2="260"
          strokeDasharray="none"
          strokeWidth="1.8"
          stroke="#e0f2fe"
        />
        <line x1="206" y1="272" x2="192" y2="406" />
        <line x1="250" y1="260" x2="296" y2="390" />
      </g>
      <g transform="translate(180, 172)">
        <circle r="22" fill={`url(#${id}-betel)`}>
          <animate attributeName="r" values="20;25;20" dur="4s" repeatCount="indefinite" />
        </circle>
        <circle r="5" fill="#ffffff" />
        <text x="-48" y="-12" fill="#fed7aa" fontSize="11" fontFamily="Georgia, serif">
          α Betelgeuse
        </text>
      </g>
      {[
        [206, 272],
        [228, 266],
        [250, 260],
      ].map(([bx, by], i) => (
        <g key={i} transform={`translate(${bx}, ${by})`}>
          <circle r="13" fill={`url(#${id}-rigel)`} />
          <circle r="3.5" fill="#ffffff" />
        </g>
      ))}
      <g transform="translate(296, 390)">
        <circle r="24" fill={`url(#${id}-rigel)`}>
          <animate attributeName="r" values="22;27;22" dur="4.6s" repeatCount="indefinite" />
        </circle>
        <circle r="5.5" fill="#ffffff" />
        <text x="16" y="18" fill="#e0f2fe" fontSize="12" fontFamily="Georgia, serif">
          β Rigel
        </text>
      </g>
      <LabelText x={230} y={456} size={13} fill="#fde68a">
        Constelación de Orión (SIPA.ZI.ANNA) · Catálogo MUL.APIN
      </LabelText>
    </Frame>
  );
}

function GeocentricSphereSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Astrolabio y esfera geocéntrica">
      <g transform="translate(210 212)" fill="none" strokeLinecap="round">
        <circle r="144" stroke={`url(#${id}-brass)`} strokeWidth="12" />
        <circle r="114" stroke="#fde68a" strokeOpacity="0.75" strokeWidth="1.5" />
        <g>
          <circle r="86" stroke="#bae6fd" strokeOpacity="0.65" strokeDasharray="4 5" />
          <circle cx="86" cy="0" r="5" fill="#fbbf24" />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="28s"
            repeatCount="indefinite"
          />
        </g>
        <g>
          <circle r="56" stroke="#7df9ff" strokeOpacity="0.75" strokeWidth="1.5" />
          <circle cx="0" cy="-56" r="4" fill="#e2e8f0" />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360"
            to="0"
            dur="18s"
            repeatCount="indefinite"
          />
        </g>
        <path d="M-114 0H114M0-114V114" stroke="#bae6fd" strokeOpacity="0.45" />
        <path d="M-120 58C-40-28 40-28 120 58" stroke="#7df9ff" strokeWidth="1.5" />
        <path d="M-6 0L98-82" stroke={`url(#${id}-brass)`} strokeWidth="6" />
        <circle r="16" fill={`url(#${id}-planet)`} stroke="#7df9ff" strokeWidth="1.5" />
        <circle cy="-162" r="13" stroke={`url(#${id}-brass)`} strokeWidth="5" />
        {Array.from({ length: 36 }, (_, i) => (
          <line
            key={i}
            x1="0"
            y1="-138"
            x2="0"
            y2={i % 3 === 0 ? -128 : -133}
            stroke="#fff"
            strokeOpacity="0.6"
            transform={`rotate(${i * 10})`}
          />
        ))}
      </g>
      <LabelText x={210} y={404} size={13.5} fill="#fde68a">
        Esfera armilar y astrolabio · Cosmos geocéntrico
      </LabelText>
    </Frame>
  );
}

function SiriusCalendarSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Pirámides, Sirio y calendario antiguo">
      <circle cx="300" cy="90" r="40" fill={`url(#${id}-sun)`} opacity="0.55">
        <animate attributeName="r" values="36;45;36" dur="4s" repeatCount="indefinite" />
      </circle>
      <path d="M300 62V118M272 90H328M280 70l40 40M320 70l-40 40" stroke="#fff" strokeWidth="1.4" />
      <LabelText x={300} y={148} size={14}>
        Sirio · Sopdet
      </LabelText>
      <path d="M40 330L170 150L300 330Z" fill="#d6a85f" stroke="#fde68a" strokeWidth="2" />
      <path d="M170 150L300 330H220Z" fill="#a9772d" opacity="0.8" />
      <path
        d="M150 330L240 210L330 330Z"
        fill="#c8964a"
        stroke="#fde68a"
        strokeWidth="1.5"
        opacity="0.9"
      />
      <path
        d="M20 335C100 320 300 345 400 330"
        stroke="#38bdf8"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      <LabelText x={210} y={385} size={13.5} fill="#fde68a">
        Orto helíaco de Sirio (365.25 d) · Ciclo de Venus (584 d)
      </LabelText>
    </Frame>
  );
}

function CopernicusSvg({ id }: { id: string }) {
  const planets: ReadonlyArray<readonly [number, BodyKind, number, number, string]> = [
    [62, 'moon', 5, 30, '12s'],
    [95, 'mars', 7, 140, '19s'],
    [135, 'planet', 9, 250, '26s'],
    [175, 'gas', 13, 330, '38s'],
  ];
  return (
    <Frame id={id} label="Modelo heliocéntrico de Copérnico">
      <circle cx="210" cy="215" r="36" fill={`url(#${id}-sun)`}>
        <animate attributeName="r" values="33;39;33" dur="4.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="210" cy="215" r="11" fill="#fffbe6" />
      {planets.map(([r, kind, size, angle, dur], i) => {
        const x = 210 + r * Math.cos((angle * Math.PI) / 180);
        const y = 215 + r * 0.9 * Math.sin((angle * Math.PI) / 180);
        return (
          <g key={i}>
            <Orbit cx={210} cy={215} rx={r} ry={r * 0.9} />
            <g>
              <Body id={id} kind={kind} cx={x} cy={y} r={size} />
              <animateTransform
                attributeName="transform"
                type="rotate"
                from={`0 210 215`}
                to={`360 210 215`}
                dur={dur}
                repeatCount="indefinite"
              />
            </g>
          </g>
        );
      })}
      <LabelText x={210} y={40} size={17}>
        Sol · Centro Heliocéntrico
      </LabelText>
      <LabelText x={210} y={400} size={13.5} fill="#fde68a">
        Nicolás Copérnico · De revolutionibus (1543)
      </LabelText>
    </Frame>
  );
}

function GalileoJupiterSvg({ id }: { id: string }) {
  const moons: ReadonlyArray<readonly [number, number, string]> = [
    [70, 205, 'Ío'],
    [125, 190, 'Europa'],
    [305, 212, 'Ganímedes'],
    [360, 196, 'Calisto'],
  ];
  return (
    <Frame id={id} label="Júpiter y satélites galileanos">
      <line
        x1="50"
        y1="205"
        x2="375"
        y2="196"
        stroke="#7df9ff"
        strokeOpacity="0.3"
        strokeDasharray="4 4"
      />
      <Body id={id} kind="gas" cx={210} cy={200} r={62} />
      <g stroke="#7a4d2c" strokeOpacity="0.55" strokeWidth="5" fill="none">
        <path d="M156 178C190 170 230 170 264 178" />
        <path d="M150 205C190 198 235 200 270 208" />
        <path d="M158 232C195 238 230 238 262 230" />
      </g>
      <ellipse cx="226" cy="222" rx="14" ry="8" fill="#b45309" opacity="0.7" />
      {moons.map(([x, y, name], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={7 - (i % 2)} fill="#f1f5f9">
            <animate
              attributeName="opacity"
              values="0.75;1;0.75"
              dur={`${2.5 + i * 0.6}s`}
              repeatCount="indefinite"
            />
          </circle>
          <LabelText x={x} y={y + 24} size={11}>
            {name}
          </LabelText>
        </g>
      ))}
      <path d="M40 330L120 292L130 308L50 346Z" fill="#d97706" stroke="#fde68a" />
      <circle cx="132" cy="298" r="9" fill="none" stroke="#bae6fd" strokeWidth="2" />
      <LabelText x={210} y={400} size={13.5} fill="#fde68a">
        Sidereus Nuncius (1610): las lunas de Júpiter
      </LabelText>
    </Frame>
  );
}

function KeplerEllipseSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Órbita elíptica y leyes de Kepler">
      <ellipse cx="170" cy="215" rx="150" ry="95" fill="none" stroke="#7dd3fc" strokeWidth="1.8" />
      <path
        d="M232 215L320 128A150 95 0 0 1 345 190Z"
        fill="#7dd3fc"
        opacity="0.28"
        stroke="#bae6fd"
      />
      <path
        d="M232 215L60 190A150 95 0 0 0 60 240Z"
        fill="#7dd3fc"
        opacity="0.28"
        stroke="#bae6fd"
      />
      <circle cx="232" cy="215" r="24" fill={`url(#${id}-sun)`}>
        <animate attributeName="r" values="22;27;22" dur="4s" repeatCount="indefinite" />
      </circle>
      <circle cx="232" cy="215" r="8" fill="#fffbe6" />
      <circle cx="108" cy="215" r="3" fill="#bae6fd" />
      <Body id={id} kind="planet" cx={322} cy={152} r={9} />
      <LabelText x={232} y={252} size={12}>
        Sol (foco F₁)
      </LabelText>
      <LabelText x={108} y={236} size={11}>
        foco vacío F₂
      </LabelText>
      <LabelText x={290} y={90} size={13}>
        Áreas iguales
      </LabelText>
      <LabelText x={90} y={160} size={13}>
        en tiempos iguales
      </LabelText>
      <LabelText x={210} y={400} size={13.5} fill="#fde68a">
        Leyes de Kepler · Astronomia Nova (1609) · T² ∝ a³
      </LabelText>
    </Frame>
  );
}

function NewtonAppleSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Gravitación universal de Newton">
      <EarthSphere id={id} cx={210} cy={235} r={62} />
      <Orbit cx={210} cy={235} rx={150} ry={150} stroke="#fde68a" op={0.5} dash="4 6" />
      <Body id={id} kind="moon" cx={316} cy={129} r={14} />
      <path d="M303 142L255 190" stroke="#7df9ff" strokeWidth="2" strokeDasharray="5 5" />
      <path d="M262 183l2 10-10-2" stroke="#7df9ff" fill="none" strokeWidth="2" />
      <LabelText x={210} y={56} size={19} fill="#fde68a">
        F = G·M·m / r²
      </LabelText>
      <g>
        <circle cx="210" cy="152" r="8" fill="#dc2626" />
        <path d="M210 144q4-7 9-8" stroke="#4ade80" strokeWidth="2" fill="none" />
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0 -8; 0 6; 0 -8"
          dur="3.6s"
          repeatCount="indefinite"
        />
      </g>
      <LabelText x={210} y={400} size={13.5} fill="#fde68a">
        Isaac Newton · Principia Mathematica (1687)
      </LabelText>
    </Frame>
  );
}

function TsiolkovskyRocketSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Cohete de combustible líquido y ecuación de Tsiolkovski">
      <g transform="translate(210 200)">
        <path
          d="M0-140C-34-90-38-30-30 70H30C38-30 34-90 0-140Z"
          fill={`url(#${id}-metal)`}
          stroke="#e0f2fe"
          strokeWidth="2"
        />
        <circle cy="-60" r="16" fill="#0f172a" stroke="#7df9ff" strokeWidth="3" />
        <path
          d="M-30 30L-68 90L-30 70M30 30L68 90L30 70"
          fill="#0ea5e9"
          stroke="#bae6fd"
        />
        <rect x="-18" y="70" width="36" height="18" fill="#475569" />
        <path d="M-16 88C-30 155 30 155 16 88Z" fill={`url(#${id}-flame)`}>
          <animate
            attributeName="d"
            values="M-16 88C-30 150 30 150 16 88Z;M-18 88C-34 170 34 170 18 88Z;M-16 88C-30 150 30 150 16 88Z"
            dur="0.7s"
            repeatCount="indefinite"
          />
        </path>
      </g>
      <LabelText x={210} y={38} size={16}>
        Δv = v_e · ln(m₀ / m_f)
      </LabelText>
      <LabelText x={210} y={400} size={13.5} fill="#fde68a">
        Tsiolkovski (1903) y Robert Goddard (1926)
      </LabelText>
    </Frame>
  );
}

function SputnikSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Sputnik 1 y amanecer orbital">
      <EarthSphere id={id} cx={210} cy={290} r={95} />
      <Orbit cx={210} cy={290} rx={160} ry={140} stroke="#fde68a" op={0.55} dash="5 6" />
      <g transform="translate(210 112)">
        <circle r="22" fill={`url(#${id}-metal)`} stroke="#fff" />
        <circle cx="-7" cy="-7" r="6" fill="#fff" opacity="0.7" />
        <path
          d="M-18-8L-110-48M-20-2L-120-10M18-8L110-48M20-2L120-10"
          stroke="#e2e8f0"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle r="34" fill="none" stroke="#7df9ff" strokeOpacity="0.45" strokeWidth="1.2">
          <animate attributeName="r" values="24;54" dur="2.2s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.7;0" dur="2.2s" repeatCount="indefinite" />
        </circle>
      </g>
      <LabelText x={210} y={45} size={15.5}>
        Sputnik 1 (1957) · Vostok 1 (1961)
      </LabelText>
      <LabelText x={210} y={402} size={13.5} fill="#fde68a">
        83.6 kg · 7.91 km/s primera velocidad cósmica
      </LabelText>
    </Frame>
  );
}

function ApolloSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Saturno V y la Luna">
      <Body id={id} kind="moon" cx={300} cy={110} r={58} />
      <circle cx="285" cy="95" r="9" fill="#475569" opacity="0.5" />
      <circle cx="322" cy="132" r="13" fill="#475569" opacity="0.4" />
      <g transform="translate(120 190)">
        <path
          d="M0-120C-14-100-16-85-16-70H16C16-85 14-100 0-120Z"
          fill="#f8fafc"
          stroke="#cbd5e1"
        />
        <rect x="-16" y="-70" width="32" height="50" fill="#f8fafc" stroke="#cbd5e1" />
        <rect x="-18" y="-20" width="36" height="60" fill="#e2e8f0" stroke="#94a3b8" />
        <rect x="-20" y="40" width="40" height="80" fill="#f8fafc" stroke="#94a3b8" />
        <rect x="-20" y="-40" width="40" height="6" fill="#0f172a" />
        <rect x="-20" y="60" width="40" height="6" fill="#0f172a" />
        <path d="M-20 120L-34 140H34L20 120Z" fill="#475569" />
        <path d="M-16 140C-30 200 30 200 16 140Z" fill={`url(#${id}-flame)`}>
          <animate
            attributeName="d"
            values="M-16 140C-30 195 30 195 16 140Z;M-20 140C-34 215 34 215 20 140Z;M-16 140C-30 195 30 195 16 140Z"
            dur="0.65s"
            repeatCount="indefinite"
          />
        </path>
      </g>
      <path
        d="M140 150C200 100 240 120 252 118"
        stroke="#7df9ff"
        strokeWidth="2"
        strokeDasharray="6 6"
        fill="none"
      />
      <LabelText x={210} y={38} size={15.5}>
        Saturno V · 34.5 MN de empuje
      </LabelText>
      <LabelText x={210} y={400} size={13.5} fill="#fde68a">
        Inyección translunar · Apolo 11 (20 de julio de 1969)
      </LabelText>
    </Frame>
  );
}

function SatellitesSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Estaciones orbitales y satélites">
      <EarthSphere id={id} cx={350} cy={360} r={90} />
      <Orbit cx={210} cy={210} rx={165} ry={95} stroke="#7df9ff" op={0.3} dash="5 6" />
      <g transform="translate(200 190) rotate(-12)">
        <rect x="-130" y="-70" width="70" height="30" fill="#1d4ed8" stroke="#93c5fd" />
        <rect x="-130" y="40" width="70" height="30" fill="#1d4ed8" stroke="#93c5fd" />
        <rect x="60" y="-70" width="70" height="30" fill="#1d4ed8" stroke="#93c5fd" />
        <rect x="60" y="40" width="70" height="30" fill="#1d4ed8" stroke="#93c5fd" />
        <rect x="-95" y="-40" width="6" height="80" fill="#cbd5e1" />
        <rect x="90" y="-40" width="6" height="80" fill="#cbd5e1" />
        <rect x="-95" y="-4" width="190" height="8" fill="#e2e8f0" />
        <rect
          x="-45"
          y="-18"
          width="90"
          height="36"
          rx="14"
          fill={`url(#${id}-metal)`}
          stroke="#fff"
        />
        <circle cx="0" cy="0" r="9" fill="#0f172a" stroke="#7df9ff" strokeWidth="2" />
      </g>
      <circle cx="96" cy="94" r="5" fill="#fde68a">
        <animate attributeName="opacity" values="0.4;1;0.4" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <LabelText x={210} y={48} size={15.5}>
        Saliut · Skylab · Mir · EEI
      </LabelText>
      <LabelText x={210} y={400} size={13.5} fill="#fde68a">
        Módulo Zaryá (1998) · 408 km en órbita baja
      </LabelText>
    </Frame>
  );
}

function JamesWebbSvg({ id }: { id: string }) {
  const hexPositions: ReadonlyArray<readonly [number, number]> = [
    [210, 130],
    [210, 78],
    [210, 182],
    [165, 104],
    [255, 104],
    [165, 156],
    [255, 156],
  ];

  const renderHex = (x: number, y: number) => {
    const points = Array.from({ length: 6 }, (_, k) => {
      const angle = (Math.PI / 3) * k + Math.PI / 6;
      return `${x + 30 * Math.cos(angle)},${y + 30 * Math.sin(angle)}`;
    }).join(' ');
    return (
      <polygon
        key={`${x}-${y}`}
        points={points}
        fill="#fbbf24"
        stroke="#fff7d6"
        strokeWidth="1.5"
      />
    );
  };

  return (
    <Frame id={id} label="Telescopio Espacial James Webb">
      <path d="M60 345L210 300L360 345L210 380Z" fill="#cbd5e1" opacity="0.65" stroke="#fff" />
      <path d="M90 325L210 288L330 325L210 358Z" fill="#94a3b8" opacity="0.7" />
      {hexPositions.map(([x, y]) => renderHex(x, y))}
      <rect x="205" y="210" width="10" height="80" fill="#cbd5e1" />
      <path d="M170 290H250" stroke="#7df9ff" strokeWidth="3" />
      <circle cx="210" cy="130" r="95" fill="none" stroke="#fde68a" strokeOpacity="0.22" strokeDasharray="4 6">
        <animate attributeName="r" values="92;104;92" dur="5s" repeatCount="indefinite" />
      </circle>
      <LabelText x={210} y={38} size={15.5}>
        JWST · Espejo segmentado de 6.5 m
      </LabelText>
      <LabelText x={210} y={404} size={13.5} fill="#fde68a">
        Punto de Lagrange L2 · 1.5 millones de km
      </LabelText>
    </Frame>
  );
}

function ArtemisSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Cápsula Orión y Programa Artemis">
      <Body id={id} kind="moon" cx={110} cy={290} r={85} />
      <circle cx="85" cy="270" r="14" fill="#475569" opacity="0.5" />
      <circle cx="140" cy="320" r="18" fill="#475569" opacity="0.4" />
      <EarthSphere id={id} cx={355} cy={85} r={32} />
      <path
        d="M130 215C200 120 280 100 325 100"
        stroke="#7df9ff"
        strokeWidth="2"
        strokeDasharray="6 7"
        fill="none"
      />
      <g transform="translate(235 140) rotate(30)">
        <path
          d="M-30 24L-18-30H18L30 24Z"
          fill={`url(#${id}-metal)`}
          stroke="#fff"
          strokeWidth="2"
        />
        <rect x="-24" y="24" width="48" height="36" fill="#e2e8f0" stroke="#94a3b8" />
        <rect x="-110" y="34" width="84" height="14" fill="#1d4ed8" stroke="#93c5fd" />
        <rect x="26" y="34" width="84" height="14" fill="#1d4ed8" stroke="#93c5fd" />
      </g>
      <LabelText x={210} y={38} size={15.5}>
        Artemis · Polo sur lunar
      </LabelText>
      <LabelText x={210} y={404} size={13.5} fill="#fde68a">
        Cápsula Orión + Estación cislunar Gateway
      </LabelText>
    </Frame>
  );
}

function MarsRouteSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Ruta interplanetaria hacia Marte">
      <EarthSphere id={id} cx={85} cy={310} r={34} />
      <Body id={id} kind="mars" cx={330} cy={115} r={46} />
      <path
        d="M120 295C190 190 250 160 288 135"
        stroke="#fde68a"
        strokeWidth="2.2"
        strokeDasharray="7 8"
        fill="none"
      />
      <g transform="translate(205 210) rotate(-38)">
        <rect
          x="-16"
          y="-8"
          width="32"
          height="16"
          rx="5"
          fill={`url(#${id}-metal)`}
          stroke="#fff"
        />
        <rect x="-42" y="-3" width="22" height="6" fill="#1d4ed8" />
        <rect x="20" y="-3" width="22" height="6" fill="#1d4ed8" />
        <circle cx="0" cy="0" r="24" fill="none" stroke="#7df9ff" strokeOpacity="0.35">
          <animate attributeName="r" values="18;28;18" dur="3s" repeatCount="indefinite" />
        </circle>
      </g>
      <path
        d="M270 100l46 4M300 140l50-2M316 78l36 8"
        stroke="#fed7aa"
        strokeWidth="4"
        opacity="0.5"
        strokeLinecap="round"
      />
      <LabelText x={85} y={365} size={13}>
        Tierra
      </LabelText>
      <LabelText x={330} y={180} size={13}>
        Marte
      </LabelText>
      <LabelText x={210} y={404} size={13.5} fill="#fde68a">
        225 M km · Ventana de transferencia de Hohmann
      </LabelText>
    </Frame>
  );
}

function FallbackOrbitalSvg({ id }: { id: string }) {
  return (
    <Frame id={id} label="Diagrama de telemetría orbital">
      <g transform="translate(210 210)" fill="none" strokeLinecap="round">
        <circle r="136" stroke="#7df9ff" strokeOpacity="0.22" strokeDasharray="4 8" />
        <circle r="96" stroke="#38bdf8" strokeOpacity="0.45" strokeWidth="1.5" />
        <ellipse rx="140" ry="58" transform="rotate(-24)" stroke="#fde68a" strokeOpacity="0.55" />
        <circle r="28" fill={`url(#${id}-planet)`} stroke="#bae6fd" strokeWidth="1.5" />
        <circle cx="96" cy="0" r="6" fill="#7df9ff">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="14s"
            repeatCount="indefinite"
          />
        </circle>
      </g>
      <LabelText x={210} y={400} size={13.5} fill="#fde68a">
        Telemetría astronáutica · Tango Horizon
      </LabelText>
    </Frame>
  );
}

export function CelestialVisual({ type }: { type: string }) {
  const uid = useId().replace(/:/g, '');
  const id = `cv-${uid}`;

  const renderGraphic = () => {
    switch (type) {
      case 'celestial-map':
        return <CelestialMapSvg id={id} />;
      case 'geocentric-sphere':
        return <GeocentricSphereSvg id={id} />;
      case 'sirius-calendar':
        return <SiriusCalendarSvg id={id} />;
      case 'copernicus':
        return <CopernicusSvg id={id} />;
      case 'galileo-jupiter':
        return <GalileoJupiterSvg id={id} />;
      case 'kepler-ellipse':
        return <KeplerEllipseSvg id={id} />;
      case 'newton-apple':
        return <NewtonAppleSvg id={id} />;
      case 'tsiolkovsky-rocket':
        return <TsiolkovskyRocketSvg id={id} />;
      case 'sputnik':
        return <SputnikSvg id={id} />;
      case 'apollo':
        return <ApolloSvg id={id} />;
      case 'satellites':
        return <SatellitesSvg id={id} />;
      case 'james-webb':
        return <JamesWebbSvg id={id} />;
      case 'artemis':
        return <ArtemisSvg id={id} />;
      case 'mars-route':
        return <MarsRouteSvg id={id} />;
      default:
        return <FallbackOrbitalSvg id={id} />;
    }
  };

  return (
    <div className="cv-visual-wrap">
      {renderGraphic()}
      <style jsx>{`
        .cv-visual-wrap {
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 18px 36px rgba(6, 12, 30, 0.55));
        }
        .cv-visual-wrap :global(.cv-celestial-svg) {
          width: 100%;
          height: auto;
          display: block;
          overflow: visible;
        }
      `}</style>
    </div>
  );
}
