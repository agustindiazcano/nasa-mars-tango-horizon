import type { SiteLang } from '@/context/LanguageContext';

export interface ThesisMetric {
  value: string;
  label: string;
}

export interface ThesisSection {
  id: string;
  num: string;
  title: string;
  paragraphs: string[];
  formula?: string;
  visualKey: string;
}

export interface ThesisDocument {
  variant: 'moon' | 'mars';
  kicker: string;
  title: string;
  subtitle: string;
  abstract: string;
  metrics: ThesisMetric[];
  chapters: ThesisSection[];
  conclusion: string;
}

export interface MarsSection {
  id: string;
  title: string;
  body: string;
  visualKey: string;
  highlights?: string[];
}

export interface MarsPhase {
  id: 'marte-observacion' | 'marte-sondas-rovers' | 'marte-arquitectura-humana';
  slug: string;
  tabLabel: string;
  title: string;
  kicker: string;
  heading: string;
  subtitle: string;
  description: string;
  accent: string;
  tags: string[];
  metrics: ThesisMetric[];
  sections: MarsSection[];
  quote: {
    text: string;
    author: string;
  };
}

const MOON_THESIS_EN: ThesisDocument = {
  variant: 'moon',
  kicker: 'University-Level Academic Thesis · Selenology & History of Science',
  title: 'The Conquest of the Moon',
  subtitle:
    'From Ancient Astral Contemplation to In Situ Selenology: Scientific Genealogy, Telescopic Optics, and the Orbital Mechanics of the Lunar Landing.',
  abstract:
    'The arrival of humanity on the Moon on July 20, 1969, was neither an isolated technological event nor a mere situational byproduct of 20th-century geopolitics. Rather, it represents the epistemological culmination of over five millennia of observing and mathematizing the cosmos. This thesis examines the historical, geometric, and physical evolution that led humanity from mythological contemplation of the night sky in Antiquity to the landing of the Eagle module in Mare Tranquillitatis. It demonstrates how Babylonian gnomonics, Hellenistic trigonometry, 17th-century refractive optics, and Newtonian celestial mechanics forged the indispensable foundations of modern astronautics.',
  metrics: [
    { value: '60.27 R_E', label: 'Mean Earth–Moon distance (~384,400 km) first gauged by Hipparchus' },
    { value: '10.9 km/s', label: 'Translunar Injection (TLI) velocity from Earth' },
    { value: '34.5 MN', label: 'Thermodynamic thrust of the Saturn V rocket at liftoff' },
    { value: '382 kg', label: 'Lunar rocks and regolith collected by the Apollo Program' },
  ],
  chapters: [
    {
      id: 'moon-cap-1',
      num: 'Chapter I',
      title: 'The Firmament in Antiquity: Archaeoastronomy and Greek Geometry',
      paragraphs: [
        'Before the Moon was conceived as a physical or topographic destination, the earliest civilizations of the Fertile Crescent scrutinized its phases to organize human time. In Mesopotamia, Chaldean priest-astronomers recorded lunar syzygies with rigorous arithmetic precision, deducing the Saros cycle (a period of 223 synodic months, equivalent to 18 years and 11 days). This empirical pattern enabled them to predict lunar and solar eclipses without yet resorting to three-dimensional spatial models.',
        'The critical transition from arithmetic recordkeeping to geometric physics took place in the Hellenistic world. In the 3rd century BCE, Aristarchus of Samos, in his treatise On the Sizes and Distances of the Sun and Moon, applied projective trigonometry during lunar eclipses and the quarter phase to estimate, for the first time in human history, the relative distance between Earth and its satellite.',
        'A century later, Hipparchus of Nicaea dramatically refined this method by measuring lunar parallax from different latitudes. Hipparchus determined that the Earth–Moon distance was approximately 60 Earth radii (60 R_E), a figure astonishingly convergent with the true mean value of 60.27 R_E (384,400 km). Thus, the Moon shifted from an unreachable deity to a metrically bounded entity.',
      ],
      formula: 'd_Moon ≈ 60 · R_E ≈ 384,400 km   (Diurnal parallax π ≈ 57′)',
      visualKey: 'moon-saros-parallax',
    },
    {
      id: 'moon-cap-2',
      num: 'Chapter II',
      title: 'The Telescopic Rupture and the Mathematization of the Cosmos (16th–17th Centuries)',
      paragraphs: [
        'For more than a millennium, the Aristotelian-Ptolemaic ontological dogma prevailed, postulating that the Moon was a sphere of pure aether, perfectly smooth and immutable, acting as the ontological boundary between the sublunary world (corruptible) and the superlunary realm (eternal). This paradigm collapsed abruptly in the autumn of 1609, when Galileo Galilei aimed his refracting telescope toward the lunar terminator.',
        'In the pages of Sidereus Nuncius (1610), Galileo proved through the trigonometric analysis of cast shadows that the satellite possessed rugged mountain ranges and deeply recessed annular craters. Ontologically, the Moon became a second Earth—a geological body analogous to our own.',
        'Subsequently, Johannes Kepler’s three laws of planetary motion paved the way for the grand synthesis of modern physics. With the publication of Principia Mathematica (1687), Isaac Newton demonstrated that the Moon’s orbital retention obeys the exact same gravitational acceleration governing a body in free fall at Earth’s surface. From that milestone onward, traveling to the Moon ceased to be a literary chimera and became a strict problem of classical dynamics: imparting sufficient initial kinetic energy to a vehicle to overcome Earth’s gravitational potential.',
      ],
      formula: 'F = G · (M_Earth · m_Moon) / r²   ⇒   a_c = g · (R_E / r)² ≈ 0.00272 m/s²',
      visualKey: 'moon-galileo-optics',
    },
    {
      id: 'moon-cap-3',
      num: 'Chapter III',
      title: 'From Theoretical Ballistics to Orbital Rendezvous Dynamics (20th Century)',
      paragraphs: [
        'The engineering solution to the problem posed by Newtonian physics emerged at the dawn of the 20th century through the Russian scientist Konstantin Tsiolkovsky. He mathematically derived that, in the vacuum of space (where aerodynamic lift does not exist), the only viable propulsion relies on the conservation of linear momentum via the continuous expulsion of high-velocity mass.',
        'To enter a Translunar Injection (TLI) trajectory, a spacecraft must accelerate from low Earth orbit (v_LEO ≈ 7.8 km/s) until approaching the planet’s escape velocity (v_e = √(2GM_E/R_E) ≈ 10.9 km/s). During the design of the Apollo Program in the 1960s, instead of the brute force of Direct Ascent, the elegant orbital-mechanics solution championed by engineer John Houbolt prevailed: Lunar Orbit Rendezvous (LOR).',
        'This strategy drastically reduced total launch mass by splitting the spacecraft into specialized stages. Only an ultralight vehicle engineered exclusively for vacuum operations—the Lunar Module (LM)—would descend to the surface, while the Command and Service Module (CSM) waited in selenocentric orbit. This entire stack was propelled by the Saturn V launch vehicle, capable of generating 34.5 MN of thrust at liftoff and injecting 48.6 metric tons of payload toward the Moon.',
      ],
      formula: 'Δv = v_e · ln(m_0 / m_f)   |   v_TLI ≈ 10.9 km/s',
      visualKey: 'moon-saturnv-lor',
    },
    {
      id: 'moon-cap-4',
      num: 'Chapter IV',
      title: 'The Lunar Landing and the Birth of Empirical Selenology (1969 – Present)',
      paragraphs: [
        'On July 20, 1969, theory accumulated over centuries materialized into praxis. Guided by the computational algorithms of the Apollo Guidance Computer (AGC) and landing Doppler radar returns, the Lunar Module Eagle, crewed by Neil Armstrong and Buzz Aldrin, touched down safely on the basaltic plains of Mare Tranquillitatis.',
        'Between 1969 and 1972, the six Apollo missions that successfully landed on the Moon transformed astronomy into a field science. Astronauts deployed ALSEP geophysical stations (seismometers and magnetometers) alongside laser retroreflector arrays that, to this day, enable scientists to measure the Moon’s secular recession from Earth (~3.8 cm/year) caused by tidal dissipation.',
        'Isotopic, geochemical, and petrographic analyses of the 382 kg of regolith, impact breccias, and anorthosites returned to Earth resolved planetary science’s foremost enigma by validating the Giant Impact Hypothesis: the Moon accreted from debris ejected by an oblique collision between proto-Earth and a Mars-sized protoplanet (Theia) roughly 4.51 billion years ago.',
      ],
      formula: 'Earth–Moon tidal recession: dr/dt ≈ +3.82 ± 0.07 cm/year',
      visualKey: 'moon-eagle-alsep',
    },
  ],
  conclusion:
    'Reaching the Moon represents the undeniable triumph of human rationalism and the scientific method. The lunar dust stirred by Apollo 11’s boots in 1969 was the final link in a causal chain that began when early Sumerian astronomers etched celestial cycles onto clay tablets. Today, on the threshold of the 21st century’s next chapter and with eyes set on the lunar south pole through the Artemis program, humanity returns to the Moon—not as a final destination, but as the first harbor of a vast interplanetary geography.',
};

const MOON_THESIS_ES: ThesisDocument = {
  variant: 'moon',
  kicker: 'Tesis Académica de Nivel Universitario · Selenología e Historia de la Ciencia',
  title: 'La Conquista de la Luna',
  subtitle:
    'De la Contemplación Astral en la Edad Antigua a la Selenología In Situ: Genealogía Científica, Óptica Telescópica y Mecánica Orbital del Alunizaje.',
  abstract:
    'La llegada del ser humano a la Luna el 20 de julio de 1969 no constituyó un evento tecnológico aislado ni un mero subproducto coyuntural de la geopolítica del siglo XX. Por el contrario, representa la culminación epistemológica de más de cinco milenios de observación y matematización del cosmos. La presente tesis examina la evolución histórica, geométrica y física que condujo a la humanidad desde la contemplación mitológica del firmamento en la Edad Antigua hasta el alunizaje del módulo Eagle en el Mare Tranquillitatis. Se demuestra cómo la gnomónica babilónica, la trigonometría helénica, la óptica refractiva del siglo XVII y la mecánica celeste newtoniana configuraron los cimientos ineludibles de la astronáutica contemporánea.',
  metrics: [
    { value: '60.27 R_T', label: 'Distancia media Tierra–Luna (~384,400 km) medida desde Hiparco' },
    { value: '10.9 km/s', label: 'Velocidad de Inyección Translunar (TLI) desde la Tierra' },
    { value: '34.5 MN', label: 'Empuje termodinámico del vector Saturno V en el despegue' },
    { value: '382 kg', label: 'Rocas lunares y regolito recolectados por el Programa Apolo' },
  ],
  chapters: [
    {
      id: 'moon-cap-1',
      num: 'Capítulo I',
      title: 'El Firmamento en la Edad Antigua: Arqueoastronomía y Geometría Griega',
      paragraphs: [
        'Antes de que la Luna fuese concebida como un destino físico u orográfico, las civilizaciones prístinas del Creciente Fértil escrutaron sus fases para ordenar el tiempo humano. En Mesopotamia, los sacerdotes-astrónomos caldeos registraron con rigurosa precisión aritmética las sicigias lunares, logrando deducir el ciclo de Saros (un período de 223 meses sinódicos, equivalente a 18 años y 11 días). Este patrón empírico permitía predecir eclipses lunares y solares sin recurrir aún a modelos espaciales tridimensionales.',
        'La transición crítica del registro aritmético a la física geométrica aconteció en el mundo helénico. En el siglo III a.C., Aristarco de Samos, en su tratado Sobre los tamaños y las distancias del Sol y la Luna, empleó la trigonometría proyectiva durante los eclipses lunares y la fase de cuadratura para estimar, por primera vez en la historia humana, la distancia relativa entre la Tierra y su satélite.',
        'Un siglo más tarde, Hiparco de Nicea refinó drásticamente este método mediante la medición de la paralaje lunar desde diferentes latitudes. Hiparco determinó que la distancia Tierra–Luna equivalía aproximadamente a 60 radios terrestres (60 R_T), una cifra asombrosamente convergente con el valor real medio de 60.27 R_T (384,400 km). Así, la Luna pasó de ser una deidad inalcanzable a convertirse en una entidad métricamente acotada.',
      ],
      formula: 'd_Luna ≈ 60 · R_T ≈ 384,400 km   (Paralaje diurna π ≈ 57′)',
      visualKey: 'moon-saros-parallax',
    },
    {
      id: 'moon-cap-2',
      num: 'Capítulo II',
      title: 'La Ruptura Telescópica y la Matematización del Cosmos (Siglos XVI–XVII)',
      paragraphs: [
        'Durante más de un milenio imperó el dogma ontológico aristotélico-ptolomeico, el cual postulaba que la Luna era una esfera de éter puro, perfectamente lisa e inmutable, que operaba como frontera ontológica entre el mundo sublunar (corruptible) y el supralunar (eterno). Este paradigma colapsó abruptamente en el otoño de 1609, cuando Galileo Galilei dirigió su telescopio refractor hacia el terminador lunar.',
        'En las páginas del Sidereus Nuncius (1610), Galileo demostró mediante el análisis trigonométrico de las sombras proyectadas que el satélite poseía cordilleras escarpadas y cráteres anulares de enorme profundidad. La Luna se transformó ontológicamente en una segunda Tierra, un cuerpo geológico análogo al nuestro.',
        'Posteriormente, las tres leyes del movimiento planetario de Johannes Kepler prepararon el terreno para la gran síntesis de la física moderna. Con la publicación de los Principia Mathematica (1687), Isaac Newton demostró que la retención orbital de la Luna obedece a la misma aceleración gravitatoria que rige la caída libre de un cuerpo en la superficie terrestre. A partir de este hito, el viaje a la Luna dejó de ser una quimera literaria y se redujo a un problema estricto de dinámica clásica: imprimir a un vehículo una energía cinética inicial suficiente para vencer el potencial gravitatorio de la Tierra.',
      ],
      formula: 'F = G · (M_Tierra · m_Luna) / r²   ⇒   a_c = g · (R_T / r)² ≈ 0.00272 m/s²',
      visualKey: 'moon-galileo-optics',
    },
    {
      id: 'moon-cap-3',
      num: 'Capítulo III',
      title: 'De la Balística Teórica a la Dinámica de Encuentro Orbital (Siglo XX)',
      paragraphs: [
        'La solución ingenieril al problema planteado por la física newtoniana emergió a comienzos del siglo XX con el científico ruso Konstantín Tsiolkovski. Él dedujo matemáticamente que, en el vacío espacial (donde no hay sustentación aerodinámica), la única propulsión viable es la conservación del momento lineal mediante la expulsión continua de masa a alta velocidad.',
        'Para alcanzar una trayectoria de Inyección Translunar (TLI), un vehículo debe acelerar desde la órbita baja terrestre (v_LEO ≈ 7.8 km/s) hasta rozar la velocidad de escape del planeta (v_e = √(2GM_T/R_T) ≈ 10.9 km/s). Durante el diseño del Programa Apolo en la década de 1960, frente a la fuerza bruta del Ascenso Directo, triunfó la elegante solución de la mecánica orbital defendida por el ingeniero John Houbolt: el Encuentro en Órbita Lunar (LOR).',
        'Esta estrategia permitió reducir drásticamente la masa total al lanzar un vehículo fraccionado. Solo un módulo ultraligero diseñado exclusivamente para operar en el vacío —el Módulo Lunar (LM)— descendería a la superficie, mientras el Módulo de Mando y Servicio (CSM) aguardaba en órbita selenocéntrica. Todo este conjunto fue impulsado por el vector Saturno V, capaz de generar 34.5 MN de empuje en el despegue e inyectar 48.6 toneladas de carga útil hacia la Luna.',
      ],
      formula: 'Δv = v_e · ln(m_0 / m_f)   |   v_TLI ≈ 10.9 km/s',
      visualKey: 'moon-saturnv-lor',
    },
    {
      id: 'moon-cap-4',
      num: 'Capítulo IV',
      title: 'El Alunizaje y el Nacimiento de la Selenología Empírica (1969 – Presente)',
      paragraphs: [
        'El 20 de julio de 1969, la teoría acumulada durante siglos se materializó en praxis. Guiado por el algoritmo computacional del Apollo Guidance Computer (AGC) y los retornos de un radar Doppler de descenso, el módulo Eagle comandado por Neil Armstrong y Buzz Aldrin aterrizó con éxito sobre las llanuras basálticas del Mare Tranquillitatis.',
        'Entre 1969 y 1972, las seis misiones del programa Apolo que lograron posarse sobre la Luna transformaron la astronomía en una ciencia de campo. Los astronautas desplegaron las estaciones geofísicas ALSEP (sismómetros y magnetómetros) y matrices de retrorreflectores láser que permiten medir, hasta el día de hoy, la recesión secular de la Luna frente a la Tierra (~3.8 cm/año) por disipación mareal.',
        'El análisis isotópico, geoquímico y petrográfico de los 382 kg de regolito, brechas de impacto y anortositas traídas a la Tierra resolvió el mayor enigma planetario mediante la validación de la Hipótesis del Gran Impacto: la Luna se acretó a partir de los escombros generados por la colisión oblicua entre la proto-Tierra y un protoplaneta del tamaño de Marte (Theia) hace aproximadamente 4.510 millones de años.',
      ],
      formula: 'Recesión mareal Tierra–Luna: dr/dt ≈ +3.82 ± 0.07 cm/año',
      visualKey: 'moon-eagle-alsep',
    },
  ],
  conclusion:
    'La llegada a la Luna representa el triunfo inobjetable del racionalismo humano y el método científico. El polvo lunar levantado por las botas del Apolo 11 en 1969 fue el último eslabón de una cadena causal que comenzó cuando los primeros astrónomos sumerios grabaron ciclos celestes en tablillas de arcilla. Hoy, en el umbral del siglo XXI y con la mirada puesta en el polo sur selenita a través del programa Artemis, la humanidad regresa a la Luna, no ya como meta final, sino como el primer puerto de la vasta geografía interplanetaria.',
};

const MARS_THESIS_EN: ThesisDocument = {
  variant: 'mars',
  kicker: 'University-Level Academic Thesis · Areology & Interplanetary Dynamics',
  title: 'The Conquest of Mars',
  subtitle:
    'From Tycho Brahe’s Ephemerides and Kepler’s Ellipses to Robotic Astrobiology, Hohmann Transfers, and Sustainable Settlement of the Red Planet.',
  abstract:
    'Mars has historically served as the great catalyst of celestial mechanics and the definitive horizon of human interplanetary expansion. This thesis analyzes the epistemological and technological trajectory linking observations of Martian retrograde motion in Antiquity and the Renaissance with contemporary robotic missions and crewed mission engineering. It examines how Mars’s orbital eccentricity enabled Johannes Kepler to overturn the circular dogma in 1609, how Walter Hohmann’s astrodynamics defined heliocentric transit windows every 26 months, and how rover geochemistry in Jezero Crater alongside in-situ propellant production (ISRU) paves the way for human arrival on Mars.',
  metrics: [
    { value: '225M km', label: 'Mean Earth–Mars distance (54.6M km minimum at perihelic opposition)' },
    { value: '780 days', label: 'Synodic period (~26 months) between orbital transfer windows' },
    { value: '3.72 m/s²', label: 'Martian surface gravity (0.379 Earth g)' },
    { value: '259 days', label: 'Typical flight time along a Hohmann transfer ellipse' },
  ],
  chapters: [
    {
      id: 'mars-cap-1',
      num: 'Chapter I',
      title: 'The Wandering Star: From Retrograde Loops to Kepler’s Ellipse and Cassini’s Parallax',
      paragraphs: [
        'From Babylonian star catalogs (where it was revered as Nergal) to Ptolemy’s Almagest, Mars baffled astronomers with its pronounced apparent retrograde loop across the sky every 780 days. Precisely the stubborn refusal of the Martian orbit to fit within circular epicycles propelled the modern scientific revolution.',
        'Building on the arcminute-precision positional observations compiled by Tycho Brahe at Uraniborg, Johannes Kepler discovered after years of calculation (Astronomia Nova, 1609) that Mars’s orbit possesses a significant eccentricity (e ≈ 0.0934), thereby formulating the First and Second Laws of planetary motion.',
        'With the arrival of the telescope in the 17th century, Christiaan Huygens sketched the first Martian surface albedo feature (Syrtis Major) in 1659 and determined its rotation period to be ~24 hours and 37 minutes. Shortly thereafter, in 1672, Giovanni Domenico Cassini and Jean Richer simultaneously measured Mars’s parallax from Paris and Cayenne, calibrating for the first time in history the true distance from Earth to the Sun (the Astronomical Unit).',
      ],
      formula: 'r(θ) = a · (1 - e²) / (1 + e · cos θ)   |   e_Mars ≈ 0.0934',
      visualKey: 'mars-kepler-tycho',
    },
    {
      id: 'mars-cap-2',
      num: 'Chapter II',
      title: 'Heliocentric Astrodynamics: The Hohmann Transfer Ellipse',
      paragraphs: [
        'Unlike the Moon—which remains bound inside Earth’s gravitational well—traveling to Mars requires escaping Earth’s sphere of influence and entering a heliocentric orbit. In 1925, German engineer Walter Hohmann proved that the most energy-efficient trajectory between two coplanar planetary orbits is a bitangent semi-ellipse whose perihelion coincides with Earth (r_1 = 1.00 AU) and aphelion with Mars (r_2 = 1.524 AU).',
        'Injecting a spacecraft onto this Trans-Mars Injection (TMI) trajectory requires an impulse of Δv_TMI ≈ 3.6 km/s from low Earth orbit, followed by a capture or aerobraking Δv upon arriving at Mars after approximately 210 to 259 days of interplanetary cruise.',
        'Because of the relative motion of both planets around the Sun, the exact geometric alignment required for launch (with Mars positioned roughly 44° ahead of Earth) recurs only once every 780-day synodic period (26 months), governing the entire logistics architecture of Martian campaigns.',
      ],
      formula: 'a_trans = (r_E + r_M) / 2 = 1.262 AU   ⇒   T_flight = π · √(a_trans³ / μ_Sun) ≈ 259 days',
      visualKey: 'mars-hohmann-transfer',
    },
    {
      id: 'mars-cap-3',
      num: 'Chapter III',
      title: 'Empirical Areology: Orbiters, Viking, and Rovers in Jezero Crater',
      paragraphs: [
        'In-situ exploration began with the Mariner 4 flyby (1965) and Mariner 9’s orbital insertion (1971), which unveiled a geologically colossal world dominated by the shield volcano Olympus Mons (21.9 km altitude) and the tectonic canyon system Valles Marineris (4,000 km long). In 1976, the Viking 1 and 2 landers achieved the first successful soft touchdowns on Chryse and Utopia Planitia.',
        'In the 21st century, the Spirit, Opportunity, Curiosity (Gale Crater, 2012), and Perseverance rovers alongside the coaxial helicopter Ingenuity (Jezero Crater, 2021) transformed Martian geology. Using laser spectrometers (SuperCam), X-ray diffraction, and core drilling, they confirmed that during the Noachian epoch (~3.8 billion years ago) Mars sustained a dense atmosphere, flowing rivers, lacustrine deltas, and clay minerals (phyllosilicates) conducive to preserving biosignatures.',
      ],
      formula: 'Mean surface pressure: P_0 ≈ 6.1 mbar (95.3% CO₂, 2.6% N₂, 1.9% Ar)',
      visualKey: 'mars-jezero-perseverance',
    },
    {
      id: 'mars-cap-4',
      num: 'Chapter IV',
      title: 'Crewed Mission Engineering: EDL, Radiation, and ISRU (Sabatier Reaction)',
      paragraphs: [
        'Landing human missions on Mars (with payloads of 20 to 100 metric tons) confronts the Entry, Descent, and Landing (EDL) challenge: the Martian atmosphere is a hundred times thinner than Earth’s—dense enough to generate 1,600 °C plasmas during hypersonic entry, yet too tenuous to decelerate massive landers by parachute alone—demanding ablative heat shields and supersonic retropropulsion.',
        'The key to making human return viable lies in In-Situ Resource Utilization (ISRU). Rather than hauling return propellant from Earth, surface chemical plants will harvest atmospheric carbon dioxide (CO₂) and subsurface water ice (H₂O) to synthesize liquid methane (CH₄) and liquid oxygen (LOX) through the catalytic Sabatier process and solid-oxide electrolysis (validated by the MOXIE experiment aboard Perseverance).',
      ],
      formula: 'Sabatier Reaction: CO₂ + 4 H₂ → CH₄ + 2 H₂O   (ΔH = -165 kJ/mol)',
      visualKey: 'mars-isru-sabatier',
    },
  ],
  conclusion:
    'If the Moon served as the proving ground where humanity learned to navigate beyond its gravitational cradle, Mars represents the transition toward a genuinely multiplanetary species. From Kepler’s manual calculations over Tycho Brahe’s tables to autonomous landing algorithms inside Jezero Crater, the conquest of Mars synthesizes four centuries of orbital physics, thermodynamics, and planetary engineering.',
};

const MARS_THESIS_ES: ThesisDocument = {
  variant: 'mars',
  kicker: 'Tesis Académica de Nivel Universitario · Areología y Dinámica Interplanetaria',
  title: 'La Conquista de Marte',
  subtitle:
    'De las Efemérides de Tycho Brahe y las Elipses de Kepler a la Astrobiología Robótica, las Transferencias de Hohmann y la Colonización Sostenible del Planeta Rojo.',
  abstract:
    'Marte ha operado históricamente como el gran catalizador de la mecánica celeste y el horizonte definitivo de la expansión interplanetaria humana. La presente tesis analiza el recorrido epistemológico y tecnológico que vincula las observaciones del movimiento retrógrado marciano en la antigüedad y el Renacimiento con las misiones robóticas contemporáneas y la ingeniería de misiones tripuladas. Se examina cómo la excentricidad orbital marciana permitió a Johannes Kepler derribar el dogma circular en 1609, cómo la astrodinámica de Walter Hohmann definió las ventanas de tránsito heliocéntrico cada 26 meses y de qué modo la geoquímica de los rovers en el Cráter Jezero y la producción in situ de propelentes (ISRU) pavimentan el arribo del ser humano a Marte.',
  metrics: [
    { value: '225M km', label: 'Distancia media Tierra–Marte (mínima de 54.6M km en oposición perihelia)' },
    { value: '780 días', label: 'Período sinódico (~26 meses) entre ventanas de transferencia orbital' },
    { value: '3.72 m/s²', label: 'Gravedad superficial marciana (0.379 g terrestres)' },
    { value: '259 días', label: 'Tiempo típico de vuelo en una elipse de transferencia de Hohmann' },
  ],
  chapters: [
    {
      id: 'mars-cap-1',
      num: 'Capítulo I',
      title: 'El Astro Errante: Del Bucle Retrógrado a la Elipse de Kepler y la Paralaje de Cassini',
      paragraphs: [
        'Desde los catálogos babilónicos (donde era venerado como Nergal) hasta el Almagesto de Ptolomeo, Marte desconcertó a los astrónomos por su pronunciado bucle de retrogradación aparente en el cielo cada 780 días. Fue precisamente la resistencia de la órbita marciana a encajar en epiciclos circulares lo que impulsó la revolución científica moderna.',
        'A partir de las observaciones posicionales de arco de minuto recopiladas por Tycho Brahe en Uraniborg, Johannes Kepler descubrió tras años de cálculo (Astronomia Nova, 1609) que la órbita de Marte tiene una excentricidad significativa (e ≈ 0.0934), formulando así la Primera y Segunda Ley del movimiento planetario.',
        'Con la llegada del telescopio en el siglo XVII, Christiaan Huygens dibujó en 1659 la primera característica de albedo superficial marciana (Syrtis Major) y determinó su período de rotación en ~24 horas y 37 minutos. Poco después, en 1672, Giovanni Domenico Cassini y Jean Richer midieron la paralaje de Marte simultáneamente desde París y Cayena, logrando calibrar por primera vez en la historia la distancia real de la Tierra al Sol (la Unidad Astronómica).',
      ],
      formula: 'r(θ) = a · (1 - e²) / (1 + e · cos θ)   |   e_Marte ≈ 0.0934',
      visualKey: 'mars-kepler-tycho',
    },
    {
      id: 'mars-cap-2',
      num: 'Capítulo II',
      title: 'Astrodinámica Heliocéntrica: La Elipse de Transferencia de Hohmann',
      paragraphs: [
        'A diferencia de la Luna —que permanece ligada al pozo gravitatorio terrestre—, viajar a Marte exige escapar de la esfera de influencia de la Tierra e ingresar en una órbita heliocéntrica. En 1925, el ingeniero alemán Walter Hohmann demostró que la trayectoria energéticamente más eficiente entre dos órbitas planetarias coplanares es una semielipse bitangente cuyo perihelio coincide con la Tierra (r_1 = 1.00 UA) y su afelio con Marte (r_2 = 1.524 UA).',
        'Para inyectar una nave en esta trayectoria de Inyección Transmarciana (TMI), se requiere un impulso Δv_TMI ≈ 3.6 km/s desde la órbita baja terrestre, sumado a un Δv de captura o aerofrenado al arribar a Marte tras unos 210 a 259 días de crucero interplanetario.',
        'Debido al movimiento relativo de ambos planetas alrededor del Sol, la configuración geométrica precisa para el lanzamiento (con Marte situado unos 44° por delante de la Tierra) se repite únicamente una vez cada período sinódico de 780 días (26 meses), condicionando toda la arquitectura logística de las campañas marcianas.',
      ],
      formula: 'a_trans = (r_T + r_M) / 2 = 1.262 UA   ⇒   T_vuelo = π · √(a_trans³ / μ_Sol) ≈ 259 días',
      visualKey: 'mars-hohmann-transfer',
    },
    {
      id: 'mars-cap-3',
      num: 'Capítulo III',
      title: 'Areología Empírica: Orbitadores, Viking y Rovers en el Cráter Jezero',
      paragraphs: [
        'La exploración in situ comenzó con el sobrevuelo del Mariner 4 (1965) y la entrada en órbita del Mariner 9 (1971), que reveló un mundo geológicamente colosal dominado por el volcán escudo Olympus Mons (21.9 km de altitud) y el sistema de cañones tectónicos Valles Marineris (4.000 km de longitud). En 1976, los módulos Viking 1 y 2 ejecutaron los primeros aterrizajes suaves exitosos sobre Chryse y Utopia Planitia.',
        'En el siglo XXI, los rovers Spirit, Opportunity, Curiosity (Cráter Gale, 2012) y Perseverance junto al helicóptero coaxial Ingenuity (Cráter Jezero, 2021) transformaron la geología marciana. Mediante espectrómetros láser (SuperCam), difracción de rayos X y perforación de núcleos, confirmaron que durante el período Noéico (hace ~3.800 millones de años) Marte poseyó una atmósfera densa, ríos caudalosos, deltas lacustres y minerales arcillosos (filosilicatos) propicios para la preservación de biosignaturas.',
      ],
      formula: 'Presión superficial media: P_0 ≈ 6.1 mbar (95.3% CO₂, 2.6% N₂, 1.9% Ar)',
      visualKey: 'mars-jezero-perseverance',
    },
    {
      id: 'mars-cap-4',
      num: 'Capítulo IV',
      title: 'Ingeniería de Misiones Tripuladas: EDL, Radiación e ISRU (Reacción de Sabatier)',
      paragraphs: [
        'El descenso de misiones humanas sobre Marte (con cargas útiles de 20 a 100 toneladas) enfrenta el denominado desafío de Entrada, Descenso y Aterrizaje (EDL): la atmósfera marciana es cien veces menos densa que la terrestre —suficiente para generar plasmas de 1.600 °C durante la entrada hipersónica, pero insuficiente para frenar grandes masas solo con paracaídas—, lo que exige escudos térmicos ablativos y retropropulsión supersónica.',
        'La clave para hacer viable el retorno humano reside en la Utilización de Recursos In Situ (ISRU). En lugar de transportar desde la Tierra el combustible de regreso, las plantas químicas en superficie extraerán dióxido de carbono atmosférico (CO₂) y hielo de agua subsuperficial (H₂O) para sintetizar metano líquido (CH₄) y oxígeno líquido (LOX) mediante el proceso catalítico de Sabatier y la electrólisis de óxido sólido (validada por el experimento MOXIE a bordo de Perseverance).',
      ],
      formula: 'Reacción de Sabatier: CO₂ + 4 H₂ → CH₄ + 2 H₂O   (ΔH = -165 kJ/mol)',
      visualKey: 'mars-isru-sabatier',
    },
  ],
  conclusion:
    'Si la Luna fue el banco de pruebas donde la humanidad aprendió a navegar fuera de su cuna gravitatoria, Marte representa la transición hacia una especie verdaderamente multiplanetaria. Desde los cálculos manuales de Kepler sobre las tablas de Tycho Brahe hasta los algoritmos autónomos de aterrizaje en el Cráter Jezero, la conquista de Marte sintetiza cuatro siglos de física orbital, termodinámica e ingeniería planetaria.',
};

const MARS_EXPLORATION_EN: MarsPhase[] = [
  {
    id: 'marte-observacion',
    slug: 'marte-i',
    tabLabel: 'Mars I',
    title: 'Mars I · Observation & Orbit',
    kicker: 'Conquest of Mars · Phase I',
    heading: 'From Ancient Ephemerides to Telescopic Cartography',
    subtitle: 'The enigma of retrograde motion, Kepler’s ellipse, and the first albedo maps of the Red Planet.',
    description:
      'Positional study of Mars revealed the elliptical nature of planetary orbits and enabled humanity to measure the true scale of the Solar System for the first time.',
    accent: '#fbbf24',
    tags: ['Kepler’s Laws', 'Cassini’s Parallax', 'Syrtis Major'],
    metrics: [
      { value: '1609', label: 'Astronomia Nova by Johannes Kepler' },
      { value: '24h 39m 35s', label: 'Duration of a Martian solar day (Sol)' },
      { value: '1672', label: 'First measurement of Earth–Mars distance' },
    ],
    sections: [
      {
        id: 'm1-kepler',
        title: 'The Mars Problem and Kepler’s Laws (1609)',
        body: 'Assigned by Tycho Brahe to study the orbit of Mars, Johannes Kepler discovered that no combination of circles could account for an 8-arcminute discrepancy in observations. By replacing the circle with an ellipse with the Sun at one focus, Kepler inaugurated modern astrodynamics.',
        visualKey: 'mars-i-kepler-retrograde',
        highlights: ['Eccentricity e = 0.0934', '8′ arc discrepancy', '1st & 2nd Laws of Kepler'],
      },
      {
        id: 'm1-huygens-cassini',
        title: '17th-Century Telescopes: Huygens and Cassini',
        body: 'In 1659 Christiaan Huygens observed the dark albedo feature Syrtis Major and deduced that Mars rotates in just over 24 hours. In 1666 Cassini identified the Martian polar ice caps, and in 1672 he triangulated Mars’s parallax alongside Jean Richer, establishing the true dimensions of the Solar System.',
        visualKey: 'mars-i-huygens-parallax',
        highlights: ['Syrtis Major (1659)', 'Paris–Cayenne Triangulation', 'Calibration of 1 AU'],
      },
      {
        id: 'm1-1877',
        title: 'The Great Opposition of 1877: Phobos, Deimos, and Cartography',
        body: 'During the perihelic opposition of 1877, Asaph Hall discovered Mars’s two captured moons—Phobos and Deimos—from the U.S. Naval Observatory. That same year, Giovanni Schiaparelli produced his celebrated areographic nomenclature map (Mare Erythraeum, Hellas, Elysium, Tharsis), still in use in planetary cartography today.',
        visualKey: 'mars-i-phobos-deimos',
        highlights: ['Phobos · Stickney Crater', 'Deimos · 23,463 km', 'Schiaparelli Toponymy'],
      },
    ],
    quote: {
      text: 'By the study of the orbit of Mars we must either arrive at the secrets of astronomy or forever remain in ignorance of them.',
      author: 'Johannes Kepler, Astronomia Nova (1609)',
    },
  },
  {
    id: 'marte-sondas-rovers',
    slug: 'marte-ii',
    tabLabel: 'Mars II',
    title: 'Mars II · Probes & Rovers',
    kicker: 'Conquest of Mars · Phase II',
    heading: 'Orbital Reconnaissance and Robotic Surface Laboratories',
    subtitle: 'From Mariner 4’s first flyby to the landings of Viking, Curiosity, Perseverance, and Ingenuity.',
    description:
      'Automated spacecraft and geological rovers proved that Mars had a warm, wet past featuring lakes, rivers, and conditions suitable for microbial habitability.',
    accent: '#fb923c',
    tags: ['Mariner 9', 'Viking Program', 'Jezero Crater'],
    metrics: [
      { value: '21.9 km', label: 'Elevation of the shield volcano Olympus Mons' },
      { value: '1976', label: 'First soft landings (Viking 1 & 2)' },
      { value: '72 flights', label: 'Sorties completed by the Ingenuity helicopter' },
    ],
    sections: [
      {
        id: 'm2-mariner',
        title: 'Mariner 4, Mariner 9, and the Discovery of Geological Mars',
        body: 'On July 15, 1965, Mariner 4 transmitted the first 21 close-up images of Mars. In November 1971, Mariner 9 became the first Martian orbiter and mapped 85% of the planet, revealing the colossal Valles Marineris canyon, the Tharsis volcanoes, and ancient riverbeds.',
        visualKey: 'mars-ii-mariner-canyons',
        highlights: ['Mariner 4 (1965)', 'Olympus Mons (21.9 km)', 'Valles Marineris (4,000 km)'],
      },
      {
        id: 'm2-viking-pathfinder',
        title: 'Viking 1 & 2 and the Return with Mars Pathfinder (1976–1997)',
        body: 'In 1976 the Viking landers analyzed Martian soil for the first time using gas chromatographs and transmitted surface panoramas. Two decades later, in 1997, Mars Pathfinder deployed the compact Sojourner rover, inaugurating the era of mobile exploration on another planet.',
        visualKey: 'mars-vikings',
        highlights: ['Chryse & Utopia Planitia', 'GC-MS Chromatography', 'Sojourner Rover (1997)'],
      },
      {
        id: 'm2-rovers-modernos',
        title: 'Spirit, Opportunity, Curiosity, and Perseverance (2004–Present)',
        body: 'Twin rovers Spirit and Opportunity confirmed the presence of hematite and evaporites formed in liquid water. Later, Curiosity (2012) in Gale Crater and Perseverance (2021) on Jezero Crater’s ancient delta uncovered complex organic molecules, while the Ingenuity helicopter achieved the first powered, controlled flight in an extraterrestrial atmosphere.',
        visualKey: 'mars-perseverance-ingenuity',
        highlights: ['Sky Crane & Rocker-Bogie', 'Gale & Jezero Craters', 'Ingenuity (2,400 RPM)'],
      },
    ],
    quote: {
      text: 'Mars is the only known planet inhabited entirely by scientific robots sent by humanity.',
      author: 'Jet Propulsion Laboratory (JPL / NASA)',
    },
  },
  {
    id: 'marte-arquitectura-humana',
    slug: 'marte-iii',
    tabLabel: 'Mars III',
    title: 'Mars III · Human Missions & ISRU',
    kicker: 'Conquest of Mars · Phase III',
    heading: 'Super Heavy Launchers, ISRU, Lava Tubes, and Human–AI Operations',
    subtitle:
      'Crewed interplanetary transfers, in-situ chemical propellant synthesis, subterranean shelters, and autonomous surface robotics.',
    description:
      '21st-century human exploration architecture integrates reusable rockets, Sabatier plants, lava-tube shielding, and coordinated human–AI surface operations (Tango Horizon · 2026).',
    accent: '#fb7185',
    tags: ['Hohmann Transfer', 'Sabatier Reaction', 'Tango Horizon · 2026'],
    metrics: [
      { value: '~100 t', label: 'Surface payload delivery capacity per mission' },
      { value: 'CH₄ / LOX', label: 'Propellant synthesized on Mars (Methane & Oxygen)' },
      { value: '6 to 9 mo', label: 'Earth–Mars interplanetary transit duration' },
    ],
    sections: [
      {
        id: 'm3-edl',
        title: 'Reusable Launchers, EDL, and In-Orbit Refueling',
        body: 'To transport habitats, power reactors, and chemical plants to Mars, modern aerospace engineering employs stainless-steel super-heavy vehicles powered by full-flow staged-combustion engines (liquid methane and oxygen). Cryogenic propellant transfer in low Earth orbit resets the Tsiolkovsky rocket equation with full tanks prior to Trans-Mars Injection and 1,600 °C hypersonic EDL.',
        visualKey: 'mars-iii-edl-hypersonic',
        highlights: ['1,600 °C Aerobraking', 'Supersonic Retropropulsion', 'LEO Refueling'],
      },
      {
        id: 'm3-isru',
        title: 'In-Situ Resource Utilization (ISRU): Water, Oxygen, and Methane',
        body: 'The MOXIE experiment aboard Perseverance demonstrated pure oxygen production via electrolysis of Martian CO₂. At human scale, combining subsurface glacial ice with atmospheric CO₂ inside catalytic Sabatier reactors will produce both breathable oxygen and water as well as the hundreds of tons of liquid methane and oxygen needed for the return voyage to Earth.',
        visualKey: 'mars-iii-isru-sabatier',
        highlights: ['MOXIE Electrolysis', 'Sabatier Reactor (400 °C)', 'Subsurface H₂O Ice'],
      },
      {
        id: 'm3-tango-horizon',
        title: 'Lava Tubes, Autonomous Robotics, and Human–AI Operations (Tango Horizon · 2026)',
        body: 'Because Mars lacks an intrinsic global magnetosphere and holds a tenuous 6.1 mbar atmosphere, advanced settlements pair sintered-regolith domes with shelters inside volcanic skylights and subsurface lava tubes that attenuate galactic cosmic rays (~250 mSv/year) and electrostatic dust. Across this frontier operates the next generation of autonomous surface robotics, subterranean speleological reconnaissance, and AI-assisted EVA support championed by Tango Horizon · 2026.',
        visualKey: 'mars-terraforming-horizon',
        highlights: ['Skylights & Lava Tubes', 'Autonomous Surface Robotics', 'Human–AI EVA · Tango Horizon'],
      },
    ],
    quote: {
      text: 'When we gaze up at the night sky, Mars will cease to be a wandering point of light and become a second home.',
      author: 'Interplanetary Exploration Outlook (21st Century)',
    },
  },
];

const MARS_EXPLORATION_ES: MarsPhase[] = [
  {
    id: 'marte-observacion',
    slug: 'marte-i',
    tabLabel: 'Marte I',
    title: 'Marte I · Observación y Órbita',
    kicker: 'Conquista de Marte · Fase I',
    heading: 'De las Efemérides Antiguas a la Cartografía Telescópica',
    subtitle: 'El enigma del movimiento retrógrado, la elipse de Kepler y los primeros mapas de albedo del Planeta Rojo.',
    description:
      'El estudio posicional de Marte permitió descubrir la naturaleza elíptica de las órbitas planetarias y medir por primera vez la escala real del Sistema Solar.',
    accent: '#fbbf24',
    tags: ['Leyes de Kepler', 'Paralaje de Cassini', 'Syrtis Major'],
    metrics: [
      { value: '1609', label: 'Astronomia Nova de Johannes Kepler' },
      { value: '24h 39m 35s', label: 'Duración del día solar marciano (Sol)' },
      { value: '1672', label: 'Primera medición de la distancia Tierra–Marte' },
    ],
    sections: [
      {
        id: 'm1-kepler',
        title: 'El Problema de Marte y las Leyes de Kepler (1609)',
        body: 'Asignado por Tycho Brahe al estudio de la órbita de Marte, Johannes Kepler descubrió que ninguna combinación de círculos explicaba una discrepancia de 8 minutos de arco en las observaciones. Al sustituir el círculo por una elipse con el Sol en uno de sus focos, Kepler inauguró la astrodinámica moderna.',
        visualKey: 'mars-i-kepler-retrograde',
        highlights: ['Excentricidad e = 0.0934', 'Discrepancia de 8′ de arco', '1.ª y 2.ª Ley de Kepler'],
      },
      {
        id: 'm1-huygens-cassini',
        title: 'Telescopios del Siglo XVII: Huygens y Cassini',
        body: 'En 1659 Christiaan Huygens observó la mancha oscura de Syrtis Major y dedujo que Marte rota en poco más de 24 horas. En 1666 Cassini identificó los casquetes polares marcianos y en 1672 trianguló su paralaje junto a Jean Richer, estableciendo las dimensiones del Sistema Solar.',
        visualKey: 'mars-i-huygens-parallax',
        highlights: ['Syrtis Major (1659)', 'Triangulación París–Cayena', 'Calibración de 1 UA'],
      },
      {
        id: 'm1-1877',
        title: 'La Gran Oposición de 1877: Fobos, Deimos y la Cartografía',
        body: 'Durante la oposición perihelia de 1877, Asaph Hall descubrió desde el Observatorio Naval de EE. UU. los dos satélites capturados de Marte: Fobos y Deimos. Ese mismo año, Giovanni Schiaparelli elaboró su célebre mapa de nomenclatura areográfica (Mare Erythraeum, Hellas, Elysium, Tharsis) que aún empleamos en la cartografía planetaria actual.',
        visualKey: 'mars-i-phobos-deimos',
        highlights: ['Fobos · Cráter Stickney', 'Deimos · 23,463 km', 'Toponimia de Schiaparelli'],
      },
    ],
    quote: {
      text: 'Por el estudio de la órbita de Marte debemos alcanzar los secretos de la astronomía, o permanecer para siempre en la ignorancia.',
      author: 'Johannes Kepler, Astronomia Nova (1609)',
    },
  },
  {
    id: 'marte-sondas-rovers',
    slug: 'marte-ii',
    tabLabel: 'Marte II',
    title: 'Marte II · Sondas y Rovers',
    kicker: 'Conquista de Marte · Fase II',
    heading: 'Reconocimiento Orbital y Laboratorios Robóticos en Superficie',
    subtitle: 'Desde el primer sobrevuelo del Mariner 4 hasta los aterrizajes de Viking, Curiosity, Perseverance e Ingenuity.',
    description:
      'Las sondas automáticas y los rovers geológicos demostraron que Marte tuvo un pasado cálido y húmedo con lagos, ríos y condiciones de habitabilidad microbiana.',
    accent: '#fb923c',
    tags: ['Mariner 9', 'Programa Viking', 'Cráter Jezero'],
    metrics: [
      { value: '21.9 km', label: 'Altitud del volcán escudo Olympus Mons' },
      { value: '1976', label: 'Primeros aterrizajes suaves (Viking 1 y 2)' },
      { value: '72 vuelos', label: 'Misiones completadas por el helicóptero Ingenuity' },
    ],
    sections: [
      {
        id: 'm2-mariner',
        title: 'Mariner 4, Mariner 9 y el Descubrimiento del Marte Geológico',
        body: 'El 15 de julio de 1965, Mariner 4 transmitió las primeras 21 imágenes cercanas de Marte. En noviembre de 1971, Mariner 9 se convirtió en el primer orbitador marciano y cartografió el 85% del planeta, descubriendo el colosal cañón Valles Marineris, los volcanes de Tharsis y antiguos lechos fluviales.',
        visualKey: 'mars-ii-mariner-canyons',
        highlights: ['Mariner 4 (1965)', 'Olympus Mons (21.9 km)', 'Valles Marineris (4,000 km)'],
      },
      {
        id: 'm2-viking-pathfinder',
        title: 'Viking 1 y 2 y el Regreso con Mars Pathfinder (1976–1997)',
        body: 'En 1976 los módulos Viking analizaron por primera vez el suelo marciano con cromatógrafos de gases y transmitieron panorámicas desde la superficie. Dos décadas más tarde, en 1997, Mars Pathfinder depositó al pequeño rover Sojourner, inaugurando la era de la exploración móvil en otro planeta.',
        visualKey: 'mars-vikings',
        highlights: ['Chryse y Utopia Planitia', 'Cromatografía GC-MS', 'Rover Sojourner (1997)'],
      },
      {
        id: 'm2-rovers-modernos',
        title: 'Spirit, Opportunity, Curiosity y Perseverance (2004–Presente)',
        body: 'Los rovers gemelos Spirit y Opportunity confirmaron la presencia de hematita y evaporitas formadas en agua líquida. Posteriormente, Curiosity (2012) en el Cráter Gale y Perseverance (2021) en el antiguo delta del Cráter Jezero hallaron moléculas orgánicas complejas, mientras el helicóptero Ingenuity logró el primer vuelo propulsado y controlado en una atmósfera extraterrestre.',
        visualKey: 'mars-perseverance-ingenuity',
        highlights: ['Sky Crane & Rocker-Bogie', 'Cráter Gale y Cráter Jezero', 'Ingenuity (2,400 RPM)'],
      },
    ],
    quote: {
      text: 'Marte es el único planeta conocido habitado íntegramente por robots científicos enviados por la humanidad.',
      author: 'Laboratorio de Propulsión a Chorro (JPL / NASA)',
    },
  },
  {
    id: 'marte-arquitectura-humana',
    slug: 'marte-iii',
    tabLabel: 'Marte III',
    title: 'Marte III · Misiones Humanas e ISRU',
    kicker: 'Conquista de Marte · Fase III',
    heading: 'Lanzadores Superpesados, ISRU, Tubos de Lava y Operaciones Humano–IA',
    subtitle:
      'Transferencias interplanetarias tripuladas, síntesis química de propelentes in situ, refugios subterráneos y robótica autónoma de superficie.',
    description:
      'La arquitectura de exploración humana del siglo XXI integra cohetes reutilizables, plantas de Sabatier, protección en tubos de lava y operaciones coordinadas humano–IA en superficie (Tango Horizon · 2026).',
    accent: '#fb7185',
    tags: ['Transferencia de Hohmann', 'Reacción de Sabatier', 'Tango Horizon · 2026'],
    metrics: [
      { value: '~100 t', label: 'Capacidad de carga útil en superficie por misión' },
      { value: 'CH₄ / LOX', label: 'Propelente sintetizado en Marte (Metano y Oxígeno)' },
      { value: '6 a 9 meses', label: 'Tránsito interplanetario Tierra–Marte' },
    ],
    sections: [
      {
        id: 'm3-edl',
        title: 'Lanzadores Reutilizables, EDL y Reabastecimiento en Órbita',
        body: 'Para transportar hábitats, reactores de potencia y plantas químicas hacia Marte, la ingeniería aeroespacial contemporánea emplea vehículos superpesados de acero inoxidable propulsados por motores de combustión escalonada de flujo completo (metano y oxígeno líquido). El reabastecimiento criogénico en órbita baja terrestre permite reiniciar la ecuación de Tsiolkovski con los tanques llenos antes de la Inyección Transmarciana y afrontar la entrada hipersónica (EDL) a 1,600 °C.',
        visualKey: 'mars-iii-edl-hypersonic',
        highlights: ['Aerofrenado a 1,600 °C', 'Retropropulsión supersónica', 'Reabastecimiento LEO'],
      },
      {
        id: 'm3-isru',
        title: 'Utilización de Recursos In Situ (ISRU): Agua, Oxígeno y Metano',
        body: 'El experimento MOXIE en el rover Perseverance demostró la producción de oxígeno puro mediante electrólisis del CO₂ marciano. A escala humana, la combinación del hielo glaciar subsuperficial con el CO₂ atmosférico en reactores catalíticos de Sabatier permitirá producir tanto el agua y el oxígeno respirable como las cientos de toneladas de metano y oxígeno líquido requeridas para el viaje de retorno a la Tierra.',
        visualKey: 'mars-iii-isru-sabatier',
        highlights: ['Electrólisis MOXIE', 'Reactor Sabatier (400 °C)', 'Hielo subsuperficial H₂O'],
      },
      {
        id: 'm3-tango-horizon',
        title: 'Tubos de Lava, Robótica Autónoma y Operaciones Humano–IA (Tango Horizon · 2026)',
        body: 'Al carecer Marte de una magnetosfera global intrínseca y poseer una atmósfera tenue de 6.1 mbar, los asentamientos avanzados combinan domos de regolito sinterizado con refugios dentro de pozos y tubos de lava volcánicos subsuperficiales que atenúan los rayos cósmicos galácticos (~250 mSv/año) y el polvo electrostático. Sobre esta frontera opera la nueva generación de robótica autónoma de superficie, reconocimiento espeleológico subterráneo y soporte EVA asistido por IA que impulsa la arquitectura de Tango Horizon · 2026.',
        visualKey: 'mars-terraforming-horizon',
        highlights: ['Pozos y tubos de lava', 'Robótica autónoma en superficie', 'EVA Humano–IA · Tango Horizon'],
      },
    ],
    quote: {
      text: 'Cuando miremos el cielo nocturno, Marte dejará de ser un punto errante de luz para convertirse en un segundo hogar.',
      author: 'Prospectiva de Exploración Interplanetaria (Siglo XXI)',
    },
  },
];

export function getMoonThesisData(lang: SiteLang): ThesisDocument {
  return lang === 'es' ? MOON_THESIS_ES : MOON_THESIS_EN;
}

export function getMarsThesisData(lang: SiteLang): ThesisDocument {
  return lang === 'es' ? MARS_THESIS_ES : MARS_THESIS_EN;
}

export function getMarsExplorationPages(lang: SiteLang): MarsPhase[] {
  return lang === 'es' ? MARS_EXPLORATION_ES : MARS_EXPLORATION_EN;
}

export const MOON_THESIS_DATA: ThesisDocument = MOON_THESIS_EN;
export const MARS_THESIS_DATA: ThesisDocument = MARS_THESIS_EN;
export const MARS_EXPLORATION_PAGES: MarsPhase[] = MARS_EXPLORATION_EN;
