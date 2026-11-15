import type { CarouselSlide } from '@/components/ui/FlexCarousel';
import type { ProfileCardProps } from '@/components/ui/ProfileCard';
import type { SiteLang } from '@/context/LanguageContext';

export interface ProjectMetadata {
  name: string;
  event: string;
  localNode: string;
  challenge: string;
  releaseDate: string;
  simulatorUrl: string;
  siteUrl: string;
  repoUrl: string;
  spaceAppsUrl: string;
}

export interface SynthesisCarouselSlide extends CarouselSlide {
  id: string;
  category: 'lunar' | 'marciana';
  categoryLabel: string;
  moduleRef: string;
}

export interface ContinuityStage {
  id: string;
  step: string;
  world: string;
  metric: string;
  accent: string;
  summary: string;
}

export interface CompendiumModule {
  code: string;
  sphere: string;
  accent: string;
  title: string;
  synthesis: string;
  keyConcepts: string[];
  formula: string;
}

export interface ComparisonRow {
  param: string;
  moon: string;
  mars: string;
  implication: string;
}

export interface ReflectionBlock {
  id: string;
  badge: string;
  title: string;
  accent: string;
  paragraphs: string[];
}

export interface FinalSynthesisData {
  kicker: string;
  title: string;
  subtitle: string;
  abstract: string;
  continuityArc: ContinuityStage[];
  modulesCompendium: CompendiumModule[];
  comparisonRows: ComparisonRow[];
  reflectionBlocks: ReflectionBlock[];
}

export interface ArchitectureHighlight {
  id: string;
  badge: string;
  title: string;
  metric: string;
  accent: string;
  description: string;
}

export interface TeamPhilosophy {
  kicker: string;
  title: string;
  paragraphs: string[];
  pillars: Array<{
    title: string;
    detail: string;
  }>;
}

const PROJECT_METADATA_EN: ProjectMetadata = {
  name: 'Tango Horizon Project',
  event: 'NASA International Space Apps Challenge 2026',
  localNode: 'Buenos Aires, Argentina · Universidad de Palermo Host Site',
  challenge: 'Interplanetary Survival Guide: Martian Map',
  releaseDate: '2026-11-15',
  simulatorUrl: 'https://tangohorizon.vercel.app',
  siteUrl: 'https://tangohorizon-site.vercel.app',
  repoUrl: 'https://github.com/agustindiazcano/nasa-mars-tango-horizon',
  spaceAppsUrl:
    'https://www.spaceappschallenge.org/2026/find-a-team/tango-horizon/?tab=project',
};

const PROJECT_METADATA_ES: ProjectMetadata = {
  ...PROJECT_METADATA_EN,
  name: 'Proyecto Tango Horizon',
  localNode: 'Buenos Aires, Argentina · Sede Universidad de Palermo',
};

export const PROJECT_METADATA: ProjectMetadata = PROJECT_METADATA_EN;

export function getProjectMetadata(lang: SiteLang): ProjectMetadata {
  return lang === 'es' ? PROJECT_METADATA_ES : PROJECT_METADATA_EN;
}

const SYNTHESIS_CAROUSEL_IMAGES_EN: SynthesisCarouselSlide[] = [
  {
    id: 'saturn-v-launch',
    category: 'lunar',
    categoryLabel: 'Lunar Thesis · Propulsion',
    title: 'Saturn V Launch Vehicle Ignition (AS-506 · Apollo 11)',
    year: 'July 16, 1969',
    src: 'https://images-assets.nasa.gov/image/ksc-69pc-442/ksc-69pc-442~orig.jpg',
    alt: 'Liftoff of the Apollo 11 Saturn V rocket from Launch Complex 39A at Kennedy Space Center',
    description:
      'Five F-1 engines on the S-IC first stage generate 34.5 MN of thrust burning RP-1 kerosene and liquid oxygen (LOX) to climb out of Earth’s gravity well toward Trans-Lunar Injection (10.9 km/s).',
    moduleRef: 'Module III · Theoretical Ballistics & Saturn V',
  },
  {
    id: 'apollo-11-earthrise',
    category: 'lunar',
    categoryLabel: 'Lunar Thesis · Orbital Mechanics',
    title: 'Earth Rising Above the Lunar Limb (Mare Smythii)',
    year: 'July 20, 1969',
    src: 'https://images-assets.nasa.gov/image/as11-44-6551/as11-44-6551~orig.jpg',
    alt: 'Blue Earth suspended above the gray lunar horizon photographed from Apollo 11',
    description:
      'Captured from selenocentric orbit prior to the separation of Lunar Module Eagle and Command Module Columbia. Visually materializes the 60.27 Earth radii (384,400 km) calculated by Hipparchus in antiquity.',
    moduleRef: 'Modules I & II · Hipparchus Parallax & Selenocentric Orbit',
  },
  {
    id: 'eagle-lander-surface',
    category: 'lunar',
    categoryLabel: 'Lunar Thesis · Lunar Landing',
    title: 'Lunar Module Eagle (LM-5) at Mare Tranquillitatis',
    year: 'July 20, 1969',
    src: 'https://images-assets.nasa.gov/image/as11-40-5948/as11-40-5948~orig.jpg',
    alt: 'Lunar Module Eagle resting on the surface of the Sea of Tranquility with gold thermal foil',
    description:
      'The staged spacecraft conceived under John Houbolt’s Lunar Orbit Rendezvous (LOR) architecture, showing its gold Kapton thermal insulation and surface contact probes beneath the landing footpads.',
    moduleRef: 'Modules III & IV · Lunar Orbit Rendezvous (LOR)',
  },
  {
    id: 'aldrin-eva-tranquility',
    category: 'lunar',
    categoryLabel: 'Lunar Thesis · In-Situ Selenology',
    title: 'Buzz Aldrin During Lunar Extravehicular Activity',
    year: 'July 20, 1969',
    src: 'https://images-assets.nasa.gov/image/as11-40-5903/as11-40-5903~orig.jpg',
    alt: 'Astronaut Buzz Aldrin on lunar soil reflecting the Eagle lander and Neil Armstrong in his visor',
    description:
      'Aldrin’s gold-plated helmet visor reflects Neil Armstrong, the Eagle lander, and the crisp, atmosphere-free shadows that Galileo had deduced geometrically in 1609 through his optical refractor.',
    moduleRef: 'Module IV · Empirical Selenology & ALSEP Stations',
  },
  {
    id: 'bootprint-regolith',
    category: 'lunar',
    categoryLabel: 'Lunar Thesis · Lunar Geotechnics',
    title: 'Soil Mechanics in Lunar Regolith (AS11-40-5880)',
    year: 'July 20, 1969',
    src: 'https://images-assets.nasa.gov/image/as11-40-5880/as11-40-5880~orig.jpg',
    alt: 'Crisp space bootprint pressed into cohesive lunar regolith',
    description:
      'Cohesion and compaction demonstration in anhydrous basaltic regolith shaped over billions of years of micrometeorite gardening without wind or liquid water erosion.',
    moduleRef: 'Module IV · Lunar Petrography & Regolith (382 kg)',
  },
  {
    id: 'hubble-mars-opposition',
    category: 'marciana',
    categoryLabel: 'Martian Thesis · Telescopic Observation',
    title: 'Syrtis Major Hemisphere and Martian Polar Cap (PIA03154)',
    year: '2001 · Hubble Opposition',
    src: 'https://images-assets.nasa.gov/image/PIA03154/PIA03154~orig.jpg',
    alt: 'Full-disk Hubble Space Telescope view of Mars showing Syrtis Major and polar clouds',
    description:
      'Full-disk Hubble image of Mars highlighting the dark volcanic plain Syrtis Major (sketched by Huygens in 1659), the Hellas Planitia impact basin, and the frozen CO₂ and H₂O polar cap.',
    moduleRef: 'Modules I & II · Albedo Cartography & Cassini Parallax',
  },
  {
    id: 'curiosity-namib-dune-selfie',
    category: 'marciana',
    categoryLabel: 'Martian Thesis · Gale Crater Geology',
    title: 'Curiosity Chemical Laboratory at Namib Dune (PIA20316)',
    year: 'January 2016',
    src: 'https://images-assets.nasa.gov/image/PIA20316/PIA20316~orig.jpg',
    alt: 'Curiosity rover self-portrait in front of dark basaltic sands at Namib Dune in Gale Crater',
    description:
      'Curiosity rover self-portrait analyzing dark basaltic sands and sedimentary strata along the flanks of Aeolis Mons (Mount Sharp) inside Gale Crater—the direct cartographic setting of the Tango Horizon 3D simulator.',
    moduleRef: 'Module V · Gale Crater Petrography & ISRU Resources',
  },
  {
    id: 'perseverance-sky-crane-descent',
    category: 'marciana',
    categoryLabel: 'Martian Thesis · EDL Descent',
    title: 'Sky Crane Propulsive Descent of Perseverance (PIA24431)',
    year: 'February 18, 2021',
    src: 'https://images-assets.nasa.gov/image/PIA24431/PIA24431~orig.jpg',
    alt: 'Overhead view of Perseverance rover suspended on nylon tethers beneath the Sky Crane descent stage',
    description:
      'High-resolution frame captured from the descent stage as nylon bridles lower Perseverance gently onto Jezero Crater regolith after surviving hypersonic atmospheric entry.',
    moduleRef: 'Module IV · Entry, Descent, and Landing (EDL)',
  },
  {
    id: 'ingenuity-mars-helicopter',
    category: 'marciana',
    categoryLabel: 'Martian Thesis · Atmospheric Flight',
    title: 'Coaxial Helicopter Ingenuity at Wright Brothers Field (PIA24542)',
    year: 'April 2021',
    src: 'https://images-assets.nasa.gov/image/PIA24542/PIA24542~orig.jpg',
    alt: 'Experimental Ingenuity helicopter on reddish Jezero Crater soil photographed by Perseverance',
    description:
      'The first powered aircraft to operate on another planet, resting on Martian soil before spinning its carbon-fiber rotors at 2,400 RPM in an atmosphere of just 6.1 mbar.',
    moduleRef: 'Module IV · Aerodynamics in a Thin CO₂ Atmosphere',
  },
];

const SYNTHESIS_CAROUSEL_IMAGES_ES: SynthesisCarouselSlide[] = [
  {
    id: 'saturn-v-launch',
    category: 'lunar',
    categoryLabel: 'Tesis Lunar · Propulsión',
    title: 'Ignición del Vector Saturno V (AS-506 · Apolo 11)',
    year: '16 de julio de 1969',
    src: 'https://images-assets.nasa.gov/image/ksc-69pc-442/ksc-69pc-442~orig.jpg',
    alt: 'Despegue del cohete Saturno V de la misión Apolo 11 desde el Complejo 39A del Centro Espacial Kennedy',
    description:
      'Los cinco motores F-1 de la primera etapa S-IC generan 34.5 MN de empuje quemando queroseno RP-1 y oxígeno líquido (LOX) para vencer el pozo gravitatorio terrestre rumbo a la Inyección Translunar (10.9 km/s).',
    moduleRef: 'Módulo III · Balística Teórica y Saturno V',
  },
  {
    id: 'apollo-11-earthrise',
    category: 'lunar',
    categoryLabel: 'Tesis Lunar · Mecánica Orbital',
    title: 'La Tierra Elevándose sobre el Limbo Lunar (Mare Smythii)',
    year: '20 de julio de 1969',
    src: 'https://images-assets.nasa.gov/image/as11-44-6551/as11-44-6551~orig.jpg',
    alt: 'La Tierra azul suspendida sobre el horizonte gris del limbo lunar fotografiada desde el Apolo 11',
    description:
      'Capturada desde la órbita selenocéntrica antes de la separación del módulo Eagle y el módulo de mando Columbia. Materializa visualmente los 60.27 radios terrestres (384,400 km) calculados por Hiparco en la antigüedad.',
    moduleRef: 'Módulos I y II · Paralaje de Hiparco y Órbita Selenocéntrica',
  },
  {
    id: 'eagle-lander-surface',
    category: 'lunar',
    categoryLabel: 'Tesis Lunar · Alunizaje',
    title: 'Módulo Lunar Eagle (LM-5) en el Mare Tranquillitatis',
    year: '20 de julio de 1969',
    src: 'https://images-assets.nasa.gov/image/as11-40-5948/as11-40-5948~orig.jpg',
    alt: 'Módulo Lunar Eagle posado sobre la superficie del Mar de la Tranquilidad con su recubrimiento térmico dorado',
    description:
      'El vehículo fraccionado concebido bajo la arquitectura de Encuentro en Órbita Lunar (LOR) de John Houbolt. Se observa el recubrimiento térmico dorado de Kapton y las sondas de contacto superficial bajo las patas.',
    moduleRef: 'Módulos III y IV · Encuentro en Órbita Lunar (LOR)',
  },
  {
    id: 'aldrin-eva-tranquility',
    category: 'lunar',
    categoryLabel: 'Tesis Lunar · Selenología In Situ',
    title: 'Buzz Aldrin durante la Actividad Extravehicular Lunar',
    year: '20 de julio de 1969',
    src: 'https://images-assets.nasa.gov/image/as11-40-5903/as11-40-5903~orig.jpg',
    alt: 'Astronauta Buzz Aldrin sobre el suelo lunar reflejando al módulo Eagle y a Neil Armstrong en su visor',
    description:
      'En el visor del casco de Aldrin se reflejan Neil Armstrong, el módulo Eagle y las sombras nítidas sin difusión atmosférica que Galileo había deducido geométricamente en 1609 con su refractor óptico.',
    moduleRef: 'Módulo IV · Selenología Empírica y Estaciones ALSEP',
  },
  {
    id: 'bootprint-regolith',
    category: 'lunar',
    categoryLabel: 'Tesis Lunar · Geotecnia Selenita',
    title: 'Mecánica de Suelos en el Regolito Lunar (AS11-40-5880)',
    year: '20 de julio de 1969',
    src: 'https://images-assets.nasa.gov/image/as11-40-5880/as11-40-5880~orig.jpg',
    alt: 'Huella de bota espacial impresa con precisión en el regolito cohesivo de la Luna',
    description:
      'Experimento de cohesión y compactación del regolito basáltico anhidro formado por miles de millones de años de micrometeorización sin erosión eólica ni hídrica.',
    moduleRef: 'Módulo IV · Petrografía Lunar y Regolito (382 kg)',
  },
  {
    id: 'hubble-mars-opposition',
    category: 'marciana',
    categoryLabel: 'Tesis Marciana · Observación Telescópica',
    title: 'Hemisferio de Syrtis Major y Casquete Polar Marciano (PIA03154)',
    year: '2001 · Oposición Hubble',
    src: 'https://images-assets.nasa.gov/image/PIA03154/PIA03154~orig.jpg',
    alt: 'Disco completo del planeta Marte captado por el Telescopio Espacial Hubble mostrando Syrtis Major y nubes polares',
    description:
      'Fotografía de disco completo de Marte donde destacan la llanura volcánica oscura Syrtis Major (dibujada por Huygens en 1659), la cuenca de impacto Hellas Planitia y el casquete polar helado de CO₂ y H₂O.',
    moduleRef: 'Módulos I y II · Cartografía de Albedo y Paralaje de Cassini',
  },
  {
    id: 'curiosity-namib-dune-selfie',
    category: 'marciana',
    categoryLabel: 'Tesis Marciana · Geología en Cráter Gale',
    title: 'Laboratorio Químico Curiosity ante la Duna Namib (PIA20316)',
    year: 'Enero de 2016',
    src: 'https://images-assets.nasa.gov/image/PIA20316/PIA20316~orig.jpg',
    alt: 'Autorretrato del rover Curiosity frente a las arenas basálticas oscuras de la duna Namib en el Cráter Gale',
    description:
      'Autorretrato del rover Curiosity analizando arenas basálticas y estratos sedimentarios en las faldas del Aeolis Mons (Monte Sharp) dentro del Cráter Gale, escenario cartográfico directo del simulador 3D Tango Horizon.',
    moduleRef: 'Módulo V · Petrografía del Cráter Gale y Recursos ISRU',
  },
  {
    id: 'perseverance-sky-crane-descent',
    category: 'marciana',
    categoryLabel: 'Tesis Marciana · Descenso EDL',
    title: 'Descenso Propulsivo Sky Crane del Rover Perseverance (PIA24431)',
    year: '18 de febrero de 2021',
    src: 'https://images-assets.nasa.gov/image/PIA24431/PIA24431~orig.jpg',
    alt: 'Vista cenital del rover Perseverance suspendido por cables bajo la grúa aérea Sky Crane segundos antes del aterrizaje',
    description:
      'Captura en alta resolución tomada desde la etapa de descenso propulsivo mientras los cables de nailon depositan suavemente al rover Perseverance sobre el regolito del Cráter Jezero tras superar la entrada hipersónica.',
    moduleRef: 'Módulo IV · Entrada, Descenso y Aterrizaje (EDL)',
  },
  {
    id: 'ingenuity-mars-helicopter',
    category: 'marciana',
    categoryLabel: 'Tesis Marciana · Vuelo Atmosférico',
    title: 'Helicóptero Coaxial Ingenuity en el Aeródromo Wright Brothers (PIA24542)',
    year: 'Abril de 2021',
    src: 'https://images-assets.nasa.gov/image/PIA24542/PIA24542~orig.jpg',
    alt: 'Helicóptero experimental Ingenuity sobre el suelo rojizo del Cráter Jezero fotografiado por Perseverance',
    description:
      'El primer vehículo aéreo motorizado en operar sobre otro planeta, posado en el suelo marciano antes de hacer girar sus rotores de fibra de carbono a 2,400 RPM en una atmósfera de apenas 6.1 mbar.',
    moduleRef: 'Módulo IV · Aerodinámica en Atmósfera Tenue de CO₂',
  },
];

export const SYNTHESIS_CAROUSEL_IMAGES: SynthesisCarouselSlide[] = SYNTHESIS_CAROUSEL_IMAGES_EN;

export function getSynthesisCarouselImages(lang: SiteLang): SynthesisCarouselSlide[] {
  return lang === 'es' ? SYNTHESIS_CAROUSEL_IMAGES_ES : SYNTHESIS_CAROUSEL_IMAGES_EN;
}

const FINAL_SYNTHESIS_DATA_EN: FinalSynthesisData = {
  kicker: 'Integrating Final Chapter · From Historical Science to Mars Operations',
  title: 'General Compendium: Earth, Moon, Mars & Tango Horizon',
  subtitle:
    'Cross-disciplinary synthesis of the astronomical, mechanical, bioastronautic, and computational foundations linking five millennia of astronomy with autonomous extravehicular activity (EVA) support in 2026.',
  abstract:
    'This compendium consolidates the full arc of our research into a single continuum: the same observational geometry that enabled Hipparchus to bound lunar distance and Cassini to calibrate the Astronomical Unit against Mars now underpins the deterministic physics models, heliocentric Hohmann transfers, ISRU chemical plants, and multi-agent AI runtime of Tango Horizon supporting astronauts in Gale Crater.',
  continuityArc: [
    {
      id: 'arc-earth',
      step: '01 · EARTH',
      world: 'Cradle of Measurement',
      metric: '1 R_E = 6,371 km · 1 AU = 149.6 M km',
      accent: '#38bdf8',
      summary:
        'From Babylonian eclipse tablets and Galileo’s optics to Kepler’s elliptical laws and Newton’s gravitational synthesis, humanity transformed the sky into a calculable physical system.',
    },
    {
      id: 'arc-moon',
      step: '02 · MOON',
      world: 'First Cislunar Testbed',
      metric: '384,400 km · 0.165 g · 1.28 s delay',
      accent: '#fde68a',
      summary:
        'Lunar Orbit Rendezvous (LOR), Saturn V propulsion, and the Apollo surface EVAs validated portable life-support systems (PLSS) and field geology in hard vacuum.',
    },
    {
      id: 'arc-mars',
      step: '03 · MARS',
      world: 'Interplanetary Frontier',
      metric: '225 M km · 0.379 g · 4–24 min delay',
      accent: '#fb923c',
      summary:
        'Months away and separated by radio latencies that preclude real-time teleoperation from Houston, Martian missions demand hypersonic aerobraking, ISRU synthesis (MOXIE/Sabatier), and local autonomy.',
    },
    {
      id: 'arc-horizon',
      step: '04 · TANGO HORIZON 2026',
      world: 'Human–AI EVA Simulation',
      metric: 'Gale Crater 4×4 km · GUARDIAN · 2026-11-15',
      accent: '#c4b5fd',
      summary:
        'Built on real NASA/USGS Gale Crater cartography, Tango Horizon unites deterministic EVA physiology, multilingual voice control, and runtime-verified AI agents to safeguard the crew.',
    },
  ],
  modulesCompendium: [
    {
      code: 'MODULE 01 · ARCHAEOASTRONOMY & PARALLAX',
      sphere: 'Lunar & Martian Thesis (Antiquity – 17th Century)',
      accent: '#fde68a',
      title: 'Geometrizing the Sky: From the Saros Cycle to Solar System Scale',
      synthesis:
        'Physical exploration of a world begins with metric calibration. For the Moon, Chaldean syzygy records (the 223-synodic-month Saros Cycle) evolved into Hipparchus’s diurnal parallax (~60.27 R_E = 384,400 km). For Mars, the 780-day retrograde loop pushed Tycho Brahe and Johannes Kepler beyond crystalline spheres, while simultaneous Paris–Cayenne triangulation (Cassini and Richer, 1672) pinned down the scale of the Astronomical Unit.',
      keyConcepts: [
        'Saros Cycle (18 years, 11 days)',
        'Hipparchus Lunar Parallax (60.27 R_E)',
        'Mars Retrograde Loop (780 days)',
        'Astronomical Unit Calibration (1672)',
      ],
      formula: 'd_Moon = R_E / sin(π_Moon) ≈ 384,400 km   |   1 AU ≈ 1.496 × 10⁸ km',
    },
    {
      code: 'MODULE 02 · TELESCOPIC OPTICS & CELESTIAL MECHANICS',
      sphere: 'Scientific Revolution (1609 – 1687)',
      accent: '#7df9ff',
      title: 'End of the Aristotelian Aether: Galileo’s Refractor, Kepler’s Ellipses & Gravitation',
      synthesis:
        'Two foundational milestones converged in 1609: Galileo Galilei measured shadows along the lunar terminator (Sidereus Nuncius, 1610), proving celestial bodies carry geological relief, while Johannes Kepler published Astronomia Nova demonstrating Mars follows an ellipse of eccentricity e = 0.0934. In 1659 Christiaan Huygens sketched Syrtis Major and deduced the Martian sol (24 h 39 m 35 s), before Isaac Newton unified celestial and terrestrial mechanics in the Principia (1687).',
      keyConcepts: [
        'Lunar orography via terminator shadows',
        'Kepler’s Laws (Ellipses & Equal Areas)',
        'Huygens Martian Rotation (24 h 39 m)',
        'Newtonian Gravitational Synthesis (1687)',
      ],
      formula: 'F = G · (M · m) / r²   |   T² / a³ = 4π² / (G · M_Sun)',
    },
    {
      code: 'MODULE 03 · PROPULSION DYNAMICS & TRAJECTORIES',
      sphere: 'Aerospace Engineering (20th – 21st Century)',
      accent: '#38bdf8',
      title: 'Tsiolkovsky Equation, Lunar Orbit Rendezvous (LOR) & Hohmann Transfers',
      synthesis:
        'Every maneuver beyond Earth obeys Konstantin Tsiolkovsky’s exponential rocket equation (1903). To reach the Moon, Apollo coupled Lunar Orbit Rendezvous (LOR) with Saturn V thrust (34.5 MN, v_TLI = 10.9 km/s, 3-day transit). Reaching Mars requires escaping Low Earth Orbit via Trans-Mars Injection (Δv_TMI ≈ 3.6 km/s from LEO) onto a heliocentric Hohmann ellipse between 1.00 AU and 1.524 AU lasting ~210 to 259 days.',
      keyConcepts: [
        'Tsiolkovsky Rocket Equation',
        'Trans-Lunar Injection (10.9 km/s · 3 days)',
        'Lunar Orbit Rendezvous (LOR · Eagle)',
        'Heliocentric Hohmann Ellipse (259 days)',
      ],
      formula: 'Δv = I_sp · g_0 · ln(m_0 / m_f)   |   T_Hohmann ≈ 259 days',
    },
    {
      code: 'MODULE 04 · PLANETARY DESCENT (EDL) & IN-SITU EXPLORATION',
      sphere: 'Empirical Selenology & Areology (1969 – Present)',
      accent: '#fb923c',
      title: 'From Vacuum at Mare Tranquillitatis to the “Seven Minutes of Terror” at Jezero and Gale',
      synthesis:
        'Landing physics diverges sharply between the two worlds. On the airless Moon, Eagle braked solely with its throttleable descent engine guided by the Apollo Guidance Computer (AGC) and Doppler radar. On Mars, where a 6.1 mbar atmosphere generates 1,600 °C hypersonic heating yet cannot decelerate heavy payloads with parachutes alone, missions rely on ablative heat shields, the Sky Crane maneuver (Curiosity and Perseverance), and supersonic retropropulsion.',
      keyConcepts: [
        'Pure propulsive vacuum descent (AGC)',
        'ALSEP seismic stations & LRRR retroreflectors',
        'Hypersonic aerobraking (1,600 °C) & Sky Crane',
        'Ingenuity coaxial flight at 2,400 RPM',
      ],
      formula: 'Lunar recession: +3.82 cm/yr   |   Martian pressure: P_0 ≈ 6.1 mbar (95.3% CO₂)',
    },
    {
      code: 'MODULE 05 · ASTROBIOLOGY, ISRU & HUMAN–AI AUTONOMY',
      sphere: 'Artemis Horizon & Tango Horizon (2026)',
      accent: '#a78bfa',
      title: 'Sabatier / MOXIE Chemical Plants, Radiation Shielding & Multi-Agent EVA Support',
      synthesis:
        'While 382 kg of Apollo samples confirmed the Giant Impact hypothesis (Theia, ~4,510 Ma) and lunar polar ice anchors Artemis architecture, Mars rovers revealed ancient lacustrine habitability in Gale and Jezero. Sustained human presence demands In-Situ Resource Utilization (ISRU: MOXIE electrolysis and Sabatier CH₄/LOX synthesis) alongside local intelligent systems able to bridge up to 24 minutes of one-way signal delay—the operational domain of Tango Horizon.',
      keyConcepts: [
        'Lunar polar ice (Artemis) & Martian paleolakes',
        'Sabatier reactor & MOXIE electrolysis',
        'EVA physiology (Pandolf / NASA-STD-3001) & SVF dose',
        'Multi-Agent orchestration with GUARDIAN',
      ],
      formula: 'CO₂ + 4 H₂ → CH₄ + 2 H₂O (Sabatier)   |   D_dot = D_0 · (svf + β·(1 - svf))',
    },
  ],
  comparisonRows: [
    {
      param: 'Distance from Earth',
      moon: '384,400 km (mean · 60.27 R_E)',
      mars: '225,000,000 km (mean · min. 54.6 M km)',
      implication:
        '1.28 s one-way radio delay at the Moon versus 4–24 min one-way on Mars, requiring local onboard computational autonomy.',
    },
    {
      param: 'Surface Gravity',
      moon: '1.62 m/s² (0.165 g)',
      mars: '3.711 m/s² (0.379 g)',
      implication:
        'Martian EVA walking imposes higher metabolic expenditure (Pandolf-Santee equation) and greater Δv for return ascent.',
    },
    {
      param: 'Escape Velocity (v_e)',
      moon: '2.38 km/s',
      mars: '5.03 km/s',
      implication:
        'Launching back from Mars makes in-situ return propellant synthesis (ISRU CH₄/LOX) essential.',
    },
    {
      param: 'Atmospheric Environment',
      moon: 'Exospheric vacuum (~10⁻¹² bar)',
      mars: 'Thin CO₂ envelope (6.1 mbar · 95.3% CO₂)',
      implication:
        'Mars enables aerobraking of 99% of kinetic entry energy, lightweight rotorcraft flight, and direct O₂ extraction via MOXIE.',
    },
    {
      param: 'Transit Duration',
      moon: '~3 days (Trans-Lunar Injection)',
      mars: '~210 to 259 days (Hohmann Transfer)',
      implication:
        'Frequent lunar launch opportunities versus synodic Mars transfer windows opening once every 780 days (26 months).',
    },
    {
      param: 'Rotation Period (Day)',
      moon: '27.32 days (tidally locked)',
      mars: '24 h 39 min 35 s (1 Martian Sol)',
      implication:
        'The Martian Sol aligns closely with human circadian rhythms, unlike the 354-hour lunar night.',
    },
  ],
  reflectionBlocks: [
    {
      id: 'reflection-continuity',
      badge: 'Reflection I · Epistemological Continuity',
      title: 'From the Celestial Vault to Survival Engineering',
      accent: '#7df9ff',
      paragraphs: [
        'Tracing the arc from Mesopotamian clay tablets to the floor of Gale Crater reveals a single constant: every leap into space began as an equation written on Earth. When Hipparchus solved lunar parallax or Kepler abandoned the perfect circle to match Mars’s orbit, both forged the method that centuries later guided ballistic trajectories, orbital rendezvous, and autonomous planetary landings.',
        'The Moon served as our first proving ground beyond Earth’s gravity well, demonstrating that a spacesuit is a one-person spacecraft and that planetary field science hinges on operational precision on the surface.',
      ],
    },
    {
      id: 'reflection-autonomy',
      badge: 'Reflection II · The Leap to Mars & Tango Horizon 2026',
      title: 'When Earth Lies Light-Minutes Away',
      accent: '#fb923c',
      paragraphs: [
        'On Mars, an emergency during an extravehicular activity cannot wait for instructions from a terrestrial control room separated by up to 48 minutes of round-trip light time. Crews need decision tools situated directly in the field: high-resolution topographic and radiation mapping, verifiable bioastronautic models of O₂ consumption and thermal load, and AI assistants capable of coordinating rovers, drones, and NASA-STD-3001 protocols without endangering the astronaut.',
        'Tango Horizon was built at that exact intersection between science communication and operational simulation: turning centuries of astronomical theory into a living platform where visitors understand our spaceflight heritage and experience firsthand the real challenges of operating on Mars in 2026.',
      ],
    },
  ],
};

const FINAL_SYNTHESIS_DATA_ES: FinalSynthesisData = {
  kicker: 'Capítulo Final Integrador · De la Ciencia Histórica a la Operación en Marte',
  title: 'Compendio General: Tierra, Luna, Marte y Tango Horizon',
  subtitle:
    'Síntesis transversal de los fundamentos astronómicos, mecánicos, bioastronáuticos y computacionales que enlazan cinco milenios de astronomía con el soporte autónomo de actividades extravehiculares (EVA) en 2026.',
  abstract:
    'Este compendio consolida el recorrido completo de la investigación en un arco continuo: la misma geometría observacional que permitió a Hiparco acotar la distancia lunar y a Cassini calibrar la Unidad Astronómica frente a Marte sustenta hoy los modelos físicos deterministas, las transferencias heliocéntricas de Hohmann, las plantas químicas ISRU y la arquitectura multi-agente de Tango Horizon para asistir a astronautas en el Cráter Gale.',
  continuityArc: [
    {
      id: 'arc-earth',
      step: '01 · TIERRA',
      world: 'Cuna de la Medición',
      metric: '1 R_T = 6,371 km · 1 UA = 149.6 M km',
      accent: '#38bdf8',
      summary:
        'Desde los registros babilónicos de eclipses y la óptica de Galileo hasta las leyes elípticas de Kepler y la síntesis gravitatoria de Newton, el ser humano transformó el firmamento en un sistema calculable.',
    },
    {
      id: 'arc-moon',
      step: '02 · LUNA',
      world: 'Primer Banco Cislunar',
      metric: '384,400 km · 0.165 g · 1.28 s retardo',
      accent: '#fde68a',
      summary:
        'La arquitectura de Encuentro en Órbita Lunar (LOR), la propulsión del Saturno V y las caminatas del Programa Apolo validaron el soporte vital portátil (PLSS) y la geología de campo en vacío absoluto.',
    },
    {
      id: 'arc-mars',
      step: '03 · MARTE',
      world: 'Frontera Interplanetaria',
      metric: '225 M km · 0.379 g · 4–24 min retardo',
      accent: '#fb923c',
      summary:
        'A meses de distancia y con latencias de radio que impiden el telecontrol en tiempo real desde Houston, las misiones marcianas requieren aerofrenado hipersónico, síntesis ISRU (MOXIE/Sabatier) y autonomía local.',
    },
    {
      id: 'arc-horizon',
      step: '04 · TANGO HORIZON 2026',
      world: 'Simulación EVA Humano–IA',
      metric: 'Cráter Gale 4×4 km · GUARDIAN · 2026-11-15',
      accent: '#c4b5fd',
      summary:
        'Sobre cartografía real NASA/USGS del Cráter Gale, Tango Horizon une fisiología EVA determinista, control por voz multilingüe y agentes de IA verificados en tiempo de ejecución para proteger a la tripulación.',
    },
  ],
  modulesCompendium: [
    {
      code: 'MÓDULO 01 · ARQUEOASTRONOMÍA Y PARALAJE',
      sphere: 'Tesis Lunar & Marciana (Antigüedad – Siglo XVII)',
      accent: '#fde68a',
      title: 'La Geometrización del Cielo: Del Ciclo de Saros a la Escala del Sistema Solar',
      synthesis:
        'La exploración física de un astro exige primero su acotación métrica. En la Luna, los registros caldeos de sicigias (Ciclo de Saros de 223 meses sinódicos) evolucionaron hacia la paralaje diurna de Hiparco (~60.27 R_T = 384,400 km). En Marte, el bucle retrógrado cada 780 días permitió a Tycho Brahe y Johannes Kepler abandonar las esferas cristalinas, mientras que la triangulación simultánea París–Cayena (Cassini y Richer, 1672) fijó la escala de la Unidad Astronómica.',
      keyConcepts: [
        'Ciclo de Saros (18 años y 11 días)',
        'Paralaje Lunar de Hiparco (60.27 R_T)',
        'Bucle Retrógrado de Marte (780 días)',
        'Calibración de la Unidad Astronómica (1672)',
      ],
      formula: 'd_Luna = R_T / sin(π_Luna) ≈ 384,400 km   |   1 UA ≈ 1.496 × 10⁸ km',
    },
    {
      code: 'MÓDULO 02 · ÓPTICA TELESCÓPICA Y MECÁNICA CELESTE',
      sphere: 'Revolución Científica (1609 – 1687)',
      accent: '#7df9ff',
      title: 'El Fin del Éter Aristotélico: Refractor de Galileo, Elipses de Kepler y Gravitación',
      synthesis:
        'En 1609 convergen dos hitos fundacionales: Galileo Galilei mide las sombras en el terminador lunar (Sidereus Nuncius, 1610) demostrando que los cuerpos celestes poseen relieve geológico, y Johannes Kepler publica Astronomia Nova probando que Marte describe una elipse de excentricidad e = 0.0934. En 1659 Christiaan Huygens registra Syrtis Major y deduce el Sol marciano (24 h 39 m 35 s), antes de que Isaac Newton unifique la mecánica celeste y terrestre en los Principia (1687).',
      keyConcepts: [
        'Orografía lunar por sombras en el terminador',
        'Leyes de Kepler (Elipses y Áreas iguales)',
        'Rotación marciana de Huygens (24 h 39 m)',
        'Síntesis Gravitacional de Newton (1687)',
      ],
      formula: 'F = G · (M · m) / r²   |   T² / a³ = 4π² / (G · M_Sol)',
    },
    {
      code: 'MÓDULO 03 · DINÁMICA DE PROPULSIÓN Y TRAYECTORIAS',
      sphere: 'Ingeniería Aeroespacial (Siglo XX – Siglo XXI)',
      accent: '#38bdf8',
      title: 'Ecuación de Tsiolkovski, Encuentro en Órbita Lunar (LOR) y Transferencia de Hohmann',
      synthesis:
        'Toda maniobra fuera de la Tierra obedece la ecuación exponencial de Konstantín Tsiolkovski (1903). Para alcanzar la Luna, el Programa Apolo articuló el Encuentro en Órbita Lunar (LOR) impulsado por el Saturno V (34.5 MN de empuje, v_TLI = 10.9 km/s en 3 días). Para viajar a Marte, una nave escapa de la órbita baja terrestre mediante una Inyección Transmarciana (Δv_TMI ≈ 3.6 km/s desde LEO) hacia una elipse heliocéntrica de Hohmann entre 1.00 UA y 1.524 UA durante ~210 a 259 días.',
      keyConcepts: [
        'Ecuación del cohete de Tsiolkovski',
        'Inyección Translunar (10.9 km/s · 3 días)',
        'Encuentro en Órbita Lunar (LOR · Módulo Eagle)',
        'Elipse Heliocéntrica de Hohmann (259 días)',
      ],
      formula: 'Δv = I_sp · g_0 · ln(m_0 / m_f)   |   T_Hohmann ≈ 259 días',
    },
    {
      code: 'MÓDULO 04 · DESCENSO PLANETARIO (EDL) Y EXPLORACIÓN IN SITU',
      sphere: 'Selenología y Areología Empírica (1969 – Presente)',
      accent: '#fb923c',
      title: 'Del Vacío del Mare Tranquillitatis a los «Siete Minutos de Terror» en Jezero y Gale',
      synthesis:
        'La física del aterrizaje diverge de raíz entre ambos cuerpos. En la Luna, sin atmósfera, el módulo Eagle frenó únicamente con su motor de descenso regulable guiado por el Apollo Guidance Computer (AGC) y radar Doppler. En Marte, cuya atmósfera de 6.1 mbar genera calentamiento hipersónico de 1,600 °C pero resulta insuficiente para frenar cargas pesadas solo con paracaídas, se requieren escudos ablativos, la grúa aérea Sky Crane (Curiosity y Perseverance) y retropropulsión supersónica.',
      keyConcepts: [
        'Descenso propulsivo puro en vacío lunar (AGC)',
        'Estaciones sísmicas ALSEP y Retrorreflectores LRRR',
        'Aerofrenado hipersónico (1,600 °C) y Sky Crane',
        'Vuelo coaxial de Ingenuity a 2,400 RPM',
      ],
      formula: 'Recesión lunar: +3.82 cm/año   |   Presión marciana: P_0 ≈ 6.1 mbar (95.3% CO₂)',
    },
    {
      code: 'MÓDULO 05 · ASTROBIOLOGÍA, ISRU Y AUTONOMÍA HUMANO–IA',
      sphere: 'Horizonte Artemis & Tango Horizon (2026)',
      accent: '#a78bfa',
      title: 'Plantas Químicas Sabatier / MOXIE, Protección Radiológica y Soporte EVA Multi-Agente',
      synthesis:
        'Mientras los 382 kg de rocas del Programa Apolo validaron la hipótesis del Gran Impacto (Theia, ~4,510 Ma) y el hielo polar lunar impulsa la arquitectura Artemis, los rovers marcianos demostraron habitabilidad antigua en los sedimentos lacustres de Gale y Jezero. La permanencia humana exige Utilización de Recursos In Situ (ISRU: electrólisis MOXIE y síntesis Sabatier de CH₄/LOX) junto con sistemas inteligentes locales que compensen hasta 24 minutos de retardo de señal: ese es el dominio operativo de Tango Horizon.',
      keyConcepts: [
        'Hielo polar lunar (Artemis) y paleolagos marcianos',
        'Reactor de Sabatier y Electrólisis MOXIE',
        'Fisiología EVA (Pandolf / NASA-STD-3001) y dosis SVF',
        'Orquestación Multi-Agente con GUARDIAN',
      ],
      formula: 'CO₂ + 4 H₂ → CH₄ + 2 H₂O (Sabatier)   |   D_dot = D_0 · (svf + β·(1 - svf))',
    },
  ],
  comparisonRows: [
    {
      param: 'Distancia desde la Tierra',
      moon: '384,400 km (media · 60.27 R_T)',
      mars: '225,000,000 km (media · mín. 54.6 M km)',
      implication:
        'Retardo de radio de 1.28 s en la Luna frente a 4–24 min por tramo en Marte, exigiendo autonomía computacional local.',
    },
    {
      param: 'Gravedad Superficial',
      moon: '1.62 m/s² (0.165 g)',
      mars: '3.711 m/s² (0.379 g)',
      implication:
        'La caminata EVA marciana demanda mayor gasto metabólico (ecuación de Pandolf-Santee) y mayor Δv para el ascenso de retorno.',
    },
    {
      param: 'Velocidad de Escape (v_e)',
      moon: '2.38 km/s',
      mars: '5.03 km/s',
      implication:
        'El despegue desde Marte vuelve indispensable sintetizar el propelente de retorno in situ (ISRU CH₄/LOX).',
    },
    {
      param: 'Entorno Atmosférico',
      moon: 'Vacío exosférico (~10⁻¹² bar)',
      mars: 'Tenue de CO₂ (6.1 mbar · 95.3% CO₂)',
      implication:
        'Marte permite aerofrenado del 99% de la energía cinética, vuelo de rotores ligeros y extracción directa de O₂ por MOXIE.',
    },
    {
      param: 'Duración del Tránsito',
      moon: '~3 días (Inyección Translunar)',
      mars: '~210 a 259 días (Transferencia de Hohmann)',
      implication:
        'Ventanas frecuentes hacia la Luna frente a oportunidades sinódicas cada 780 días (26 meses) rumbo a Marte.',
    },
    {
      param: 'Período de Rotación (Día)',
      moon: '27.32 días (acoplamiento de marea)',
      mars: '24 h 39 min 35 s (1 Sol marciano)',
      implication:
        'El ciclo circadiano del Sol marciano se alinea con el reloj biológico humano, a diferencia de la noche lunar de 354 horas.',
    },
  ],
  reflectionBlocks: [
    {
      id: 'reflection-continuity',
      badge: 'Reflexión I · Continuidad Epistemológica',
      title: 'De la Bóveda Celeste a la Ingeniería de Supervivencia',
      accent: '#7df9ff',
      paragraphs: [
        'Recorrer la historia desde las tablillas mesopotámicas hasta la superficie del Cráter Gale revela una constante: cada salto hacia el espacio comenzó siendo una ecuación sobre la Tierra. Cuando Hiparco calculó la paralaje lunar o Kepler renunció al círculo perfecto para seguir la órbita de Marte, ambos establecieron el método que siglos más tarde guiaría trayectorias balísticas, acoplamientos orbitales y descensos autónomos.',
        'La Luna funcionó como el primer laboratorio fuera del pozo gravitatorio terrestre, validando que el traje espacial es una nave unipersonal y que el conocimiento geológico de otro mundo depende de la destreza operativa en campo.',
      ],
    },
    {
      id: 'reflection-autonomy',
      badge: 'Reflexión II · El Salto hacia Marte y Tango Horizon 2026',
      title: 'Cuando la Tierra Queda a Minutos-Luz de Distancia',
      accent: '#fb923c',
      paragraphs: [
        'En Marte, una emergencia durante una actividad extravehicular no puede esperar instrucciones desde un centro de control terrestre separado por hasta 48 minutos de ida y vuelta de señal. La tripulación necesita herramientas de decisión situadas en el propio terreno: cartografía topográfica y de radiación de alta resolución, modelos bioastronáuticos verificables de consumo de O₂ y carga térmica, y asistentes de inteligencia artificial capaces de coordinar rovers, drones y protocolos NASA-STD-3001 sin poner en riesgo al astronauta.',
        'Proyecto Tango Horizon nace precisamente en esa intersección entre divulgación científica y simulación operativa: convertir siglos de teoría astronómica en una plataforma viva donde el usuario comprende el pasado espacial y experimenta en primera persona los desafíos reales de operar sobre Marte en 2026.',
      ],
    },
  ],
};

export const FINAL_SYNTHESIS_DATA: FinalSynthesisData = FINAL_SYNTHESIS_DATA_EN;

export function getFinalSynthesisData(lang: SiteLang): FinalSynthesisData {
  return lang === 'es' ? FINAL_SYNTHESIS_DATA_ES : FINAL_SYNTHESIS_DATA_EN;
}

const TANGO_HORIZON_TEAM_EN: ProfileCardProps[] = [
  {
    name: 'Agustin Diaz-Cano',
    title: 'MS Candidate, Systems Engineering (UTN, FRBA) · Lead Systems Architect',
    handle: 'agustindiazcano',
    status: 'UTN, FRBA · Buenos Aires · Tango Horizon 2026',
    avatarUrl: '/images/agustin.jpeg',
    roleBadge: 'Systems & AI Lead',
    bio: 'MS Candidate, Systems Engineering (UTN, FRBA). Architect of the Gale Crater 3D simulator, the @th/shared deterministic physics kernel, six in-process MCP servers, and the GUARDIAN-gated multi-agent runtime. Portfolio: agustindiazcano.com',
    linkedinUrl: 'https://www.linkedin.com/in/agustindiazcano/',
    githubUrl: 'https://github.com/agustindiazcano',
  },
  {
    name: 'Baltazar Salerno',
    title: 'Frontend Developer · Aerospace Cartography & HUD Telemetry',
    handle: 'S-Baltazar',
    status: 'Buenos Aires · Tango Horizon 2026',
    avatarUrl: '/images/baltazar.jpg',
    roleBadge: 'Frontend Developer',
    bio: 'Frontend Developer. Leads NASA/USGS planetary cartography integration, curved CSS3D helmet HUD telemetry, and interactive scientific visualization.',
    githubUrl: 'https://github.com/S-Baltazar',
  },
  {
    name: 'Milagros Sotelo',
    title: 'Systems Engineering Student (UTN, FRBA) · Astrobiology & Human Factors',
    handle: 'Milagros-Sotelo',
    status: 'UTN, FRBA · Buenos Aires · Tango Horizon 2026',
    avatarUrl: undefined,
    roleBadge: 'Human Factors & Research',
    bio: 'Systems Engineering Student (UTN, FRBA). Leads human factors research, Martian astrobiology, NASA-STD-3001 / OCHMO biomedical standards, and scientific mission curation.',
    githubUrl: 'https://github.com/Milagros-Sotelo',
  },
  {
    name: 'Federico Yaconis',
    title: '3D Developer & QA · Surface Robotics & EVA Operations',
    handle: 'federicoyaconis',
    status: 'Buenos Aires · Tango Horizon 2026',
    roleBadge: '3D Developer & QA',
    bio: '3D Developer & Surface Operations QA. Focuses on mission 3D assets, rover kinematics, safe pathfinding over steep Martian terrain, and EVA scenario verification.',
  },
];

const TANGO_HORIZON_TEAM_ES: ProfileCardProps[] = [
  {
    name: 'Agustin Diaz-Cano',
    title: 'MS Candidate, Systems Engineering (UTN, FRBA) · Arquitecto Principal de Sistemas',
    handle: 'agustindiazcano',
    status: 'UTN, FRBA · Buenos Aires · Tango Horizon 2026',
    avatarUrl: '/images/agustin.jpeg',
    roleBadge: 'Líder de Sistemas e IA',
    bio: 'MS Candidate, Systems Engineering (UTN, FRBA). Arquitecto del simulador 3D del Cráter Gale, del núcleo determinista @th/shared, de los seis servidores MCP y del sistema multi-agente protegido por GUARDIAN. Portfolio: agustindiazcano.com',
    linkedinUrl: 'https://www.linkedin.com/in/agustindiazcano/',
    githubUrl: 'https://github.com/agustindiazcano',
  },
  {
    name: 'Baltazar Salerno',
    title: 'Frontend Developer · Cartografía Aeroespacial y Telemetría HUD',
    handle: 'S-Baltazar',
    status: 'Buenos Aires · Tango Horizon 2026',
    avatarUrl: '/images/baltazar.jpg',
    roleBadge: 'Desarrollador Frontend',
    bio: 'Frontend Developer. Responsable de la integración cartográfica NASA/USGS, telemetría HUD curvo en CSS3D y experiencia interactiva de visualización científica.',
    githubUrl: 'https://github.com/S-Baltazar',
  },
  {
    name: 'Milagros Sotelo',
    title: 'Systems Engineering Student (UTN, FRBA) · Astrobiología y Factores Humanos',
    handle: 'Milagros-Sotelo',
    status: 'UTN, FRBA · Buenos Aires · Tango Horizon 2026',
    avatarUrl: undefined,
    roleBadge: 'Factores Humanos e Investigación',
    bio: 'Systems Engineering Student (UTN, FRBA). Investigación en factores humanos, astrobiología marciana, estándares biomédicos NASA-STD-3001 / OCHMO y curaduría científica de misión.',
    githubUrl: 'https://github.com/Milagros-Sotelo',
  },
  {
    name: 'Federico Yaconis',
    title: '3D Developer & QA · Robótica de Superficie y Operaciones EVA',
    handle: 'federicoyaconis',
    status: 'Buenos Aires · Tango Horizon 2026',
    roleBadge: 'Desarrollador 3D y QA',
    bio: '3D Developer & QA de operaciones en superficie. Especializado en activos 3D de misión, cinemática de rovers, planificación de rutas seguras en terreno escarpado y verificación de escenarios EVA.',
  },
];

export const TANGO_HORIZON_TEAM: ProfileCardProps[] = TANGO_HORIZON_TEAM_EN;

export function getTeamMembers(lang: SiteLang): ProfileCardProps[] {
  return lang === 'es' ? TANGO_HORIZON_TEAM_ES : TANGO_HORIZON_TEAM_EN;
}

const TEAM_PHILOSOPHY_EN: TeamPhilosophy = {
  kicker: 'Mission Philosophy · Tango Horizon 2026',
  title: 'Uniting Multi-Agent EVA Assistance, Offline Physics & Space Science Outreach',
  paragraphs: [
    'Tango Horizon was conceived for the “Interplanetary Survival Guide: Martian Map” challenge at the NASA International Space Apps Challenge 2026 (Universidad de Palermo, Buenos Aires, Argentina). Our design starts from a hard constraint of Mars exploration: communications latency on the Martian surface forces the spacesuit, robotic fleet, and operational guidance to run with verifiable autonomy even without a live link to Earth.',
    'To meet that constraint, we integrate three complementary layers into one open ecosystem: a deterministic physics and bioastronautics core capable of 100% offline execution, a multi-agent EVA assistance layer with Run-Time Assurance safety gating (GUARDIAN), and this interactive narrative platform linking humanity’s astronomical heritage to live operations over Gale Crater.',
  ],
  pillars: [
    {
      title: 'Safe Multi-Agent EVA Assistance',
      detail:
        'Multilingual voice commands escalate from SUIT.VOICE-EXEC to the BASE orchestrator and health, routing, science, weather, and fleet specialists under deterministic GUARDIAN safety checks.',
    },
    {
      title: 'Offline-Verifiable Physics & Cartography',
      detail:
        '4 km × 4 km HiRISE Gale Crater terrain, Pandolf-Santee metabolic models, choked O₂ flow, Sky View Factor (SVF) radiation dose, and an offline fallback runtime.',
    },
    {
      title: 'Interactive Science Communication',
      detail:
        'A direct bridge between the Earth–Moon–Mars scientific lineage and the immersive WebGL2 simulator, bringing real NASA standards (NASA-STD-3001, REMS, RAD, HiRISE) to the wider community.',
    },
  ],
};

const TEAM_PHILOSOPHY_ES: TeamPhilosophy = {
  kicker: 'Filosofía de Misión · Tango Horizon 2026',
  title: 'Unir Asistencia EVA Multi-Agente, Física Offline y Divulgación Espacial',
  paragraphs: [
    'Tango Horizon fue concebido para el desafío «Interplanetary Survival Guide: Martian Map» del NASA International Space Apps Challenge 2026 en la sede Universidad de Palermo (Buenos Aires, Argentina). Nuestro principio de diseño parte de una exigencia real de la exploración marciana: en la superficie de Marte, la latencia de comunicaciones obliga a que el traje espacial, los vehículos robóticos y la guía operativa funcionen con autonomía verificable incluso sin enlace directo con la Tierra.',
    'Por ello integramos tres capas complementarias en un mismo ecosistema abierto: un núcleo determinista de física y bioastronáutica capaz de operar 100% offline, una capa de asistencia EVA multi-agente con verificación de seguridad en tiempo de ejecución (GUARDIAN) y esta plataforma narrativa interactiva que conecta la historia astronómica de la humanidad con las operaciones reales sobre el Cráter Gale.',
  ],
  pillars: [
    {
      title: 'Asistencia EVA Multi-Agente Segura',
      detail:
        'Órdenes de voz multilingües escalan desde SUIT.VOICE-EXEC hasta el orquestador BASE y especialistas de salud, ruta, ciencia, clima y flota robótica bajo control determinista GUARDIAN.',
    },
    {
      title: 'Física y Cartografía Verificables Offline',
      detail:
        'Terreno HiRISE de 4 km × 4 km del Cráter Gale, modelos Pandolf-Santee de consumo metabólico, flujo estrangulado de O₂, dosis por factor de vista de cielo (SVF) y motor de respaldo sin conexión.',
    },
    {
      title: 'Divulgación Científica Interactiva',
      detail:
        'Puente directo entre la genealogía científica Tierra–Luna–Marte y la experiencia inmersiva WebGL2, acercando estándares reales de la NASA (NASA-STD-3001, REMS, RAD, HiRISE) a toda la comunidad.',
    },
  ],
};

export const TEAM_PHILOSOPHY: TeamPhilosophy = TEAM_PHILOSOPHY_EN;

export function getTeamPhilosophy(lang: SiteLang): TeamPhilosophy {
  return lang === 'es' ? TEAM_PHILOSOPHY_ES : TEAM_PHILOSOPHY_EN;
}

const ARCHITECTURE_HIGHLIGHTS_EN: ArchitectureHighlight[] = [
  {
    id: 'arch-terrain-webgl',
    badge: 'Cartography & WebGL2',
    title: 'Real Gale Crater (NASA / USGS)',
    metric: '4 km × 4 km · 60 FPS',
    accent: '#fb923c',
    description:
      'MRO HiRISE digital elevation model (height_2048.u16) with 5 analytical overlay rasters: orthomosaic, slope, Sky View Factor (SVF), THEMIS thermal inertia, and hydration prospection.',
  },
  {
    id: 'arch-physics-shared',
    badge: 'Deterministic @th/shared Kernel',
    title: 'Offline Bioastronautics & Ballistics',
    metric: '1 Hz PLSS · RK4 · A*',
    accent: '#7df9ff',
    description:
      'Pandolf-Santee metabolic rate scaled to 0.379 g, compressible suit leaks, cosmic and SEP radiation dose, RK4 ballistic drop-pod trajectory with parachute, and FDIR fault detection.',
  },
  {
    id: 'arch-multiagent-mcp',
    badge: 'Multi-Agent & BM25 RAG',
    title: '6 MCP Servers + GUARDIAN RTA',
    metric: 'NASA-STD-3001 · 3 Providers',
    accent: '#fde68a',
    description:
      'In-process MCP servers (terrain, suit, environment, fleet, hud, knowledge) with BM25 citations across NASA standards, hard GUARDIAN safety bounds, and automatic Vertex / AI Studio / offline failover.',
  },
  {
    id: 'arch-ml-science',
    badge: 'Data Science & Voice',
    title: 'Martian ML Models & Mobile Remote',
    metric: '5 Languages · QR WebSocket',
    accent: '#a78bfa',
    description:
      'Dust storm forecasting (REMS + tau), mineral hydration mapping (DAN/CRISM), visual vein detection (DINOv2), hands-free multilingual voice, and QR-paired smartphone gyroscope pointer.',
  },
];

const ARCHITECTURE_HIGHLIGHTS_ES: ArchitectureHighlight[] = [
  {
    id: 'arch-terrain-webgl',
    badge: 'Cartografía & WebGL2',
    title: 'Cráter Gale Real (NASA / USGS)',
    metric: '4 km × 4 km · 60 FPS',
    accent: '#fb923c',
    description:
      'Modelo digital de elevación MRO HiRISE (height_2048.u16) con 5 capas superpuestas: ortomosaico, pendiente, factor de vista de cielo (SVF), inercia térmica THEMIS y prospección de hidratación.',
  },
  {
    id: 'arch-physics-shared',
    badge: 'Núcleo Determinista @th/shared',
    title: 'Bioastronáutica y Balística Offline',
    metric: '1 Hz PLSS · RK4 · A*',
    accent: '#7df9ff',
    description:
      'Tasa metabólica Pandolf-Santee escalada a 0.379 g, fugas compresibles de traje, dosis por radiación cósmica y SEP, trayectoria balística RK4 con paracaídas y detección de fallas FDIR.',
  },
  {
    id: 'arch-multiagent-mcp',
    badge: 'Multi-Agente & RAG BM25',
    title: '6 Servidores MCP + GUARDIAN RTA',
    metric: 'NASA-STD-3001 · 3 Proveedores',
    accent: '#fde68a',
    description:
      'Servidores MCP en proceso (terrain, suit, environment, fleet, hud, knowledge) con citas BM25 sobre estándares NASA, límites duros de seguridad GUARDIAN y failover automático Vertex / AI Studio / offline.',
  },
  {
    id: 'arch-ml-science',
    badge: 'Ciencia de Datos & Voz',
    title: 'Modelos ML Marcianos y Control Remoto',
    metric: '5 Idiomas · WebSocket QR',
    accent: '#a78bfa',
    description:
      'Predicción de tormentas de polvo (REMS + tau), mapa de hidratación mineral (DAN/CRISM), detector visual de vetas minerales (DINOv2), voz manos libres y puntero móvil emparejado por QR.',
  },
];

export const ARCHITECTURE_HIGHLIGHTS: ArchitectureHighlight[] = ARCHITECTURE_HIGHLIGHTS_EN;

export function getArchitectureHighlights(lang: SiteLang): ArchitectureHighlight[] {
  return lang === 'es' ? ARCHITECTURE_HIGHLIGHTS_ES : ARCHITECTURE_HIGHLIGHTS_EN;
}
