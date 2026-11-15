'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BrainCircuit,
  Compass,
  Cpu,
  ExternalLink,
  Layers,
  Mic,
  Radio,
  Rocket,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Waypoints,
} from 'lucide-react';
import { GlassSurface } from '@/components/ui/GlassSurface';
import { ElectricBorder } from '@/components/ui/ElectricBorder';
import { PhotorealisticMarsBanner } from '@/components/ui/PlanetBanners';
import { useLanguage, pickLang, type BiText, type SiteLang } from '@/context/LanguageContext';
import {
  getGuardianLayers,
  getMlModelsData,
  getMultiAgentTiers,
  getProjectCapabilityPillars,
  getProjectHeroCopy,
  getRescueScenarioSteps,
  getTeamRosterSummary,
  getTechStackGroups,
  SIMULATOR_URL,
} from '@/data/projectOverview';
import { TANGO_HORIZON_TEAM } from '@/data/compendiumAndTeam';

const HERO_TELEMETRY_CHIPS: BiText[] = [
  {
    en: 'Gale Crater 4×4 km · 1 m/px HiRISE',
    es: 'Cráter Gale 4×4 km · 1 m/px HiRISE',
  },
  {
    en: '14 Agents · 6 MCP Servers',
    es: '14 Agentes · 6 Servidores MCP',
  },
  {
    en: 'BM25 RAG <2 ms · 1,002 Chunks',
    es: 'RAG BM25 <2 ms · 1,002 Chunks',
  },
  {
    en: '5-Language Voice · <5 ms Local',
    es: 'Voz 5 Idiomas · <5 ms Local',
  },
  {
    en: '3 NASA PDS ML Models',
    es: '3 Modelos ML NASA PDS',
  },
];

interface MarsChallengeCard {
  id: string;
  badge: BiText;
  metric: BiText;
  accent: string;
  title: BiText;
  description: BiText;
}

const MARS_CHALLENGE_CARDS: MarsChallengeCard[] = [
  {
    id: 'light-delay',
    badge: { en: 'Communications Physics', es: 'Física de Comunicaciones' },
    metric: { en: '4–24 min one-way', es: '4–24 min por tramo' },
    accent: '#fb923c',
    title: {
      en: 'Earth–Mars Delay & Local Autonomy',
      es: 'Retardo Tierra–Marte y Autonomía Local',
    },
    description: {
      en: 'One-way radio latency reaches up to 24 minutes (48 minutes round-trip) and solar conjunctions cut the link entirely. Every critical EVA and rescue decision must execute locally on the Mars habitat compute module and onboard suit/rover processors.',
      es: 'La latencia unidireccional de radio alcanza hasta 24 minutos (48 minutos ida y vuelta) y las conjunciones solares cortan el enlace. Toda decisión crítica EVA y de rescate debe ejecutarse localmente en el módulo compute del hábitat marciano y en los procesadores de trajes y rovers.',
    },
  },
  {
    id: 'pressurized-suit',
    badge: { en: 'EVA Human Factors', es: 'Factores Humanos EVA' },
    metric: { en: '29.6 kPa Pure O2', es: '29.6 kPa O2 Puro' },
    accent: '#fbbf24',
    title: {
      en: 'Pressurized Gloves Without a Keyboard',
      es: 'Guantes Presurizados sin Teclado',
    },
    description: {
      en: 'At 29.6 kPa (4.3 psi) pure oxygen, suit glove stiffness prevents typing on keyboards or tiny touchscreens while climbing crater slopes or handling rock samples. The entire mission interface is 100% hands-free.',
      es: 'A 29.6 kPa (4.3 psi) de oxígeno puro, la rigidez de los guantes impide operar teclados o pantallas diminutas mientras se escala un cráter o se manipulan muestras. La interfaz completa es 100% manos libres.',
    },
  },
  {
    id: 'voice-5lang',
    badge: { en: 'Bidirectional Voice · 5 Languages', es: 'Voz Bidireccional · 5 Idiomas' },
    metric: { en: 'EN · ES · FR · DE · IT', es: 'EN · ES · FR · DE · IT' },
    accent: '#f97316',
    title: {
      en: '<5 ms Intents, Multimodal STT & Cloud TTS',
      es: 'Intenciones <5 ms, STT Multimodal y Cloud TTS',
    },
    description: {
      en: 'Two-stage speech recognition: instant local browser rules (<5 ms) for safety-critical and HUD orders, plus multimodal STT conditioned on a Mars mission glossary (gemini-4-hydrogen), answered with Google Cloud Journey neural voices.',
      es: 'Dos etapas de reconocimiento: reglas locales instantáneas (<5 ms) para órdenes críticas de seguridad/HUD y STT multimodal con glosario marciano (gemini-4-hydrogen), respondidas con voces neuronales Google Cloud Journey.',
    },
  },
  {
    id: 'quindar-remote',
    badge: { en: 'DSP Audio & Mobile Pointer', es: 'Audio DSP y Puntero Móvil' },
    metric: { en: '2525/2475 Hz · 32-Band FFT', es: '2525/2475 Hz · 32-Band FFT' },
    accent: '#fb7185',
    title: {
      en: 'Apollo Quindar Tones & QR /remote Control',
      es: 'Tonos Apolo Quindar y Control /remote por QR',
    },
    description: {
      en: 'Web Audio radio DSP chain with Apollo Quindar tones (2525 Hz intro, 2475 Hz outro) and a live 32-band FFT spectrum visualizer on the CSS3D visor, paired with a smartphone gyroscope pointer (/remote over /ws/remote) featuring Push-to-Talk and haptic vibration.',
      es: 'Cadena Web Audio con tonos Quindar (2525 Hz entrada, 2475 Hz salida) y analizador FFT de 32 bandas en el visor CSS3D, acoplada a un puntero láser giroscópico móvil (/remote vía /ws/remote) con Push-to-Talk y vibración háptica.',
    },
  },
];

const PROJECT_UI_COPY = {
  backHome: { en: 'Back to Home', es: 'Volver al Inicio' },
  backHomePath: { en: 'Back to Home (/)', es: 'Volver al Inicio (/)' },
  patchAlt: {
    en: 'Official mission patch for Tango Horizon: EVA and Mars robotics exploration',
    es: 'Emblema oficial de Tango Horizon: exploración EVA y robótica en Marte',
  },
  kpiAria: {
    en: 'Key architecture metrics',
    es: 'Métricas clave de arquitectura',
  },
  launchSim: {
    en: 'Launch Live 3D Simulator ↗',
    es: 'Abrir Simulador 3D en Vivo ↗',
  },
  teamBtn: { en: 'Team', es: 'Equipo' },
  exploreTeamBtn: {
    en: 'Explore Full Team (/equipo)',
    es: 'Explorar Equipo Completo (/equipo)',
  },
  compendiumBtn: {
    en: 'Historical–Technical Compendium',
    es: 'Compendio Histórico–Técnico',
  },
  marsEyebrow: {
    en: 'Operational Challenge · Latency & Voice',
    es: 'Desafío Operativo · Latencia y Voz',
  },
  marsHeading: {
    en: 'The Mars Challenge & Hands-Free Voice (5 Languages)',
    es: 'El Desafío en Marte y Voz Manos Libres (5 Idiomas)',
  },
  quindarTitle: { en: 'Apollo Quindar:', es: 'Quindar Apolo:' },
  quindarDesc: {
    en: '2525 Hz intro / 2475 Hz outro + 300–3200 Hz bandpass',
    es: '2525 Hz inicio / 2475 Hz cierre + filtro 300–3200 Hz',
  },
  fftTitle: { en: '32-Band FFT:', es: 'FFT 32 Bandas:' },
  fftDesc: {
    en: 'live radio spectrum over the CSS3D visor',
    es: 'espectro de radio en vivo sobre el visor CSS3D',
  },
  remoteTitle: { en: '/remote QR Pointer:', es: 'Puntero /remote QR:' },
  remoteDesc: {
    en: 'WebSocket gyroscope <16 ms + haptic PTT',
    es: 'giroscopio WebSocket <16 ms + PTT háptico',
  },
  stackEyebrow: {
    en: 'End-to-End Engineering',
    es: 'Ingeniería de Extremo a Extremo',
  },
  stackHeading: {
    en: 'Operational Layers & Full Engineering Stack',
    es: 'Capas Operativas y Stack Completo',
  },
  stackLead: {
    en: 'Deterministic simulation in TypeScript and Three.js WebGL2, in-process MCP servers with Fastify 5, Python ML models trained on NASA PDS datasets, and Cloud Run / Terraform / Vercel infrastructure with GitHub Actions CI/CD.',
    es: 'Simulación determinista en TypeScript y Three.js WebGL2, servidores MCP en proceso con Fastify 5, modelos Python ML sobre datos NASA PDS e infraestructura Cloud Run / Terraform / Vercel con CI/CD en GitHub Actions.',
  },
  stackSubheading: {
    en: 'Verified Technology Architecture',
    es: 'Arquitectura Tecnológica Verificada',
  },
  multiAgentEyebrow: {
    en: 'Orchestration & Run-Time Assurance',
    es: 'Orquestación y Run-Time Assurance',
  },
  multiAgentHeading: {
    en: 'Multi-Agent Hierarchy (14 Agents) + 3-Layer GUARDIAN Safety',
    es: 'Jerarquía Multi-Agente (14 Agentes) + Seguridad GUARDIAN de 3 Capas',
  },
  multiAgentLead: {
    en: 'Hierarchical routing from fast suit voice (SUIT.VOICE-EXEC) to the BASE orchestrator, five domain specialists, and autonomous ROBOT.<id> units, featuring 3-provider failover, local Mars compute module execution, and 2/3 consensus in GUARDIAN.',
    es: 'Enrutamiento jerárquico desde la voz rápida en traje (SUIT.VOICE-EXEC) hacia el orquestador BASE, cinco especialistas de dominio y unidades robóticas autónomas ROBOT.<id>, con failover entre 3 proveedores, ejecución local en módulo compute marciano y consenso 2/3 en GUARDIAN.',
  },
  dtPrimary: { en: 'Primary (Vertex AI)', es: 'Primario (Vertex AI)' },
  dtSecondary: { en: 'Secondary (AI Studio)', es: 'Secundario (AI Studio)' },
  dtBackup: { en: 'Backup (Meta Muse)', es: 'Backup (Meta Muse)' },
  dtOffline: { en: 'Offline / Mars Fallback', es: 'Fallback Offline / Marte' },
  guardianTitle: {
    en: 'Physical Verification, <untrusted> Judge & Asymmetric Safety Voting',
    es: 'Verificación Física, Juez <untrusted> y Votación Asimétrica de Seguridad',
  },
  mlEyebrow: {
    en: 'Data Science · Zero Spatial/Temporal Leakage',
    es: 'Ciencia de Datos · Cero Fuga Temporal/Espacial',
  },
  mlHeading: {
    en: '3 ML Models Validated on Real NASA PDS Data',
    es: '3 Modelos de ML Validados sobre Datos Reales NASA PDS',
  },
  mlLead: {
    en: 'Trained offline in Python and validated with spatial/sol-grouped GroupKFold or held-out storm years over real measurements from the Curiosity rover (DAN, REMS, Mastcam, MAHLI) and MRO / Mars Odyssey orbiters.',
    es: 'Entrenados offline en Python y validados con GroupKFold espacial/por sol o años de tormenta reservados sobre mediciones reales del rover Curiosity (DAN, REMS, Mastcam y MAHLI) y orbitadores MRO / Mars Odyssey.',
  },
  mlDatasetLabel: { en: 'NASA Dataset:', es: 'Dataset NASA:' },
  mlArchLabel: { en: 'Architecture:', es: 'Arquitectura:' },
  rescueEyebrow: {
    en: 'Live Operational Demonstration · S1–S7',
    es: 'Demostración Operativa en Vivo · S1–S7',
  },
  rescueHeading: {
    en: 'Autonomous Gale Crater Rescue Scenario (S1–S7)',
    es: 'Escenario de Rescate Autónomo en Cráter Gale (S1–S7)',
  },
  rescueLead: {
    en: 'Complete autonomous response when Cassini / DIAZ-CANO falls into the 24 m × 4 m natural pit 290 m East of base: aerial drone overwatch, 8.0 kg RK4 ballistic drop-pod, A* pathing for rescue-1 and rescue-bot-1, and safe airlock return.',
    es: 'Secuencia completa ante caída de Cassini / DIAZ-CANO en la fosa natural de 24 m × 4 m a 290 m al Este de la base: drones en sobrevuelo, pod balístico RK4 de 8.0 kg, ruta A* para rescue-1 y rescue-bot-1 y retorno seguro a la esclusa.',
  },
  rescueListAria: {
    en: 'Autonomous rescue stages S1 to S7',
    es: 'Etapas S1 a S7 del rescate autónomo',
  },
  teamEyebrow: {
    en: 'Buenos Aires · Universidad de Palermo',
    es: 'Buenos Aires · Universidad de Palermo',
  },
  teamLead: {
    en: 'Interdisciplinary engineering, systems architecture, human factors, and 3D simulation crew for the Interplanetary Survival Guide: Martian Map challenge.',
    es: 'Tripulación interdisciplinaria de desarrollo, ingeniería de sistemas, factores humanos y simulación 3D para el desafío Interplanetary Survival Guide: Martian Map.',
  },
} as const;

const CAPABILITY_ICONS = [Mic, BrainCircuit, Cpu, Compass];

const RALEWAY_FONT = "var(--font-raleway), 'Raleway', sans-serif";

const SUNSET_ACCENT_MAP: Record<string, string> = {
  '#7df9ff': '#f97316',
  '#38bdf8': '#fb923c',
  '#0ea5e9': '#f97316',
  '#0284c7': '#f97316',
  '#7dd3fc': '#fdba74',
  '#60a5fa': '#fb923c',
  '#3b82f6': '#f97316',
  '#5227ff': '#fb7185',
  '#a78bfa': '#fb7185',
  '#c4b5fd': '#fda4af',
  '#fde68a': '#fbbf24',
  '#34d399': '#fbbf24',
  '#6ee7b7': '#fdba74',
};

function toSunsetAccent(color: string): string {
  return SUNSET_ACCENT_MAP[color.toLowerCase()] ?? color;
}

function resolveBadgeText(value: unknown, lang: SiteLang): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  if (value && typeof value === 'object' && 'en' in value && 'es' in value) {
    return pickLang(value as BiText, lang);
  }
  return null;
}

export function ProjectLandingView() {
  const { lang } = useLanguage();

  const heroCopy = getProjectHeroCopy(lang);
  const capabilityPillars = getProjectCapabilityPillars(lang);
  const techStackGroups = getTechStackGroups(lang);
  const multiAgentTiers = getMultiAgentTiers(lang);
  const guardianLayers = getGuardianLayers(lang);
  const mlModels = getMlModelsData(lang);
  const rescueSteps = getRescueScenarioSteps(lang);
  const teamRoster = getTeamRosterSummary(lang);

  return (
    <div className="era-detail-page th-project-page" style={{ fontFamily: RALEWAY_FONT }}>
      <div className="era-detail-container th-project-landing">
        {/* TOPBAR */}
        <div className="era-detail-topbar">
          <Link href="/" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
            <GlassSurface
              width="auto"
              height={44}
              borderRadius={2}
              borderWidth={0.12}
              brightness={52}
              opacity={0.95}
              blur={10}
              displace={0.5}
              backgroundOpacity={0.14}
              saturation={1.3}
              distortionScale={-120}
              redOffset={12}
              greenOffset={5}
              blueOffset={0}
              className="ac-glass-btn-surface"
            >
              <span className="ac-readmore-label">
                <ArrowLeft size={16} className="ac-readmore-arrow-left" aria-hidden="true" />
                <span>{pickLang(PROJECT_UI_COPY.backHome, lang)}</span>
              </span>
            </GlassSurface>
          </Link>

          <ElectricBorder color="#fb923c" speed={1.15} chaos={0.35} borderRadius={2}>
            <div className="era-detail-period-pill" style={{ color: '#fdba74' }}>
              NASA Space Apps Challenge 2026 · 2026-11-15
            </div>
          </ElectricBorder>
        </div>

        {/* 1. HERO LANDING BLOCK */}
        <section className="th-project-section" aria-labelledby="project-hero-title">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={2}
            borderWidth={0.08}
            brightness={48}
            opacity={0.95}
            blur={14}
            displace={0.55}
            backgroundOpacity={0.14}
            saturation={1.25}
            distortionScale={-140}
            redOffset={14}
            greenOffset={6}
            blueOffset={0}
            style={{
              background: 'rgba(26, 12, 17, 0.78)',
              border: '1px solid rgba(255, 255, 255, 0.24)',
            }}
          >
            <div className="th-project-hero-inner">
              <div className="th-project-hero-visuals">
                <div className="th-project-patch-col">
                  <div className="th-project-patch-wrap" style={{ background: 'transparent' }}>
                    <img
                      src="/images/tango-horizon-mars-exploration-logo.jpeg"
                      alt={pickLang(PROJECT_UI_COPY.patchAlt, lang)}
                      className="th-project-patch-img"
                    />
                  </div>
                  <span className="th-project-patch-caption th-mono">
                    MISSION PATCH · GALE CRATER 137.400°E, 4.589°S
                  </span>
                </div>

                <div className="th-project-mars-col">
                  <PhotorealisticMarsBanner size={216} showCallouts />
                </div>
              </div>

              <span className="th-eyebrow">{heroCopy.badge}</span>

              <h1 id="project-hero-title" className="th-project-hero-title">
                {heroCopy.title}
              </h1>

              <p className="th-project-hero-subtitle">{heroCopy.subtitle}</p>
              <p className="th-project-hero-summary">{heroCopy.summary}</p>

              <ul
                className="th-project-kpi-strip"
                aria-label={pickLang(PROJECT_UI_COPY.kpiAria, lang)}
              >
                {HERO_TELEMETRY_CHIPS.map((chip) => {
                  const text = pickLang(chip, lang);
                  return (
                    <li key={chip.en} className="th-stack-chip">
                      {text}
                    </li>
                  );
                })}
              </ul>

              <div className="th-project-hero-actions">
                <ElectricBorder color="#f97316" speed={1.2} chaos={0.35} borderRadius={2}>
                  <a
                    href={SIMULATOR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ac-readmore-wrap"
                    style={{ textDecoration: 'none' }}
                  >
                    <GlassSurface
                      width="auto"
                      height={44}
                      borderRadius={2}
                      borderWidth={0.12}
                      brightness={54}
                      opacity={0.96}
                      blur={12}
                      displace={0.5}
                      backgroundOpacity={0.18}
                      saturation={1.35}
                      distortionScale={-120}
                      redOffset={14}
                      greenOffset={6}
                      blueOffset={0}
                      className="ac-glass-btn-surface"
                    >
                      <span className="ac-readmore-label" style={{ padding: '0 1.5rem' }}>
                        <Rocket size={17} style={{ color: '#fbbf24' }} aria-hidden="true" />
                        <span>{pickLang(PROJECT_UI_COPY.launchSim, lang)}</span>
                        <ExternalLink size={15} style={{ color: '#fdba74' }} aria-hidden="true" />
                      </span>
                    </GlassSurface>
                  </a>
                </ElectricBorder>

                <Link href="/equipo" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
                  <GlassSurface
                    width="auto"
                    height={44}
                    borderRadius={2}
                    borderWidth={0.12}
                    brightness={52}
                    opacity={0.95}
                    blur={10}
                    displace={0.5}
                    backgroundOpacity={0.14}
                    saturation={1.3}
                    distortionScale={-120}
                    redOffset={12}
                    greenOffset={5}
                    blueOffset={0}
                    className="ac-glass-btn-surface"
                  >
                    <span className="ac-readmore-label" style={{ padding: '0 1.45rem' }}>
                      <Users size={16} style={{ color: '#fb923c' }} aria-hidden="true" />
                      <span>{pickLang(PROJECT_UI_COPY.teamBtn, lang)}</span>
                      <ArrowRight size={15} style={{ color: '#fbbf24' }} aria-hidden="true" />
                    </span>
                  </GlassSurface>
                </Link>

                <Link
                  href="/compendio"
                  className="ac-readmore-wrap"
                  style={{ textDecoration: 'none' }}
                >
                  <GlassSurface
                    width="auto"
                    height={44}
                    borderRadius={2}
                    borderWidth={0.1}
                    brightness={50}
                    opacity={0.94}
                    blur={10}
                    displace={0.45}
                    backgroundOpacity={0.12}
                    saturation={1.25}
                    distortionScale={-120}
                    redOffset={12}
                    greenOffset={5}
                    blueOffset={0}
                    className="ac-glass-btn-surface"
                  >
                    <span className="ac-readmore-label" style={{ padding: '0 1.4rem' }}>
                      <span>{pickLang(PROJECT_UI_COPY.compendiumBtn, lang)}</span>
                      <ArrowRight size={15} style={{ color: '#fda4af' }} aria-hidden="true" />
                    </span>
                  </GlassSurface>
                </Link>
              </div>
            </div>
          </GlassSurface>
        </section>

        <div className="th-project-divider" aria-hidden="true" />

        {/* 2. THE MARS CHALLENGE & HANDS-FREE VOICE (5 LANGUAGES) */}
        <section className="th-project-section" aria-labelledby="mars-voice-heading">
          <div className="th-project-section-head">
            <span className="ac-timeline-badge">
              {pickLang(PROJECT_UI_COPY.marsEyebrow, lang)}
            </span>
            <h2 id="mars-voice-heading" className="th-section-title">
              {pickLang(PROJECT_UI_COPY.marsHeading, lang)}
            </h2>
            <p className="th-lead">{heroCopy.marsContext}</p>
          </div>

          <div className="th-project__grid">
            {MARS_CHALLENGE_CARDS.map((card) => (
              <article
                key={card.id}
                className="th-project__card"
                style={{ borderTop: `3px solid ${card.accent}` }}
              >
                <div className="th-project-card-top">
                  <span className="th-project-card-badge" style={{ color: card.accent }}>
                    {pickLang(card.badge, lang)}
                  </span>
                  <span className="th-project-metric-pill th-mono">
                    {pickLang(card.metric, lang)}
                  </span>
                </div>
                <h3 className="th-project-card-title">{pickLang(card.title, lang)}</h3>
                <p className="th-project-card-desc">{pickLang(card.description, lang)}</p>
              </article>
            ))}
          </div>

          <div className="th-project-voice-ribbon">
            <div className="th-project-voice-item">
              <Radio size={17} style={{ color: '#f97316' }} aria-hidden="true" />
              <span>
                <strong>{pickLang(PROJECT_UI_COPY.quindarTitle, lang)}</strong>{' '}
                {pickLang(PROJECT_UI_COPY.quindarDesc, lang)}
              </span>
            </div>
            <div className="th-project-voice-item">
              <Mic size={17} style={{ color: '#fbbf24' }} aria-hidden="true" />
              <span>
                <strong>{pickLang(PROJECT_UI_COPY.fftTitle, lang)}</strong>{' '}
                {pickLang(PROJECT_UI_COPY.fftDesc, lang)}
              </span>
            </div>
            <div className="th-project-voice-item">
              <Smartphone size={17} style={{ color: '#fda4af' }} aria-hidden="true" />
              <span>
                <strong>{pickLang(PROJECT_UI_COPY.remoteTitle, lang)}</strong>{' '}
                {pickLang(PROJECT_UI_COPY.remoteDesc, lang)}
              </span>
            </div>
          </div>
        </section>

        <div className="th-project-divider" aria-hidden="true" />

        {/* 3. OPERATIONAL LAYERS & FULL ENGINEERING STACK */}
        <section className="th-project-section" aria-labelledby="capabilities-stack-heading">
          <div className="th-project-section-head">
            <span className="ac-timeline-badge">
              {pickLang(PROJECT_UI_COPY.stackEyebrow, lang)}
            </span>
            <h2 id="capabilities-stack-heading" className="th-section-title">
              {pickLang(PROJECT_UI_COPY.stackHeading, lang)}
            </h2>
            <p className="th-lead">{pickLang(PROJECT_UI_COPY.stackLead, lang)}</p>
          </div>

          <div className="th-project-2col-grid">
            {capabilityPillars.map((pillar, idx) => {
              const Icon = CAPABILITY_ICONS[idx % CAPABILITY_ICONS.length];
              const accent = toSunsetAccent(pillar.accent);
              return (
                <article
                  key={pillar.id}
                  className="th-project__card"
                  style={{ borderTop: `3px solid ${accent}` }}
                >
                  <div className="th-project-card-top">
                    <span className="th-project-icon-title" style={{ color: accent }}>
                      <Icon size={16} aria-hidden="true" />
                      <span>{pillar.badge}</span>
                    </span>
                    <span className="th-project-metric-pill th-mono">{pillar.metric}</span>
                  </div>
                  <h3 className="th-project-card-title">{pillar.title}</h3>
                  <p className="th-project-card-desc">{pillar.description}</p>
                  <ul className="th-project-bullet-list">
                    {pillar.highlights.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>

          <div className="th-project-stack-wrap">
            <div className="th-project-stack-header">
              <Layers size={18} style={{ color: '#fb923c' }} aria-hidden="true" />
              <h3>{pickLang(PROJECT_UI_COPY.stackSubheading, lang)}</h3>
            </div>
            <div className="th-project__grid">
              {techStackGroups.map((group) => {
                const accent = toSunsetAccent(group.accent);
                return (
                  <div
                    key={group.id}
                    className="th-project__card"
                    style={{ borderLeft: `3px solid ${accent}` }}
                  >
                    <span className="th-project-card-badge" style={{ color: accent }}>
                      {group.category}
                    </span>
                    <ul className="th-project-stack-list">
                      {group.items.map((tech) => (
                        <li key={tech} className="th-mono">
                          {tech}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <div className="th-project-divider" aria-hidden="true" />

        {/* 4. MULTI-AGENT HIERARCHY (14 AGENTS) + GUARDIAN SAFETY */}
        <section className="th-project-section" aria-labelledby="multiagent-guardian-heading">
          <div className="th-project-section-head">
            <span className="ac-timeline-badge">
              {pickLang(PROJECT_UI_COPY.multiAgentEyebrow, lang)}
            </span>
            <h2 id="multiagent-guardian-heading" className="th-section-title">
              {pickLang(PROJECT_UI_COPY.multiAgentHeading, lang)}
            </h2>
            <p className="th-lead">{pickLang(PROJECT_UI_COPY.multiAgentLead, lang)}</p>
          </div>

          <div className="th-project-tiers-grid">
            {multiAgentTiers.map((tier) => {
              const accent = toSunsetAccent(tier.accent);
              return (
                <article
                  key={tier.id}
                  className="th-project__card"
                  style={{ borderTop: `3px solid ${accent}` }}
                >
                  <div className="th-project-card-top">
                    <span className="th-project-card-badge" style={{ color: accent }}>
                      {tier.tier}
                    </span>
                    <span className="th-project-metric-pill th-mono">{tier.latencyOrBudget}</span>
                  </div>

                  <div className="th-project-agent-chips">
                    {tier.agents.map((agent) => (
                      <span
                        key={agent}
                        className="th-project-agent-chip th-mono"
                        style={{ borderColor: `${accent}66`, color: accent }}
                      >
                        <Bot size={13} aria-hidden="true" />
                        <span>{agent}</span>
                      </span>
                    ))}
                  </div>

                  <p className="th-project-card-desc">{tier.role}</p>

                  <dl className="th-project-model-matrix th-mono">
                    <div>
                      <dt>{pickLang(PROJECT_UI_COPY.dtPrimary, lang)}</dt>
                      <dd>{tier.primaryModel}</dd>
                    </div>
                    <div>
                      <dt>{pickLang(PROJECT_UI_COPY.dtSecondary, lang)}</dt>
                      <dd>{tier.secondaryModel}</dd>
                    </div>
                    <div>
                      <dt>{pickLang(PROJECT_UI_COPY.dtBackup, lang)}</dt>
                      <dd>{tier.backupModel}</dd>
                    </div>
                    <div>
                      <dt>{pickLang(PROJECT_UI_COPY.dtOffline, lang)}</dt>
                      <dd>{tier.offlineFallback}</dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>

          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={2}
            borderWidth={0.07}
            brightness={48}
            opacity={0.94}
            blur={12}
            displace={0.5}
            backgroundOpacity={0.12}
            saturation={1.25}
            distortionScale={-130}
            redOffset={12}
            greenOffset={5}
            blueOffset={0}
            style={{
              background: 'rgba(26, 12, 17, 0.78)',
              border: '1px solid rgba(255, 255, 255, 0.24)',
            }}
          >
            <div className="th-project-guardian-box">
              <div className="th-project-guardian-head">
                <ShieldCheck size={22} style={{ color: '#fb923c' }} aria-hidden="true" />
                <div>
                  <span className="th-project-card-badge" style={{ color: '#fb923c' }}>
                    GUARDIAN · 3-Layer Run-Time Assurance &amp; 2/3 Consensus Voting
                  </span>
                  <h3 className="th-project-guardian-title">
                    {pickLang(PROJECT_UI_COPY.guardianTitle, lang)}
                  </h3>
                </div>
              </div>

              <div className="th-project-3col-grid">
                {guardianLayers.map((layer) => {
                  const accent = toSunsetAccent(layer.accent);
                  return (
                    <div
                      key={layer.id}
                      className="th-project-subpanel"
                      style={{ borderTop: `3px solid ${accent}` }}
                    >
                      <span className="th-project-card-badge" style={{ color: accent }}>
                        {layer.step}
                      </span>
                      <h4 className="th-project-subpanel-title">{layer.title}</h4>
                      <span className="th-project-module-ref th-mono">{layer.moduleRef}</span>
                      <p className="th-project-subpanel-summary">{layer.summary}</p>
                      <ul className="th-project-bullet-list">
                        {layer.rules.map((rule) => (
                          <li key={rule}>{rule}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassSurface>
        </section>

        <div className="th-project-divider" aria-hidden="true" />

        {/* 5. 3 ML MODELS VALIDATED ON REAL NASA PDS DATA */}
        <section className="th-project-section" aria-labelledby="ml-models-heading">
          <div className="th-project-section-head">
            <span className="ac-timeline-badge">{pickLang(PROJECT_UI_COPY.mlEyebrow, lang)}</span>
            <h2 id="ml-models-heading" className="th-section-title">
              {pickLang(PROJECT_UI_COPY.mlHeading, lang)}
            </h2>
            <p className="th-lead">{pickLang(PROJECT_UI_COPY.mlLead, lang)}</p>
          </div>

          <div className="th-project-3col-grid">
            {mlModels.map((model) => {
              const accent = toSunsetAccent(model.accent);
              return (
                <article
                  key={model.id}
                  className="th-project__card"
                  style={{ borderTop: `3px solid ${accent}` }}
                >
                  <div className="th-project-card-top">
                    <span className="th-project-card-badge" style={{ color: accent }}>
                      {model.modelId}
                    </span>
                    <span
                      className="th-project-metric-pill th-mono"
                      style={{ borderColor: `${accent}66`, color: accent }}
                    >
                      {model.primaryMetric}
                    </span>
                  </div>
                  <h3 className="th-project-card-title">{model.name}</h3>
                  <p className="th-project-ml-meta">
                    <strong>{pickLang(PROJECT_UI_COPY.mlDatasetLabel, lang)}</strong> {model.dataset}
                  </p>
                  <p className="th-project-ml-meta">
                    <strong>{pickLang(PROJECT_UI_COPY.mlArchLabel, lang)}</strong>{' '}
                    {model.architecture}
                  </p>
                  <ul className="th-project-bullet-list">
                    {model.metrics.map((metric) => (
                      <li key={metric}>{metric}</li>
                    ))}
                  </ul>
                  <p className="th-project-card-desc" style={{ marginTop: 'auto' }}>
                    {model.operationalRole}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <div className="th-project-divider" aria-hidden="true" />

        {/* 6. AUTONOMOUS GALE CRATER RESCUE SCENARIO (S1-S7) */}
        <section className="th-project-section" aria-labelledby="rescue-scenario-heading">
          <div className="th-project-section-head">
            <span className="ac-timeline-badge">
              {pickLang(PROJECT_UI_COPY.rescueEyebrow, lang)}
            </span>
            <h2 id="rescue-scenario-heading" className="th-section-title">
              {pickLang(PROJECT_UI_COPY.rescueHeading, lang)}
            </h2>
            <p className="th-lead">{pickLang(PROJECT_UI_COPY.rescueLead, lang)}</p>
          </div>

          <ol
            className="th-project__steps"
            aria-label={pickLang(PROJECT_UI_COPY.rescueListAria, lang)}
          >
            {rescueSteps.map((step) => {
              const accent = toSunsetAccent(step.accent);
              return (
                <li
                  key={step.id}
                  className="th-project__step"
                  style={{ borderTop: `3px solid ${accent}` }}
                >
                  <span className="th-project-card-badge" style={{ color: accent }}>
                    {step.stage}
                  </span>
                  <h3 className="th-project-step-title">{step.title}</h3>
                  <div className="th-project-step-telemetry th-mono">{step.telemetry}</div>
                  <p className="th-project-card-desc">{step.summary}</p>
                  <div className="th-project-agent-chips">
                    {step.actors.map((actor) => (
                      <span key={actor} className="th-project-actor-chip th-mono">
                        <Waypoints size={12} aria-hidden="true" />
                        <span>{actor}</span>
                      </span>
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="th-project-divider" aria-hidden="true" />

        {/* 7. TEAM TANGO HORIZON CARD */}
        <section className="th-project-section" aria-labelledby="team-summary-heading">
          <ElectricBorder color="#f97316" speed={1.1} chaos={0.35} borderRadius={2}>
            <GlassSurface
              width="100%"
              height="auto"
              borderRadius={2}
              borderWidth={0.08}
              brightness={48}
              opacity={0.95}
              blur={14}
              displace={0.55}
              backgroundOpacity={0.14}
              saturation={1.25}
              distortionScale={-140}
              redOffset={14}
              greenOffset={6}
              blueOffset={0}
              style={{
                background: 'rgba(26, 12, 17, 0.78)',
                border: '1px solid rgba(255, 255, 255, 0.24)',
              }}
            >
              <div className="th-project-team-card">
                <div className="th-project-team-header">
                  <div>
                    <span className="ac-timeline-badge">
                      {pickLang(PROJECT_UI_COPY.teamEyebrow, lang)}
                    </span>
                    <h2 id="team-summary-heading" className="th-section-title">
                      Team Tango Horizon
                    </h2>
                    <p className="th-lead">{pickLang(PROJECT_UI_COPY.teamLead, lang)}</p>
                  </div>

                  <Link
                    href="/equipo"
                    className="ac-readmore-wrap"
                    style={{ textDecoration: 'none', flexShrink: 0 }}
                  >
                    <GlassSurface
                      width="auto"
                      height={44}
                      borderRadius={2}
                      borderWidth={0.12}
                      brightness={54}
                      opacity={0.96}
                      blur={12}
                      displace={0.5}
                      backgroundOpacity={0.18}
                      saturation={1.35}
                      distortionScale={-120}
                      redOffset={12}
                      greenOffset={5}
                      blueOffset={0}
                      className="ac-glass-btn-surface"
                    >
                      <span className="ac-readmore-label" style={{ padding: '0 1.5rem' }}>
                        <Users size={16} style={{ color: '#fb923c' }} aria-hidden="true" />
                        <span>{pickLang(PROJECT_UI_COPY.teamBtn, lang)}</span>
                        <ArrowRight size={15} style={{ color: '#fbbf24' }} aria-hidden="true" />
                      </span>
                    </GlassSurface>
                  </Link>
                </div>

                <div className="th-project-team-grid">
                  {teamRoster.map((member, index) => {
                    const profile = TANGO_HORIZON_TEAM[index];
                    const isMilagros = member.name.toLowerCase().includes('milagros');
                    const roleBadgeText = isMilagros
                      ? 'Full Stack & 3D'
                      : resolveBadgeText(profile?.roleBadge, lang);
                    return (
                      <div key={member.name} className="th-project-member-card">
                        <div className="th-project-member-head">
                          {profile?.avatarUrl ? (
                            <img
                              src={profile.avatarUrl}
                              alt={member.name}
                              className="th-project-member-avatar"
                            />
                          ) : (
                            <span className="th-project-member-monogram" aria-hidden="true">
                              {member.name
                                .split(' ')
                                .map((part) => part[0])
                                .join('')
                                .slice(0, 2)}
                            </span>
                          )}
                          <div>
                            <h3 className="th-project-member-name">{member.name}</h3>
                            <p className="th-project-member-role">{member.role}</p>
                            <span className="th-project-member-aff">{member.affiliation}</span>
                          </div>
                        </div>

                        {roleBadgeText && (
                          <span className="th-project-member-badge th-mono">
                            <Sparkles size={12} aria-hidden="true" />
                            <span>{roleBadgeText}</span>
                          </span>
                        )}

                        {member.links.length > 0 && (
                          <div className="th-project-member-links">
                            {member.links.map((linkItem) => (
                              <a
                                key={linkItem.url}
                                href={linkItem.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="th-home__team-chip"
                              >
                                <span>{linkItem.label}</span>
                                <ExternalLink size={12} aria-hidden="true" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="th-project-footer-actions">
                  <Link href="/" className="ac-readmore-wrap" style={{ textDecoration: 'none' }}>
                    <GlassSurface
                      width="auto"
                      height={44}
                      borderRadius={2}
                      borderWidth={0.1}
                      brightness={52}
                      opacity={0.94}
                      blur={10}
                      displace={0.45}
                      backgroundOpacity={0.12}
                      saturation={1.25}
                      distortionScale={-120}
                      redOffset={12}
                      greenOffset={5}
                      blueOffset={0}
                      className="ac-glass-btn-surface"
                    >
                      <span className="ac-readmore-label" style={{ padding: '0 1.4rem' }}>
                        <ArrowLeft size={15} className="ac-readmore-arrow-left" aria-hidden="true" />
                        <span>{pickLang(PROJECT_UI_COPY.backHomePath, lang)}</span>
                      </span>
                    </GlassSurface>
                  </Link>

                  <Link
                    href="/equipo"
                    className="ac-readmore-wrap"
                    style={{ textDecoration: 'none' }}
                  >
                    <GlassSurface
                      width="auto"
                      height={44}
                      borderRadius={2}
                      borderWidth={0.12}
                      brightness={52}
                      opacity={0.95}
                      blur={10}
                      displace={0.5}
                      backgroundOpacity={0.14}
                      saturation={1.3}
                      distortionScale={-120}
                      redOffset={12}
                      greenOffset={5}
                      blueOffset={0}
                      className="ac-glass-btn-surface"
                    >
                      <span className="ac-readmore-label" style={{ padding: '0 1.5rem' }}>
                        <Users size={16} style={{ color: '#fbbf24' }} aria-hidden="true" />
                        <span>{pickLang(PROJECT_UI_COPY.exploreTeamBtn, lang)}</span>
                      </span>
                    </GlassSurface>
                  </Link>

                  <a
                    href={SIMULATOR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ac-readmore-wrap"
                    style={{ textDecoration: 'none' }}
                  >
                    <GlassSurface
                      width="auto"
                      height={44}
                      borderRadius={2}
                      borderWidth={0.12}
                      brightness={54}
                      opacity={0.96}
                      blur={12}
                      displace={0.5}
                      backgroundOpacity={0.18}
                      saturation={1.35}
                      distortionScale={-120}
                      redOffset={14}
                      greenOffset={6}
                      blueOffset={0}
                      className="ac-glass-btn-surface"
                    >
                      <span className="ac-readmore-label" style={{ padding: '0 1.5rem' }}>
                        <Rocket size={16} style={{ color: '#f97316' }} aria-hidden="true" />
                        <span>{pickLang(PROJECT_UI_COPY.launchSim, lang)}</span>
                        <ExternalLink size={14} style={{ color: '#fdba74' }} aria-hidden="true" />
                      </span>
                    </GlassSurface>
                  </a>
                </div>
              </div>
            </GlassSurface>
          </ElectricBorder>
        </section>
      </div>

      <style>{`
        .th-project-page,
        .th-project-page * {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
        }
        .th-project-page .th-mono,
        .th-project-page code {
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          font-variant-numeric: tabular-nums;
        }
        .th-project-page .ac-timeline-badge,
        .th-project-page .th-eyebrow {
          border-radius: 2px;
          background: rgba(249, 115, 22, 0.16);
          border: 1px solid rgba(251, 146, 60, 0.48);
          color: #fdba74;
        }
        .th-project-page .era-detail-period-pill {
          border-radius: 2px;
          background: #1c0e13;
          color: #fdba74;
        }
        .th-project-page .th-section-title {
          color: #fff8f1;
          font-weight: 800;
          letter-spacing: -0.02em;
        }
        .th-project-page .th-lead {
          color: #f3dfd1;
        }
        .th-project-page .th-stack-chip {
          border-radius: 2px;
          background: #1c0e13;
          border: 1px solid rgba(251, 146, 60, 0.34);
          color: #f3dfd1;
          font-family: var(--font-raleway), 'Raleway', sans-serif;
          font-variant-numeric: tabular-nums;
        }
        .th-project-page .th-stack-chip:hover {
          border-color: #f97316;
          color: #fff8f1;
        }
        .th-project-page .th-project__card,
        .th-project-page .th-project__step {
          border-radius: 2px;
          background: rgba(26, 12, 17, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.22);
        }
        .th-project-page .th-project__card:hover {
          border-color: rgba(251, 146, 60, 0.56);
        }
        .th-project-page .th-home__team-chip {
          border-radius: 2px;
          background: #140a0e;
          border: 1px solid rgba(251, 146, 60, 0.34);
          color: #f3dfd1;
        }
        .th-project-page .th-home__team-chip:hover,
        .th-project-page .th-home__team-chip:focus-visible {
          border-color: #f97316;
          background: rgba(249, 115, 22, 0.16);
          color: #fff8f1;
        }
        .th-project-page .ac-glass-btn-surface {
          border-radius: 2px;
          border: 1px solid rgba(251, 146, 60, 0.45);
          background: rgba(26, 12, 17, 0.84);
          box-shadow: 0 6px 18px rgba(10, 4, 6, 0.45);
        }
        .th-project-page .ac-readmore-wrap:hover {
          filter: drop-shadow(0 0 14px rgba(249, 115, 22, 0.38));
        }
        .th-project-page .ac-readmore-label {
          color: #fff8f1;
          font-weight: 700;
        }
        .th-project-page .ac-readmore-arrow,
        .th-project-page .ac-readmore-arrow-left {
          color: #fb923c;
        }
        .th-project-divider {
          width: 100%;
          border-top: 1px solid rgba(255, 255, 255, 0.24);
        }
        .th-project-landing {
          display: flex;
          flex-direction: column;
          gap: 2.6rem;
        }
        .th-project-section {
          display: flex;
          flex-direction: column;
          gap: 1.55rem;
        }
        .th-project-section-head {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.45rem;
        }
        .th-project-hero-inner {
          width: 100%;
          padding: 2.4rem 2.3rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 1.2rem;
        }
        .th-project-hero-visuals {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 2.4rem;
          margin-bottom: 0.35rem;
        }
        .th-project-patch-col {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }
        .th-project-patch-wrap {
          width: 196px;
          height: 196px;
          background: transparent;
          border: none;
          box-shadow: none;
          padding: 0;
        }
        .th-project-patch-img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 2px;
          background: transparent;
          display: block;
        }
        .th-project-patch-caption {
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          color: #fdba74;
          padding: 0.28rem 0.8rem;
          border-radius: 2px;
          background: #1c0e13;
          border: 1px solid rgba(251, 146, 60, 0.38);
        }
        .th-project-mars-col {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .th-project-hero-title {
          margin: 0;
          max-width: 900px;
          font-size: clamp(2rem, 4.1vw, 3.35rem);
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -0.02em;
          color: #fff8f1;
          text-shadow: 0 2px 24px rgba(249, 115, 22, 0.28);
        }
        .th-project-hero-subtitle {
          margin: 0;
          max-width: 820px;
          font-size: clamp(1.08rem, 1.6vw, 1.28rem);
          line-height: 1.65;
          color: #fdba74;
          font-weight: 600;
        }
        .th-project-hero-summary {
          margin: 0;
          max-width: 900px;
          font-size: 1rem;
          line-height: 1.75;
          color: #f3dfd1;
        }
        .th-project-kpi-strip {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.55rem;
          list-style: none;
          padding: 0;
          margin: 0.35rem 0;
        }
        .th-project-hero-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 0.9rem;
          margin-top: 0.4rem;
        }
        .th-project-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .th-project-card-badge {
          font-size: 0.74rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .th-project-icon-title {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .th-project-metric-pill {
          font-size: 0.74rem;
          color: #fdba74;
          padding: 0.22rem 0.65rem;
          border-radius: 2px;
          background: #140a0e;
          border: 1px solid rgba(251, 146, 60, 0.34);
        }
        .th-project-card-title {
          margin: 0;
          font-size: 1.18rem;
          font-weight: 800;
          color: #fff8f1;
          line-height: 1.3;
        }
        .th-project-card-desc {
          margin: 0;
          font-size: 0.96rem;
          line-height: 1.68;
          color: #f3dfd1;
        }
        .th-project-voice-ribbon {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 0.9rem;
          padding: 1.1rem 1.3rem;
          border-radius: 2px;
          background: #1c0e13;
          border: 1px solid rgba(255, 255, 255, 0.24);
        }
        .th-project-voice-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          color: #f3dfd1;
          line-height: 1.45;
        }
        .th-project-2col-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.35rem;
        }
        .th-project-3col-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
        }
        .th-project-tiers-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 1.25rem;
        }
        .th-project-bullet-list {
          margin: 0.25rem 0 0 0;
          padding-left: 1.15rem;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          font-size: 0.9rem;
          line-height: 1.58;
          color: #c4a99a;
        }
        .th-project-stack-wrap {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .th-project-stack-header {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .th-project-stack-header h3 {
          margin: 0;
          font-size: 1.2rem;
          font-weight: 800;
          color: #fff8f1;
        }
        .th-project-stack-list {
          margin: 0;
          padding-left: 1.05rem;
          display: flex;
          flex-direction: column;
          gap: 0.42rem;
          font-size: 0.82rem;
          line-height: 1.55;
          color: #f3dfd1;
        }
        .th-project-agent-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .th-project-agent-chip,
        .th-project-actor-chip {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.65rem;
          border-radius: 2px;
          background: #140a0e;
          border: 1px solid rgba(251, 146, 60, 0.34);
          font-size: 0.74rem;
          font-weight: 600;
          color: #f3dfd1;
        }
        .th-project-model-matrix {
          margin: 0.4rem 0 0 0;
          padding: 0.85rem 1rem;
          border-radius: 2px;
          background: #140a0e;
          border: 1px solid rgba(255, 255, 255, 0.18);
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
          font-size: 0.77rem;
        }
        .th-project-model-matrix div {
          display: flex;
          flex-direction: column;
          gap: 0.12rem;
        }
        .th-project-model-matrix dt {
          color: #c4a99a;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .th-project-model-matrix dd {
          margin: 0;
          color: #fff8f1;
        }
        .th-project-guardian-box {
          width: 100%;
          padding: 2rem 2.1rem;
          display: flex;
          flex-direction: column;
          gap: 1.4rem;
        }
        .th-project-guardian-head {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding-bottom: 0.9rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.22);
        }
        .th-project-guardian-title {
          margin: 0.25rem 0 0 0;
          font-size: 1.3rem;
          font-weight: 800;
          color: #fff8f1;
        }
        .th-project-subpanel {
          padding: 1.25rem 1.35rem;
          border-radius: 2px;
          background: #1c0e13;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          flex-direction: column;
          gap: 0.55rem;
        }
        .th-project-subpanel-title {
          margin: 0;
          font-size: 1.06rem;
          font-weight: 800;
          color: #fff8f1;
        }
        .th-project-module-ref {
          font-size: 0.74rem;
          color: #fdba74;
        }
        .th-project-subpanel-summary {
          margin: 0;
          font-size: 0.9rem;
          line-height: 1.6;
          color: #f3dfd1;
        }
        .th-project-ml-meta {
          margin: 0;
          font-size: 0.86rem;
          line-height: 1.55;
          color: #f3dfd1;
        }
        .th-project-ml-meta strong {
          color: #fbbf24;
        }
        .th-project-step-title {
          margin: 0;
          font-size: 1.05rem;
          font-weight: 800;
          color: #fff8f1;
          line-height: 1.35;
        }
        .th-project-step-telemetry {
          font-size: 0.76rem;
          color: #fdba74;
          padding: 0.45rem 0.7rem;
          border-radius: 2px;
          background: #140a0e;
          border: 1px solid rgba(251, 146, 60, 0.34);
        }
        .th-project-team-card {
          width: 100%;
          padding: 2.2rem 2.3rem;
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }
        .th-project-team-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 1.25rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.22);
        }
        .th-project-team-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1.2rem;
        }
        .th-project-member-card {
          padding: 1.3rem 1.4rem;
          border-radius: 2px;
          background: #1c0e13;
          border: 1px solid rgba(255, 255, 255, 0.2);
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }
        .th-project-member-head {
          display: flex;
          align-items: center;
          gap: 0.9rem;
        }
        .th-project-member-avatar,
        .th-project-member-monogram {
          width: 54px;
          height: 54px;
          border-radius: 2px;
          object-fit: cover;
          object-position: center top;
          flex-shrink: 0;
          border: 1px solid rgba(251, 146, 60, 0.48);
        }
        .th-project-member-monogram {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: #140a0e;
          color: #fb923c;
          font-weight: 800;
          font-size: 1rem;
        }
        .th-project-member-name {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 800;
          color: #fff8f1;
        }
        .th-project-member-role {
          margin: 0.15rem 0 0 0;
          font-size: 0.88rem;
          color: #fdba74;
          font-weight: 600;
        }
        .th-project-member-aff {
          font-size: 0.78rem;
          color: #c4a99a;
        }
        .th-project-member-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          align-self: flex-start;
          padding: 0.22rem 0.7rem;
          border-radius: 2px;
          background: rgba(249, 115, 22, 0.14);
          border: 1px solid rgba(251, 146, 60, 0.36);
          color: #fbbf24;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .th-project-member-links {
          display: flex;
          flex-wrap: wrap;
          gap: 0.45rem;
        }
        .th-project-footer-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: center;
          gap: 0.9rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.22);
        }
        @media (max-width: 1024px) {
          .th-project-tiers-grid,
          .th-project-3col-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 820px) {
          .th-project-2col-grid,
          .th-project-team-grid {
            grid-template-columns: 1fr;
          }
          .th-project-hero-inner,
          .th-project-guardian-box,
          .th-project-team-card {
            padding: 1.5rem 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}

export default ProjectLandingView;
