import type { BiText, SiteLang } from '@/context/LanguageContext';
import { SIMULATOR_URL } from '@/data/projectOverview';

export const SLIDES_SOURCE_URL =
  'https://github.com/agustindiazcano/nasa-mars-tango-horizon/blob/main/docs/slides/SLIDES.md';
export const REMOTE_POINTER_URL = `${SIMULATOR_URL}/remote`;
export const AFAW_METHODOLOGY_URL =
  'https://github.com/agustindiazcano/afaw-anti-fragile-agentic-workflow';

export const TEAM_CREW_LIST: readonly string[] = [
  'Agustin Diaz-Cano',
  'Baltazar Salerno',
  'Milagros Sotelo',
  'Federico Yaconis',
];

export interface SlideMetricBadge {
  label: BiText;
  value: string;
  accent?: string;
}

export interface SlideVisualImage {
  src: string;
  alt: BiText;
  title: BiText;
  caption: BiText;
}

export interface SlideTwoColumn {
  leftTitle: BiText;
  leftItems: BiText[];
  rightTitle: BiText;
  rightItems: BiText[];
}

export interface SlideSpeakerCue {
  duration: string;
  sceneRef: BiText;
  script: BiText;
}

export interface SlideLinkItem {
  label: BiText;
  url: string;
  hint?: BiText;
  primary?: boolean;
}

export interface SlideVisualBlock {
  kind: 'hero-patch' | 'mars-globe' | 'architecture' | 'ml-charts' | 'telemetry' | 'closing';
  badge: BiText;
  headline: BiText;
  summary: BiText;
  images?: SlideVisualImage[];
  specs?: BiText[];
}

export interface SlideDeckItem {
  number: number;
  code: string;
  accent: string;
  eyebrow: BiText;
  title: BiText;
  subtitle: BiText;
  tagline?: BiText;
  bullets: BiText[];
  metrics: SlideMetricBadge[];
  speakerCue: SlideSpeakerCue;
  visual: SlideVisualBlock;
  twoColumn?: SlideTwoColumn;
  links?: SlideLinkItem[];
  teamMembers?: readonly string[];
}

export interface ResolvedSlideDeckItem {
  number: number;
  code: string;
  accent: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  tagline?: string;
  bullets: string[];
  metrics: {
    label: string;
    value: string;
    accent?: string;
  }[];
  speakerCue: {
    duration: string;
    sceneRef: string;
    script: string;
  };
  visual: {
    kind: SlideVisualBlock['kind'];
    badge: string;
    headline: string;
    summary: string;
    images?: {
      src: string;
      alt: string;
      title: string;
      caption: string;
    }[];
    specs?: string[];
  };
  twoColumn?: {
    leftTitle: string;
    leftItems: string[];
    rightTitle: string;
    rightItems: string[];
  };
  links?: {
    label: string;
    url: string;
    hint?: string;
    primary?: boolean;
  }[];
  teamMembers?: readonly string[];
}

export const SLIDES_DECK: SlideDeckItem[] = [
  {
    number: 1,
    code: '01',
    accent: '#fbbf24',
    eyebrow: {
      en: 'Slide 01 · Title & Vision',
      es: 'Slide 01 · Portada y Visión',
    },
    title: {
      en: 'Tango Horizon — Autonomous Multi-Agent Mars Surface Operations, Robotics & Climate Simulator',
      es: 'Tango Horizon — Simulador Autónomo Multi-Agente de Operaciones, Robótica y Clima en Marte',
    },
    subtitle: {
      en: 'Hands-Free 5-Language Voice · Real NASA/USGS Gale Crater Cartography · Deterministic Physics · Predictive RAG · Custom ML',
      es: 'Voz Manos Libres en 5 Idiomas · Cartografía Real NASA/USGS del Cráter Gale · Física Determinista · RAG Predictivo · ML Propio',
    },
    tagline: {
      en: 'Not a game: a real-time 3D engineering, robotics, and bioastronautics simulation for crew safety on Mars.',
      es: 'No es un juego: es una simulación 3D en tiempo real de ingeniería, robótica y bioastronáutica para la seguridad de la tripulación en Marte.',
    },
    bullets: [
      {
        en: 'Real-time 60 FPS WebGL2 reconstruction of a 4 km × 4 km Gale Crater sector anchored to 1 m/px MRO HiRISE DTM and 0.25 m/px orthoimagery.',
        es: 'Reconstrucción WebGL2 a 60 FPS de un sector de 4 km × 4 km en el Cráter Gale sobre DTM MRO HiRISE (1 m/px) y ortoimagen (0.25 m/px).',
      },
      {
        en: '20-module Mars habitat complex, rocket launch pad, 4 EVA astronauts (SOTELO, YACONIS, SALERNO, DIAZ-CANO), and 7 autonomous rovers & rotorcraft.',
        es: 'Complejo de hábitat marciano de 20 módulos, plataforma de cohetes, 4 astronautas EVA (SOTELO, YACONIS, SALERNO, DIAZ-CANO) y 7 rovers y aeronaves autónomas.',
      },
      {
        en: '100% hands-free 5-language voice interface, <2 ms in-memory BM25 RAG, 3 NASA PDS ML models, and 14 AI agents governed by 3-layer GUARDIAN safety.',
        es: 'Interfaz 100% manos libres por voz en 5 idiomas, RAG BM25 en memoria (<2 ms), 3 modelos ML sobre datos NASA PDS y 14 agentes bajo seguridad GUARDIAN de 3 capas.',
      },
    ],
    metrics: [
      { label: { en: 'Terrain Grid', es: 'Grilla de Terreno' }, value: '4×4 km · 1 m/px', accent: '#fbbf24' },
      { label: { en: 'Multi-Agent AI', es: 'IA Multi-Agente' }, value: '14 Agents · 6 MCP', accent: '#fb7185' },
      { label: { en: 'Voice Control', es: 'Control por Voz' }, value: '5 Languages', accent: '#f97316' },
      { label: { en: 'Render Target', es: 'Fluidez Visual' }, value: '60 FPS WebGL2', accent: '#fdba74' },
    ],
    visual: {
      kind: 'hero-patch',
      badge: {
        en: 'CAM-1 / S1 · GALE CRATER 137.400°E, 4.589°S',
        es: 'CAM-1 / S1 · CRÁTER GALE 137.400°E, 4.589°S',
      },
      headline: {
        en: 'Official Mission Patch & Wide Shot of the 20-Module Mars Base',
        es: 'Emblema Oficial de Misión y Vista General de la Base de 20 Módulos',
      },
      summary: {
        en: 'Built for the NASA Space Apps Challenge 2026 (Buenos Aires), integrating 57 SHA-256 provenance entries across 9 NASA/USGS data sources.',
        es: 'Desarrollado para el NASA Space Apps Challenge 2026 (Buenos Aires), integrando 57 activos trazables SHA-256 de 9 fuentes NASA y USGS.',
      },
      images: [
        {
          src: '/images/tango-horizon-mars-exploration-logo.jpeg',
          alt: {
            en: 'Official Tango Horizon mission patch showing Mars habitat, EVA operations, and Gale Crater.',
            es: 'Emblema oficial de Tango Horizon mostrando hábitat marciano, operaciones EVA y el Cráter Gale.',
          },
          title: {
            en: 'Tango Horizon Mission Patch',
            es: 'Emblema de Misión Tango Horizon',
          },
          caption: {
            en: '20-Module Habitat · Rocket Pad · Gale Crater DEM',
            es: 'Hábitat 20 Módulos · Plataforma de Cohetes · DEM Cráter Gale',
          },
        },
      ],
      specs: [
        { en: 'Base Sector: conae-base-mars (137.400°E, 4.589°S)', es: 'Sector Base: conae-base-mars (137.400°E, 4.589°S)' },
        { en: 'Crew: SOTELO · YACONIS · SALERNO · DIAZ-CANO', es: 'Tripulación: SOTELO · YACONIS · SALERNO · DIAZ-CANO' },
      ],
    },
    speakerCue: {
      duration: '0:00 – 0:25',
      sceneRef: {
        en: 'On screen: Aerial view of the Gale Crater Base (Scene S1 / CAM-1)',
        es: 'En pantalla: Vista aérea de la Base en el Cráter Gale (Escena S1 / CAM-1)',
      },
      script: {
        en: 'Tango Horizon is not a game—it is a real-time 3D Mars mission operations, robotics, and climate simulator built over real NASA laser altimetry, engineered to keep a four-astronaut EVA crew safe through hierarchical multi-agent AI and 100% hands-free voice control in 5 languages.',
        es: 'Tango Horizon no es un juego: es un simulador de operaciones de misión, robótica y clima en 3D en tiempo real construido sobre topografía láser real de la NASA, diseñado para proteger a una tripulación de cuatro astronautas mediante IA multi-agente jerárquica y control 100% manos libres por voz en 5 idiomas.',
      },
    },
  },
  {
    number: 2,
    code: '02',
    accent: '#fb923c',
    eyebrow: {
      en: 'Slide 02 · The Operational Problem on Mars',
      es: 'Slide 02 · El Problema Operativo en Marte',
    },
    title: {
      en: 'Why Autonomous Local Operations on Mars?',
      es: '¿Por Qué Operaciones Locales Autónomas en Marte?',
    },
    subtitle: {
      en: 'Earth-Mars light-speed latency, pressurized suit dexterity limits, and seconds-critical surface hazards make Earth-in-the-loop control impossible.',
      es: 'El retardo electromagnético Tierra-Marte, la rigidez de los trajes presurizados y emergencias de segundos vuelven inviable esperar a Houston.',
    },
    bullets: [
      {
        en: '4 to 24 minutes one-way radio delay between Earth and Mars (up to 48 minutes round-trip), plus total communication blackouts during solar conjunctions.',
        es: '4 a 24 minutos de retardo unidireccional entre la Tierra y Marte (hasta 48 minutos ida y vuelta), además de cortes totales en conjunción solar.',
      },
      {
        en: 'Pressurized EVA suits (29.6 kPa / 4.3 psi pure O₂) restrict finger and wrist dexterity—astronauts climbing crater slopes need 100% hands-free voice and visor HUD control.',
        es: 'Los trajes EVA presurizados (29.6 kPa / 4.3 psi de O₂ puro) restringen la destreza manual: los astronautas necesitan control 100% manos libres por voz y visor HUD.',
      },
      {
        en: 'Sudden suit punctures (-0.12 kPa/s), metabolic overload, dust storms (τ > 1.5), or DONKI solar particle events (SEP) leave zero margin to wait for Earth commands.',
        es: 'Micro-perforaciones de traje (-0.12 kPa/s), sobrecarga metabólica, tormentas de polvo (τ > 1.5) o eventos de partículas solares (SEP) no dejan margen para esperar a la Tierra.',
      },
      {
        en: 'Architectural Solution: Local-ready 14-agent AI + deterministic @th/shared physics + autonomous robotic fleet engineered to run inside the Martian habitat compute module.',
        es: 'Solución Arquitectónica: IA multi-agente local de 14 agentes + física determinista @th/shared + flota robótica autónoma diseñada para correr en el módulo compute del hábitat.',
      },
    ],
    metrics: [
      { label: { en: 'Radio Latency', es: 'Latencia Radio' }, value: '4–24 min (48 RT)', accent: '#fb923c' },
      { label: { en: 'EVA Suit Pressure', es: 'Presión Traje EVA' }, value: '29.6 kPa Pure O₂', accent: '#fdba74' },
      { label: { en: 'Martian Gravity', es: 'Gravedad Marciana' }, value: '3.72076 m/s²', accent: '#fbbf24' },
      { label: { en: 'Local Execution', es: 'Ejecución Local' }, value: 'In-Habitat Ready', accent: '#ea580c' },
    ],
    visual: {
      kind: 'mars-globe',
      badge: {
        en: 'GALE CRATER ENVIRONMENT · 0.379 g · ~610 Pa CO₂',
        es: 'ENTORNO CRÁTER GALE · 0.379 g · ~610 Pa CO₂',
      },
      headline: {
        en: 'Autonomous Habitat Compute vs. 48-Minute Round-Trip Delay',
        es: 'Cómputo Autónomo en Hábitat vs. Retardo de 48 Minutos Ida y Vuelta',
      },
      summary: {
        en: 'Stateless TypeScript physics and in-memory MCP servers allow the same mission runtime deployed on Cloud Run to operate locally on Mars surface hardware.',
        es: 'La física determinista en TypeScript y los servidores MCP en memoria permiten ejecutar el mismo runtime de Cloud Run directamente sobre hardware local en la superficie marciana.',
      },
      images: [
        {
          src: '/images/mars-texture.jpg.jpeg',
          alt: {
            en: 'Mars surface cartography texture representing Gale Crater and Martian environmental conditions.',
            es: 'Textura cartográfica de Marte representando el Cráter Gale y sus condiciones ambientales.',
          },
          title: {
            en: 'Mars Surface Telemetry Envelope',
            es: 'Envolvente Telemétrica en Superficie',
          },
          caption: {
            en: '148 K – 293 K Surface Temp · 0.020 kg/m³ Air Density · Dust τ = 0.5 → 6.0',
            es: 'Temp. 148 K – 293 K · Densidad 0.020 kg/m³ · Polvo τ = 0.5 → 6.0',
          },
        },
      ],
      specs: [
        { en: 'Zero Earth dependency during life-critical EVA anomalies', es: 'Cero dependencia de la Tierra ante anomalías EVA críticas' },
        { en: 'Offline deterministic fallback (offline.ts) guarantees continuity', es: 'Fallback determinista offline (offline.ts) garantiza continuidad' },
      ],
    },
    speakerCue: {
      duration: '0:05 – 0:25',
      sceneRef: {
        en: 'On screen: Gale Crater terrain & pressurized EVA crew telemetry',
        es: 'En pantalla: Terreno del Cráter Gale y telemetría de tripulación EVA',
      },
      script: {
        en: 'Imagine four astronauts walking across Gale Crater wearing 29.6 kPa pressurized gloves with finite oxygen reserves. Any radio signal to Earth takes up to 24 minutes one way. When a suit leak, dust storm, or crater fall strikes, Earth cannot help in time—so the habitat itself must think and act locally.',
        es: 'Imaginen cuatro astronautas caminando sobre el Cráter Gale con guantes presurizados a 29.6 kPa y reservas finitas de oxígeno. Cualquier señal a la Tierra tarda hasta 24 minutos por tramo. Ante una fuga, tormenta de polvo o caída en una fosa, la Tierra no llega a tiempo: la propia base debe decidir y actuar localmente.',
      },
    },
  },
  {
    number: 3,
    code: '03',
    accent: '#fb7185',
    eyebrow: {
      en: 'Slide 03 · Multi-Agent AI Architecture',
      es: 'Slide 03 · Arquitectura Multi-Agente Jerárquica',
    },
    title: {
      en: '14-Agent Hierarchy, 6 In-Process MCP Servers & 3-Provider Failover',
      es: 'Jerarquía de 14 Agentes, 6 Servidores MCP en Proceso y Failover Tri-Proveedor',
    },
    subtitle: {
      en: 'Three specialized model tiers routed over InMemoryTransport with zero network hop and deterministic offline continuity.',
      es: 'Tres niveles de modelos especializados conectados vía InMemoryTransport sin salto de red y con continuidad determinista offline.',
    },
    bullets: [
      {
        en: 'Fast Reflex (SUIT.VOICE-EXEC): Gemini 4 Hydrogen (~400–600 ms voice execution, <5 ms local intents) handles HUD layers, consumables, and capture_vision.',
        es: 'Reflejo Rápido (SUIT.VOICE-EXEC): Gemini 4 Hydrogen (~400–600 ms en voz, <5 ms intenciones locales) resuelve capas HUD, consumibles y capture_vision.',
      },
      {
        en: 'Base Orchestrator (BASE): Gemini 4 Carbon (MAX_TURNS = 6) prioritizes crew survival over science, reads live 360° LiDAR, and coordinates rescues.',
        es: 'Orquestador Base (BASE): Gemini 4 Carbon (MAX_TURNS = 6) prioriza supervivencia sobre ciencia, lee LiDAR 360° en vivo y coordina rescates.',
      },
      {
        en: '5 Domain Specialists + 7 Robot Agents (ROBOT.<id>): Gemini 4 Argon powering SUIT.HEALTH, EVA-PLANNER, SCIENCE, WEATHER-RAD, MAINTENANCE, and 7 autonomous vehicles.',
        es: '5 Especialistas de Dominio + 7 Agentes Robóticos (ROBOT.<id>): Gemini 4 Argon impulsando SUIT.HEALTH, EVA-PLANNER, SCIENCE, WEATHER-RAD, MAINTENANCE y 7 vehículos autónomos.',
      },
      {
        en: '3-Provider Failover & AFAW Methodology: Google Cloud Vertex AI → Google AI Studio → Meta Muse (muse-wonder-1.0 / muse-spark-1.3) → offline.ts; built via our AFAW workflow.',
        es: 'Failover Tri-Proveedor y Metodología AFAW: Google Cloud Vertex AI → Google AI Studio → Meta Muse (muse-wonder-1.0 / muse-spark-1.3) → offline.ts; coordinado con AFAW.',
      },
    ],
    metrics: [
      { label: { en: 'Total Agents', es: 'Agentes Totales' }, value: '14 AI Agents', accent: '#fb7185' },
      { label: { en: 'MCP Transport', es: 'Transporte MCP' }, value: '6 InMemory', accent: '#fbbf24' },
      { label: { en: 'Voice Reflex', es: 'Reflejo de Voz' }, value: '~400–600 ms', accent: '#f97316' },
      { label: { en: 'Failover Chain', es: 'Cadena Failover' }, value: '3 Clouds + Offline', accent: '#fb923c' },
    ],
    visual: {
      kind: 'architecture',
      badge: {
        en: 'IN-PROCESS MCP (@modelcontextprotocol/sdk) · ZERO NETWORK HOP',
        es: 'MCP EN PROCESO (@modelcontextprotocol/sdk) · CERO SALTO DE RED',
      },
      headline: {
        en: '3-Tier Model Routing + AFAW Multi-Agent Engineering',
        es: 'Enrutamiento en 3 Niveles + Ingeniería Multi-Agente AFAW',
      },
      summary: {
        en: 'Six dedicated in-process MCP servers expose telemetry, medical RAG, HiRISE routing, robotic IK, weather/ML models, and GUARDIAN validation directly in Fastify 5.',
        es: 'Seis servidores MCP en proceso exponen telemetría, RAG médico, rutas HiRISE, cinemática IK, modelos ML/clima y validación GUARDIAN directamente dentro de Fastify 5.',
      },
      specs: [
        { en: 'Tier 1 Fast: SUIT.VOICE-EXEC → gemini-4-hydrogen / muse-spark-1.3', es: 'Nivel 1 Rápido: SUIT.VOICE-EXEC → gemini-4-hydrogen / muse-spark-1.3' },
        { en: 'Tier 2 Strategic: BASE → gemini-4-carbon / muse-wonder-1.0', es: 'Nivel 2 Estratégico: BASE → gemini-4-carbon / muse-wonder-1.0' },
        { en: 'Tier 3 Specialists (×5) + Robots (×7): gemini-4-argon / muse-wonder-1.0', es: 'Nivel 3 Especialistas (×5) + Robots (×7): gemini-4-argon / muse-wonder-1.0' },
        { en: 'Coordinated via AFAW (Anti-Fragile Agentic Workflow)', es: 'Coordinado mediante AFAW (Anti-Fragile Agentic Workflow)' },
      ],
    },
    speakerCue: {
      duration: '0:25 – 0:42',
      sceneRef: {
        en: 'On screen: 14-Agent hierarchy diagram & Vertex AI / Meta Muse failover',
        es: 'En pantalla: Diagrama de los 14 agentes y failover Vertex AI / Meta Muse',
      },
      script: {
        en: 'Our multi-agent hierarchy pairs three tiers on Google Cloud Vertex AI: Gemini 4 Hydrogen for sub-second voice reflexes, Gemini 4 Carbon as the central Base Orchestrator, and Gemini 4 Argon for five domain specialists plus seven autonomous robot agents—all backed by Meta Muse failover and an offline deterministic engine.',
        es: 'Nuestra jerarquía multi-agente combina tres niveles en Google Cloud Vertex AI: Gemini 4 Hydrogen para reflejos rápidos de voz, Gemini 4 Carbon como Orquestador Central de Base y Gemini 4 Argon para cinco especialistas de dominio y siete agentes robóticos, respaldados por failover a Meta Muse y un motor determinista offline.',
      },
    },
  },
  {
    number: 4,
    code: '04',
    accent: '#f97316',
    eyebrow: {
      en: 'Slide 04 · Hands-Free Voice & Mobile Pointer',
      es: 'Slide 04 · Voz Manos Libres y Puntero Móvil',
    },
    title: {
      en: '5-Language Bidirectional Voice, Apollo Quindar & /remote QR Pointer',
      es: 'Voz Bidireccional en 5 Idiomas, Tonos Quindar y Puntero QR /remote',
    },
    subtitle: {
      en: 'Keyboard-free helmet visor control in EN, ES, FR, DE, and IT with <5 ms local critical intents and sub-16 ms WebSocket gyroscope pointing.',
      es: 'Control sin teclado sobre visor curvo en EN, ES, FR, DE e IT con intenciones críticas locales (<5 ms) y puntero giroscópico WebSocket (<16 ms).',
    },
    bullets: [
      {
        en: 'Two-Stage Speech Recognition: <5 ms deterministic local intent engine (localIntents.ts) for safety-critical/HUD orders, plus Mars-glossary multimodal STT fallback (stt.ts).',
        es: 'Reconocimiento en Dos Etapas: motor local determinista (<5 ms, localIntents.ts) para órdenes críticas/HUD y respaldo STT multimodal normalizado por glosario marciano (stt.ts).',
      },
      {
        en: 'Google Cloud Neural TTS (Journey Voices): Natural spoken briefings across 5 languages framed by authentic NASA Apollo Quindar tones (2525 Hz intro / 2475 Hz outro, 300–3200 Hz bandpass).',
        es: 'Google Cloud Neural TTS (Voces Journey): Respuestas habladas naturales en 5 idiomas enmarcadas por tonos NASA Apollo Quindar reales (2525 Hz inicio / 2475 Hz cierre, pasabanda 300–3200 Hz).',
      },
      {
        en: 'Curved CSS3D Helmet Visor HUD: Real-time 32-band Web Audio FFT spectrum visualizer, language switcher, and dynamic QR pairing.',
        es: 'Visor Curvo CSS3D de Casco: Analizador de espectro FFT Web Audio de 32 bandas en vivo, selector de idioma y emparejamiento QR.',
      },
      {
        en: 'Phone-as-Pointer (/remote over /ws/remote): Sub-16 ms WebSocket gyroscope laser cursor across the 3D Gale Crater scene with Push-to-Talk and haptic vibration.',
        es: 'Puntero Móvil (/remote vía /ws/remote): Cursor giroscópico láser por WebSocket (<16 ms) sobre la escena 3D del Cráter Gale con Push-to-Talk y vibración háptica.',
      },
    ],
    metrics: [
      { label: { en: 'Supported Languages', es: 'Idiomas Soportados' }, value: 'EN · ES · FR · DE · IT', accent: '#f97316' },
      { label: { en: 'Local Voice Intent', es: 'Intención Local' }, value: '<5 ms', accent: '#fbbf24' },
      { label: { en: 'Visor Audio DSP', es: 'Audio DSP Visor' }, value: '32-Band FFT · Quindar', accent: '#fdba74' },
      { label: { en: 'Remote Gyro WS', es: 'Giroscopio /ws/remote' }, value: '<16 ms + Haptics', accent: '#fb7185' },
    ],
    visual: {
      kind: 'telemetry',
      badge: {
        en: 'CSS3D HELMET VISOR · QUINDAR 2525 / 2475 Hz',
        es: 'VISOR CASCO CSS3D · QUINDAR 2525 / 2475 Hz',
      },
      headline: {
        en: 'Zero-Keyboard Mission Control from Visor or Smartphone',
        es: 'Control de Misión Sin Teclado desde el Visor o el Teléfono',
      },
      summary: {
        en: 'Astronauts or reviewers scan the HUD QR code to aim directly at rocks, rovers, or pit rims while issuing voice commands in their native language.',
        es: 'Astronautas o evaluadores escanean el QR del HUD para apuntar directamente a rocas, rovers o bordes de fosa mientras emiten órdenes por voz en su idioma.',
      },
      specs: [
        { en: 'Stage 1: localIntents.ts (<5 ms regex + telemetry verbs)', es: 'Etapa 1: localIntents.ts (<5 ms regex + verbos de telemetría)' },
        { en: 'Stage 2: Multimodal STT conditioned on Gale Crater glossary', es: 'Etapa 2: STT Multimodal condicionado al glosario de Gale Crater' },
        { en: 'Output: Cloud Neural TTS Journey Voices + 32-band FFT canvas', es: 'Salida: Cloud Neural TTS Journey Voices + espectro FFT 32 bandas' },
        { en: 'Mobile Endpoint: https://tangohorizon.vercel.app/remote', es: 'Endpoint Móvil: https://tangohorizon.vercel.app/remote' },
      ],
    },
    speakerCue: {
      duration: '0:42 – 0:55',
      sceneRef: {
        en: 'On screen: Helmet HUD visor, 32-band FFT spectrum & QR /remote pointer',
        es: 'En pantalla: Visor HUD del casco, espectro FFT de 32 bandas y puntero QR /remote',
      },
      script: {
        en: 'Crew members operate completely hands-free in English, Spanish, French, German, or Italian. Critical commands execute locally in under 5 milliseconds, responses synthesize through Google Cloud Neural TTS with Apollo Quindar radio tones, and a QR-paired smartphone turns into a sub-16 ms 3D gyroscope pointer.',
        es: 'La tripulación opera 100% manos libres en inglés, español, francés, alemán o italiano. Las órdenes críticas se ejecutan localmente en menos de 5 milisegundos, las respuestas usan voces neuronales de Google Cloud con tonos Quindar y un teléfono emparejado por QR funciona como puntero giroscópico 3D en menos de 16 ms.',
      },
    },
  },
  {
    number: 5,
    code: '05',
    accent: '#fda4af',
    eyebrow: {
      en: 'Slide 05 · Predictive In-Memory RAG',
      es: 'Slide 05 · RAG Predictivo en Memoria',
    },
    title: {
      en: 'Predictive RAG (<2 ms BM25) for Health, Maintenance & Climate',
      es: 'RAG Predictivo (<2 ms BM25) para Salud, Mantenimiento y Clima',
    },
    subtitle: {
      en: '1,002 indexed chunks across 15 NASA standards with exact document and page citations—zero external database dependency.',
      es: '1,002 fragmentos indexados de 15 estándares NASA con citas exactas de documento y página, sin dependencia de base de datos externa.',
    },
    bullets: [
      {
        en: 'Zero-Latency BM25 Engine (k1 = 1.5, b = 0.75 over server/corpus/chunks.json): Retrieves authoritative NASA-STD-3001 Vol. 1 & 2, OCHMO, AMCL, MEDPRAT, Mars-GRAM, MCD v5.2, MSL RAD, and MOXIE passages in <2 ms.',
        es: 'Motor BM25 Sin Latencia (k1 = 1.5, b = 0.75 sobre server/corpus/chunks.json): Recupera citas exactas de NASA-STD-3001 Vol. 1 y 2, OCHMO, AMCL, MEDPRAT, Mars-GRAM, MCD v5.2, MSL RAD y MOXIE en <2 ms.',
      },
      {
        en: '1. Astronaut Health (SUIT.HEALTH): Sliding-slope time_to_breach_s across HR, SpO2, FiCO2, and suit dP/dt plus Casson/Quemada blood rheology digital twin vs. personal baselines.',
        es: '1. Salud del Astronauta (SUIT.HEALTH): Cálculo predictivo time_to_breach_s sobre HR, SpO2, FiCO2 y dP/dt más gemelo reológico sanguíneo Casson/Quemada frente a líneas base personales.',
      },
      {
        en: '2. Predictive Equipment Maintenance (MAINTENANCE): Aerospace FDIR with Remaining Useful Life (rul_s) for MOXIE O₂ solid-oxide electrolysis, solar arrays, PLSS, and batteries.',
        es: '2. Mantenimiento Predictivo (MAINTENANCE): FDIR aeroespacial con vida útil remanente (rul_s) para electrólisis sólida MOXIE, paneles solares, PLSS y baterías.',
      },
      {
        en: '3. Weather & Radiation (WEATHER-RAD): Tracks dust optical depth (τ), pressure drop (ΔP), DONKI CME/SEP alerts, and MSL RAD dose (233 µGy/d) with sky-view-factor (SVF) pit shielding.',
        es: '3. Clima y Radiación (WEATHER-RAD): Monitorea opacidad de polvo (τ), caída de presión (ΔP), alertas CME/SEP DONKI y dosis MSL RAD (233 µGy/d) con blindaje por sky-view-factor (SVF).',
      },
    ],
    metrics: [
      { label: { en: 'Retrieval Speed', es: 'Velocidad RAG' }, value: '<2 ms BM25', accent: '#fda4af' },
      { label: { en: 'Corpus Size', es: 'Tamaño Corpus' }, value: '1,002 Chunks', accent: '#fbbf24' },
      { label: { en: 'NASA Standards', es: 'Estándares NASA' }, value: '15 Documents', accent: '#fdba74' },
      { label: { en: 'External DB', es: 'Base Externa' }, value: '0 Dependencies', accent: '#ea580c' },
    ],
    visual: {
      kind: 'telemetry',
      badge: {
        en: 'CASSON BLOOD DIGITAL TWIN · FDIR RUL · NASA-STD-3001 CITATIONS',
        es: 'GEMELO SANGUÍNEO CASSON · FDIR RUL · CITAS NASA-STD-3001',
      },
      headline: {
        en: 'Three Predictive Operational Pillars Grounded in Flight Standards',
        es: 'Tres Pilares Predictivos Anclados a Estándares Aeroespaciales',
      },
      summary: {
        en: 'Instead of reacting after a threshold alarm fires, specialists extrapolate sliding telemetry slopes to compute time-to-breach and cite exact NASA remediation clauses.',
        es: 'En lugar de reaccionar tras sonar una alarma, los especialistas extrapolan pendientes telemétricas para estimar el tiempo a umbral y citar cláusulas NASA exactas.',
      },
      specs: [
        { en: 'Bio-Twin: Casson yield stress & Quemada viscosity under 0.379 g EVA', es: 'Bio-Gemelo: Tensión de fluencia Casson y viscosidad Quemada en EVA 0.379 g' },
        { en: 'FDIR: Detects wheel fault RVR-MOB-01 & MOXIE degradation early', es: 'FDIR: Detecta falla de rueda RVR-MOB-01 y degradación MOXIE anticipada' },
        { en: 'RAD Shielding: Sky-view-factor pit attenuation vs. GCR/SEP flux', es: 'Blindaje RAD: Atenuación por factor de cielo en fosa vs. flujo GCR/SEP' },
      ],
    },
    speakerCue: {
      duration: '0:55 – 1:15',
      sceneRef: {
        en: 'On screen: Casson Blood Digital Twin, FDIR maintenance alert & NASA-STD-3001 citation card',
        es: 'En pantalla: Gemelo sanguíneo Casson, alerta FDIR y tarjeta de cita NASA-STD-3001',
      },
      script: {
        en: 'While the crew works, the backend executes in-memory BM25 RAG in under 2 milliseconds across 1,002 chunks from 15 NASA standards including NASA-STD-3001—powering predictive astronaut health with a Casson blood twin, FDIR maintenance for MOXIE and rovers, and radiation alerts.',
        es: 'Mientras la tripulación opera, el backend ejecuta RAG BM25 en memoria en menos de 2 milisegundos sobre 1,002 fragmentos de 15 estándares incluyendo NASA-STD-3001, impulsando salud predictiva con gemelo sanguíneo Casson, mantenimiento FDIR de MOXIE y rovers, y alertas de radiación.',
      },
    },
  },
  {
    number: 6,
    code: '06',
    accent: '#f97316',
    eyebrow: {
      en: 'Slide 06 · 3 Custom ML Models on NASA PDS Data',
      es: 'Slide 06 · 3 Modelos Propios de ML sobre Datos NASA PDS',
    },
    title: {
      en: '3 Custom Machine Learning Models Validated on Real Curiosity & Orbiter Data',
      es: '3 Modelos de Machine Learning Validados con Datos Reales de Curiosity y Orbitadores',
    },
    subtitle: {
      en: 'Trained offline in Python with strict spatial GroupKFold, sol-grouped CV, and held-out Martian Year 34 storm splits—zero data leakage.',
      es: 'Entrenados offline en Python con GroupKFold espacial, validación agrupada por sol y test reservado en Año Marciano 34—cero fuga de datos.',
    },
    bullets: [
      {
        en: 'Hydration Prospector: 1,567 MSL Curiosity DAN neutron stops (377 in scene) + CRISM MTRDR + THEMIS IR + CTX; GradientBoosting ensemble + 90% conformal intervals → 500 m spatial GroupKFold Spearman = 0.5823 (p = 6.845e-143), blocked R² = 0.3638, MAE = 0.3695.',
        es: 'Hydration Prospector: 1,567 puntos de neutrones DAN de Curiosity (377 en escena) + CRISM MTRDR + THEMIS IR + CTX; ensemble GradientBoosting + intervalos conformales 90% → GroupKFold espacial 500 m Spearman = 0.5823 (p = 6.845e-143), R² bloqueado = 0.3638, MAE = 0.3695.',
      },
      {
        en: 'Storm Nowcaster: 3,953–4,050 sols of MSL REMS telemetry (28 features) + Mastcam 880 nm opacity; Quantile HistGradientBoostingRegressor (q10, q50, q90) + CQR → +1/+2/+3 sol Spearman = 0.777 / 0.765 / 0.796 on MY 34 test (captures Sol 2075 global storm; semidiurnal tide s2_amp Spearman = 0.6709).',
        es: 'Storm Nowcaster: 3,953–4,050 soles de telemetría MSL REMS (28 variables) + opacidad Mastcam 880 nm; HistGradientBoostingRegressor por cuantiles (q10, q50, q90) + CQR → Spearman +1/+2/+3 soles = 0.777 / 0.765 / 0.796 en test MY 34 (captura la tormenta global Sol 2075; precursor s2_amp Spearman = 0.6709).',
      },
      {
        en: 'Mineral Vein Detector: 117 audited real Curiosity Mastcam & MAHLI frames (41 positive, 76 negative across 22 sols); frozen Meta DINOv2 ViT-S/14 (384-d CLS + 32×32 patches) + LogisticRegression → 5-fold sol-grouped ROC-AUC = 0.8453, PR-AUC = 0.7961, F1 = 0.7200 (500-run permutation p = 0.0020).',
        es: 'Mineral Vein Detector: 117 frames reales auditados de Curiosity Mastcam y MAHLI (41 positivos, 76 negativos en 22 soles); embeddings congelados Meta DINOv2 ViT-S/14 (CLS 384-d + parches 32×32) + LogisticRegression → ROC-AUC = 0.8453, PR-AUC = 0.7961, F1 = 0.7200 (permutación 500 corridas p = 0.0020).',
      },
    ],
    metrics: [
      { label: { en: 'Hydration (1,567 DAN)', es: 'Hidratación (1,567 DAN)' }, value: 'Spearman 0.5823', accent: '#f97316' },
      { label: { en: 'Storm (3,953–4,050 sols)', es: 'Tormentas (3,953–4,050 sols)' }, value: 'Spearman 0.765–0.796', accent: '#fb923c' },
      { label: { en: 'Veins (117 Frames)', es: 'Vetas (117 Frames)' }, value: 'ROC-AUC 0.8453', accent: '#fda4af' },
      { label: { en: 'CV Policy', es: 'Política CV' }, value: 'Zero Leakage', accent: '#ea580c' },
    ],
    visual: {
      kind: 'ml-charts',
      badge: {
        en: 'EMPIRICAL VALIDATION CHARTS · NASA PDS BENCHMARKS',
        es: 'GRÁFICOS DE VALIDACIÓN EMPÍRICA · BENCHMARKS NASA PDS',
      },
      headline: {
        en: 'Three Leakage-Free Validation Figures from Python Training Pipelines',
        es: 'Tres Figuras de Validación Sin Fuga de Datos desde Python',
      },
      summary: {
        en: 'Each model runs real inference for science prospecting and flight safety—never evaluating on synthetic 3D renders for Mineral Vein Detection.',
        es: 'Cada modelo ejecuta inferencia real para prospección científica y seguridad de vuelo, evaluando vetas exclusivamente sobre fotografías reales Mastcam y MAHLI.',
      },
      images: [
        {
          src: '/images/slides/hydration_cv.png',
          alt: {
            en: 'Hydration Prospector spatial GroupKFold cross-validation figure over 1,567 MSL DAN neutron stops.',
            es: 'Figura de validación cruzada espacial GroupKFold de Hydration Prospector sobre 1,567 puntos DAN.',
          },
          title: {
            en: 'Hydration Prospector · DAN Spatial CV',
            es: 'Hydration Prospector · CV Espacial DAN',
          },
          caption: {
            en: '1,567 DAN stops · 500 m GroupKFold · Spearman = 0.5823 · R² = 0.3638',
            es: '1,567 puntos DAN · GroupKFold 500 m · Spearman = 0.5823 · R² = 0.3638',
          },
        },
        {
          src: '/images/slides/storm_tides.png',
          alt: {
            en: 'Storm Nowcaster validation plot showing REMS semidiurnal tide s2_amp precursor and MY 34 Sol 2075 dust storm forecast.',
            es: 'Gráfico de validación de Storm Nowcaster mostrando precursor de marea semidiurna REMS s2_amp y tormenta Sol 2075 MY 34.',
          },
          title: {
            en: 'Storm Nowcaster · REMS Tides & MY 34',
            es: 'Storm Nowcaster · Mareas REMS y MY 34',
          },
          caption: {
            en: '3,953–4,050 sols REMS · +1/+2/+3 sol Spearman 0.765–0.796 · CQR',
            es: '3,953–4,050 soles REMS · Spearman +1/+2/+3 sol 0.765–0.796 · CQR',
          },
        },
        {
          src: '/images/slides/veins_eval.png',
          alt: {
            en: 'Mineral Vein Detector ROC-AUC and Precision-Recall curves using DINOv2 ViT-S/14 over 117 Curiosity Mastcam/MAHLI frames.',
            es: 'Curvas ROC-AUC y Precision-Recall de Mineral Vein Detector con DINOv2 ViT-S/14 sobre 117 frames Mastcam/MAHLI.',
          },
          title: {
            en: 'Mineral Vein Detector · DINOv2 Eval',
            es: 'Mineral Vein Detector · Eval DINOv2',
          },
          caption: {
            en: '117 audited frames · Sol-grouped ROC-AUC = 0.8453 · PR-AUC = 0.7961',
            es: '117 frames auditados · ROC-AUC por sol = 0.8453 · PR-AUC = 0.7961',
          },
        },
      ],
    },
    speakerCue: {
      duration: '0:35 – 0:55',
      sceneRef: {
        en: 'On screen: Hydration map, 3-sol REMS storm forecast & DINOv2 mineral vein ROC curves',
        es: 'En pantalla: Mapa de hidratación, pronóstico de tormentas a 3 soles y curvas ROC de vetas DINOv2',
      },
      script: {
        en: 'We trained three custom ML models on real Curiosity datasets: Hydration Prospector over 1,567 DAN neutron stops (Spearman 0.5823); Storm Nowcaster over up to 4,050 sols of REMS pressure forecasting dust storms 3 sols ahead (Spearman 0.765–0.796); and Mineral Vein Detector using DINOv2 over 117 Mastcam and MAHLI frames (ROC-AUC 0.8453).',
        es: 'Entrenamos tres modelos de ML propios con datos reales de Curiosity: Hydration Prospector sobre 1,567 puntos de neutrones DAN (Spearman 0.5823); Storm Nowcaster sobre hasta 4,050 soles REMS anticipando tormentas a 3 soles (Spearman 0.765–0.796); y Mineral Vein Detector con DINOv2 sobre 117 frames Mastcam y MAHLI (ROC-AUC 0.8453).',
      },
    },
  },
  {
    number: 7,
    code: '07',
    accent: '#fdba74',
    eyebrow: {
      en: 'Slide 07 · Simulated Robotics, Vision & Ballistics',
      es: 'Slide 07 · Robótica Simulada, Visión y Balística',
    },
    title: {
      en: 'Analytic 4-DOF IK Robotics, Multimodal Vision & RK4 Ballistic Drop-Pod',
      es: 'Robótica con Cinemática Inversa 4-DOF, Visión Multimodal y Pod Balístico RK4',
    },
    subtitle: {
      en: 'Real deterministic kinematics, camera-guided sampling, spherical-pendulum rotorcraft physics, and Martian atmospheric ballistics.',
      es: 'Cinemática determinista real, muestreo guiado por cámara, dinámica de péndulo esférico en drones y balística atmosférica marciana.',
    },
    bullets: [
      {
        en: '4-DOF Analytic Inverse Kinematics (arm.ts): Exact 2-bone cosine-law joint angles (θ₀..θ₃) with 1.7 m reach on HANDS (manip-1 / rover-3) plus state-machine SkillRunner (drill, sample, photograph, handover).',
        es: 'Cinemática Inversa Analítica 4-DOF (arm.ts): Ángulos articulares exactos por ley de cosenos (θ₀..θ₃) con alcance de 1.7 m en HANDS (manip-1 / rover-3) y máquina de estados SkillRunner (drill, sample, photograph, handover).',
      },
      {
        en: 'Multimodal Camera Vision (/api/agent/vision): Vision agent reads the rover offscreen 512×384 mast camera target (T1..Tn) and commands the IK arm to inspect and drill selected rocks.',
        es: 'Visión Multimodal de Cámara (/api/agent/vision): El agente visual lee el cuadro offscreen 512×384 de la cámara mástil (T1..Tn) y comanda al brazo IK para inspeccionar y perforar rocas seleccionadas.',
      },
      {
        en: '8.0 kg Ballistic Life-Support Pack (ballistics.ts): 4th-order Runge-Kutta (RK4) trajectory under Martian gravity (3.72076 m/s²) and aerodynamic drag (ρ = 0.020 kg/m³), delivering COPV O₂, LiOH scrubber, 200 Wh battery, and patch kit.',
        es: 'Pack Balístico de Soporte Vital de 8.0 kg (ballistics.ts): Trayectoria integrada con Runge-Kutta de 4to orden (RK4) bajo gravedad marciana (3.72076 m/s²) y arrastre atmosférico (ρ = 0.020 kg/m³), entregando COPV O₂, depurador LiOH, batería 200 Wh y kit de parche.',
      },
      {
        en: 'Aerial Sling & GPS-Denied Nav: drone-2 Sky-Crane Kevlar spherical-pendulum dynamics alongside MRL + 6.5 GHz UWB + VIO + 360° Flash LiDAR localization.',
        es: 'Eslinga Aérea y Navegación Sin GPS: Dinámica de péndulo esférico Kevlar en drone-2 Sky-Crane junto a localización MRL + UWB 6.5 GHz + VIO + LiDAR Flash 360°.',
      },
    ],
    metrics: [
      { label: { en: 'Manipulator Arm', es: 'Brazo Manipulador' }, value: '4-DOF · 1.7 m', accent: '#fdba74' },
      { label: { en: 'Mast Camera Feed', es: 'Cámara Mástil' }, value: '512×384 Vision', accent: '#fbbf24' },
      { label: { en: 'Drop-Pod Solver', es: 'Solver Pod Balístico' }, value: '8.0 kg RK4', accent: '#fb923c' },
      { label: { en: 'Localization', es: 'Localización' }, value: '6.5 GHz UWB + LiDAR', accent: '#f97316' },
    ],
    visual: {
      kind: 'telemetry',
      badge: {
        en: 'HANDS (manip-1) · SKILLRUNNER · SKY-CRANE TETHER · BALLISTICS.TS',
        es: 'HANDS (manip-1) · SKILLRUNNER · ESLINGA SKY-CRANE · BALLISTICS.TS',
      },
      headline: {
        en: 'Every Joint Angle, Camera Frame & Ballistic Arc Is Computed in Real Time',
        es: 'Cada Ángulo Articular, Cuadro de Cámara y Arco Balístico se Calcula en Vivo',
      },
      summary: {
        en: 'No pre-baked animations: @th/shared physics and arm.ts compute joint solutions, collision safety, and ballistic impact envelopes directly from terrain heightmaps.',
        es: 'Sin animaciones pregrabadas: la física en @th/shared y arm.ts calculan soluciones articulares, envolventes de colisión e impacto balístico directo sobre el mapa de elevación.',
      },
      specs: [
        { en: 'Arm States: approach → align → drill / sample / photograph → handover', es: 'Estados Brazo: approach → align → drill / sample / photograph → handover' },
        { en: 'Pod Payload: COPV O₂ + LiOH CO₂ Scrubber + 200 Wh Cell + Suit Patch', es: 'Carga Pod: COPV O₂ + Depurador LiOH + Celda 200 Wh + Parche Traje' },
        { en: '15 m Keep-Out Zone around crew enforced prior to launch', es: 'Zona de exclusión de 15 m alrededor de la tripulación antes del disparo' },
      ],
    },
    speakerCue: {
      duration: '1:15 – 1:35',
      sceneRef: {
        en: 'On screen: HANDS (manip-1) 4-DOF arm + 512×384 mast camera target + RK4 arc',
        es: 'En pantalla: Brazo 4-DOF HANDS (manip-1) + cámara mástil 512×384 + arco RK4',
      },
      script: {
        en: 'Every one of our 7 rovers and drones is an autonomous agent. HANDS (manip-1) solves analytic 4-DOF cosine-law inverse kinematics in real time and uses multimodal vision to inspect rock targets from its 512×384 mast camera, while our ballistic pod solver integrates 4th-order Runge-Kutta trajectories under real Martian gravity and drag.',
        es: 'Cada uno de nuestros 7 rovers y drones es un agente autónomo. HANDS (manip-1) resuelve cinemática inversa analítica de 4 DOF en tiempo real y usa visión multimodal sobre su cámara mástil de 512×384 para perforar rocas, mientras el solver balístico integra trayectorias Runge-Kutta de 4to orden con gravedad y arrastre marcianos reales.',
      },
    },
  },
  {
    number: 8,
    code: '08',
    accent: '#e11d48',
    eyebrow: {
      en: 'Slide 08 · Autonomous Rescue & GUARDIAN Voting',
      es: 'Slide 08 · Rescate Autónomo y Votación GUARDIAN',
    },
    title: {
      en: 'Autonomous 4-Astronaut Rescue Scenario (S1–S7) & 3-Layer GUARDIAN Safety',
      es: 'Escenario de Rescate Autónomo (S1–S7) y Seguridad GUARDIAN de 3 Capas',
    },
    subtitle: {
      en: 'From pit fall and suit depressurization at 290 m East to multi-unit extraction via 2/3 heterogeneous AI consensus and human confirmation.',
      es: 'Desde caída en fosa y despresurización a 290 m al Este hasta extracción multi-unidad mediante consenso heterogéneo 2/3 y confirmación humana.',
    },
    bullets: [
      {
        en: 'S1–S3 Anomaly & Storm: rover-1 suffers wheel fault RVR-MOB-01; Cassini / DIAZ-CANO (eva-4) slips into the 24 m × 4 m natural pit (290 m East), leaking at -0.12 kPa/s (HR = 148 bpm) as dust τ ramps toward 6.0.',
        es: 'S1–S3 Anomalía y Tormenta: rover-1 sufre falla RVR-MOB-01; Cassini / DIAZ-CANO (eva-4) cae en la fosa natural de 24 m × 4 m (290 m Este) con fuga -0.12 kPa/s (HR = 148 bpm) mientras polvo τ sube a 6.0.',
      },
      {
        en: 'S4–S5 Multi-Unit Dispatch: BASE sends drone-1 & drone-2 (≥ 25 m horizontal standoff, 20–30 m alt) for LiDAR/radio relay, routes rescue-1 & rescue-bot-1 via HiRISE A* (slope ≤ 16°), and fires the 8.0 kg RK4 O₂ pod (>15 m keep-out) if hypoxia dictates.',
        es: 'S4–S5 Despliegue Multi-Unidad: BASE envía drone-1 y drone-2 (standoff ≥ 25 m, altitud 20–30 m) para LiDAR/enlace, enruta rescue-1 y rescue-bot-1 vía A* sobre HiRISE (pendiente ≤ 16°) y dispara el pod RK4 de 8.0 kg (>15 m exclusión) si la hipoxia lo exige.',
      },
      {
        en: 'S6–S7 Extraction & Recall: Drones land safely once τ ≥ 1.8 (recall_aircraft); after ask_human approval, rescue-bot-1 descends the 11.3° north ramp, stabilizes O₂, winches Cassini into rescue-1, and returns to the airlock.',
        es: 'S6–S7 Extracción y Repliegue: Los drones aterrizan al superar τ ≥ 1.8 (recall_aircraft); tras aprobación ask_human, rescue-bot-1 desciende por la rampa norte de 11.3°, estabiliza O₂, extrae a Cassini hacia rescue-1 y regresa a la esclusa.',
      },
      {
        en: 'GUARDIAN 3-Layer Verification: Layer 1 deterministic physical checks (guardian.ts) → Layer 2 <untrusted> LLM Safety Judge → Layer 3 2/3 Consensus Vote (voting.ts) across Gemini 4 Carbon, Gemini 4 Argon, and Meta Muse Wonder (with Asymmetric Safety Override to ask_human if dissent confidence ≥ 0.85).',
        es: 'Verificación GUARDIAN de 3 Capas: Capa 1 límites físicos deterministas (guardian.ts) → Capa 2 Juez LLM <untrusted> → Capa 3 Votación 2/3 (voting.ts) entre Gemini 4 Carbon, Gemini 4 Argon y Meta Muse Wonder (con Asymmetric Safety Override a ask_human si disidencia ≥ 0.85).',
      },
    ],
    metrics: [
      { label: { en: 'Natural Pit', es: 'Fosa Natural' }, value: '24 m × 4 m @ 290 m E', accent: '#fb923c' },
      { label: { en: 'Suit Leak / HR', es: 'Fuga / Pulso' }, value: '-0.12 kPa/s · 148 bpm', accent: '#e11d48' },
      { label: { en: 'A* & Ramp Slope', es: 'Ruta A* y Rampa' }, value: '≤ 16° · 11.3° North', accent: '#fbbf24' },
      { label: { en: 'GUARDIAN Vote', es: 'Votación GUARDIAN' }, value: '2/3 + Asymmetric Override', accent: '#ea580c' },
    ],
    visual: {
      kind: 'architecture',
      badge: {
        en: 'SEQUENCE S2 → S4 → S6 · GUARDIAN 3-MODEL VOTING',
        es: 'SECUENCIA S2 → S4 → S6 · VOTACIÓN 3 MODELOS GUARDIAN',
      },
      headline: {
        en: 'Run-Time Assurance Before Any Physical Command Moves a Rover or Drone',
        es: 'Aseguramiento en Tiempo de Ejecución Antes de Mover Cualquier Rover o Dron',
      },
      summary: {
        en: 'High-consequence maneuvers never rely on a single model output: deterministic geometry and three heterogeneous voters protect the injured astronaut.',
        es: 'Las maniobras críticas nunca dependen de una sola inferencia: la geometría determinista y tres votantes heterogéneos protegen al astronauta herido.',
      },
      specs: [
        { en: 'Layer 1 (ruleCheck): Slope limits, 15 m pod & 25 m drone standoffs, τ ≥ 1.8 grounding', es: 'Capa 1 (ruleCheck): Límites de pendiente, exclusión 15 m pod y 25 m drones, τ ≥ 1.8' },
        { en: 'Layer 2 (Judge): Wraps transcripts & RAG chunks in <untrusted> tags (fail-closed)', es: 'Capa 2 (Juez): Envuelve transcripciones y RAG en <untrusted> (fail-closed)' },
        { en: 'Layer 3 (Consensus): Gemini 4 Carbon + Gemini 4 Argon + Meta Muse Wonder', es: 'Capa 3 (Consenso): Gemini 4 Carbon + Gemini 4 Argon + Meta Muse Wonder' },
      ],
    },
    speakerCue: {
      duration: '1:35 – 2:30',
      sceneRef: {
        en: 'On screen: Scenes S2, S4, S5, S6 & S7 — Pit fall, drones, RK4 pod & extraction',
        es: 'En pantalla: Escenas S2, S4, S5, S6 y S7 — Caída en fosa, drones, pod RK4 y extracción',
      },
      script: {
        en: 'When Cassini falls into the 24 m × 4 m natural pit 290 meters East with a -0.12 kPa/s suit leak, BASE launches Ingenuity and Sky-Crane drones, routes rescue-1 and rescue-bot-1 along an A* terrain path, and prepares the 8 kg RK4 oxygen pod. Every critical step passes GUARDIAN physical bounds and a 2-of-3 consensus vote across Gemini 4 Carbon, Gemini 4 Argon, and Meta Muse Wonder before rescue-bot-1 descends the 11.3° north ramp and extracts him to the airlock.',
        es: 'Cuando Cassini cae en la fosa de 24 m × 4 m a 290 metros al Este con una fuga de -0.12 kPa/s, BASE despliega los drones Ingenuity y Sky-Crane, enruta rescue-1 y rescue-bot-1 por camino A* y prepara el pod RK4 de 8 kg. Cada paso crítico supera los límites físicos de GUARDIAN y una votación 2 de 3 entre Gemini 4 Carbon, Gemini 4 Argon y Meta Muse Wonder antes de descender por la rampa norte de 11.3° y extraerlo a la esclusa.',
      },
    },
  },
  {
    number: 9,
    code: '09',
    accent: '#ea580c',
    eyebrow: {
      en: 'Slide 09 · Provenance & Physics Audit',
      es: 'Slide 09 · Auditoría de Datos Reales vs. Simulación',
    },
    title: {
      en: 'Real NASA / USGS Data vs. Deterministic Physics & Simulation',
      es: 'Datos Reales de NASA / USGS vs. Física Determinista y Simulación',
    },
    subtitle: {
      en: 'Transparent engineering boundary: 57 SHA-256 provenance entries from 9 NASA/USGS sources paired with peer-reviewed deterministic simulation models.',
      es: 'Frontera de ingeniería transparente: 57 activos verificados por SHA-256 de 9 fuentes NASA/USGS acoplados a modelos físicos deterministas.',
    },
    bullets: [
      {
        en: 'Every orbital raster, rover CSV, radiation telemetry log, and medical standard carries SHA-256 provenance tracking (57 verified entries across 9 NASA/USGS sources).',
        es: 'Cada ráster orbital, CSV de rover, registro de radiación y estándar médico cuenta con trazabilidad SHA-256 (57 entradas verificadas en 9 fuentes NASA/USGS).',
      },
      {
        en: 'All dynamic state transitions (metabolism, suit depressurization, pod ballistics, IK, and tether swing) execute deterministically inside @th/shared and are unit-tested with Vitest.',
        es: 'Todas las transiciones dinámicas (metabolismo, despresurización, balística del pod, cinemática IK y péndulo de eslinga) corren de forma determinista en @th/shared con tests en Vitest.',
      },
    ],
    metrics: [
      { label: { en: 'Provenance Assets', es: 'Activos Trazables' }, value: '57 SHA-256 Entries', accent: '#ea580c' },
      { label: { en: 'Data Sources', es: 'Fuentes Oficiales' }, value: '9 NASA / USGS', accent: '#fbbf24' },
      { label: { en: 'Physics Package', es: 'Núcleo Físico' }, value: '@th/shared · Vitest', accent: '#fdba74' },
      { label: { en: '3D Graphics', es: 'Motor Gráfico' }, value: '16 GLBs + WebGL2', accent: '#fb923c' },
    ],
    twoColumn: {
      leftTitle: {
        en: '100% Real NASA / USGS Data (9 Sources · 57 Assets)',
        es: '100% Datos Reales NASA / USGS (9 Fuentes · 57 Activos)',
      },
      leftItems: [
        {
          en: 'MRO HiRISE & MOLA Gale Crater: 1 m/px DTM + 0.25 m/px orthoimage (2048×2048 16-bit DEM), CTX & THEMIS IR.',
          es: 'MRO HiRISE y MOLA Cráter Gale: DTM 1 m/px + ortoimagen 0.25 m/px (DEM 16-bit 2048×2048), CTX y THEMIS IR.',
        },
        {
          en: 'MSL Curiosity Rover: 1,567 DAN neutron stops, 3,953–4,050 sols REMS weather + Mastcam τ, and 117 audited Mastcam/MAHLI frames.',
          es: 'Rover MSL Curiosity: 1,567 puntos DAN de neutrones, 3,953–4,050 soles REMS + Mastcam τ, y 117 frames auditados Mastcam/MAHLI.',
        },
        {
          en: 'MSL RAD & Perseverance MOXIE: Real 233 µGy/d GCR baseline and 5.37 g/h O₂ solid-oxide electrolysis telemetry.',
          es: 'MSL RAD y Perseverance MOXIE: Línea base real 233 µGy/d GCR y telemetría 5.37 g/h de electrólisis sólida de O₂.',
        },
        {
          en: 'NASA DONKI & JPL Horizons DE441: Live solar flare / CME WSA-Enlil alerts and exact Earth-Mars light-time ephemeris.',
          es: 'NASA DONKI y JPL Horizons DE441: Alertas reales de llamaradas/CME WSA-Enlil y efemérides exactas de tiempo-luz Tierra-Marte.',
        },
        {
          en: 'NASA 3D Resources & Medical Corpus: 16 meshoptimizer GLBs + 15 standards (1,002 chunks: NASA-STD-3001 Vol. 1 & 2, OCHMO, AMCL, MEDPRAT, Mars-GRAM).',
          es: 'NASA 3D Resources y Corpus Médico: 16 GLBs meshoptimizer + 15 estándares (1,002 fragmentos: NASA-STD-3001 Vol. 1 y 2, OCHMO, AMCL, MEDPRAT, Mars-GRAM).',
        },
      ],
      rightTitle: {
        en: 'Deterministic Physics & Simulation (@th/shared)',
        es: 'Física Determinista y Simulación (@th/shared)',
      },
      rightItems: [
        {
          en: 'Bioastronautics: Pandolf-Santee EVA metabolic cost at 0.379 g, choked-orifice compressible suit leak, and Casson/Quemada blood rheology.',
          es: 'Bioastronáutica: Ecuación metabólica Pandolf-Santee a 0.379 g, fuga compresible estrangulada y reología sanguínea Casson/Quemada.',
        },
        {
          en: 'Ballistics & Flight: 4th-order Runge-Kutta (RK4) 8.0 kg pod trajectory and coaxial rotorcraft Kevlar spherical-pendulum tether dynamics.',
          es: 'Balística y Vuelo: Trayectoria Runge-Kutta 4to orden (RK4) de pod 8.0 kg y péndulo esférico Kevlar en helicópteros coaxiales.',
        },
        {
          en: 'Robotics & Navigation: 4-DOF analytic cosine-law IK (arm.ts), A* routing over HiRISE slope maps (≤ 16° / ≤ 20°), and MRL + 6.5 GHz UWB + VIO + 360° Flash LiDAR.',
          es: 'Robótica y Navegación: IK analítica 4-DOF por cosenos (arm.ts), rutas A* sobre pendientes HiRISE (≤ 16° / ≤ 20°) y MRL + UWB 6.5 GHz + VIO + LiDAR Flash 360°.',
        },
        {
          en: '60 FPS WebGL2 Engine: Three.js atmospheric scattering, dust opacity shaders, CSS3D curved visor HUD, and Web Audio Quindar DSP.',
          es: 'Motor WebGL2 60 FPS: Dispersión atmosférica Three.js, shaders de opacidad de polvo, visor curvo CSS3D y DSP Web Audio Quindar.',
        },
      ],
    },
    visual: {
      kind: 'telemetry',
      badge: {
        en: 'PROVENANCE AUDIT · SHA-256 VERIFIED · ZERO UNDECLARED SYNTHESIS',
        es: 'AUDITORÍA DE PROVENANCIA · SHA-256 VERIFICADO · TRANSPARENCIA TOTAL',
      },
      headline: {
        en: 'Grounded Truth in Every Terrain Meter, Sensor Log & Physics Equation',
        es: 'Datos Verificados en Cada Metro de Terreno, Sensor y Ecuación Física',
      },
      summary: {
        en: 'Reviewers can trace every dataset directly to its NASA PDS / USGS source and inspect the deterministic physics equations in packages/shared.',
        es: 'Los evaluadores pueden rastrear cada dataset hasta su fuente NASA PDS / USGS e inspeccionar las ecuaciones deterministas en packages/shared.',
      },
    },
    speakerCue: {
      duration: '2:30 – 2:45',
      sceneRef: {
        en: 'On screen: Provenance matrix — 9 NASA/USGS sources vs. @th/shared deterministic physics',
        es: 'En pantalla: Matriz de provenancia — 9 fuentes NASA/USGS vs. física determinista @th/shared',
      },
      script: {
        en: 'Everything you see separates cleanly between 57 checksummed real NASA and USGS assets—from HiRISE 1-meter DEMs and Curiosity DAN, REMS, and Mastcam archives to NASA-STD-3001—and peer-reviewed deterministic physics in @th/shared running at 60 FPS.',
        es: 'Todo el sistema distingue con total claridad entre 57 activos reales de NASA y USGS con suma SHA-256 —desde DEMs HiRISE de 1 metro y archivos DAN, REMS y Mastcam de Curiosity hasta NASA-STD-3001— y física determinista validada en @th/shared corriendo a 60 FPS.',
      },
    },
  },
  {
    number: 10,
    code: '10',
    accent: '#fbbf24',
    eyebrow: {
      en: 'Slide 10 · Closing & Live Deployment',
      es: 'Slide 10 · Cierre y Demo en Vivo',
    },
    title: {
      en: 'Live Production Deployment & Team Tango Horizon',
      es: 'Despliegue en Vivo en Producción y Equipo Tango Horizon',
    },
    subtitle: {
      en: 'Try the real-time 3D Gale Crater simulator, pair your smartphone as a /remote pointer, and explore the open-source multi-agent stack.',
      es: 'Prueba el simulador 3D del Cráter Gale en vivo, empareja tu teléfono como puntero /remote y explora el stack multi-agente.',
    },
    bullets: [
      {
        en: 'Live 3D Simulator (Vercel Edge): Full WebGL2 Gale Crater mission, S1–S7 autonomous rescue sequence, 5-language voice, and ML overlay inspector.',
        es: 'Simulador 3D en Vivo (Vercel Edge): Misión completa WebGL2 en Cráter Gale, rescate autónomo S1–S7, voz en 5 idiomas e inspector de capas ML.',
      },
      {
        en: 'Cloud Run Production API (tangohorizon-api · us-central1): Fastify 5, 6 in-process MCP servers, Vertex AI Gemini 4 routing, Cloud Neural TTS, and Meta Muse failover.',
        es: 'API en Producción Cloud Run (tangohorizon-api · us-central1): Fastify 5, 6 servidores MCP en proceso, Vertex AI Gemini 4, Cloud Neural TTS y failover Meta Muse.',
      },
      {
        en: 'Reproducible Infrastructure & CI/CD: Terraform IaC (infra/terraform/), GitHub Actions checks (test-shared, test-server, build, Python), and Vercel Edge.',
        es: 'Infraestructura Reproducible y CI/CD: Terraform IaC (infra/terraform/), pipelines GitHub Actions (test-shared, test-server, build, Python) y Vercel Edge.',
      },
    ],
    metrics: [
      { label: { en: 'Frontend Edge', es: 'Frontend Edge' }, value: 'tangohorizon.vercel.app', accent: '#fbbf24' },
      { label: { en: 'Backend Cloud', es: 'Backend Cloud' }, value: 'Cloud Run · us-central1', accent: '#f97316' },
      { label: { en: 'Challenge', es: 'Desafío' }, value: 'NASA Space Apps 2026', accent: '#fdba74' },
      { label: { en: 'Team Node', es: 'Nodo Equipo' }, value: 'Buenos Aires · 4 Crew', accent: '#fb923c' },
    ],
    links: [
      {
        label: { en: 'Launch Live 3D Simulator ↗', es: 'Abrir Simulador 3D en Vivo ↗' },
        url: SIMULATOR_URL,
        hint: { en: 'https://tangohorizon.vercel.app', es: 'https://tangohorizon.vercel.app' },
        primary: true,
      },
      {
        label: { en: 'Mobile QR Pointer (/remote) ↗', es: 'Puntero Móvil QR (/remote) ↗' },
        url: REMOTE_POINTER_URL,
        hint: { en: 'Sub-16 ms WebSocket gyroscope + PTT', es: 'Giroscopio WebSocket <16 ms + PTT' },
      },
      {
        label: { en: 'Source SLIDES.md on GitHub ↗', es: 'Fuente SLIDES.md en GitHub ↗' },
        url: SLIDES_SOURCE_URL,
        hint: { en: 'docs/slides/SLIDES.md', es: 'docs/slides/SLIDES.md' },
      },
    ],
    teamMembers: TEAM_CREW_LIST,
    visual: {
      kind: 'closing',
      badge: {
        en: 'SCENE S7 · AIRLOCK RETURN & LIVE DEMO READY',
        es: 'ESCENA S7 · RETORNO A ESCLUSA Y DEMO EN VIVO LISTA',
      },
      headline: {
        en: 'Ready for Hands-Free Operations on Mars',
        es: 'Listo para Operaciones Manos Libres en Marte',
      },
      summary: {
        en: 'Real NASA/USGS science, deterministic physics, 3 custom ML models, 4-DOF IK robotics, and 14-agent GUARDIAN safety running live in your browser.',
        es: 'Ciencia real NASA/USGS, física determinista, 3 modelos ML propios, robótica IK 4-DOF y seguridad GUARDIAN de 14 agentes corriendo en vivo en tu navegador.',
      },
    },
    speakerCue: {
      duration: '2:45 – 3:00',
      sceneRef: {
        en: 'On screen: Scene S7 — Airlock entry, rocket launch pad & live links',
        es: 'En pantalla: Escena S7 — Ingreso a esclusa, plataforma de cohetes y enlaces en vivo',
      },
      script: {
        en: 'Within minutes of coordinated autonomous operation, Cassini is safely inside the habitat airlock. Real data from 9 NASA and USGS sources, deterministic physics, 3 custom-trained ML models, analytic inverse-kinematics robotics, and verified multi-agent safety built for hands-free operations on Mars. This is Tango Horizon—thank you.',
        es: 'En cuestión de minutos de operación autónoma coordinada, Cassini ingresa a salvo en la esclusa de la base. Datos reales de 9 fuentes NASA y USGS, física determinista, 3 modelos ML propios, robótica con cinemática inversa analítica y seguridad multi-agente verificada para operar manos libres en Marte. Esto es Tango Horizon. Muchas gracias.',
      },
    },
  },
];

export function getSlidesDeck(lang: SiteLang): ResolvedSlideDeckItem[] {
  return SLIDES_DECK.map((slide) => ({
    number: slide.number,
    code: slide.code,
    accent: slide.accent,
    eyebrow: slide.eyebrow[lang],
    title: slide.title[lang],
    subtitle: slide.subtitle[lang],
    tagline: slide.tagline ? slide.tagline[lang] : undefined,
    bullets: slide.bullets.map((bullet) => bullet[lang]),
    metrics: slide.metrics.map((metric) => ({
      label: metric.label[lang],
      value: metric.value,
      accent: metric.accent,
    })),
    speakerCue: {
      duration: slide.speakerCue.duration,
      sceneRef: slide.speakerCue.sceneRef[lang],
      script: slide.speakerCue.script[lang],
    },
    visual: {
      kind: slide.visual.kind,
      badge: slide.visual.badge[lang],
      headline: slide.visual.headline[lang],
      summary: slide.visual.summary[lang],
      images: slide.visual.images?.map((img) => ({
        src: img.src,
        alt: img.alt[lang],
        title: img.title[lang],
        caption: img.caption[lang],
      })),
      specs: slide.visual.specs?.map((spec) => spec[lang]),
    },
    twoColumn: slide.twoColumn
      ? {
          leftTitle: slide.twoColumn.leftTitle[lang],
          leftItems: slide.twoColumn.leftItems.map((item) => item[lang]),
          rightTitle: slide.twoColumn.rightTitle[lang],
          rightItems: slide.twoColumn.rightItems.map((item) => item[lang]),
        }
      : undefined,
    links: slide.links?.map((link) => ({
      label: link.label[lang],
      url: link.url,
      hint: link.hint ? link.hint[lang] : undefined,
      primary: link.primary,
    })),
    teamMembers: slide.teamMembers,
  }));
}
