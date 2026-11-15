import type { BiText } from '@/context/LanguageContext';

export type SourceCategoryId =
  | 'all'
  | 'cartography'
  | 'atmosphere'
  | 'ml-spectra'
  | 'biomed-rag'
  | 'models-3d'
  | 'partners';

export type VerificationBadge = 'verified-nasa' | 'empirical-ml' | 'open-standard' | 'cc-by-4' | 'official-partner';

export interface SourceLinkItem {
  label: BiText;
  url: string;
}

export interface SourceEntry {
  id: string;
  category: Exclude<SourceCategoryId, 'all'>;
  title: BiText;
  provider: string;
  productId: string;
  badge: VerificationBadge;
  badgeLabel: BiText;
  accent: string;
  description: BiText;
  operationalRole: BiText;
  primaryUrl: string;
  secondaryLinks?: SourceLinkItem[];
  tags: string[];
}

export interface SourceCategoryFilter {
  id: SourceCategoryId;
  label: BiText;
  accent: string;
}

export interface PhysicsDomainReference {
  id: string;
  domain: BiText;
  formulation: string;
  basis: BiText;
  modulePath: string;
}

export interface ProvenanceSummaryStat {
  id: string;
  value: string;
  label: BiText;
  accent: string;
}

export const CC_BY_4_URL = 'https://creativecommons.org/licenses/by/4.0/';
export const NASA_3D_RESOURCES_URL = 'https://github.com/nasa/NASA-3D-Resources';
export const SIMULATOR_URL = 'https://tangohorizon.vercel.app';

export const CUSTOM_3D_MODELS_LIST: string[] = [
  'antenna.glb',
  'asset-1.glb',
  'asset-2.glb',
  'asset-3.glb',
  'asset-4.glb',
  'astronaut.glb',
  'astronaut-animated.glb',
  'building-1.glb',
  'building-2.glb',
  'building-3.glb',
  'building-connector.glb',
  'conae-base-mars.glb',
  'rescue-robot-astronaut.glb',
  'rescue-robot-without-astronaut.glb',
  'rescue-rover.glb',
  'rocket.glb',
  'rover-1.glb',
  'rover-2.glb',
  'solar-panel.glb',
];

export const NASA_3D_MODELS_LIST: { file: string; name: string; url: string }[] = [
  {
    file: 'ingenuity.glb',
    name: 'Ingenuity Mars Helicopter',
    url: 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Ingenuity%20Mars%20Helicopter/Ingenuity%20Mars%20Helicopter.glb',
  },
  {
    file: 'mro.glb',
    name: 'Mars Reconnaissance Orbiter (MRO)',
    url: 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%20Reconnaissance%20Orbiter%20(MRO)%20(A)/Mars%20Reconnaissance%20Orbiter%20(MRO)%20(A).glb',
  },
  {
    file: 'rover.glb',
    name: 'Mars 2020 Perseverance / MSL-Class Chassis',
    url: 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%202020%20Perseverance%20Rover/Mars%202020%20Perseverance%20Rover.glb',
  },
];

export const SOURCE_CATEGORY_FILTERS: SourceCategoryFilter[] = [
  {
    id: 'all',
    label: { en: 'All', es: 'Todas' },
    accent: '#fbbf24',
  },
  {
    id: 'cartography',
    label: { en: 'Cartography', es: 'Cartografía' },
    accent: '#fb923c',
  },
  {
    id: 'atmosphere',
    label: { en: 'Atmosphere & Rad', es: 'Atmósfera y Rad' },
    accent: '#f97316',
  },
  {
    id: 'ml-spectra',
    label: { en: 'ML & Spectra', es: 'ML y Espectros' },
    accent: '#fb7185',
  },
  {
    id: 'biomed-rag',
    label: { en: 'Biomed RAG', es: 'RAG Biomédico' },
    accent: '#ea580c',
  },
  {
    id: 'models-3d',
    label: { en: '3D Models (CC BY 4.0)', es: 'Modelos 3D (CC BY 4.0)' },
    accent: '#fdba74',
  },
  {
    id: 'partners',
    label: { en: 'Partners & Challenge', es: 'Aliados y Desafío' },
    accent: '#fda4af',
  },
];

export const PROVENANCE_SUMMARY_STATS: ProvenanceSummaryStat[] = [
  {
    id: 'provenance-assets',
    value: '57',
    label: {
      en: 'Tracked Runtime Assets (SHA-256)',
      es: 'Activos Verificados en Runtime (SHA-256)',
    },
    accent: '#fbbf24',
  },
  {
    id: 'rag-chunks',
    value: '1,002',
    label: {
      en: 'BM25 RAG Chunks (<2 ms Offline)',
      es: 'Chunks RAG BM25 (<2 ms Offline)',
    },
    accent: '#ea580c',
  },
  {
    id: 'ml-models',
    value: '3',
    label: {
      en: 'Empirical NASA PDS ML Models',
      es: 'Modelos ML Empíricos NASA PDS',
    },
    accent: '#fb7185',
  },
  {
    id: 'physics-constants',
    value: '44',
    label: {
      en: 'Audited Constants (18 Standard / 26 Design)',
      es: 'Constantes Auditadas (18 Estándar / 26 Diseño)',
    },
    accent: '#fb923c',
  },
];

export const SOURCE_ENTRIES: SourceEntry[] = [
  // =========================================================================
  // 1. CARTOGRAPHY, ELEVATION & THERMAL IMAGERY
  // =========================================================================
  {
    id: 'hirise-dtm-ortho',
    category: 'cartography',
    title: {
      en: 'MRO HiRISE DTM (1 m/px) & Orthoimage (0.25 m/px)',
      es: 'MRO HiRISE DTM (1 m/px) y Ortoimagen (0.25 m/px)',
    },
    provider: 'NASA / JPL / University of Arizona / USGS Astrogeology',
    productId: 'DTEEC_009149_1750_009294_1750_U01 · PSP_009149_1750_RED',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA / USGS', es: 'Verificado NASA / USGS' },
    accent: '#fb923c',
    description: {
      en: 'High-resolution controlled digital terrain model and red-band photogrammetric orthoimage covering Gale Crater and Aeolis Mons (Mount Sharp).',
      es: 'Modelo digital de terreno controlado de alta resolución y ortoimagen fotogramétrica en banda roja sobre el Cráter Gale y Aeolis Mons (Monte Sharp).',
    },
    operationalRole: {
      en: 'Generates the 4×4 km 3D elevation mesh (height_2048.u16), slope hazard map (slope_1024.png), 16-ray horizon Sky View Factor shielding map (svf_1024.png), and ortho_4096.webp surface texture.',
      es: 'Genera la malla 3D de 4×4 km (height_2048.u16), mapa de pendientes peligrosas (slope_1024.png), mapa de factor de cielo visible de 16 rayos (svf_1024.png) y textura ortho_4096.webp.',
    },
    primaryUrl: 'https://stac.astrogeology.usgs.gov/docs/data/mars/hirise_dtms/',
    secondaryLinks: [
      {
        label: { en: 'AWS Open Data Registry', es: 'Registro AWS Open Data' },
        url: 'https://registry.opendata.aws/nasa-usgs-mars-hirise-dtms/',
      },
      {
        label: { en: 'HiRISE Team DTM Index', es: 'Índice DTM Equipo HiRISE' },
        url: 'https://www.uahirise.org/dtm/',
      },
      {
        label: { en: 'Direct S3 DTM GeoTIFF', es: 'GeoTIFF DTM Directo S3' },
        url: 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/PSP_009149_1750_PSP_009294_1750/DTEEC_009149_1750_009294_1750_U01.tif',
      },
      {
        label: { en: 'Direct S3 Ortho GeoTIFF', es: 'GeoTIFF Ortoimagen Directo S3' },
        url: 'https://astrogeo-ard.s3-us-west-2.amazonaws.com/mars/mro/hirise/controlled/dtm/PSP_009149_1750_PSP_009294_1750/PSP_009149_1750_RED_A_01_ORTHO.tif',
      },
    ],
    tags: ['MRO', 'HiRISE', '1 m/px', 'Gale Crater', 'STAC', 'SVF'],
  },
  {
    id: 'ctx-stereo-dem',
    category: 'cartography',
    title: {
      en: 'MRO CTX Stereo DEM (20 m/px) & Regional Geomorphometry',
      es: 'MRO CTX Stereo DEM (20 m/px) y Geomorfometría Regional',
    },
    provider: 'NASA / JPL / MSSS / USGS Astrogeology STAC & UCLA',
    productId: 'T01_000815_1749 · CTX 20 m/px DEM',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA / USGS', es: 'Verificado NASA / USGS' },
    accent: '#fb923c',
    description: {
      en: 'Wide-area 20 m/px Context Camera stereo elevation and orthorectified mosaics bridging regional Gale Crater topography beyond single HiRISE strips.',
      es: 'Elevación estéreo Context Camera de 20 m/px y mosaicos ortorrectificados que cubren la topografía regional del Cráter Gale más allá de las franjas HiRISE individuales.',
    },
    operationalRole: {
      en: 'Supplies wide-area geomorphometry along the full Curiosity traverse to train Hydration Prospector and quantify the MOLA areoid vs. IAU 2015 sphere vertical datum offset.',
      es: 'Provee geomorfometría regional a lo largo del recorrido completo de Curiosity para entrenar Hydration Prospector y cuantificar el desplazamiento entre el areoide MOLA y la esfera IAU 2015.',
    },
    primaryUrl: 'https://stac.astrogeology.usgs.gov/api/',
    secondaryLinks: [
      {
        label: { en: 'UCLA / GALE-Lab Mars DEM Index', es: 'Índice Mars DEMs UCLA / GALE-Lab' },
        url: 'https://github.com/GALE-Lab/Mars_DEMs',
      },
    ],
    tags: ['MRO', 'CTX', '20 m/px', 'STAC', 'Geomorphometry'],
  },
  {
    id: 'themis-ir-mosaics',
    category: 'cartography',
    title: {
      en: 'Mars Odyssey THEMIS IR Controlled Mosaics (100 m/px)',
      es: 'Mosaicos IR Controlados Mars Odyssey THEMIS (100 m/px)',
    },
    provider: 'NASA / ASU / USGS Astrogeology',
    productId: 'mc23_aeolis_nir (Night) · mc23_aeolis_dir (Day)',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA / USGS', es: 'Verificado NASA / USGS' },
    accent: '#fb923c',
    description: {
      en: 'Controlled day and night thermal infrared mosaics of the Aeolis (MC-23) quadrangle used as physical thermal inertia proxies.',
      es: 'Mosaicos infrarrojos térmicos controlados diurnos y nocturnos del cuadrángulo Aeolis (MC-23) usados como proxy físico de inercia térmica.',
    },
    operationalRole: {
      en: 'Segments terrain into 3 thermal inertia classes (thermal_class.png: loose eolian sand traps vs. consolidated bedrock) for Pandolf metabolic cost, rover slip prevention, and hydration ML.',
      es: 'Segmenta el terreno en 3 clases de inercia térmica (thermal_class.png: trampas de arena eólica vs. roca consolidada) para costo metabólico Pandolf, tracción de rovers y ML de hidratación.',
    },
    primaryUrl: 'https://registry.opendata.aws/nasa-usgs-themis-mosaics/',
    secondaryLinks: [
      {
        label: { en: 'Direct S3 Night IR Mosaic', es: 'Mosaico IR Nocturno S3 Directo' },
        url: 'https://astrogeo-ard.s3.us-west-2.amazonaws.com/mars/mo/themis/controlled_mosaics/mc23_aeolis_nir/mc23_aeolis_nir.tif',
      },
    ],
    tags: ['THEMIS', 'Thermal Inertia', 'mc23_aeolis_nir', '100 m/px'],
  },
  {
    id: 'mgs-mola',
    category: 'cartography',
    title: {
      en: 'Mars Global Surveyor MOLA Global Altimetry',
      es: 'Altimetría Global MOLA de Mars Global Surveyor',
    },
    provider: 'NASA GSFC / PDS Geosciences Node (WashU)',
    productId: 'MGS-M-MOLA-3/5 (PEDR / MEGDR)',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA PDS', es: 'Verificado NASA PDS' },
    accent: '#fb923c',
    description: {
      en: 'Mars Orbiter Laser Altimeter global reference topography and planetary areoid geoid datum.',
      es: 'Topografía global de referencia del altímetro láser MOLA y datum geoide areoide planetario.',
    },
    operationalRole: {
      en: 'Establishes global planetary elevation reference and areoid datum calibration for Gale Crater elevation coordinates.',
      es: 'Establece la referencia altimétrica planetaria global y la calibración del datum areoide para las coordenadas de elevación en Gale.',
    },
    primaryUrl: 'https://pds-geosciences.wustl.edu/missions/mgs/mola.html',
    tags: ['MGS', 'MOLA', 'Altimetry', 'Areoid Datum'],
  },
  {
    id: 'nasa-mars-trek',
    category: 'cartography',
    title: {
      en: 'NASA Mars Trek Web GIS & WMTS Portal',
      es: 'Portal Web GIS y WMTS NASA Mars Trek',
    },
    provider: 'NASA Solar System Treks / JPL',
    productId: 'Mars Trek Global & Landing Site Layers',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA', es: 'Verificado NASA' },
    accent: '#fb923c',
    description: {
      en: 'Official NASA interactive Mars GIS portal providing equirectangular WMTS map layers, elevation profiles, and mission landing site footprints.',
      es: 'Portal GIS interactivo oficial de NASA para Marte con capas WMTS equirectangulares, perfiles de elevación y zonas de aterrizaje.',
    },
    operationalRole: {
      en: 'Used during mission cartography discovery and layer alignment across MOLA, CTX, and HiRISE Gale Crater study sites.',
      es: 'Utilizado en el relevamiento cartográfico inicial y alineación de capas entre MOLA, CTX y HiRISE en la zona de estudio de Gale.',
    },
    primaryUrl: 'https://trek.nasa.gov/mars/',
    tags: ['Mars Trek', 'WMTS', 'GIS', 'JPL'],
  },
  {
    id: 'usgs-mars-caves',
    category: 'cartography',
    title: {
      en: 'USGS Mars Global Cave Candidate Catalog (MGC3)',
      es: 'Catálogo Global de Candidatos a Cuevas en Marte (MGC3)',
    },
    provider: 'USGS Astrogeology Science Center (Cushing et al.)',
    productId: 'mars_global_cave_candidate_catalog_v1_cushing',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified USGS', es: 'Verificado USGS' },
    accent: '#fb923c',
    description: {
      en: 'Global geospatial catalog of Martian pits, skylights, and subsurface cave candidates investigated for radiation shielding and astrobiology.',
      es: 'Catálogo geoespacial global de fosas, tragaluces y cavidades candidatas en Marte estudiadas para blindaje radiológico y astrobiología.',
    },
    operationalRole: {
      en: 'Informs subsurface shelter strategy and Sky View Factor radiation shielding models for severe SEP solar storm contingencies.',
      es: 'Respalda la estrategia de refugios subsuperficiales y los modelos de blindaje radiológico Sky View Factor ante tormentas solares SEP severas.',
    },
    primaryUrl: 'https://astrogeology.usgs.gov/search/map/mars_global_cave_candidate_catalog_v1_cushing',
    tags: ['USGS', 'MGC3', 'Caves', 'Radiation Shelter'],
  },
  {
    id: 'ai4mars-dataset',
    category: 'cartography',
    title: {
      en: 'AI4MARS Terrain-Aware Autonomous Driving Dataset',
      es: 'Dataset AI4MARS para Conducción Autónoma en Terreno Marciano',
    },
    provider: 'NASA JPL / Open Data Portal',
    productId: 'ai4mars-a-dataset-for-terrain-aware-autonomous-driving-on-mars',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA', es: 'Verificado NASA' },
    accent: '#fb923c',
    description: {
      en: 'Crowdsourced semantic segmentation dataset of Curiosity, Opportunity, and Spirit rover images classifying soil, bedrock, sand, and big rocks.',
      es: 'Dataset de segmentación semántica de imágenes de Curiosity, Opportunity y Spirit clasificando suelo, lecho rocoso, arena y rocas grandes.',
    },
    operationalRole: {
      en: 'Benchmark reference for rover traversability classes (consolidated bedrock vs. high-slip eolian sand) alongside THEMIS thermal inertia.',
      es: 'Referencia de clasificación de transitabilidad para rovers (roca consolidada vs. arena eólica de alto deslizamiento) junto con la inercia térmica THEMIS.',
    },
    primaryUrl: 'https://data.nasa.gov/dataset/ai4mars-a-dataset-for-terrain-aware-autonomous-driving-on-mars',
    tags: ['AI4MARS', 'JPL', 'Traversability', 'Terrain'],
  },

  // =========================================================================
  // 2. PLANETARY ATMOSPHERE, RADIATION, EPHEMERIS & SPACE WEATHER
  // =========================================================================
  {
    id: 'msl-rems',
    category: 'atmosphere',
    title: {
      en: 'MSL Curiosity REMS Surface Meteorology (Sols 1–3953)',
      es: 'Meteorología Superficial MSL Curiosity REMS (Soles 1–3953)',
    },
    provider: 'NASA / CAB (Spain) PDS Atmospheres Node (NMSU)',
    productId: 'mslrem_1001 · rems_clear.json · rems_storm2018.json',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA PDS', es: 'Verificado NASA PDS' },
    accent: '#f97316',
    description: {
      en: 'Hourly Rover Environmental Monitoring Station surface pressure, air/ground temperature, wind speed, and UV radiation records at Gale Crater.',
      es: 'Registros horarios de presión superficial, temperatura de aire y suelo, viento y radiación UV de la estación REMS en el Cráter Gale.',
    },
    operationalRole: {
      en: 'Drives clear-day and MY 34 global dust storm replay telemetry (rems_clear.json, rems_storm2018.json) and trains Storm Nowcaster on diurnal/semidiurnal pressure tides.',
      es: 'Alimenta la telemetría real de días despejados y de la tormenta global MY 34 (rems_clear.json, rems_storm2018.json) y entrena Storm Nowcaster en mareas de presión.',
    },
    primaryUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html',
    tags: ['MSL', 'REMS', 'Meteorology', 'Pressure Tides', 'MY 34'],
  },
  {
    id: 'mastcam-tau-880',
    category: 'atmosphere',
    title: {
      en: 'MSL Mastcam 880 nm Atmospheric Dust Optical Depth',
      es: 'Profundidad Óptica de Polvo Atmosférico Mastcam 880 nm',
    },
    provider: 'NASA PDS Atmospheres / Lemmon (2024)',
    productId: 'msl_tau_880.csv (doi:10.17189/fjh0-2978)',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA PDS', es: 'Verificado NASA PDS' },
    accent: '#f97316',
    description: {
      en: 'Derived column atmospheric dust opacity (tau at 880 nm) measured from direct solar imaging by Curiosity Mastcam across Martian years.',
      es: 'Opacidad columnar de polvo atmosférico (tau a 880 nm) derivada de observaciones solares directas con Mastcam de Curiosity.',
    },
    operationalRole: {
      en: 'Ground-truth target for Storm Nowcaster (+1 to +3 sol tau forecasting) and rotorcraft grounding enforcement at tau >= 1.8.',
      es: 'Variable objetivo real para Storm Nowcaster (pronóstico tau +1 a +3 soles) y restricción de vuelo de drones con tau >= 1.8.',
    },
    primaryUrl: 'https://atmos.nmsu.edu/PDS/review/PDS4/msl_mmm_tau_bundle/data_derived/msl_tau_880.csv',
    tags: ['Mastcam', 'Optical Depth', 'tau', 'Dust Storm'],
  },
  {
    id: 'msl-rad',
    category: 'atmosphere',
    title: {
      en: 'MSL Curiosity RAD Surface Radiation Assessment Detector',
      es: 'Detector de Radiación Superficial MSL Curiosity RAD',
    },
    provider: 'NASA / SwRI PDS-PPI Node (UCLA)',
    productId: 'MSL-M-RAD-3-RDR-V1.0 (Sols 1773–1779 & 1811–1817)',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA PDS', es: 'Verificado NASA PDS' },
    accent: '#f97316',
    description: {
      en: 'Reduced surface radiation dose rates in Gale Crater covering both nominal Galactic Cosmic Ray (GCR) background and the September 2017 SEP solar storm.',
      es: 'Tasas reducidas de dosis de radiación superficial en el Cráter Gale cubriendo fondo nominal de Rayos Cósmicos Galácticos (GCR) y el evento SEP de septiembre 2017.',
    },
    operationalRole: {
      en: 'Anchors quiet-time baseline (~27 µSv/h, rad_quiet.json) and Sep 2017 SEP radiation spikes (rad_sep2017.json) inside dose.ts, WEATHER-RAD, and EVA-PLANNER.',
      es: 'Fija la línea base nominal (~27 µSv/h, rad_quiet.json) y los picos SEP de sep. 2017 (rad_sep2017.json) en dose.ts, WEATHER-RAD y EVA-PLANNER.',
    },
    primaryUrl: 'https://pds-ppi.igpp.ucla.edu/collection/MSL-M-RAD-3-RDR-V1.0:DATA',
    tags: ['RAD', 'GCR', 'SEP', 'Dosimetry', 'PDS-PPI'],
  },
  {
    id: 'jpl-horizons',
    category: 'atmosphere',
    title: {
      en: 'NASA JPL Horizons Ephemeris API (DE441 / mar099)',
      es: 'API de Efemérides NASA JPL Horizons (DE441 / mar099)',
    },
    provider: 'NASA Jet Propulsion Laboratory (Solar System Dynamics)',
    productId: 'Target 399 (Earth) w.r.t. 499 (Mars) + Target 10 (Sun)',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA API', es: 'Verificado API NASA' },
    accent: '#f97316',
    description: {
      en: 'High-precision planetary ephemeris service delivering Earth–Mars one-way light time and Sun zenith/azimuth geometry at Gale Crater.',
      es: 'Servicio de efemérides planetarias de alta precisión que entrega el tiempo-luz unidireccional Tierra–Marte y ángulos solares horarios en el Cráter Gale.',
    },
    operationalRole: {
      en: 'Computes authentic radio communication delay (4–24 min one-way) and solar irradiance geometry for solar array generation (ephem.json, solar.ts).',
      es: 'Calcula el retardo real de comunicaciones por radio (4–24 min por tramo) y la geometría solar para generación fotovoltaica (ephem.json, solar.ts).',
    },
    primaryUrl: 'https://ssd.jpl.nasa.gov/api/horizons.api',
    tags: ['JPL', 'Horizons', 'DE441', 'Light Time', 'Ephemeris'],
  },
  {
    id: 'nasa-donki',
    category: 'atmosphere',
    title: {
      en: 'NASA CCMC DONKI Space Weather APIs (SEP, CME, WSA-Enlil)',
      es: 'APIs de Clima Espacial NASA CCMC DONKI (SEP, CME, WSA-Enlil)',
    },
    provider: 'NASA Community Coordinated Modeling Center (GSFC)',
    productId: 'DONKI/SEP · CMEAnalysis · WSAEnlilSimulations',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA API', es: 'Verificado API NASA' },
    accent: '#f97316',
    description: {
      en: 'Space Weather Database Of Notifications, Knowledge, Information tracking solar energetic particle events, CMEs, and heliospheric WSA-Enlil propagation toward Mars.',
      es: 'Base de datos de clima espacial con alertas de partículas energéticas solares (SEP), eyecciones coronales (CME) y simulaciones heliosféricas WSA-Enlil hacia Marte.',
    },
    operationalRole: {
      en: 'Supplies live heliospheric storm alerts and CME arrival windows at Mars (donki_alert) to gate outward EVA dispatch in GUARDIAN.',
      es: 'Provee alertas heliosféricas en vivo y ventanas de arribo CME a Marte (donki_alert) para bloquear salidas EVA desde GUARDIAN.',
    },
    primaryUrl: 'https://api.nasa.gov/DONKI/SEP',
    secondaryLinks: [
      {
        label: { en: 'CME Analysis Endpoint', es: 'Endpoint CMEAnalysis' },
        url: 'https://api.nasa.gov/DONKI/CMEAnalysis?startDate=2026-10-15&endDate=2026-11-11&mostAccurateOnly=true&api_key=DEMO_KEY',
      },
      {
        label: { en: 'WSA-Enlil Simulations', es: 'Simulaciones WSA-Enlil' },
        url: 'https://api.nasa.gov/DONKI/WSAEnlilSimulations?api_key=DEMO_KEY',
      },
    ],
    tags: ['DONKI', 'CCMC', 'SEP', 'CME', 'WSA-Enlil'],
  },
  {
    id: 'mars-gram',
    category: 'atmosphere',
    title: {
      en: 'NASA Mars-GRAM Global Reference Atmospheric Model',
      es: 'Modelo Atmosférico de Referencia Global NASA Mars-GRAM',
    },
    provider: 'NASA Marshall Space Flight Center (NTRS)',
    productId: 'Mars-GRAM User Guide (20210023957)',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA NTRS', es: 'Verificado NASA NTRS' },
    accent: '#f97316',
    description: {
      en: 'Engineering-oriented Martian atmosphere model defining vertical density profiles, scale height, wind shears, and dust perturbations for EDL and flight.',
      es: 'Modelo atmosférico de ingeniería marciana para perfiles verticales de densidad, altura de escala, cizalladura de viento y perturbaciones por polvo.',
    },
    operationalRole: {
      en: 'Guides atmospheric density stratification (scale height 11.1 km), ballistic pod reentry drag, and BM25 RAG atmospheric engineering chunks.',
      es: 'Orienta la estratificación atmosférica (escala 11.1 km), el arrastre balístico de cápsulas de rescate y los chunks de ingeniería atmosférica del RAG BM25.',
    },
    primaryUrl: 'https://ntrs.nasa.gov/api/citations/20210023957/downloads/Mars-GRAM%20User%20Guide.pdf',
    tags: ['Mars-GRAM', 'NTRS', 'Atmosphere', 'EDL'],
  },
  {
    id: 'mars-climate-database',
    category: 'atmosphere',
    title: {
      en: 'Mars Climate Database (MCD v5.2)',
      es: 'Base de Datos Climática de Marte (MCD v5.2)',
    },
    provider: 'LMD / CNRS / ESA / CNES',
    productId: 'MCD v5.2 Atmospheric & Dust Climatology',
    badge: 'open-standard',
    badgeLabel: { en: 'Open Scientific Model', es: 'Modelo Científico Abierto' },
    accent: '#f97316',
    description: {
      en: 'General Circulation Model climatology of Mars atmospheric temperature, density, winds, and seasonal dust scenarios across solar longitudes (Ls).',
      es: 'Climatología basada en Modelo de Circulación General de Marte para temperatura, densidad, vientos y escenarios estacionales de polvo según longitud solar (Ls).',
    },
    operationalRole: {
      en: 'Cross-checks seasonal density bounds and wind profiles in our atmospheric knowledge base and RAG corpus.',
      es: 'Contrasta los límites estacionales de densidad y perfiles de viento en nuestra base de conocimiento atmosférico y corpus RAG.',
    },
    primaryUrl: 'https://www-mars.lmd.jussieu.fr/mars/access.html',
    tags: ['MCD v5.2', 'LMD', 'Climatology', 'Seasonal Ls'],
  },
  {
    id: 'perseverance-moxie',
    category: 'atmosphere',
    title: {
      en: 'Mars 2020 Perseverance MOXIE ISRU O2 Logs',
      es: 'Registros ISRU de O2 MOXIE en Mars 2020 Perseverance',
    },
    provider: 'NASA / MIT PDS Atmospheres Node (NMSU)',
    productId: 'mars2020_moxie (Sols 0–659)',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA PDS', es: 'Verificado NASA PDS' },
    accent: '#f97316',
    description: {
      en: '1 Hz raw, calibrated, and derived oxygen mass production rate logs (g/hr) from the Mars Oxygen In-Situ Resource Utilization Experiment.',
      es: 'Registros a 1 Hz de tasa másica de producción de oxígeno (g/h) del experimento Mars Oxygen In-Situ Resource Utilization Experiment.',
    },
    operationalRole: {
      en: 'Calibrates habitat ISRU solid-oxide electrolysis (CO2 -> O2) output profiles and compressor/SOXE fault signatures (ISRU-MOX-01) in MAINTENANCE FDIR.',
      es: 'Calibra las tasas de electrólisis de óxido sólido del hábitat (CO2 -> O2) y las firmas de falla de compresor/SOXE (ISRU-MOX-01) en FDIR MAINTENANCE.',
    },
    primaryUrl: 'https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/moxie.html',
    tags: ['MOXIE', 'Perseverance', 'ISRU', 'O2 Production'],
  },
  {
    id: 'sounds-of-mars',
    category: 'atmosphere',
    title: {
      en: 'NASA Sounds of Mars Acoustic Reference',
      es: 'Referencia Acústica Sounds of Mars de NASA',
    },
    provider: 'NASA / JPL-Caltech (Mars 2020 Perseverance)',
    productId: 'Perseverance SuperCam & EDL Microphone Archive',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA', es: 'Verificado NASA' },
    accent: '#f97316',
    description: {
      en: 'First direct acoustic recordings captured on the Martian surface, capturing low-pressure wind attenuation, rover wheels, and Ingenuity rotor blades.',
      es: 'Primeras grabaciones acústicas directas en la superficie marciana, capturando atenuación del viento en baja presión, ruedas y rotores de Ingenuity.',
    },
    operationalRole: {
      en: 'Acoustic impedance reference for Web Audio Martian environment ambience and high-frequency rotor/comms DSP feedback.',
      es: 'Referencia de impedancia acústica para la ambientación Web Audio en Marte y la cadena DSP de audio de rotores y radio.',
    },
    primaryUrl: 'https://science.nasa.gov/mission/mars-2020-perseverance/sounds-of-mars/',
    tags: ['Acoustics', 'Perseverance', 'Audio DSP', 'Wind'],
  },

  // =========================================================================
  // 3. SPECTROSCOPY, HYDRATION & SURFACE IMAGERY (ML TRAINING DATA)
  // =========================================================================
  {
    id: 'msl-dan',
    category: 'ml-spectra',
    title: {
      en: 'MSL Curiosity DAN Active/Passive Neutron Logs (1,567 Stops)',
      es: 'Registros de Neutrones MSL Curiosity DAN (1,567 Paradas)',
    },
    provider: 'NASA / IKI Roscosmos PDS Geosciences Node (WashU)',
    productId: 'MSL-M-DAN-3/4-RDR-V1.0 (msldan_1000)',
    badge: 'empirical-ml',
    badgeLabel: { en: 'ML Ground Truth', es: 'Verdad de Campo ML' },
    accent: '#fb7185',
    description: {
      en: 'Dynamic Albedo of Neutrons thermal and epithermal neutron counts measuring subsurface hydrogen/OH moderation along Curiosity’s Gale Crater traverse.',
      es: 'Conteos de neutrones térmicos y epitérmicos del instrumento DAN midiendo moderación subsuperficial de hidrógeno/OH en la ruta de Curiosity.',
    },
    operationalRole: {
      en: 'Ground-truth target (1,567 stops; 377 inside the 4×4 km scene) for Hydration Prospector (tango-horizon-hydration-v1: Spearman 0.5823, 500 m blocked CV).',
      es: 'Variable objetivo real (1,567 paradas; 377 dentro de la escena 4×4 km) para Hydration Prospector (tango-horizon-hydration-v1: Spearman 0.5823, CV espacial 500 m).',
    },
    primaryUrl: 'https://pds-geosciences.wustl.edu/msl/msl-m-dan-3_4-rdr-v1/msldan_1000/data/',
    tags: ['DAN', 'Neutron Spectroscopy', 'Hydration Prospector', '1,567 stops'],
  },
  {
    id: 'mro-crism',
    category: 'ml-spectra',
    title: {
      en: 'MRO CRISM MTRDR Spectral Summary Products',
      es: 'Productos Espectrales MTRDR de MRO CRISM',
    },
    provider: 'NASA / JHU-APL PDS Geosciences Node (WashU)',
    productId: '9 MTRDR Cubes · BD1900_2 & SINDEX2',
    badge: 'empirical-ml',
    badgeLabel: { en: 'ML Orbital Features', es: 'Features Orbitales ML' },
    accent: '#fb7185',
    description: {
      en: 'Compact Reconnaissance Imaging Spectrometer for Mars map-projected targeted reduced data records capturing 1.9 µm H2O band depth and hydrated sulfates.',
      es: 'Registros espectrales reducidos y proyectados de CRISM capturando la banda de absorción H2O a 1.9 µm e índices de sulfatos hidratados.',
    },
    operationalRole: {
      en: 'Supplies orbital BD1900_2 and SINDEX2 hydration spectral predictors to Hydration Prospector across Gale Crater.',
      es: 'Aporta predictores espectrales orbitales BD1900_2 y SINDEX2 a Hydration Prospector sobre el Cráter Gale.',
    },
    primaryUrl: 'https://pds-geosciences.wustl.edu/missions/mro/crism.htm',
    tags: ['CRISM', 'MTRDR', 'BD1900_2', 'SINDEX2', 'Hydrated Minerals'],
  },
  {
    id: 'msl-raw-images',
    category: 'ml-spectra',
    title: {
      en: 'MSL Curiosity Mastcam & MAHLI Raw Images API (117 Audited Frames)',
      es: 'API Imágenes Crudas MSL Mastcam & MAHLI (117 Cuadros Auditados)',
    },
    provider: 'NASA / JPL-Caltech / Malin Space Science Systems',
    productId: 'mars.nasa.gov/api/v1/raw_image_items · Sols 170, 925, 929, 931, 1190',
    badge: 'empirical-ml',
    badgeLabel: { en: 'ML Vision Dataset', es: 'Dataset Visión ML' },
    accent: '#fb7185',
    description: {
      en: 'Real Curiosity outcrop photography (Garden City, Sheepbed, Bagnold Dunes) audited frame-by-frame (41 positive vein, 76 negative across 22 sols).',
      es: 'Fotografía real de afloramientos de Curiosity (Garden City, Sheepbed, Dunas Bagnold) auditada cuadro a cuadro (41 positivos con vetas, 76 negativos en 22 soles).',
    },
    operationalRole: {
      en: 'Trains and validates Mineral Vein Detector (tango-horizon-veins-v1: ROC-AUC 0.8453, PR-AUC 0.7961) and renders 256×256 drill-target heatmaps.',
      es: 'Entrena y valida Mineral Vein Detector (tango-horizon-veins-v1: ROC-AUC 0.8453, PR-AUC 0.7961) y genera mapas de calor 256×256 para perforación robótica.',
    },
    primaryUrl: 'https://mars.nasa.gov/api/v1/raw_image_items/',
    tags: ['Mastcam', 'MAHLI', 'Garden City', 'Mineral Veins', '117 Frames'],
  },
  {
    id: 'meta-dinov2',
    category: 'ml-spectra',
    title: {
      en: 'Meta AI DINOv2-small (ViT-S/14) Self-Supervised Backbone',
      es: 'Backbone Auto-Supervisado Meta AI DINOv2-small (ViT-S/14)',
    },
    provider: 'Meta Fundamental AI Research (FAIR)',
    productId: 'dinov2-small-vits14 (384-d CLS + 32×32 patch tokens)',
    badge: 'open-standard',
    badgeLabel: { en: 'Open Foundation Model', es: 'Modelo Base Abierto' },
    accent: '#fb7185',
    description: {
      en: 'Frozen self-supervised Vision Transformer used as a deterministic spatial patch feature extractor paired with sol-grouped LogisticRegression.',
      es: 'Vision Transformer auto-supervisado congelado usado como extractor espacial determinístico acoplado a regresión logística agrupada por sol.',
    },
    operationalRole: {
      en: 'Powers Mineral Vein Detector (tango-horizon-veins-v1) strictly on real Curiosity Mastcam/MAHLI outcrop imagery, verified via 500-run permutation test (p = 0.0020).',
      es: 'Impulsa Mineral Vein Detector (tango-horizon-veins-v1) exclusivamente sobre imágenes reales Mastcam/MAHLI, verificado con test de permutación de 500 corridas (p = 0.0020).',
    },
    primaryUrl: 'https://github.com/facebookresearch/dinov2',
    tags: ['DINOv2', 'ViT-S/14', 'Patch Heatmaps', 'Sol-Grouped CV'],
  },

  // =========================================================================
  // 4. BIOMEDICAL & AEROSPACE STANDARDS (BM25 RAG CORPUS — 1,002 CHUNKS)
  // =========================================================================
  {
    id: 'ochmo-hub',
    category: 'biomed-rag',
    title: {
      en: 'NASA OCHMO Human Spaceflight & Aviation Standards Hub',
      es: 'Centro de Estándares OCHMO de Vuelo Espacial Humano de NASA',
    },
    provider: 'NASA Office of the Chief Health & Medical Officer',
    productId: 'OCHMO Standards Portal (BM25 RAG Corpus)',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA OCHMO', es: 'Verificado NASA OCHMO' },
    accent: '#ea580c',
    description: {
      en: 'Central authority hub governing crew health, medical risk frameworks, environmental exposure limits, and EVA suit operational tolerances.',
      es: 'Portal rector oficial para salud de tripulación, marcos de riesgo médico, límites de exposición ambiental y tolerancias operativas de trajes EVA.',
    },
    operationalRole: {
      en: 'Top-level regulatory index of our 1,002-chunk in-memory BM25 RAG corpus (<2 ms offline query latency) cited by SUIT.HEALTH and GUARDIAN.',
      es: 'Índice normativo principal de nuestro corpus RAG BM25 en memoria de 1,002 chunks (<2 ms offline) citado por SUIT.HEALTH y GUARDIAN.',
    },
    primaryUrl: 'https://www.nasa.gov/ochmo/human-spaceflight-and-aviation-standards/',
    tags: ['OCHMO', 'BM25 RAG', '1,002 Chunks', 'Human Spaceflight'],
  },
  {
    id: 'nasa-std-3001-vol1',
    category: 'biomed-rag',
    title: {
      en: 'NASA-STD-3001 Vol. 1: Crew Health',
      es: 'NASA-STD-3001 Vol. 1: Salud de la Tripulación (Crew Health)',
    },
    provider: 'NASA Technical Standards System',
    productId: 'NASA-STD-3001 Volume 1',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA Standard', es: 'Estándar NASA Verificado' },
    accent: '#ea580c',
    description: {
      en: 'Spaceflight human-system standards specifying physiological health criteria, radiation career/acute limits, hypoxia margins, and clinical care capabilities.',
      es: 'Estándar espacial que especifica criterios fisiológicos de salud, límites de radiación, márgenes de hipoxia y capacidades de atención médica.',
    },
    operationalRole: {
      en: 'Calibrates crew biomedical Early Warning Score (EWS) thresholds, radiation dose action tiers, and SUIT.HEALTH advisory citations.',
      es: 'Calibra los umbrales del puntaje biomédico Early Warning Score (EWS), niveles de acción por radiación y citas consultivas de SUIT.HEALTH.',
    },
    primaryUrl: 'https://standards.nasa.gov/node/238',
    tags: ['NASA-STD-3001', 'Vol 1', 'Crew Health', 'EWS'],
  },
  {
    id: 'nasa-std-3001-vol2',
    category: 'biomed-rag',
    title: {
      en: 'NASA-STD-3001 Vol. 2: Human Factors, Habitability & Environment',
      es: 'NASA-STD-3001 Vol. 2: Factores Humanos, Habitabilidad y Ambiente',
    },
    provider: 'NASA Technical Standards System',
    productId: 'NASA-STD-3001 Volume 2 Rev E',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA Standard', es: 'Estándar NASA Verificado' },
    accent: '#ea580c',
    description: {
      en: 'Authoritative standard governing EVA suit nominal pressure (29.6 kPa / 4.3 psi), inspired CO2 limits, thermal strain, metabolic workloads, and Armstrong limit.',
      es: 'Estándar oficial que regula la presión nominal de traje EVA (29.6 kPa / 4.3 psi), límites de CO2 inspirado, estrés térmico, carga metabólica y límite de Armstrong.',
    },
    operationalRole: {
      en: 'Directly parameterizes suitLeak.ts (Armstrong 6.27 kPa, PAO2 = 8.0 kPa impaired), suitState.ts, metabolic.ts, and biomed.ts.',
      es: 'Parametriza directamente suitLeak.ts (Armstrong 6.27 kPa, PAO2 = 8.0 kPa deterioro), suitState.ts, metabolic.ts y biomed.ts.',
    },
    primaryUrl: 'https://standards.nasa.gov/node/237',
    tags: ['NASA-STD-3001', 'Vol 2', '29.6 kPa', 'CO2 Limits', 'Armstrong'],
  },
  {
    id: 'ochmo-tb-004',
    category: 'biomed-rag',
    title: {
      en: 'OCHMO-TB-004 Technical Briefs (CO2 & Hypercapnia)',
      es: 'Boletines Técnicos OCHMO-TB-004 (CO2 e Hipercapnia)',
    },
    provider: 'NASA OCHMO / Science Mission Directorate',
    productId: 'OCHMO-TB-004',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA OCHMO', es: 'Verificado NASA OCHMO' },
    accent: '#ea580c',
    description: {
      en: 'Operational technical brief detailing hypercapnia cognitive symptoms, PICO2 scrubber breakthrough thresholds, and suit ventilation mitigation.',
      es: 'Boletín técnico operativo sobre síntomas cognitivos por hipercapnia, umbrales de saturación del depurador PICO2 y mitigación por ventilación.',
    },
    operationalRole: {
      en: 'Indexed in the BM25 RAG corpus and encoded into PICO2 escalation rules inside biomed.ts and PLSS scrubber FDIR.',
      es: 'Indexado en el corpus RAG BM25 y codificado en las reglas de escalado PICO2 de biomed.ts y FDIR del depurador PLSS.',
    },
    primaryUrl: 'https://science.nasa.gov/category/organizations/ochmo/',
    tags: ['OCHMO-TB-004', 'Hypercapnia', 'PICO2', 'Scrubber'],
  },
  {
    id: 'medprat-impact',
    category: 'biomed-rag',
    title: {
      en: 'NASA MEDPRAT & IMPACT Probabilistic Medical Risk Models',
      es: 'Modelos Probabilísticos de Riesgo Médico NASA MEDPRAT e IMPACT',
    },
    provider: 'NASA NTRS (Johnson / Glenn Research Center)',
    productId: 'NASA/TM-20240012058 · NTRS 20230013414',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA NTRS', es: 'Verificado NASA NTRS' },
    accent: '#ea580c',
    description: {
      en: 'Informing Mission Planning via Analysis of Complex Tradespaces (IMPACT) and MEDPRAT dynamic Bayesian medical risk tools for deep-space exploration.',
      es: 'Herramientas probabilísticas IMPACT y MEDPRAT de análisis dinámico de riesgo médico y tradespaces para exploración humana profunda.',
    },
    operationalRole: {
      en: 'Provides exploration medical capability scoping and dynamic triage rationale inside the 1,002-chunk BM25 biomedical RAG.',
      es: 'Provee alcance de capacidades médicas de exploración y fundamento de triaje dinámico dentro del RAG biomédico BM25 de 1,002 chunks.',
    },
    primaryUrl: 'https://ntrs.nasa.gov/citations/20240012058',
    secondaryLinks: [
      {
        label: { en: 'IMPACT (NTRS 20230013414)', es: 'IMPACT (NTRS 20230013414)' },
        url: 'https://ntrs.nasa.gov/citations/20230013414',
      },
    ],
    tags: ['MEDPRAT', 'IMPACT', 'Medical Risk', 'NTRS'],
  },
  {
    id: 'amcl-2022',
    category: 'biomed-rag',
    title: {
      en: 'NASA Accepted Medical Condition List (AMCL)',
      es: 'Lista de Condiciones Médicas Aceptadas de NASA (AMCL)',
    },
    provider: 'NASA NTRS (Exploration Medical Capability)',
    productId: 'NASA/TM-2022-220299 (NTRS 20220003136)',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA NTRS', es: 'Verificado NASA NTRS' },
    accent: '#ea580c',
    description: {
      en: 'Canonical NASA reference list of acute and chronic medical conditions modeled for long-duration lunar and Martian surface missions.',
      es: 'Lista canónica de NASA de condiciones médicas agudas y crónicas modeladas para misiones de larga duración en Luna y Marte.',
    },
    operationalRole: {
      en: 'Grounds clinical terminology, trauma/decompression contingencies, and advisory diagnostic grounding in SUIT.HEALTH.',
      es: 'Fundamenta la terminología clínica, contingencias de trauma/descompresión y el respaldo consultivo de SUIT.HEALTH.',
    },
    primaryUrl: 'https://ntrs.nasa.gov/citations/20220003136',
    tags: ['AMCL', 'NTRS', 'Clinical Scoping', 'Mars EVA'],
  },
  {
    id: 'nasa-osdr',
    category: 'biomed-rag',
    title: {
      en: 'NASA Open Science Data Repository (OSDR) Biological API',
      es: 'API Biológica del Repositorio de Ciencia Abierta NASA OSDR',
    },
    provider: 'NASA Ames Research Center (GeneLab / OSDR)',
    productId: 'visualization.osdr.nasa.gov/biodata/api',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA API', es: 'Verificado API NASA' },
    accent: '#ea580c',
    description: {
      en: 'Programmatic access to spaceflight omics, physiological adaptation, and radiation-response datasets from NASA GeneLab and space biology archives.',
      es: 'Acceso programático a conjuntos de datos ómicos, de adaptación fisiológica y respuesta a radiación de NASA GeneLab y biología espacial.',
    },
    operationalRole: {
      en: 'Enriches the biomedical RAG corpus with peer-reviewed spaceflight physiological adaptation and radiation biology context.',
      es: 'Enriquece el corpus RAG biomédico con contexto revisado por pares sobre adaptación fisiológica y radiobiología en vuelo espacial.',
    },
    primaryUrl: 'https://visualization.osdr.nasa.gov/biodata/api/',
    tags: ['OSDR', 'GeneLab', 'Space Biology', 'API'],
  },
  {
    id: 'nasa-suits-tss',
    category: 'biomed-rag',
    title: {
      en: 'NASA SUITS Telemetry Stream Server Schema (TSS 2024)',
      es: 'Esquema de Telemetría NASA SUITS Telemetry Stream Server (TSS 2024)',
    },
    provider: 'NASA Spacesuit User Interface Technologies for Students',
    productId: 'SUITS-Techteam/TSS_2024',
    badge: 'verified-nasa',
    badgeLabel: { en: 'Verified NASA Schema', es: 'Esquema NASA Verificado' },
    accent: '#ea580c',
    description: {
      en: 'Open NASA SUITS reference server defining EVA suit telemetry JSON fields (oxygen primary/secondary, suit pressure, fan RPM, scrubber, heart rate, coolant).',
      es: 'Servidor de referencia oficial de NASA SUITS que define los campos JSON de telemetría EVA (O2 primario/secundario, presión, RPM de ventilador, depurador, FC, refrigerante).',
    },
    operationalRole: {
      en: 'Informs the variable naming and 1 Hz PLSS state packet structure in suitTelemetry.ts and the CSS3D helmet HUD.',
      es: 'Guía la nomenclatura de variables y la estructura de paquetes PLSS a 1 Hz en suitTelemetry.ts y el HUD curvo CSS3D del visor.',
    },
    primaryUrl: 'https://github.com/SUITS-Techteam/TSS_2024',
    tags: ['NASA SUITS', 'TSS_2024', 'PLSS Telemetry', 'EVA HUD'],
  },

  // =========================================================================
  // 5. 3D MODELS & LICENSING (CC BY 4.0 + NASA 3D RESOURCES)
  // =========================================================================
  {
    id: 'tango-horizon-cc-by-4-models',
    category: 'models-3d',
    title: {
      en: 'Team Tango Horizon Custom 3D Assets (Meshopt GLBs — Free CC BY 4.0)',
      es: 'Activos 3D Originales Team Tango Horizon (GLB Meshopt — Libres CC BY 4.0)',
    },
    provider: 'Team Tango Horizon (Original 3D Models)',
    productId: '16+ Custom Mission GLBs · CC BY 4.0 International',
    badge: 'cc-by-4',
    badgeLabel: { en: 'Free to Use · CC BY 4.0', es: 'Uso Libre · CC BY 4.0' },
    accent: '#fdba74',
    description: {
      en: 'Original habitats, Starship-class rocket, animated & static astronauts, rescue robot, rescue rover, reconnaissance rovers, solar panels, antenna, and base modules created by Team Tango Horizon and optimized with meshoptimizer.',
      es: 'Hábitats originales, cohete clase Starship, astronautas animados y estáticos, robot de rescate, rover de rescate, rovers de reconocimiento, paneles solares, antena y módulos base creados por Team Tango Horizon y optimizados con meshoptimizer.',
    },
    operationalRole: {
      en: 'Free to use under Creative Commons Attribution 4.0 International (CC BY 4.0) for personal, educational, commercial, and illustration uses with attribution to Team Tango Horizon.',
      es: 'Libres para usar bajo Creative Commons Atribución 4.0 Internacional (CC BY 4.0) para fines personales, educativos, comerciales e ilustración dando atribución a Team Tango Horizon.',
    },
    primaryUrl: 'https://creativecommons.org/licenses/by/4.0/',
    tags: ['CC BY 4.0', 'Free to Use', 'GLB', 'Meshopt', 'Team Tango Horizon'],
  },
  {
    id: 'nasa-3d-resources',
    category: 'models-3d',
    title: {
      en: 'NASA 3D Resources (Ingenuity, MRO, Perseverance / MSL Chassis)',
      es: 'Recursos 3D de NASA (Ingenuity, MRO, Chasis Perseverance / MSL)',
    },
    provider: 'NASA Science / NASA 3D Resources',
    productId: 'ingenuity.glb · mro.glb · rover.glb',
    badge: 'verified-nasa',
    badgeLabel: { en: 'NASA Media Guidelines', es: 'Directrices NASA Media' },
    accent: '#fdba74',
    description: {
      en: 'Official NASA 3D spacecraft and robotic explorer models (Ingenuity Mars Helicopter, Mars Reconnaissance Orbiter, and Mars 2020/MSL chassis) integrated into the 3D Gale Crater scene.',
      es: 'Modelos 3D oficiales de NASA (helicóptero Ingenuity, orbitador MRO y rover clase Mars 2020/MSL) integrados en la escena 3D del Cráter Gale.',
    },
    operationalRole: {
      en: 'Renders authentic NASA flight & surface hardware alongside Team Tango Horizon habitat and rescue vehicles; remains governed by NASA media usage guidelines.',
      es: 'Renderiza hardware oficial de vuelo y superficie de NASA junto a los módulos y vehículos de rescate de Team Tango Horizon; sujeto a las directrices de medios de NASA.',
    },
    primaryUrl: 'https://github.com/nasa/NASA-3D-Resources',
    secondaryLinks: [
      {
        label: { en: 'ingenuity.glb (Raw)', es: 'ingenuity.glb (Raw)' },
        url: 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Ingenuity%20Mars%20Helicopter/Ingenuity%20Mars%20Helicopter.glb',
      },
      {
        label: { en: 'mro.glb (Raw)', es: 'mro.glb (Raw)' },
        url: 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%20Reconnaissance%20Orbiter%20(MRO)%20(A)/Mars%20Reconnaissance%20Orbiter%20(MRO)%20(A).glb',
      },
      {
        label: { en: 'rover.glb (Raw)', es: 'rover.glb (Raw)' },
        url: 'https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/3D%20Models/Mars%202020%20Perseverance%20Rover/Mars%202020%20Perseverance%20Rover.glb',
      },
    ],
    tags: ['NASA 3D', 'Ingenuity', 'MRO', 'Rover', 'GLB'],
  },

  // =========================================================================
  // 6. NASA SPACE APPS CHALLENGE 2026 & INSTITUTIONAL LINKS
  // =========================================================================
  {
    id: 'nasa-gov',
    category: 'partners',
    title: {
      en: 'NASA — National Aeronautics and Space Administration',
      es: 'NASA — National Aeronautics and Space Administration',
    },
    provider: 'U.S. Government Space Agency',
    productId: 'nasa.gov',
    badge: 'official-partner',
    badgeLabel: { en: 'Space Agency', es: 'Agencia Espacial' },
    accent: '#fda4af',
    description: {
      en: 'Primary sponsor and data steward behind the Mars missions, Planetary Data System archives, OCHMO standards, and open APIs powering Tango Horizon.',
      es: 'Agencia impulsora y custodia de datos detrás de las misiones marcianas, archivos PDS, estándares OCHMO y APIs abiertas que impulsan Tango Horizon.',
    },
    operationalRole: {
      en: 'Source of all orbital, surface, dosimetry, biomedical, and ephemeris datasets used in the project.',
      es: 'Fuente de todos los conjuntos de datos orbitales, superficiales, dosimétricos, biomédicos y de efemérides empleados en el proyecto.',
    },
    primaryUrl: 'https://www.nasa.gov/',
    tags: ['NASA', 'Open Data', 'Mars Exploration'],
  },
  {
    id: 'space-apps-2026',
    category: 'partners',
    title: {
      en: 'NASA International Space Apps Challenge 2026',
      es: 'NASA International Space Apps Challenge 2026',
    },
    provider: 'NASA Space Apps Global Organizing Team',
    productId: 'spaceappschallenge.org · 2026 Edition',
    badge: 'official-partner',
    badgeLabel: { en: 'Global Hackathon', es: 'Hackatón Global' },
    accent: '#fda4af',
    description: {
      en: 'The world’s largest annual global space & science hackathon inviting multidisciplinary teams to build open solutions with NASA Earth and space data.',
      es: 'La hackatón global anual de ciencia y espacio más grande del mundo, convocando equipos interdisciplinarios a crear soluciones abiertas con datos de NASA.',
    },
    operationalRole: {
      en: 'Official global event portal, participant rules, and submission framework for Tango Horizon (2026-11-15).',
      es: 'Portal oficial del evento global, reglamento para participantes y marco de presentación para Tango Horizon (2026-11-15).',
    },
    primaryUrl: 'https://www.spaceappschallenge.org/',
    secondaryLinks: [
      {
        label: { en: 'Rules & Legal Terms', es: 'Reglas y Términos Legales' },
        url: 'https://www.spaceappschallenge.org/legal/',
      },
      {
        label: { en: 'Project Submission Guide', es: 'Guía de Presentación' },
        url: 'https://www.spaceappschallenge.org/resources/project-submission-guide/',
      },
    ],
    tags: ['Space Apps 2026', 'Hackathon', 'Open Science'],
  },
  {
    id: 'challenge-martian-map',
    category: 'partners',
    title: {
      en: 'Challenge: Interplanetary Survival Guide — Martian Map',
      es: 'Desafío: Interplanetary Survival Guide — Martian Map',
    },
    provider: 'NASA Space Apps Challenge 2026',
    productId: 'interplanetary-survival-guide-martian-map',
    badge: 'official-partner',
    badgeLabel: { en: 'Official Challenge', es: 'Desafío Oficial' },
    accent: '#fda4af',
    description: {
      en: '2026 challenge calling for interactive Martian mapping, hazard awareness, and survival guidance for future human and robotic explorers.',
      es: 'Desafío 2026 orientado a crear mapas marcianos interactivos, conciencia de peligros y guías de supervivencia para futuros exploradores humanos y robóticos.',
    },
    operationalRole: {
      en: 'Defines the mission scope solved by Tango Horizon’s 3D Gale Crater EVA simulator, GUARDIAN safety gates, and S1–S7 crew rescue loop.',
      es: 'Define el alcance misionero resuelto por el simulador 3D de EVA en el Cráter Gale de Tango Horizon, las barreras GUARDIAN y el rescate S1–S7.',
    },
    primaryUrl: 'https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/',
    tags: ['Martian Map', 'Survival Guide', '2026 Challenge'],
  },
  {
    id: 'tango-horizon-team-page',
    category: 'partners',
    title: {
      en: 'Team Tango Horizon Official Project Page',
      es: 'Página Oficial del Equipo Tango Horizon',
    },
    provider: 'NASA Space Apps Challenge 2026',
    productId: 'tango-horizon',
    badge: 'official-partner',
    badgeLabel: { en: 'Team Submission', es: 'Presentación del Equipo' },
    accent: '#fda4af',
    description: {
      en: 'Official Space Apps 2026 project submission profile for Team Tango Horizon (Agustín Díaz-Cano, Baltazar Salerno, Milagros Sotelo, Federico Yaconis).',
      es: 'Perfil oficial de presentación en Space Apps 2026 del Equipo Tango Horizon (Agustín Díaz-Cano, Baltazar Salerno, Milagros Sotelo, Federico Yaconis).',
    },
    operationalRole: {
      en: 'Public hackathon submission page linking the live simulator, repository, architecture slides, and video pitch.',
      es: 'Página pública de presentación vinculando el simulador en vivo, repositorio, diapositivas de arquitectura y video pitch.',
    },
    primaryUrl: 'https://www.spaceappschallenge.org/2026/find-a-team/tango-horizon/?tab=project',
    tags: ['Tango Horizon', 'Team Profile', 'Submission'],
  },
  {
    id: 'buenos-aires-node',
    category: 'partners',
    title: {
      en: 'Buenos Aires Local Node — Space Apps 2026',
      es: 'Nodo Local Buenos Aires — Space Apps 2026',
    },
    provider: 'Space Apps Buenos Aires · Universidad de Palermo',
    productId: 'local-events/buenos-aires',
    badge: 'official-partner',
    badgeLabel: { en: 'Local Host Node', es: 'Sede Local' },
    accent: '#fda4af',
    description: {
      en: 'Official Buenos Aires, Argentina local event hub hosting Team Tango Horizon during the November 14–15, 2026 hackathon weekend.',
      es: 'Sede oficial de Buenos Aires, Argentina, anfitriona del Equipo Tango Horizon durante el fin de semana del 14 y 15 de noviembre de 2026.',
    },
    operationalRole: {
      en: 'Local judging and mentorship node connecting Argentine engineering & science teams with the global Space Apps jury.',
      es: 'Nodo local de mentoría y jurado que conecta equipos de ingeniería y ciencia de Argentina con el jurado global de Space Apps.',
    },
    primaryUrl: 'https://www.spaceappschallenge.org/2026/local-events/buenos-aires/',
    tags: ['Buenos Aires', 'Argentina', 'Local Event'],
  },
  {
    id: 'partner-conae',
    category: 'partners',
    title: {
      en: 'CONAE — Comisión Nacional de Actividades Espaciales',
      es: 'CONAE — Comisión Nacional de Actividades Espaciales',
    },
    provider: 'National Space Agency of Argentina',
    productId: 'conae · Space Agency Partner',
    badge: 'official-partner',
    badgeLabel: { en: 'Agency Partner', es: 'Agencia Aliada' },
    accent: '#fda4af',
    description: {
      en: 'Argentina’s national space agency and official NASA Space Apps Challenge space agency partner supporting local innovation since 2021.',
      es: 'Agencia espacial nacional de Argentina y socia oficial del NASA Space Apps Challenge acompañando la innovación local desde 2021.',
    },
    operationalRole: {
      en: 'Institutional partner inspiring the conae-base-mars.glb habitat architecture and Argentine spaceflight outreach.',
      es: 'Socia institucional que inspira la arquitectura del módulo conae-base-mars.glb y la divulgación aeroespacial argentina.',
    },
    primaryUrl: 'https://www.argentina.gob.ar/ciencia/conae',
    tags: ['CONAE', 'Argentina', 'Space Agency'],
  },
  {
    id: 'partner-up',
    category: 'partners',
    title: {
      en: 'Universidad de Palermo (UP) — Host Campus Buenos Aires',
      es: 'Universidad de Palermo (UP) — Sede Anfitriona Buenos Aires',
    },
    provider: 'Universidad de Palermo',
    productId: 'palermo.edu',
    badge: 'official-partner',
    badgeLabel: { en: 'Academic Host', es: 'Sede Académica' },
    accent: '#fda4af',
    description: {
      en: 'Host university campus for the Buenos Aires Space Apps 2026 node and academic home of our lunar and Martian robotics/AI research chronicled on this site.',
      es: 'Campus anfitrión de la sede Buenos Aires de Space Apps 2026 y casa académica de las tesis sobre robótica e IA lunar y marciana publicadas en este sitio.',
    },
    operationalRole: {
      en: 'Provides academic mentorship, engineering facilities, and local event hosting for the Buenos Aires node.',
      es: 'Brinda mentoría académica, instalaciones de ingeniería y sede presencial para el nodo Buenos Aires.',
    },
    primaryUrl: 'https://www.palermo.edu/',
    tags: ['Universidad de Palermo', 'Host Campus', 'Buenos Aires'],
  },
  {
    id: 'partner-ibm-ar',
    category: 'partners',
    title: {
      en: 'IBM Argentina — Event Sponsor & Technology Partner',
      es: 'IBM Argentina — Sponsor del Evento y Socio Tecnológico',
    },
    provider: 'IBM Argentina',
    productId: 'ibm.com/ar-es',
    badge: 'official-partner',
    badgeLabel: { en: 'Local Sponsor', es: 'Sponsor Local' },
    accent: '#fda4af',
    description: {
      en: 'Enterprise technology sponsor supporting the Buenos Aires Space Apps Challenge node and AI/cloud engineering mentorship.',
      es: 'Sponsor tecnológico corporativo que apoya al nodo Buenos Aires de Space Apps Challenge y la mentoría en IA y nube.',
    },
    operationalRole: {
      en: 'Regional partner supporting the Buenos Aires hackathon ecosystem alongside CONAE and Universidad de Palermo.',
      es: 'Socio regional que impulsa el ecosistema de la hackatón en Buenos Aires junto a CONAE y Universidad de Palermo.',
    },
    primaryUrl: 'https://www.ibm.com/ar-es',
    tags: ['IBM Argentina', 'Sponsor', 'Buenos Aires'],
  },
  {
    id: 'afaw-methodology',
    category: 'partners',
    title: {
      en: 'AFAW — Anti-Fragile Agentic Workflow (Software 3.0)',
      es: 'AFAW — Anti-Fragile Agentic Workflow (Software 3.0)',
    },
    provider: 'Agustín Díaz-Cano (Open Methodology)',
    productId: 'afaw-anti-fragile-agentic-workflow',
    badge: 'open-standard',
    badgeLabel: { en: 'Open Methodology', es: 'Metodología Abierta' },
    accent: '#fbbf24',
    description: {
      en: 'Multi-agent engineering methodology used to build Tango Horizon with isolated git worktrees, shared contract files, automated CI/test verification, and human-in-the-loop review.',
      es: 'Metodología de ingeniería multi-agente utilizada para construir Tango Horizon con worktrees aislados, contratos compartidos, CI automatizado y revisión humana.',
    },
    operationalRole: {
      en: 'Documents how AI coding agents and human authors collaborated transparently across physics, ML, 3D WebGL2, and backend systems.',
      es: 'Documenta cómo los agentes de código y los autores humanos colaboraron con trazabilidad en física, ML, 3D WebGL2 y backend.',
    },
    primaryUrl: 'https://github.com/agustindiazcano/afaw-anti-fragile-agentic-workflow',
    tags: ['AFAW', 'Software 3.0', 'Human-in-the-Loop', 'Open Source'],
  },
];

export const DETERMINISTIC_PHYSICS_DOMAINS: PhysicsDomainReference[] = [
  {
    id: 'metabolic',
    domain: { en: 'Metabolic Rate & O2/CO2 Demand', es: 'Tasa Metabólica y Demanda O2/CO2' },
    formulation: 'M = 1.5 W + k * [2.0(W + L)(L/W)^2 + eta(W + L)(1.5 v^2 + 0.35 v G)]',
    basis: {
      en: 'Pandolf (1977) + Santee (2001) scaled by g_mars/g_earth; NASA-STD-3001 Vol 2',
      es: 'Pandolf (1977) + Santee (2001) escalado por g_mars/g_earth; NASA-STD-3001 Vol 2',
    },
    modulePath: 'shared/src/physics/metabolic.ts',
  },
  {
    id: 'suit-leak',
    domain: { en: 'Choked Orifice Leak & Alveolar pO2', es: 'Fuga Sónica y pO2 Alveolar' },
    formulation: 'm_dot = Cd A P sqrt(gamma/(R T)) (2/(gamma+1))^((gamma+1)/(2(gamma-1)))',
    basis: {
      en: 'Compressible choked flow; NASA-STD-3001 Vol 2 Rev E (Armstrong 6.27 kPa)',
      es: 'Flujo compresible estrangulado; NASA-STD-3001 Vol 2 Rev E (Armstrong 6.27 kPa)',
    },
    modulePath: 'shared/src/physics/suitLeak.ts',
  },
  {
    id: 'plss-state',
    domain: { en: '1 Hz PLSS State & Suit Telemetry', es: 'Estado PLSS 1 Hz y Telemetría de Traje' },
    formulation: 'Primary/SOP O2 draw, CO2 scrubber, fan RPM, Wh battery, L coolant',
    basis: {
      en: 'NASA-STD-3001 Vol 2; Apollo/xEMU & NASA SUITS TSS_2024 bounds',
      es: 'NASA-STD-3001 Vol 2; límites Apollo/xEMU y NASA SUITS TSS_2024',
    },
    modulePath: 'shared/src/physics/suitState.ts',
  },
  {
    id: 'atmo-solar',
    domain: { en: 'Martian Atmosphere & Solar Extinction', es: 'Atmósfera Marciana y Extinción Solar' },
    formulation: 'rho(h) = rho0 exp(-h/H), direct beam exp(-tau/mu), 589.2 W/m^2 TOA',
    basis: {
      en: 'MSL REMS + Mars-GRAM scale height (11.1 km); direct-beam-only extinction',
      es: 'MSL REMS + altura de escala Mars-GRAM (11.1 km); extinción de haz directo',
    },
    modulePath: 'shared/src/physics/solar.ts',
  },
  {
    id: 'dose-svf',
    domain: { en: 'Geometric SVF Radiation & Albedo Dose', es: 'Radiación SVF Geométrica y Dosis Albedo' },
    formulation: 'D_dot = D_0 * (svf + beta * (1 - svf)), beta = 0.09',
    basis: {
      en: 'MSL-M-RAD-3-RDR-V1.0 (SwRI PDS-PPI) + 16-ray HiRISE horizon SVF',
      es: 'MSL-M-RAD-3-RDR-V1.0 (SwRI PDS-PPI) + SVF de horizonte 16 rayos HiRISE',
    },
    modulePath: 'shared/src/physics/dose.ts',
  },
  {
    id: 'ballistic-pod',
    domain: { en: 'RK4 Ballistic Pod & Parachute Delivery', es: 'Cápsula Balística RK4 y Paracaídas' },
    formulation: '3D gravity + quadratic drag + log wind shear; chute < 120 m; 15 m keep-out',
    basis: {
      en: 'Mars ballistic/chute design model (g_mars = 3.711 m/s^2, Monte Carlo)',
      es: 'Modelo de diseño balístico/paracaídas en Marte (g_mars = 3.711 m/s^2)',
    },
    modulePath: 'shared/src/physics/podDelivery.ts',
  },
  {
    id: 'astar-storm',
    domain: { en: 'Storm Go/No-Go & EVA Route Planner (A*)', es: 'Decisión de Tormenta y Ruta EVA (A*)' },
    formulation: 'A* on DEM slope, THEMIS thermal energy & SVF radiation; tau >= 1.8 ground',
    basis: {
      en: 'Ingenuity flight envelope; OCHMO/RAD EVA exposure limits',
      es: 'Envolvente de vuelo Ingenuity; límites de exposición EVA OCHMO/RAD',
    },
    modulePath: 'shared/src/physics/route.ts',
  },
  {
    id: 'biomed-fdir',
    domain: { en: 'Biomed EWS, FDIR Prognostics & Env Nowcast', es: 'EWS Biomédico, FDIR y Nowcast Ambiental' },
    formulation: '0–3 EWS subscores, sliding-window RUL, diurnal dP/dt & DONKI SEP',
    basis: {
      en: 'NASA-STD-3001 Vol 1/2, OCHMO-TB-004, MSL REMS & DONKI WSA-Enlil (advisory)',
      es: 'NASA-STD-3001 Vol 1/2, OCHMO-TB-004, MSL REMS y DONKI WSA-Enlil (consultivo)',
    },
    modulePath: 'shared/src/physics/biomed.ts',
  },
];

export function getSourcesPageCopy() {
  return {
    eyebrow: {
      en: 'Open Science Provenance & References · 2026-11-15',
      es: 'Trazabilidad Científica Abierta y Referencias · 2026-11-15',
    },
    title: {
      en: 'Data Sources, NASA APIs & 3D Licensing',
      es: 'Fuentes de Datos, APIs NASA y Licencias 3D',
    },
    subtitle: {
      en: 'Every orbital DEM, PDS rover archive, biomedical standard, ML training corpus, physics formulation, Space Apps Challenge link, and CC BY 4.0 3D asset powering Tango Horizon.',
      es: 'Cada DEM orbital, archivo PDS de rovers, estándar biomédico, corpus ML, formulación física, enlace de Space Apps Challenge y activo 3D CC BY 4.0 que impulsa Tango Horizon.',
    },
    backHome: { en: 'Back to Home', es: 'Volver al Inicio' },
    openSimulator: { en: 'Open 3D Simulator', es: 'Abrir Simulador 3D' },
    projectOverview: { en: 'Project Architecture', es: 'Arquitectura del Proyecto' },
    searchPlaceholder: {
      en: 'Filter by mission, API, instrument, ID, or URL (e.g. HiRISE, REMS, DAN, 3001, CC BY)...',
      es: 'Filtrar por misión, API, instrumento, ID o URL (ej. HiRISE, REMS, DAN, 3001, CC BY)...',
    },
    clearSearch: { en: 'Clear', es: 'Limpiar' },
    showingPrefix: { en: 'Showing', es: 'Mostrando' },
    showingMiddle: { en: 'of', es: 'de' },
    showingSuffix: { en: 'verified entries', es: 'entradas verificadas' },
    noResults: {
      en: 'No data sources match your current filter. Try another category or clear the search.',
      es: 'Ninguna fuente coincide con tu filtro actual. Probá otra categoría o limpiá la búsqueda.',
    },
    verifiedVsSimTitle: {
      en: 'Scientific Rigor: Empirical NASA Data vs. Deterministic Simulation',
      es: 'Rigor Científico: Datos Empíricos NASA vs. Simulación Determinística',
    },
    verifiedVsSimEmpiricalTitle: {
      en: 'Real Grounded Data & Standards (Verified)',
      es: 'Datos Reales y Estándares Oficiales (Verificado)',
    },
    verifiedVsSimEmpiricalBody: {
      en: '57 runtime artifacts in provenance.json (SHA-256 checksums): 1 m/px HiRISE DTM & 0.25 m/px orthoimage, 20 m/px CTX DEM, 100 m/px THEMIS IR mosaics, MSL REMS Sols 1–3953, Mastcam tau_880, MSL RAD quiet & Sep 2017 SEP dose rates, 1,567 DAN neutron stops, 9 CRISM cubes, 117 audited Mastcam/MAHLI frames, JPL Horizons DE441, DONKI space weather, MOXIE O2 logs, and 1,002 OCHMO / NASA-STD-3001 / NTRS RAG chunks.',
      es: '57 artefactos en provenance.json (checksums SHA-256): DTM HiRISE 1 m/px y ortoimagen 0.25 m/px, CTX DEM 20 m/px, mosaicos THEMIS IR 100 m/px, MSL REMS Soles 1–3953, Mastcam tau_880, dosis MSL RAD nominal y SEP 2017, 1,567 paradas DAN, 9 cubos CRISM, 117 cuadros Mastcam/MAHLI auditados, JPL Horizons DE441, DONKI, registros MOXIE y 1,002 chunks RAG de OCHMO / NASA-STD-3001 / NTRS.',
    },
    verifiedVsSimSimTitle: {
      en: 'Simulation Envelope & Engineering Assumptions (Transparent)',
      es: 'Entorno de Simulación y Supuestos de Ingeniería (Transparente)',
    },
    verifiedVsSimSimBody: {
      en: 'Interactive 3D telemetry (1 Hz PLSS suit state, Pandolf-Santee 0.38 g metabolic scaling, choked orifice leaks, RK4 ballistic pod delivery, FDIR fault injection profiles, and A* routing) runs deterministically in TypeScript with 44 constants audited explicitly (18 published/standard, 26 labeled design assumptions). ML outputs and biomedical EWS are advisory decision-support tools, never clinical or flight-command replacements.',
      es: 'La telemetría 3D interactiva (estado PLSS a 1 Hz, escalado metabólico Pandolf-Santee 0.38 g, fugas sónicas, cápsula balística RK4, inyección de fallas FDIR y rutas A*) corre determinísticamente en TypeScript con 44 constantes auditadas (18 estándar y 26 supuestos de diseño). Los modelos ML y el EWS biomédico son herramientas consultivas de soporte.',
    },
    licenseBoxBadge: {
      en: 'Open 3D Assets License · Free to Use',
      es: 'Licencia Abierta Activos 3D · Uso Libre',
    },
    licenseBoxTitle: {
      en: 'Team Tango Horizon 3D Models — Free Under CC BY 4.0',
      es: 'Modelos 3D Team Tango Horizon — Uso Libre bajo CC BY 4.0',
    },
    licenseBoxBody: {
      en: 'All custom Team Tango Horizon GLB models listed below are free to use under Creative Commons Attribution 4.0 International (CC BY 4.0) for personal, educational, commercial, and illustration uses (with attribution to Team Tango Horizon). Official NASA 3D Resources (ingenuity.glb, mro.glb, rover.glb) remain governed by NASA media guidelines.',
      es: 'Todos los modelos GLB originales de Team Tango Horizon listados abajo son libres de usar bajo Creative Commons Atribución 4.0 Internacional (CC BY 4.0) para usos personales, educativos, comerciales e ilustración (con atribución a Team Tango Horizon). Los activos de NASA 3D Resources (ingenuity.glb, mro.glb, rover.glb) se rigen por las directrices de medios de NASA.',
    },
    licenseCta: {
      en: 'Read CC BY 4.0 License',
      es: 'Ver Licencia CC BY 4.0',
    },
    nasa3dCta: {
      en: 'NASA 3D Resources Repo',
      es: 'Repo NASA 3D Resources',
    },
    physicsSectionEyebrow: {
      en: 'Deterministic Physics Kernel (@th/shared)',
      es: 'Núcleo Físico Determinístico (@th/shared)',
    },
    physicsSectionTitle: {
      en: 'Physics Formulations & Provenance Basis',
      es: 'Formulaciones Físicas y Base de Trazabilidad',
    },
    roleLabel: { en: 'Operational Role:', es: 'Rol Operativo:' },
    openSourceBtn: { en: 'Open Primary Source', es: 'Abrir Fuente Principal' },
  };
}
