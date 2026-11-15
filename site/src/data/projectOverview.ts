import type { BiText, SiteLang } from '@/context/LanguageContext';

export const SIMULATOR_URL = 'https://tangohorizon.vercel.app';
export const SITE_URL = 'https://tangohorizon-site.vercel.app';

export interface TechStackGroup {
  id: string;
  category: BiText;
  accent: string;
  items: BiText[];
}

export interface ProjectHeroCopy {
  badge: BiText;
  title: string;
  subtitle: BiText;
  summary: BiText;
  marsContext: BiText;
}

export interface ContractFileEntry {
  file: string;
  role: BiText;
}

export interface AiUsageSection {
  methodologyTitle: BiText;
  methodologyUrl: string;
  methodologySummary: BiText;
  codingAgents: string[];
  orchestrationNote: BiText;
  workflowAi: string[];
  contractFiles: ContractFileEntry[];
  humanResponsibility: BiText;
}

export interface MultiAgentTier {
  id: string;
  tier: BiText;
  agents: string[];
  primaryModel: string;
  secondaryModel: string;
  backupModel: string;
  offlineFallback: BiText;
  latencyOrBudget: BiText;
  accent: string;
  role: BiText;
}

export interface GuardianLayer {
  id: string;
  step: BiText;
  title: BiText;
  moduleRef: string;
  accent: string;
  summary: BiText;
  rules: BiText[];
}

export interface MlModelSummary {
  id: string;
  name: BiText;
  modelId: string;
  dataset: BiText;
  architecture: BiText;
  primaryMetric: BiText;
  metrics: BiText[];
  operationalRole: BiText;
  accent: string;
}

export interface RescueScenarioStep {
  id: string;
  stage: BiText;
  title: BiText;
  actors: string[];
  telemetry: BiText;
  summary: BiText;
  accent: string;
}

export interface ProjectCapabilityPillar {
  id: string;
  badge: BiText;
  title: BiText;
  metric: BiText;
  accent: string;
  description: BiText;
  highlights: BiText[];
}

export interface TeamMemberLink {
  label: string;
  url: string;
}

export interface TeamMemberSummary {
  name: string;
  role: BiText;
  affiliation: BiText;
  links: TeamMemberLink[];
}

export const TECH_STACK_HIGHLIGHT: string[] = [
  'GitHub Actions CI/CD',
  'Python 3 · PyTorch · scikit-learn',
  'Google Cloud Run',
  'Terraform IaC',
  'Vertex AI · Gemini',
  'Meta Muse AI',
  'Three.js WebGL2 (60 FPS)',
  'Next.js · TypeScript',
  'Fastify 5 · MCP',
  'Cloud Neural TTS',
  'Vercel Edge',
];

export const TECH_STACK_GROUPS: TechStackGroup[] = [
  {
    id: 'frontend-3d',
    category: { en: 'Frontend & 3D', es: 'Frontend y 3D' },
    accent: '#7df9ff',
    items: [
      { en: 'Three.js (WebGL2 · 60 FPS)', es: 'Three.js (WebGL2 · 60 FPS)' },
      { en: 'TypeScript · Vite', es: 'TypeScript · Vite' },
      {
        en: 'Next.js App Router (Editorial Site)',
        es: 'Next.js App Router (Sitio Editorial)',
      },
      { en: 'CSS 3D Curved Visor HUD', es: 'HUD Visor Curvo CSS 3D' },
      {
        en: 'Web Speech API & Web Audio API (32-band FFT + Quindar)',
        es: 'Web Speech API y Web Audio API (FFT 32 bandas + Quindar)',
      },
      {
        en: 'QR Mobile Pointer (/remote · WebSocket)',
        es: 'Puntero Móvil QR (/remote · WebSocket)',
      },
    ],
  },
  {
    id: 'backend-mcp',
    category: { en: 'Backend & Multi-Agent MCP', es: 'Backend y Multi-Agente MCP' },
    accent: '#c4b5fd',
    items: [
      {
        en: 'Node.js 22 · Fastify 5 (@fastify/websocket, rate-limit)',
        es: 'Node.js 22 · Fastify 5 (@fastify/websocket, rate-limit)',
      },
      {
        en: '6 In-Process MCP Servers (@modelcontextprotocol/sdk · InMemoryTransport)',
        es: '6 Servidores MCP en Proceso (@modelcontextprotocol/sdk · InMemoryTransport)',
      },
      {
        en: 'In-Memory BM25 RAG (1,002 chunks · <2 ms)',
        es: 'RAG BM25 en Memoria (1,002 fragmentos · <2 ms)',
      },
      {
        en: 'Vertex AI (Gemini 4 Carbon / Argon / Hydrogen)',
        es: 'Vertex AI (Gemini 4 Carbon / Argon / Hydrogen)',
      },
      {
        en: 'Google AI Studio & Meta Muse AI Failover',
        es: 'Failover Google AI Studio y Meta Muse AI',
      },
      {
        en: 'Shared Physics Core (@th/shared · Zod · Vitest)',
        es: 'Núcleo Físico Compartido (@th/shared · Zod · Vitest)',
      },
    ],
  },
  {
    id: 'data-science-gis',
    category: { en: 'Data Science & GIS Python', es: 'Ciencia de Datos y GIS Python' },
    accent: '#fb923c',
    items: [
      {
        en: 'Python 3 · PyTorch · Hugging Face transformers (DINOv2-small)',
        es: 'Python 3 · PyTorch · Hugging Face transformers (DINOv2-small)',
      },
      {
        en: 'scikit-learn (GradientBoosting & HistGradientBoosting CQR)',
        es: 'scikit-learn (GradientBoosting y HistGradientBoosting CQR)',
      },
      {
        en: 'NumPy · Pandas · SciPy · Matplotlib · Pillow',
        es: 'NumPy · Pandas · SciPy · Matplotlib · Pillow',
      },
      { en: 'Rasterio · PyProj · PyMuPDF', es: 'Rasterio · PyProj · PyMuPDF' },
      {
        en: 'meshoptimizer (16 mission GLBs + NASA 3D Resources)',
        es: 'meshoptimizer (16 GLBs de misión + NASA 3D Resources)',
      },
    ],
  },
  {
    id: 'gcp-terraform',
    category: { en: 'Google Cloud & Terraform IaC', es: 'Google Cloud y Terraform IaC' },
    accent: '#38bdf8',
    items: [
      { en: 'Terraform IaC (infra/terraform/)', es: 'Terraform IaC (infra/terraform/)' },
      {
        en: 'Google Cloud Run (tangohorizon-api · us-central1)',
        es: 'Google Cloud Run (tangohorizon-api · us-central1)',
      },
      {
        en: 'Vertex AI & Cloud Neural Text-to-Speech (Journey Voices)',
        es: 'Vertex AI y Cloud Neural Text-to-Speech (Voces Journey)',
      },
      {
        en: 'Artifact Registry · Cloud Build · Secret Manager · IAM',
        es: 'Artifact Registry · Cloud Build · Secret Manager · IAM',
      },
    ],
  },
  {
    id: 'cicd-vercel',
    category: { en: 'CI/CD & Vercel', es: 'CI/CD y Vercel' },
    accent: '#fde68a',
    items: [
      {
        en: 'GitHub Actions CI/CD (test-shared, test-server, build, Python checks)',
        es: 'GitHub Actions CI/CD (test-shared, test-server, build, checks Python)',
      },
      {
        en: 'Vercel Edge CDN — Simulator (tangohorizon.vercel.app)',
        es: 'Vercel Edge CDN — Simulador (tangohorizon.vercel.app)',
      },
      {
        en: 'Vercel Edge CDN — Showcase Site (tangohorizon-site.vercel.app)',
        es: 'Vercel Edge CDN — Portal Editorial (tangohorizon-site.vercel.app)',
      },
      { en: '@vercel/analytics', es: '@vercel/analytics' },
    ],
  },
];

export const PROJECT_HERO_COPY: ProjectHeroCopy = {
  badge: {
    en: 'NASA SPACE APPS CHALLENGE 2026 · BUENOS AIRES · 2026-11-15',
    es: 'NASA SPACE APPS CHALLENGE 2026 · BUENOS AIRES · 2026-11-15',
  },
  title: 'Tango Horizon: AI Systems for EVA and Mars Exploration',
  subtitle: {
    en: 'Real-time 3D Mars surface mission operations, robotics, and climate simulator over Gale Crater with hierarchical multi-agent AI and hands-free 5-language voice control.',
    es: 'Simulador 3D en tiempo real de operaciones de misión, robótica y clima en el Cráter Gale con IA multi-agente y control manos libres por voz en 5 idiomas.',
  },
  summary: {
    en: 'Built over real NASA and USGS Gale Crater cartography (1 m/px MRO HiRISE DTM and 0.25 m/px orthoimage across a 4 km × 4 km grid at 60 FPS), Tango Horizon safeguards a four-astronaut crew (SOTELO, YACONIS, SALERNO, and DIAZ-CANO) with deterministic bioastronautics physics (@th/shared), in-memory BM25 RAG (<2 ms across 1,002 chunks from 15 NASA standards), 3 custom-trained ML models on Curiosity rover data, analytic 4-DOF inverse-kinematics robotics, a QR-paired smartphone gyroscope pointer (/remote), and a 14-agent multi-agent runtime protected by GUARDIAN.',
    es: 'Construido sobre cartografía real de la NASA y el USGS (DTM MRO HiRISE de 1 m/px y ortomosaico de 0.25 m/px en una grilla de 4 km × 4 km a 60 FPS), Tango Horizon protege a una tripulación de cuatro astronautas (SOTELO, YACONIS, SALERNO y DIAZ-CANO) mediante física bioastronáutica determinista (@th/shared), RAG en memoria (<2 ms sobre 1,002 fragmentos de 15 estándares NASA), 3 modelos propios de Machine Learning entrenados con datos del rover Curiosity, robótica con cinemática inversa analítica de 4 DOF, puntero giroscópico móvil por QR (/remote) y un sistema multi-agente de 14 agentes resguardado por GUARDIAN.',
  },
  marsContext: {
    en: 'With a 4-to-24-minute one-way Earth-Mars radio delay (up to 48 minutes round-trip) and pressurized gloves at 29.6 kPa pure O2, an EVA emergency cannot wait for a reply from Houston. While the web demo runs on Google Cloud Run, Vertex AI, and Meta Muse with deterministic offline fallback, the stateless architecture and in-memory MCP transport are designed to execute locally on the Mars Base compute module and suit/rover edge NPUs.',
    es: 'Con un retardo de radio unidireccional de 4 a 24 minutos entre la Tierra y Marte (hasta 48 minutos ida y vuelta) y guantes presurizados a 29.6 kPa de O2 puro, una emergencia EVA no puede esperar respuesta desde Houston. Aunque la demo web opera sobre Google Cloud Run, Vertex AI y Meta Muse con fallback determinista offline, la arquitectura sin estado y el transporte MCP en memoria están diseñados para ejecutarse localmente en el módulo compute de la base marciana y en las NPUs de trajes y rovers.',
  },
};

export const AI_USAGE_DATA: AiUsageSection = {
  methodologyTitle: {
    en: 'Software 3.0 Methodology — AFAW (Anti-Fragile Agentic Workflow)',
    es: 'Metodología Software 3.0 — AFAW (Anti-Fragile Agentic Workflow)',
  },
  methodologyUrl: 'https://github.com/agustindiazcano/afaw-anti-fragile-agentic-workflow',
  methodologySummary: {
    en: 'This project was built with AI-assisted development in the Software 3.0 style using our own AFAW (Anti-Fragile Agentic Workflow) methodology for multi-agent coordination: AI coding agents took part in the whole development process (implementation, tests, CI/CD, pull requests, commits, human-validated and designed documentation, and deploy), under human direction and review.',
    es: 'Este proyecto fue construido con desarrollo asistido por IA al estilo Software 3.0 mediante nuestra propia metodología AFAW (Anti-Fragile Agentic Workflow) para coordinación multi-agente: los agentes de codificación participaron en todo el proceso (implementación, tests, CI/CD, pull requests, commits, documentación validada y diseñada por humanos, y despliegue) bajo dirección y revisión humana continua.',
  },
  codingAgents: ['Codex', 'Claude Code', 'Gemini Antigravity', 'IBM Bob', 'Meta Muse'],
  orchestrationNote: {
    en: 'Multiple agents running in parallel via an orchestrator coordinating medium-tier models, each in its own git worktree and branch to avoid conflicts, plus a code reviewer agent.',
    es: 'Múltiples agentes en paralelo mediante un orquestador coordinando modelos de nivel medio, cada uno en su propio git worktree y rama independiente para evitar conflictos, más un agente revisor de código.',
  },
  workflowAi: ['ChatGPT', 'Gemini', 'Google AI Studio', 'Grok'],
  contractFiles: [
    {
      file: 'AGENTS.md',
      role: {
        en: 'Repository architecture rules and conventions',
        es: 'Reglas de arquitectura y convenciones del repositorio',
      },
    },
    {
      file: 'PENDING.md',
      role: {
        en: 'Prioritized backlog and open tasks',
        es: 'Backlog priorizado y tareas abiertas',
      },
    },
    {
      file: 'LASTCONTEXT.md',
      role: {
        en: 'Latest verified state and next step',
        es: 'Estado más reciente y siguiente paso verificado',
      },
    },
  ],
  humanResponsibility: {
    en: 'All plans, code reviews, NASA/USGS data validation, designs, mathematical formulations, implementations, and empirical results were audited and verified by the authors (human-in-the-loop).',
    es: 'Todo plan, revisión de código, validación de datos NASA/USGS, diseño, formulación matemática, implementación y resultado empírico fue auditado y verificado por los autores (human-in-the-loop).',
  },
};

export const MULTI_AGENT_TIERS: MultiAgentTier[] = [
  {
    id: 'tier-fast-voice',
    tier: {
      en: 'Fast Tier · Suit Voice Executor',
      es: 'Nivel Rápido · Ejecutor de Voz en Traje',
    },
    agents: ['SUIT.VOICE-EXEC'],
    primaryModel: 'Vertex AI · google/gemini-4-hydrogen',
    secondaryModel: 'Google AI Studio · gemini-4-hydrogen',
    backupModel: 'Meta Muse · muse-spark-1.3',
    offlineFallback: {
      en: 'Deterministic parser + localIntents.ts (<5 ms)',
      es: 'Parser determinista + localIntents.ts (<5 ms)',
    },
    latencyOrBudget: {
      en: '~400–600 ms voice / <5 ms local',
      es: '~400–600 ms voz / <5 ms local',
    },
    accent: '#7df9ff',
    role: {
      en: 'First voice contact in 5 languages (EN, ES, FR, DE, IT). Resolves HUD visor layers, cartographic map, O2/consumables readouts, fleet status, ballistic pod trajectory previews, and multimodal camera vision (capture_vision); escalates routing, FDIR, science, and emergencies to BASE.',
      es: 'Primer punto de contacto por voz en 5 idiomas (EN, ES, FR, DE, IT). Resuelve capas del visor HUD, mapa cartográfico, lecturas de O2/consumibles, estado de flota, previsualización balística y visión de cámara (capture_vision); escala rutas, FDIR, ciencia y emergencias a BASE.',
    },
  },
  {
    id: 'tier-large-orchestrator',
    tier: {
      en: 'Large Tier · Central Base Orchestrator',
      es: 'Nivel Grande · Orquestador Central de Base',
    },
    agents: ['BASE'],
    primaryModel: 'Vertex AI · google/gemini-4-carbon',
    secondaryModel: 'Google AI Studio · gemini-4-carbon',
    backupModel: 'Meta Muse · muse-wonder-1.0',
    offlineFallback: {
      en: 'Deterministic rule/tool router (offline.ts)',
      es: 'Router determinista de herramientas (offline.ts)',
    },
    latencyOrBudget: {
      en: 'MAX_TURNS = 6 · Survival first',
      es: 'MAX_TURNS = 6 · Prioridad supervivencia',
    },
    accent: '#c4b5fd',
    role: {
      en: 'Strategic brain of the habitat/Starship complex (conae-base-mars). Prioritizes crew survival over science, reads live LiDAR and environmental telemetry, triggers autonomous rescue protocols, and delegates specialized analysis to the 5 domain specialists and robotic fleet.',
      es: 'Cerebro estratégico del complejo base/Starship (conae-base-mars). Prioriza la supervivencia de la tripulación sobre la ciencia, lee LiDAR y telemetría ambiental en vivo, dispara protocolos autónomos de rescate y delega análisis a los 5 especialistas y a la flota robótica.',
    },
  },
  {
    id: 'tier-medium-specialists',
    tier: {
      en: 'Medium Tier · 5 Specialists + Robot Agents (ROBOT.<id>)',
      es: 'Nivel Medio · 5 Especialistas + Agentes Robóticos (ROBOT.<id>)',
    },
    agents: [
      'SUIT.HEALTH',
      'EVA-PLANNER',
      'SCIENCE',
      'WEATHER-RAD',
      'MAINTENANCE',
      'ROBOT.<id> (rover-1/2/3, rescue-1, rescue-bot-1, drone-1/2, glider-1, scout-1)',
    ],
    primaryModel: 'Vertex AI · google/gemini-4-argon',
    secondaryModel: 'Google AI Studio · gemini-4-argon',
    backupModel: 'Meta Muse · muse-wonder-1.0',
    offlineFallback: {
      en: 'Deterministic domain handlers (offline.ts)',
      es: 'Manejadores deterministas de dominio (offline.ts)',
    },
    latencyOrBudget: {
      en: '14 agents total · 6 InMemoryTransport MCP servers',
      es: '14 agentes totales · 6 servidores MCP InMemoryTransport',
    },
    accent: '#fb923c',
    role: {
      en: 'Execute predictive biomedical checks (NASA-STD-3001 / Casson), A* routing over HiRISE, DAN/DINOv2 prospecting, REMS/DONKI storm nowcasting, FDIR with Remaining Useful Life (rul_s), and autonomous per-vehicle control with a 4-DOF IK arm.',
      es: 'Ejecutan cálculo predictivo biomédico (NASA-STD-3001 / Casson), rutas A* sobre HiRISE, prospección DAN/DINOv2, pronóstico de tormentas REMS/DONKI, FDIR con vida útil remanente (rul_s) y control autónomo por vehículo con brazo IK de 4 DOF.',
    },
  },
];

export const GUARDIAN_LAYERS: GuardianLayer[] = [
  {
    id: 'guardian-rules',
    step: {
      en: 'Layer 1 · Deterministic Physical Limits',
      es: 'Capa 1 · Límites Físicos Deterministas',
    },
    title: {
      en: 'ruleCheck (guardian.ts)',
      es: 'ruleCheck (guardian.ts)',
    },
    moduleRef: 'server/src/agents/guardian.ts',
    accent: '#7df9ff',
    summary: {
      en: 'Automatically blocks any action violating verified physical envelopes before it reaches the 3D environment.',
      es: 'Bloquea automáticamente toda acción que viole envolventes físicas verificadas antes de llegar al entorno 3D.',
    },
    rules: [
      {
        en: 'Per-vehicle slope limits (≤ 20° science rovers, ≤ 16° rescue-1) and 360° Flash LiDAR hazard verification.',
        es: 'Límites de pendiente por vehículo (≤ 20° rovers científicos, ≤ 16° rescue-1) y verificación LiDAR 360°.',
      },
      {
        en: '15 m keep-out zone around astronauts for ballistic drop-pods and 2 m keep-out for the manipulator arm (except stationary handover).',
        es: 'Zona de exclusión de 15 m alrededor de astronautas para pods balísticos y de 2 m para brazo manipulador (salvo handover estacionario).',
      },
      {
        en: 'Horizontal standoff ≥ 25 m (20–30 m altitude band) for rescue reconnaissance drones over injured crew.',
        es: 'Distancia horizontal ≥ 25 m (banda de altitud 20–30 m) para drones de reconocimiento en rescate sobre tripulación herida.',
      },
      {
        en: 'Rotorcraft grounding under high dust (tau ≥ 1.8), high wind, or low air density; blocks outward dispatch during DONKI SEP events and pyrotechnic flares near 100% O2 suits (NASA-STD-3001 V2 6002).',
        es: 'Prohibición de vuelo con polvo alto (tau ≥ 1.8), viento o densidad insuficiente, despacho exterior ante eventos SEP DONKI y bengalas pirotécnicas cerca de trajes 100% O2 (NASA-STD-3001 V2 6002).',
      },
    ],
  },
  {
    id: 'guardian-judge',
    step: {
      en: 'Layer 2 · Contextual Safety Judge',
      es: 'Capa 2 · Juez Contextual de Seguridad',
    },
    title: {
      en: 'LLM Safety Judge (<untrusted>)',
      es: 'LLM Safety Judge (<untrusted>)',
    },
    moduleRef: 'server/src/agents/guardian.ts · gemini-4-argon / muse-spark-1.3',
    accent: '#fde68a',
    summary: {
      en: 'Wraps voice transcripts, RAG chunks, and subagent text in <untrusted> tags to verify alignment with crew intent.',
      es: 'Envuelve transcripciones de voz, fragmentos RAG y texto entre subagentes en etiquetas <untrusted> para verificar coherencia con la intención de la tripulación.',
    },
    rules: [
      {
        en: 'Strict alignment between the astronaut command, live MissionContext telemetry, and proposed physical effects.',
        es: 'Alineación estricta entre la orden del astronauta, la telemetría viva de MissionContext y los efectos físicos propuestos.',
      },
      {
        en: 'Fail-closed policy (deny) against manipulation attempts or FDIR component isolation without telemetry corroboration.',
        es: 'Política fail-closed (deny) ante intentos de manipulación o aislamiento FDIR sin corroboración telemétrica.',
      },
      {
        en: 'Mandatory clinical framing for SUIT.HEALTH: operational decision support only, never medical diagnosis or prescription.',
        es: 'Enmarcación clínica obligatoria para SUIT.HEALTH: solo soporte operativo de decisión, nunca diagnóstico ni prescripción médica.',
      },
    ],
  },
  {
    id: 'guardian-voting',
    step: {
      en: 'Layer 3 · 3-Model Escalated Consensus',
      es: 'Capa 3 · Consenso Escalado de 3 Modelos',
    },
    title: {
      en: 'Asymmetric Safety Override (voting.ts)',
      es: 'Asymmetric Safety Override (voting.ts)',
    },
    moduleRef: 'server/src/agents/voting.ts · 3 heterogeneous voters',
    accent: '#fb923c',
    summary: {
      en: 'For high-consequence actions (ballistic pod launch, beacons, long/rescue dispatch, borderline ask_human cases, or critical telemetry), three models vote in parallel.',
      es: 'Para acciones de alta consecuencia (lanzamiento de pod balístico, balizas, despacho largo o rescate, casos borderline ask_human o telemetría crítica), tres modelos votan en paralelo.',
    },
    rules: [
      {
        en: 'Concurrent voters: Voter A (gemini-4-carbon), Voter B (gemini-4-argon), and Voter C (Meta muse-wonder-1.0).',
        es: 'Votantes concurrentes: Voter A (gemini-4-carbon), Voter B (gemini-4-argon) y Voter C (Meta muse-wonder-1.0).',
      },
      {
        en: 'If a 2-allow / 1-deny split occurs and the dissenting model reports confidence ≥ 0.85, the Asymmetric Safety Override downgrades the verdict to ask_human.',
        es: 'Si ocurre una división 2-allow / 1-deny y el modelo disidente reporta confianza ≥ 0.85, el Asymmetric Safety Override degrada el veredicto a ask_human.',
      },
      {
        en: 'Guarantees explicit crew confirmation (human-in-the-loop) on irreversible maneuvers such as deploying rescue-bot-1 into the pit.',
        es: 'Garantiza confirmación explícita de la tripulación (human-in-the-loop) en maniobras irreversibles como el despliegue de rescue-bot-1 dentro de la fosa.',
      },
    ],
  },
];

export const ML_MODELS_DATA: MlModelSummary[] = [
  {
    id: 'hydration-prospector',
    name: { en: 'Hydration Prospector', es: 'Hydration Prospector' },
    modelId: 'tango-horizon-hydration-v1',
    dataset: {
      en: '1,567 MSL Curiosity DAN neutron stops (377 in scene) + CRISM MTRDR + THEMIS IR + CTX',
      es: '1,567 mediciones de neutrones DAN de MSL Curiosity (377 en escena) + CRISM MTRDR + THEMIS IR + CTX',
    },
    architecture: {
      en: 'GradientBoostingRegressor ensemble + 90% conformal intervals (tools/train_hydration.py)',
      es: 'Ensemble GradientBoostingRegressor + intervalos conformales al 90% (tools/train_hydration.py)',
    },
    primaryMetric: {
      en: 'Spearman = 0.5823',
      es: 'Spearman = 0.5823',
    },
    metrics: [
      {
        en: '500 m spatial GroupKFold (36 blocks): Spearman = 0.5823 (p = 6.845e-143)',
        es: 'GroupKFold espacial 500 m (36 bloques): Spearman = 0.5823 (p = 6.845e-143)',
      },
      {
        en: 'Blocked R² = 0.3638 · MAE = 0.3695 vs. block-mean baseline MAE = 0.4860',
        es: 'Blocked R² = 0.3638 · MAE = 0.3695 vs. baseline de media por bloque MAE = 0.4860',
      },
      {
        en: 'Top features: elev (0.566), themis_day (0.139), img_mean (0.056)',
        es: 'Variables líderes: elev (0.566), themis_day (0.139), img_mean (0.056)',
      },
    ],
    operationalRole: {
      en: 'Generates the 1024×1024 subsurface mineral hydration layer (relative H/OH) and uncertainty map to prioritize drilling targets.',
      es: 'Genera la capa 1024×1024 de hidratación mineral subsuperficial (H/OH relativo) y mapa de incertidumbre para priorizar objetivos de perforación.',
    },
    accent: '#38bdf8',
  },
  {
    id: 'storm-nowcaster',
    name: { en: 'Storm Nowcaster', es: 'Storm Nowcaster' },
    modelId: 'rems_hgbr_quantile_v1',
    dataset: {
      en: '3,953–4,050 sols of MSL REMS telemetry (28 features) + Mastcam 880 nm opacity (msl_tau_880.csv)',
      es: '3,953–4,050 soles de telemetría MSL REMS (28 variables) + opacidad Mastcam 880 nm (msl_tau_880.csv)',
    },
    architecture: {
      en: 'Quantile HistGradientBoostingRegressor (q10, q50, q90) + Conformalized Quantile Regression (CQR)',
      es: 'HistGradientBoostingRegressor por cuantiles (q10, q50, q90) + Conformalized Quantile Regression (CQR)',
    },
    primaryMetric: {
      en: 'Spearman = 0.765–0.796 (+1 to +3 sols)',
      es: 'Spearman = 0.765–0.796 (+1 a +3 sols)',
    },
    metrics: [
      {
        en: '+1 / +2 / +3 sol horizons (MY 34 held-out test): Spearman = 0.777 / 0.765 / 0.796',
        es: 'Horizontes +1 / +2 / +3 sols (test MY 34): Spearman = 0.777 / 0.765 / 0.796',
      },
      {
        en: 'Beats 10° Ls seasonal climatology MAE at all 3 horizons (1.587 / 1.524 / 1.332)',
        es: 'Supera la climatología estacional (10° Ls) en MAE en los 3 horizontes (1.587 / 1.524 / 1.332)',
      },
      {
        en: 'Verified tide precursor (n = 58 sols MY 34): semidiurnal s2_amp rises 0.01727 → 0.0642, Spearman(s2_amp, tau) = 0.6709',
        es: 'Precursor físico verificado (n = 58 sols MY 34): marea semidiurna s2_amp sube 0.01727 → 0.0642, Spearman(s2_amp, tau) = 0.6709',
      },
    ],
    operationalRole: {
      en: 'Issues 1–3 sol dust opacity (tau) forecasts for WEATHER-RAD, anticipating global dust storms and triggering drone grounding (tau ≥ 1.8).',
      es: 'Emite pronósticos de opacidad de polvo tau a 1–3 soles para WEATHER-RAD, anticipando tormentas globales y activando el repliegue de drones (tau ≥ 1.8).',
    },
    accent: '#fb923c',
  },
  {
    id: 'mineral-vein-detector',
    name: { en: 'Mineral Vein Detector', es: 'Mineral Vein Detector' },
    modelId: 'tango-horizon-veins-v1 (dinov2-small-vits14)',
    dataset: {
      en: '117 audited real Curiosity Mastcam and MAHLI frames (41 positive, 76 negative across 22 sols)',
      es: '117 frames reales auditados de Curiosity Mastcam y MAHLI (41 positivos, 76 negativos en 22 soles)',
    },
    architecture: {
      en: 'Frozen Meta DINOv2-small embeddings (384-d CLS + 32×32 patches) + StandardScaler + LogisticRegression',
      es: 'Embeddings congelados Meta DINOv2-small (CLS 384-d + parches 32×32) + StandardScaler + LogisticRegression',
    },
    primaryMetric: {
      en: 'ROC-AUC = 0.8453',
      es: 'ROC-AUC = 0.8453',
    },
    metrics: [
      {
        en: 'Sol-grouped GroupKFold (5 folds): ROC-AUC = 0.8453 · PR-AUC = 0.7961 (0.3504 base rate)',
        es: 'GroupKFold agrupado por sol (5 folds): ROC-AUC = 0.8453 · PR-AUC = 0.7961 (tasa base 0.3504)',
      },
      {
        en: 'F1 = 0.7200 · Precision = 0.7941 · Recall = 0.6585',
        es: 'F1 = 0.7200 · Precision = 0.7941 · Recall = 0.6585',
      },
      {
        en: '500-run permutation test: p = 0.0020 (null AUC = 0.4925 ± 0.0710)',
        es: 'Test de permutación (500 corridas): p = 0.0020 (AUC nulo = 0.4925 ± 0.0710)',
      },
    ],
    operationalRole: {
      en: 'Produces 256×256 heatmaps strictly over real Mastcam/MAHLI photographs (never synthetic 3D renders) to guide sampling targets.',
      es: 'Produce mapas de calor 256×256 únicamente sobre fotografías reales Mastcam/MAHLI (nunca renders sintéticos) para guiar objetivos de muestreo.',
    },
    accent: '#a78bfa',
  },
];

export const RESCUE_SCENARIO_STEPS: RescueScenarioStep[] = [
  {
    id: 'rescue-s1-s2',
    stage: {
      en: 'S1–S2 · Mechanical Fault & Natural Pit Fall',
      es: 'S1–S2 · Falla Mecánica y Caída en Fosa Natural',
    },
    title: {
      en: 'rover-1 immobilization and DIAZ-CANO fall into RESCUE_PIT',
      es: 'Inmovilización de rover-1 y caída de DIAZ-CANO en RESCUE_PIT',
    },
    actors: ['DIAZ-CANO (eva-4 / Cassini)', 'SALERNO', 'rover-1', 'MAINTENANCE'],
    telemetry: {
      en: 'RESCUE_PIT: 24 m diameter × 4 m depth, 290 m East · Fault RVR-MOB-01',
      es: 'RESCUE_PIT: 24 m diámetro × 4 m profundidad a 290 m Este · Falla RVR-MOB-01',
    },
    summary: {
      en: 'During a science traverse, rover-1 suffers a critical wheel actuator fault (RVR-MOB-01) isolated by MAINTENANCE. While sampling the rim of the natural geological pit (24 m × 4 m, 290 m East of base), DIAZ-CANO slips inside.',
      es: 'Durante una travesía científica, rover-1 sufre una falla crítica en el actuador de rueda (RVR-MOB-01) aislada por MAINTENANCE. Al muestrear el borde de la fosa geológica natural (24 m × 4 m, 290 m al Este de la base), DIAZ-CANO resbala hacia el interior.',
    },
    accent: '#fb923c',
  },
  {
    id: 'rescue-s3',
    stage: {
      en: 'S3 · Suit Puncture & Rising Dust Storm',
      es: 'S3 · Perforación de Traje y Tormenta en Ascenso',
    },
    title: {
      en: 'Critical biomedical alert and NO-GO weather verdict',
      es: 'Alerta biomédica crítica y veredicto climático NO-GO',
    },
    actors: ['SUIT.HEALTH', 'WEATHER-RAD', 'NASA-STD-3001 RAG (<2 ms)'],
    telemetry: {
      en: 'dP/dt = -0.12 kPa/s · HR = 148 bpm · Opacity tau 0.5 → 6.0',
      es: 'dP/dt = -0.12 kPa/s · HR = 148 bpm · Opacidad tau 0.5 → 6.0',
    },
    summary: {
      en: 'SUIT.HEALTH detects suit depressurization from a micro-puncture and tachycardia spike against personal baselines and NASA-STD-3001. Simultaneously, atmospheric dust opacity tau ramps toward 6.0 and WEATHER-RAD issues a NO-GO verdict for walking back.',
      es: 'SUIT.HEALTH detecta despresurización por micro-perforación y pico taquicárdico contra la línea base personal y NASA-STD-3001. Simultáneamente, la opacidad atmosférica tau escala hacia 6.0 y WEATHER-RAD emite veredicto NO-GO para retorno a pie.',
    },
    accent: '#f87171',
  },
  {
    id: 'rescue-s4-s5',
    stage: {
      en: 'S4–S5 · Aerial Overwatch, RK4 Pod & A* Route',
      es: 'S4–S5 · Overwatch Aéreo, Pod RK4 y Ruta A*',
    },
    title: {
      en: 'Autonomous deployment validated by GUARDIAN',
      es: 'Despliegue autónomo validado por GUARDIAN',
    },
    actors: ['BASE', 'drone-1', 'drone-2', 'rescue-1', 'rescue-bot-1', 'GUARDIAN'],
    telemetry: {
      en: 'Drone standoff ≥ 25 m (20–30 m alt) · 8.0 kg RK4 Pod (>15 m) · A* Route ≤ 16°',
      es: 'Standoff drones ≥ 25 m (altitud 20–30 m) · Pod 8.0 kg RK4 (>15 m) · Ruta A* ≤ 16°',
    },
    summary: {
      en: 'BASE launches drone-1 and drone-2 for LiDAR mapping and radio relay while tau < 1.8, dispatches pressurized rover rescue-1 carrying rescue-bot-1 along a HiRISE A* path, and—if time-to-hypoxia requires—fires the 8.0 kg RK4-integrated ballistic life-support drop-pod (COPV O2, LiOH scrubber, 200 Wh battery, patch kit).',
      es: 'BASE lanza drone-1 y drone-2 para mapeo LiDAR y enlace radio mientras tau < 1.8, despacha el rover presurizado rescue-1 con rescue-bot-1 por ruta A* sobre HiRISE y, si el tiempo a hipoxia lo exige, dispara el pod balístico de soporte vital de 8.0 kg integrado con RK4 (COPV O2, depurador LiOH, batería 200 Wh y kit de parche).',
    },
    accent: '#7df9ff',
  },
  {
    id: 'rescue-s6-s7',
    stage: {
      en: 'S6–S7 · Human Confirmation, Extraction & Airlock',
      es: 'S6–S7 · Confirmación Humana, Extracción y Esclusa',
    },
    title: {
      en: 'North ramp descent (11.3°) and safe return',
      es: 'Descenso por rampa norte (11.3°) y retorno seguro',
    },
    actors: ['rescue-bot-1', 'rescue-1', 'SOTELO', 'YACONIS', '3-Model Voting'],
    telemetry: {
      en: '11.3° Ramp · 3-Model Consensus + ask_human · Drone recall tau ≥ 1.8',
      es: 'Rampa 11.3° · Consenso 3 modelos + ask_human · Repliegue drones tau ≥ 1.8',
    },
    summary: {
      en: 'Once dust crosses tau ≥ 1.8, drones land safely (recall_aircraft). After human-in-the-loop confirmation (ask_human), rescue-bot-1 descends the 11.3° north ramp, stabilizes oxygen, winches DIAZ-CANO onto its stretcher, transfers him into rescue-1, and returns to the habitat airlock.',
      es: 'Al superar tau ≥ 1.8 los drones aterrizan de forma segura (recall_aircraft). Tras confirmación human-in-the-loop (ask_human), rescue-bot-1 desciende por la rampa norte de 11.3°, estabiliza el oxígeno, asegura a DIAZ-CANO en camilla con cabrestante, lo transfiere a rescue-1 y retorna a la esclusa de la base.',
    },
    accent: '#34d399',
  },
];

export const PROJECT_CAPABILITY_PILLARS: ProjectCapabilityPillar[] = [
  {
    id: 'pillar-voice-5lang',
    badge: { en: 'Hands-Free Interaction', es: 'Interacción Manos Libres' },
    title: {
      en: 'Bidirectional 5-Language Voice & QR Mobile Pointer',
      es: 'Voz Bidireccional en 5 Idiomas y Puntero Móvil QR',
    },
    metric: {
      en: '5 Languages · <5 ms Local · 32-Band FFT',
      es: '5 Idiomas · <5 ms Local · 32-Band FFT',
    },
    accent: '#7df9ff',
    description: {
      en: 'Full keyboard-free operation in English, Spanish, French, German, and Italian with sub-5 ms local critical intents, Mars-glossary multimodal STT, and Google Cloud Neural TTS (Journey Voices) with Apollo Quindar tones (2525/2475 Hz).',
      es: 'Operación integral sin teclado en inglés, español, francés, alemán e italiano con intenciones críticas locales (<5 ms), STT multimodal normalizado por glosario marciano y síntesis Cloud Neural TTS (Journey Voices) con tonos Apollo Quindar (2525/2475 Hz).',
    },
    highlights: [
      {
        en: 'Direct voice control or QR-paired smartphone gyroscope pointer (/remote over /ws/remote) with haptic vibration.',
        es: 'Control por voz directa o puntero giroscópico móvil emparejado por QR (/remote vía /ws/remote) con vibración háptica.',
      },
      {
        en: 'CSS3D curved visor HUD featuring a live 32-band FFT spectrum analyzer and source provenance.',
        es: 'Visor curvo CSS3D con analizador de espectro FFT en vivo de 32 bandas y trazabilidad de fuentes.',
      },
    ],
  },
  {
    id: 'pillar-rag-predictivo',
    badge: { en: 'Aerospace RAG <2 ms', es: 'RAG Aeroespacial <2 ms' },
    title: {
      en: 'In-Memory BM25 over 1,002 Chunks & 15 NASA Standards',
      es: 'BM25 en Memoria sobre 1,002 Fragmentos y 15 Estándares NASA',
    },
    metric: {
      en: '1,002 Chunks · <2 ms · 0 External DB',
      es: '1,002 Chunks · <2 ms · 0 DB Externa',
    },
    accent: '#c4b5fd',
    description: {
      en: 'BM25 engine (k1 = 1.5, b = 0.75) citing exact document and page across NASA-STD-3001 Vol. 1 & 2, OCHMO, AMCL, MEDPRAT, Mars-GRAM, MCD v5.2, MSL RAD, and MOXIE to anticipate failures before critical thresholds are breached.',
      es: 'Motor BM25 (k1 = 1.5, b = 0.75) que cita documento y página exacta de NASA-STD-3001 Vol. 1 y 2, OCHMO, AMCL, MEDPRAT, Mars-GRAM, MCD v5.2, MSL RAD y MOXIE para anticipar fallas antes de alcanzar umbrales críticos.',
    },
    highlights: [
      {
        en: 'Predictive health: sliding slopes, time_to_breach_s, and Casson/Quemada blood rheology bio-twin.',
        es: 'Salud predictiva: pendientes deslizantes, time_to_breach_s y gemelo reológico sanguíneo Casson/Quemada.',
      },
      {
        en: 'Predictive FDIR (rul_s) across suit PLSS, rovers, manipulator arm, solar arrays, and MOXIE electrolyzer.',
        es: 'FDIR predictivo (rul_s) en PLSS, rovers, brazo manipulador, energía solar y electrolizador MOXIE.',
      },
    ],
  },
  {
    id: 'pillar-robotics-physics',
    badge: { en: 'Deterministic Physics & Robotics', es: 'Física & Robótica Determinista' },
    title: {
      en: '4-DOF Inverse Kinematics, GPS-Denied Nav & RK4 Ballistics',
      es: 'Cinemática Inversa 4-DOF, Localización Sin GPS y Balística RK4',
    },
    metric: {
      en: '4-DOF IK · 6.5 GHz UWB · 8.0 kg RK4 Pod',
      es: '4-DOF IK · 6.5 GHz UWB · Pod 8.0 kg RK4',
    },
    accent: '#fb923c',
    description: {
      en: 'Deterministic physics simulation in @th/shared: Pandolf-Santee metabolism at 0.379 g, choked compressible suit leak, Kevlar spherical pendulum on coaxial rotorcraft, MRL + UWB + VIO + 360° Flash LiDAR localization, and multimodal camera vision (/api/agent/vision).',
      es: 'Simulación física determinista en @th/shared: metabolismo Pandolf-Santee a 0.379 g, fuga compresible estrangulada, péndulo esférico Kevlar en helicópteros coaxiales, localización MRL + UWB + VIO + LiDAR 360° y visión multimodal (/api/agent/vision).',
    },
    highlights: [
      {
        en: 'HANDS manipulator arm (manip-1 / rover-3) with 1.7 m reach and 512×384 mast camera for drill, sample, photograph, and handover.',
        es: 'Brazo manipulador HANDS (manip-1 / rover-3) con 1.7 m de alcance y cámara mast 512×384 para drill, sample, photograph y handover.',
      },
      {
        en: 'Solid-state LED/laser + 6.5 GHz UWB beacons compliant with 100% O2 fire safety (NASA-STD-3001 V2 6002).',
        es: 'Balizas sólidas LED/láser + UWB 6.5 GHz conformes a seguridad contra incendios en 100% O2 (NASA-STD-3001 V2 6002).',
      },
    ],
  },
  {
    id: 'pillar-nasa-data-ml',
    badge: { en: 'Real NASA / USGS Science', es: 'Ciencia Real NASA / USGS' },
    title: {
      en: '57 Checksummed Assets (SHA-256) & 3 Validated ML Models',
      es: '57 Activos Trazables (SHA-256) y 3 Modelos ML Validados',
    },
    metric: {
      en: '57 Provenance Entries · 3 ML Models',
      es: '57 Entradas Provenance · 3 Modelos ML',
    },
    accent: '#fde68a',
    description: {
      en: 'Gale Crater terrain anchored to HiRISE (1 m/px DTM, 0.25 m/px ortho), CTX, THEMIS IR, JPL Horizons DE441 ephemeris, DONKI WSA-Enlil alerts, MSL RAD doses, and 3 offline-trained ML models with leakage-free spatial/temporal CV.',
      es: 'Terreno del Cráter Gale anclado a HiRISE (1 m/px DTM, 0.25 m/px orto), CTX, THEMIS IR, efemérides JPL Horizons DE441, alertas DONKI WSA-Enlil, dosis MSL RAD y 3 modelos entrenados offline con validación cruzada libre de fuga temporal/espacial.',
    },
    highlights: [
      {
        en: 'Hydration Prospector (1,567 DAN stops · Spearman 0.5823), Storm Nowcaster (3,953–4,050 REMS sols · Spearman 0.765–0.796), and Mineral Vein Detector (117 Mastcam/MAHLI frames · ROC-AUC 0.8453).',
        es: 'Hydration Prospector (1,567 puntos DAN · Spearman 0.5823), Storm Nowcaster (3,953–4,050 sols REMS · Spearman 0.765–0.796) y Mineral Vein Detector (117 frames Mastcam/MAHLI · ROC-AUC 0.8453).',
      },
      {
        en: 'Reproducible infrastructure with Terraform, Cloud Run, GitHub Actions CI/CD, and Vercel Edge.',
        es: 'Infraestructura reproducible con Terraform, Cloud Run, GitHub Actions CI/CD y Vercel Edge.',
      },
    ],
  },
];

export const TEAM_ROSTER_SUMMARY: TeamMemberSummary[] = [
  {
    name: 'Agustin Diaz-Cano',
    role: {
      en: 'MS Candidate, Systems Engineering',
      es: 'Candidato a Magíster, Ingeniería en Sistemas',
    },
    affiliation: { en: 'UTN, FRBA', es: 'UTN, FRBA' },
    links: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/agustindiazcano/' },
      { label: 'Portfolio', url: 'https://www.agustindiazcano.com/' },
      { label: 'GitHub', url: 'https://github.com/agustindiazcano' },
      { label: 'Qollab', url: 'https://qollab.xyz/u/agustindiazcano' },
      { label: 'YouTube', url: 'https://www.youtube.com/@agustin-diaz-cano' },
    ],
  },
  {
    name: 'Baltazar Salerno',
    role: {
      en: 'Frontend Developer',
      es: 'Desarrollador Frontend',
    },
    affiliation: { en: 'Buenos Aires, Argentina', es: 'Buenos Aires, Argentina' },
    links: [{ label: 'GitHub', url: 'https://github.com/S-Baltazar' }],
  },
  {
    name: 'Milagros Sotelo',
    role: {
      en: 'Systems Engineering Student',
      es: 'Estudiante de Ingeniería en Sistemas',
    },
    affiliation: { en: 'UTN, FRBA', es: 'UTN, FRBA' },
    links: [{ label: 'GitHub', url: 'https://github.com/Milagros-Sotelo' }],
  },
  {
    name: 'Federico Yaconis',
    role: {
      en: '3D Developer & QA',
      es: 'Desarrollador 3D y QA',
    },
    affiliation: { en: 'Buenos Aires, Argentina', es: 'Buenos Aires, Argentina' },
    links: [],
  },
];

export function getProjectHeroCopy(lang: SiteLang) {
  return {
    badge: PROJECT_HERO_COPY.badge[lang],
    title: PROJECT_HERO_COPY.title,
    subtitle: PROJECT_HERO_COPY.subtitle[lang],
    summary: PROJECT_HERO_COPY.summary[lang],
    marsContext: PROJECT_HERO_COPY.marsContext[lang],
  };
}

export function getAiUsageData(lang: SiteLang) {
  return {
    methodologyTitle: AI_USAGE_DATA.methodologyTitle[lang],
    methodologyUrl: AI_USAGE_DATA.methodologyUrl,
    methodologySummary: AI_USAGE_DATA.methodologySummary[lang],
    codingAgents: AI_USAGE_DATA.codingAgents,
    orchestrationNote: AI_USAGE_DATA.orchestrationNote[lang],
    workflowAi: AI_USAGE_DATA.workflowAi,
    contractFiles: AI_USAGE_DATA.contractFiles.map((entry) => ({
      file: entry.file,
      role: entry.role[lang],
    })),
    humanResponsibility: AI_USAGE_DATA.humanResponsibility[lang],
  };
}

export function getTechStackGroups(lang: SiteLang) {
  return TECH_STACK_GROUPS.map((group) => ({
    id: group.id,
    category: group.category[lang],
    accent: group.accent,
    items: group.items.map((item) => item[lang]),
  }));
}

export function getMultiAgentTiers(lang: SiteLang) {
  return MULTI_AGENT_TIERS.map((tier) => ({
    ...tier,
    tier: tier.tier[lang],
    offlineFallback: tier.offlineFallback[lang],
    latencyOrBudget: tier.latencyOrBudget[lang],
    role: tier.role[lang],
  }));
}

export function getGuardianLayers(lang: SiteLang) {
  return GUARDIAN_LAYERS.map((layer) => ({
    ...layer,
    step: layer.step[lang],
    title: layer.title[lang],
    summary: layer.summary[lang],
    rules: layer.rules.map((rule) => rule[lang]),
  }));
}

export function getMlModelsData(lang: SiteLang) {
  return ML_MODELS_DATA.map((model) => ({
    ...model,
    name: model.name[lang],
    dataset: model.dataset[lang],
    architecture: model.architecture[lang],
    primaryMetric: model.primaryMetric[lang],
    metrics: model.metrics.map((m) => m[lang]),
    operationalRole: model.operationalRole[lang],
  }));
}

export function getRescueScenarioSteps(lang: SiteLang) {
  return RESCUE_SCENARIO_STEPS.map((step) => ({
    ...step,
    stage: step.stage[lang],
    title: step.title[lang],
    telemetry: step.telemetry[lang],
    summary: step.summary[lang],
  }));
}

export function getProjectCapabilityPillars(lang: SiteLang) {
  return PROJECT_CAPABILITY_PILLARS.map((pillar) => ({
    ...pillar,
    badge: pillar.badge[lang],
    title: pillar.title[lang],
    metric: pillar.metric[lang],
    description: pillar.description[lang],
    highlights: pillar.highlights.map((h) => h[lang]),
  }));
}

export function getTeamRosterSummary(lang: SiteLang) {
  return TEAM_ROSTER_SUMMARY.map((member) => ({
    ...member,
    role: member.role[lang],
    affiliation: member.affiliation[lang],
  }));
}
