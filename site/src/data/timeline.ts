import type { SiteLang } from '@/context/LanguageContext';

export interface EraSection {
  id: string;
  title: string;
  subtitle?: string;
  visualType: string;
  highlight?: string;
  paragraphs: string[];
}

export interface SpaceEra {
  id: string;
  yearRange: string;
  eraTitle: string;
  subtitle: string;
  iconName: string;
  accentColor: string;
  summary: string;
  keyFigures: string[];
  detailSections: EraSection[];
}

const SPACE_TIMELINE_DATA_EN: SpaceEra[] = [
  {
    id: 'antiguedad',
    yearRange: '~3000 BCE – 2nd Century CE',
    eraTitle: 'Mythic Cosmologies, Archaeoastronomy & Geocentrism',
    subtitle:
      'The celestial vault as an architecture of time, agriculture, and geometric thought across early civilizations.',
    iconName: 'Compass',
    accentColor: '#fbbf24',
    summary:
      'Civilizations across Mesopotamia, Egypt, and Mesoamerica compiled the first systematic records of the night sky. In this pre-theoretical era, celestial cycles governed agricultural calendars, anchored cosmogonies, and served as a stellar compass, until Hellenic astronomy transformed those records into geometric geocentric models.',
    keyFigures: [
      'Chaldean Astronomers (MUL.APIN)',
      'Aristarchus of Samos',
      'Eratosthenes',
      'Hipparchus of Nicaea',
      'Claudius Ptolemy',
      'Al-Battani',
    ],
    detailSections: [
      {
        id: 'antiguedad-observacion',
        title: 'Systematic Observation and Agricultural Calendars',
        subtitle: 'Mesopotamian ziggurats, the MUL.APIN catalog, and Orion in the ancient sky',
        visualType: 'celestial-map',
        highlight: 'Saros Cycle: 223 synodic months (18 years and 11 days) to predict eclipses',
        paragraphs: [
          'From the ziggurats of Mesopotamia to the ceremonial complexes of Mesoamerica and the Nile Valley, observing the firmament constituted humanity’s first empirical science. Babylonian scribes compiled star catalogs such as the MUL.APIN and recorded eclipse periodicities on cuneiform tablets, identifying iconic constellations like Orion (SIPA.ZI.ANNA) with Betelgeuse, Rigel, and the three belt stars.',
          'By tracking lunar syzygies with arithmetic precision, Chaldean astronomers deduced the Saros cycle—a period of 223 synodic months equivalent to 18 years and 11 days—enabling them to forecast lunar and solar eclipses long before three-dimensional spatial models existed.',
        ],
      },
      {
        id: 'antiguedad-geocentrismo',
        title: 'From Babylonian Myth to the Geometric Geocentric Cosmos',
        subtitle: 'Aristarchus, Hipparchus, Ptolemy, and the perfection of the celestial sphere',
        visualType: 'geocentric-sphere',
        highlight: 'Earth–Moon distance calculated by Hipparchus: ~60 Earth radii (384,400 km)',
        paragraphs: [
          'In Hellenic antiquity, thinkers such as Aristarchus of Samos, Eratosthenes, Hipparchus of Nicaea, and Claudius Ptolemy transformed Eastern arithmetic tables into deductive geometric models. Eratosthenes’ measurement of Earth’s circumference, Aristarchus’ trigonometric distance estimates, and Hipparchus’ discovery of the precession of the equinoxes and lunar parallax laid the foundations of positional astronomy.',
          'In the 2nd century CE, Claudius Ptolemy synthesized the geocentric model in the Almagest using concentric spheres, deferents, and epicycles that placed an immobile Earth at the center of the cosmos. Later, using the astrolabe and the armillary sphere, medieval Arab astronomers such as Al-Battani and Al-Sufi refined measurements of celestial altitude, timekeeping, and maritime navigation.',
        ],
      },
      {
        id: 'antiguedad-egipto-mesoamerica',
        title: 'Egypt, Mesoamerica, and the Sky as a Calendar',
        subtitle: 'The heliacal rising of Sirius (Sopdet) and the synodic cycle of Venus',
        visualType: 'sirius-calendar',
        highlight: 'Egyptian Sothic year of 365.25 days and Mayan Venus synodic cycle (584 days)',
        paragraphs: [
          'In Ancient Egypt, architects aligned pyramids and temples with circumpolar stars and anchored their 365-day civil calendar to the heliacal rising of Sirius (Sopdet), whose pre-dawn reappearance heralded the annual flooding of the Nile.',
          'Across the ocean, Mayan astronomy achieved remarkable mathematical accuracy by calculating the synodic cycle of Venus at 584 days and recording eclipse prediction tables in the Dresden Codex, while observatories such as El Caracol at Chichén Itzá marked solstices and equinoxes. Without optical aid, these cultures built a precision science rooted in centuries of accumulated observation.',
        ],
      },
    ],
  },
  {
    id: 'revolucion-copernicana',
    yearRange: '1543 – 1610',
    eraTitle: 'Copernican Revolution and Telescopic Evidence',
    subtitle:
      'The heliocentric shift and the invention of the astronomical telescope dismantle fourteen centuries of geocentric dogma.',
    iconName: 'Sun',
    accentColor: '#fb923c',
    summary:
      'The rupture initiated by Nicolaus Copernicus—placing the Sun at the center of the planetary system—together with Galileo Galilei’s refracting telescope transformed celestial bodies from immutable metaphysical entities into physical worlds open to measurement and cartography.',
    keyFigures: ['Nicolaus Copernicus', 'Tycho Brahe', 'Galileo Galilei'],
    detailSections: [
      {
        id: 'copernico-giro',
        title: 'Copernicus and the Heliocentric Shift (1543)',
        subtitle: 'De revolutionibus orbium coelestium and the ordering of planetary orbits',
        visualType: 'copernicus',
        highlight: 'Retrograde planetary motion explained as an orbital perspective effect',
        paragraphs: [
          'In De revolutionibus orbium coelestium (1543), Nicolaus Copernicus proposed placing the Sun at the center of the planetary system and assigning Earth a dual motion: daily rotation on its axis and annual revolution around the Sun.',
          'This model naturally explained the apparent retrograde motion of planets like Mars and ordered the orbits by their orbital period. Although Copernicus still retained perfect circular paths and auxiliary epicycles, his work represented the first structural break with the Aristotelian-Ptolemaic paradigm that had stood for fourteen centuries.',
        ],
      },
      {
        id: 'galileo-telescopio',
        title: 'Galileo Galilei and Instrumental Evidence (1609–1610)',
        subtitle: 'Sidereus Nuncius: lunar mountains, phases of Venus, and moons of Jupiter',
        visualType: 'galileo-jupiter',
        highlight: 'Io, Europa, Ganymede, and Callisto: empirical proof of multiple orbital centers',
        paragraphs: [
          'By refining the refracting telescope and turning it skyward in 1609, Galileo Galilei inaugurated modern observational astronomy. Geometric analysis of shadows along the lunar terminator revealed rugged mountain ranges and deep craters, refuting the Aristotelian notion of a smooth, incorruptible Moon made of pure ether.',
          'In the pages of Sidereus Nuncius (1610), Galileo documented the discovery of four moons orbiting Jupiter—Io, Europa, Ganymede, and Callisto—as well as the full phases of Venus. These observations proved beyond doubt that not all celestial bodies revolve around Earth.',
        ],
      },
    ],
  },
  {
    id: 'gravitacion-orbital',
    yearRange: '1609 – 1687',
    eraTitle: 'Universal Gravitation and Orbital Physics',
    subtitle:
      'Kepler’s elliptical laws and Newton’s gravitational synthesis unify terrestrial and celestial mechanics.',
    iconName: 'Orbit',
    accentColor: '#fdba74',
    summary:
      'Working from the arc-minute observations of Mars’s eccentric orbit compiled by Tycho Brahe, Johannes Kepler formulated the three laws of planetary motion. In 1687, Isaac Newton derived those laws from a single principle—universal gravitation—founding the classical mechanics used to compute every spacecraft trajectory.',
    keyFigures: ['Tycho Brahe', 'Johannes Kepler', 'Isaac Newton'],
    detailSections: [
      {
        id: 'kepler-elipses',
        title: 'Kepler’s Elliptical Orbits (1609–1619)',
        subtitle: 'Astronomia Nova, Martian eccentricity, and the three laws of motion',
        visualType: 'kepler-ellipse',
        highlight: 'First Law (ellipses), Second Law (equal areas), and Third Law (T² ∝ a³)',
        paragraphs: [
          'Tasked by Tycho Brahe with resolving the positional anomalies of Mars, Johannes Kepler proved that no combination of circles could account for an eight-arc-minute discrepancy in the Uraniborg tables. Abandoning circular dogma, he discovered in Astronomia Nova (1609) that planets trace ellipses with the Sun at one focus.',
          'Kepler completed Solar System kinematics with his second law—the planet–Sun radius vector sweeps out equal areas in equal times—and his third law (Harmonices Mundi, 1619), linking the square of the orbital period to the cube of the semi-major axis (T² ∝ a³).',
        ],
      },
      {
        id: 'newton-principia',
        title: 'Newton’s Synthesis: Universal Gravitation (1687)',
        subtitle: 'Principia Mathematica and the universal mathematization of free fall and orbits',
        visualType: 'newton-apple',
        highlight: 'F = G · M · m / r²  ⇒  Terrestrial free fall and the lunar orbit obey the same law',
        paragraphs: [
          'In Philosophiae Naturalis Principia Mathematica (1687), Isaac Newton demonstrated that the force pulling a body toward the ground is identical to the centripetal acceleration keeping the Moon in orbit around Earth, expressed by the inverse-square law: F = G·M·m/r².',
          'Through infinitesimal calculus and his three laws of motion, Newton mathematically derived Kepler’s empirical laws and unified terrestrial and celestial physics. From that moment on, leaving Earth ceased to be literary speculation and became a solvable problem of ballistics and orbital dynamics.',
        ],
      },
    ],
  },
  {
    id: 'carrera-espacial',
    yearRange: '1903 – 1998',
    eraTitle: 'Rocketry, the Space Race, and Lunar Conquest',
    subtitle:
      'From Tsiolkovsky’s rocket equation to Sputnik 1, Yuri Gagarin, the Apollo 11 Moon landing, and the International Space Station.',
    iconName: 'Rocket',
    accentColor: '#f97316',
    summary:
      'Grounded in the reaction-propulsion physics of Tsiolkovsky and Goddard and driven by Cold War competition, humanity overcame Earth’s gravity well. In barely four decades, spaceflight progressed from the first artificial satellite to crewed Apollo Moon landings and continuous orbital habitation.',
    keyFigures: [
      'Konstantin Tsiolkovsky',
      'Robert Goddard',
      'Sergei Korolev',
      'Yuri Gagarin',
      'John Houbolt',
      'Neil Armstrong',
      'Buzz Aldrin',
    ],
    detailSections: [
      {
        id: 'tsiolkovski-ecuacion',
        title: 'Tsiolkovsky, Goddard, and the Rocket Equation (1903–1926)',
        subtitle: 'Propulsion via conservation of linear momentum in the vacuum of space',
        visualType: 'tsiolkovsky-rocket',
        highlight: 'Δv = v_e · ln(m₀ / m_f) · Goddard’s first liquid-fueled rocket (1926)',
        paragraphs: [
          'In 1903, Russian theorist Konstantin Tsiolkovsky formulated the fundamental equation of astronautics, Δv = v_e · ln(m₀ / m_f), proving that in the absence of atmosphere the only way to accelerate a spacecraft is by expelling mass at high velocity using multistage rockets.',
          'American pioneer Robert Goddard brought that theory into experimental reality on March 16, 1926, by launching the first liquid-fueled rocket. Decades later, these principles crystallized into the heavy orbital launch vehicles of the mid-20th century.',
        ],
      },
      {
        id: 'sputnik-vostok',
        title: 'Sputnik 1 and Vostok 1: The Orbital Dawn (1957–1961)',
        subtitle: 'First cosmic velocity (7.91 km/s) and the first human in orbit',
        visualType: 'sputnik',
        highlight: 'October 4, 1957 (Sputnik 1, 83.6 kg) · April 12, 1961 (Yuri Gagarin, 108 min)',
        paragraphs: [
          'On October 4, 1957, the Soviet Union placed Sputnik 1 into orbit—an 83.6 kg, 58 cm polished aluminum sphere whose radio beacon swept across the planet for three weeks. Its 96-minute orbit proved that first cosmic velocity was achievable and catalyzed the creation of NASA in 1958.',
          'On April 12, 1961, Yuri Gagarin completed a full Earth orbit in 108 minutes aboard the Vostok 1 capsule at roughly 327 km altitude. His flight validated microgravity life-support systems and controlled atmospheric reentry, ushering in the era of human spaceflight.',
        ],
      },
      {
        id: 'apolo-alunizaje',
        title: 'Saturn V and the Apollo 11 Moon Landing (1969–1972)',
        subtitle: 'Lunar Orbit Rendezvous (LOR) and the Eagle touchdown in the Sea of Tranquility',
        visualType: 'apollo',
        highlight: '34.5 MN thrust · Trans-lunar injection at 10.9 km/s · 382 kg of lunar samples',
        paragraphs: [
          'To fulfill the 1961 mandate of landing humans on the Moon and returning them safely, the Apollo Program developed the Saturn V rocket—standing 110 meters tall with 34.5 MN of thrust—and adopted the Lunar Orbit Rendezvous (LOR) architecture championed by John Houbolt, splitting the spacecraft into an orbital module and an ultralight lunar lander.',
          'On July 20, 1969, following Apollo 8’s historic circumlunar flight (1968), Neil Armstrong and Buzz Aldrin descended in the Eagle module onto Mare Tranquillitatis while Michael Collins orbited above in Columbia. The six missions that landed through 1972 collected 382 kg of lunar samples and deployed laser retroreflectors that remain operational today.',
        ],
      },
      {
        id: 'estaciones-satelites',
        title: 'Orbital Stations and Satellite Constellations (1971–1998)',
        subtitle: 'From Salyut, Skylab, and Mir to the assembly of the International Space Station',
        visualType: 'satellites',
        highlight: 'Zarya Module (1998) · Permanent microgravity laboratories at 408 km altitude',
        paragraphs: [
          'Following the lunar campaign, astronautics shifted toward sustained presence in low Earth orbit: Salyut 1 (1971) pioneered the space station concept, Skylab (1973) demonstrated long-duration habitability, and Mir (1986–2001) sustained more than a decade of continuous human occupation.',
          'In 1998, the launch of the Zarya module initiated assembly of the International Space Station (ISS), accompanied by global constellations of Earth-observation, telecommunications, and navigation satellites that redefined planetary science and modern life.',
        ],
      },
    ],
  },
  {
    id: 'era-moderna',
    yearRange: '2015 – 2026+',
    eraTitle: 'Modern Era: James Webb and the Martian Horizon',
    subtitle:
      'Reusable rocketry, infrared astrophysics at L2, Artemis cislunar return, and interplanetary architecture toward Mars.',
    iconName: 'Telescope',
    accentColor: '#fb7185',
    summary:
      'As of November 15, 2026, space exploration is undergoing a structural shift: vertical booster reuse has dramatically lowered orbital launch costs, the James Webb Space Telescope maps the early universe from L2, and the Artemis program builds the cislunar bridge toward the Martian horizon.',
    keyFigures: [
      'James Webb Space Telescope (JWST)',
      'Artemis Program & Orion',
      'Curiosity & Perseverance Rovers',
      'Ingenuity Helicopter',
      'Walter Hohmann',
    ],
    detailSections: [
      {
        id: 'jwst-lagrange',
        title: 'The James Webb Space Telescope at L2 (2021–2026)',
        subtitle: '6.5-meter segmented mirror and infrared spectroscopy of the early cosmos',
        visualType: 'james-webb',
        highlight: 'L2 halo orbit at 1.5 million km · Over 5,800 exoplanets cataloged by 2026',
        paragraphs: [
          'Launched on December 25, 2021, the James Webb Space Telescope (JWST) operates in a halo orbit around the L2 Lagrange point, 1.5 million kilometers from Earth. Its segmented 6.5-meter primary mirror of 18 gold-coated beryllium hexagons and five-layer sunshield enable observations across the near- and mid-infrared spectrum.',
          'Across its science campaigns through November 2026, JWST has revealed galaxies formed just a few hundred million years after the Big Bang and characterized distant world atmospheres through transit spectroscopy, alongside a catalog surpassing 5,800 confirmed exoplanets.',
        ],
      },
      {
        id: 'artemis-cislunar',
        title: 'Reusable Launchers and the Artemis Program (2015–2026)',
        subtitle: 'Vertical retropropulsion, Orion spacecraft, and sustainable lunar south pole presence',
        visualType: 'artemis',
        highlight: 'Orbital propulsive reuse · Lunar polar water ice and Gateway station',
        paragraphs: [
          'Since 2015, vertical landing via retropropulsion and hypersonic grid fins made routine recovery of orbital first stages possible, cutting launch cost per kilogram by an order of magnitude and catalyzing a new commercial and scientific space economy.',
          'In parallel, the Artemis Program—inaugurated by Artemis I’s 2022 circumlunar flight with the Orion spacecraft—is building cislunar infrastructure toward the Moon’s south pole, where water-ice deposits in permanently shadowed craters will serve as a strategic reserve of oxygen and propellant.',
        ],
      },
      {
        id: 'horizonte-marciano',
        title: 'Bound for Mars: Hohmann Windows and Project Tango Horizon',
        subtitle: 'From Curiosity, Perseverance, and Ingenuity to crewed interplanetary transit',
        visualType: 'mars-route',
        highlight: '225M km mean distance · Synodic window every 780 days · ISRU synthesis (MOXIE / Sabatier)',
        paragraphs: [
          'On the surface of the Red Planet, the Curiosity (Gale Crater) and Perseverance rovers alongside the 72 historic flights of the Ingenuity coaxial helicopter (Jezero Crater) confirmed that Mars once hosted river deltas, clay minerals, and chemical conditions favorable to ancient habitability, while the MOXIE experiment demonstrated pure oxygen production from atmospheric CO₂.',
          'Looking ahead from 2026 into the coming decades, the Tango Horizon roadmap charts the interplanetary leap using synodic Hohmann transfer windows every 26 months (six- to nine-month transits), integrating radiation shielding, hypersonic descent, and Sabatier chemical plants to produce methane and oxygen directly on Mars.',
        ],
      },
    ],
  },
];

const SPACE_TIMELINE_DATA_ES: SpaceEra[] = [
  {
    id: 'antiguedad',
    yearRange: '~3000 a.C. – Siglo II d.C.',
    eraTitle: 'Cosmologías Míticas, Arqueoastronomía y Geocentrismo',
    subtitle:
      'La bóveda celeste como arquitectura del tiempo, la agricultura y el pensamiento geométrico en las civilizaciones prístinas.',
    iconName: 'Compass',
    accentColor: '#fbbf24',
    summary:
      'Las civilizaciones de Mesopotamia, Egipto y Mesoamérica articularon los primeros registros sistemáticos de la bóveda celeste. En esta etapa preteórica, los fenómenos astronómicos regían los calendarios agrícolas, fundamentaban las cosmogonías y servían de brújula estelar, hasta que la astronomía helénica transformó esos datos en modelos geométricos geocéntricos.',
    keyFigures: [
      'Astrónomos Caldeos (MUL.APIN)',
      'Aristarco de Samos',
      'Eratóstenes',
      'Hiparco de Nicea',
      'Claudio Ptolomeo',
      'Al-Battani',
    ],
    detailSections: [
      {
        id: 'antiguedad-observacion',
        title: 'Observación Sistemática y Calendarios Agrícolas',
        subtitle: 'Zigurats mesopotámicos, el catálogo MUL.APIN y Orión en el cielo antiguo',
        visualType: 'celestial-map',
        highlight: 'Ciclo de Saros: 223 meses sinódicos (18 años y 11 días) para predecir eclipses',
        paragraphs: [
          'Desde los zigurats de Mesopotamia hasta los complejos ceremoniales de Mesoamérica y el valle del Nilo, la observación del firmamento constituyó la primera ciencia empírica de la humanidad. Los escribas babilónicos compilaron catálogos estelares como el MUL.APIN y registraron periodicidades de eclipses mediante tablas cuneiformes, identificando constelaciones emblemáticas como Orión (SIPA.ZI.ANNA) con Betelgeuse, Rigel y las tres estrellas del cinturón.',
          'Al escrutar las sicigias lunares con precisión aritmética, los astrónomos caldeos dedujeron el ciclo de Saros —un período de 223 meses sinódicos equivalente a 18 años y 11 días— que permitía anticipar eclipses lunares y solares mucho antes de que existieran modelos espaciales tridimensionales.',
        ],
      },
      {
        id: 'antiguedad-geocentrismo',
        title: 'Del Mito Babilónico al Cosmos Geométrico y Geocéntrico',
        subtitle: 'Aristarco, Hiparco, Ptolomeo y la perfección de la esfera celeste',
        visualType: 'geocentric-sphere',
        highlight: 'Distancia Tierra–Luna calculada por Hiparco: ~60 radios terrestres (384,400 km)',
        paragraphs: [
          'En la antigüedad helénica, pensadores como Aristarco de Samos, Eratóstenes, Hiparco de Nicea y Claudio Ptolomeo transformaron los registros aritméticos orientales en modelos geométricos deductivos. La medición de la circunferencia terrestre por Eratóstenes, la estimación trigonométrica de distancias por Aristarco y el descubrimiento de la precesión de los equinoccios y la paralaje lunar por Hiparco sentaron las bases de la astronomía posicional.',
          'En el siglo II d.C., Claudio Ptolomeo sintetizó el modelo geocéntrico en el Almagesto mediante esferas concéntricas, deferentes y epiciclos que ubicaban a la Tierra inmóvil en el centro del cosmos. Posteriormente, con el astrolabio y la esfera armilar, los astrónomos árabes medievales como Al-Battani y Al-Sufi refinaron la medición de la altura de los astros, la determinación horaria y la orientación marítima.',
        ],
      },
      {
        id: 'antiguedad-egipto-mesoamerica',
        title: 'Egipto, Mesoamérica y el Cielo como Calendario',
        subtitle: 'El orto helíaco de Sirio (Sopdet) y el ciclo sinódico de Venus',
        visualType: 'sirius-calendar',
        highlight: 'Año sotíaco egipcio de 365.25 días y ciclo sinódico maya de Venus (584 días)',
        paragraphs: [
          'En el Antiguo Egipto, los arquitectos alinearon pirámides y templos con las estrellas circumpolares y fundaron su calendario civil de 365 días en el orto helíaco de Sirio (Sopdet), cuya reaparición antes del amanecer anunciaba la inundación anual del Nilo.',
          'Al otro lado del océano, la astronomía maya alcanzó una notable exactitud matemática al calcular el ciclo sinódico de Venus en 584 días y registrar tablas de predicción de eclipses en el Códice de Dresde, mientras que observatorios como El Caracol en Chichén Itzá marcaban solsticios y equinoccios. Sin auxilio óptico, estas culturas construyeron una ciencia de precisión basada en siglos de observación acumulada.',
        ],
      },
    ],
  },
  {
    id: 'revolucion-copernicana',
    yearRange: '1543 – 1610',
    eraTitle: 'Revolución Copernicana y Evidencia Telescópica',
    subtitle:
      'El giro heliocéntrico y la invención del telescopio astronómico desmantelan catorce siglos de dogma geocéntrico.',
    iconName: 'Sun',
    accentColor: '#fb923c',
    summary:
      'La ruptura iniciada por Nicolás Copérnico al situar al Sol en el centro del sistema planetario y la irrupción del telescopio refractor de Galileo Galilei transformaron los cuerpos celestes de entidades metafísicas inmutables en mundos físicos susceptibles de medición y cartografía.',
    keyFigures: ['Nicolás Copérnico', 'Tycho Brahe', 'Galileo Galilei'],
    detailSections: [
      {
        id: 'copernico-giro',
        title: 'Copérnico y el Giro Heliocéntrico (1543)',
        subtitle: 'De revolutionibus orbium coelestium y el ordenamiento de las órbitas',
        visualType: 'copernicus',
        highlight: 'El movimiento retrógrado planetario explicado como efecto de perspectiva orbital',
        paragraphs: [
          'En De revolutionibus orbium coelestium (1543), Nicolás Copérnico propuso colocar al Sol en el centro del sistema planetario y atribuir a la Tierra un doble movimiento: rotación diaria sobre su eje y traslación anual alrededor del astro rey.',
          'Este modelo explicaba de forma natural el aparente movimiento retrógrado de planetas como Marte y ordenaba las órbitas según su período de revolución. Aunque Copérnico todavía conservaba trayectorias circulares perfectas y epiciclos auxiliares, su obra representó el primer quiebre estructural frente al paradigma aristotélico-ptolemaico vigente durante catorce siglos.',
        ],
      },
      {
        id: 'galileo-telescopio',
        title: 'Galileo Galilei y la Evidencia Instrumental (1609–1610)',
        subtitle: 'Sidereus Nuncius: montañas lunares, fases de Venus y satélites de Júpiter',
        visualType: 'galileo-jupiter',
        highlight: 'Ío, Europa, Ganímedes y Calisto: prueba empírica de múltiples centros orbitales',
        paragraphs: [
          'Al perfeccionar el telescopio refractor y dirigirlo hacia el firmamento en 1609, Galileo Galilei inauguró la astronomía observacional moderna. El análisis geométrico de las sombras en el terminador lunar reveló cordilleras escarpadas y cráteres profundos, refutando la noción aristotélica de una Luna lisa e incorruptible de éter puro.',
          'En las páginas del Sidereus Nuncius (1610), Galileo documentó el descubrimiento de las cuatro lunas que orbitan Júpiter —Ío, Europa, Ganímedes y Calisto—, así como las fases completas de Venus. Estas observaciones probaron de modo irrefutable que no todos los cuerpos celestes giran alrededor de la Tierra.',
        ],
      },
    ],
  },
  {
    id: 'gravitacion-orbital',
    yearRange: '1609 – 1687',
    eraTitle: 'Gravitación Universal y Física Orbital',
    subtitle:
      'Las leyes elípticas de Kepler y la síntesis gravitatoria de Newton unifican la mecánica terrestre y celeste.',
    iconName: 'Orbit',
    accentColor: '#fdba74',
    summary:
      'A partir de las observaciones de arco de minuto recopiladas por Tycho Brahe sobre la órbita excéntrica de Marte, Johannes Kepler formuló las tres leyes del movimiento planetario. En 1687, Isaac Newton dedujo esas leyes desde un principio único: la gravitación universal, fundando la mecánica clásica sobre la que se calculan todas las trayectorias espaciales.',
    keyFigures: ['Tycho Brahe', 'Johannes Kepler', 'Isaac Newton'],
    detailSections: [
      {
        id: 'kepler-elipses',
        title: 'Las Órbitas Elípticas de Kepler (1609–1619)',
        subtitle: 'Astronomia Nova, la excentricidad marciana y las tres leyes del movimiento',
        visualType: 'kepler-ellipse',
        highlight: 'Primera Ley (elipses), Segunda Ley (áreas iguales) y Tercera Ley (T² ∝ a³)',
        paragraphs: [
          'Encargado por Tycho Brahe de resolver las anomalías posicionales de Marte, Johannes Kepler comprobó que ninguna combinación de círculos explicaba una discrepancia de ocho minutos de arco en las tablas de Uraniborg. Al abandonar el dogma circular, descubrió en Astronomia Nova (1609) que los planetas describen elipses con el Sol situado en uno de sus focos.',
          'Kepler completó la cinemática del Sistema Solar con su segunda ley —el radio vector planeta-Sol barre áreas iguales en tiempos iguales— y con la tercera ley (Harmonices Mundi, 1619), que vincula el cuadrado del período orbital con el cubo del semieje mayor (T² ∝ a³).',
        ],
      },
      {
        id: 'newton-principia',
        title: 'La Síntesis de Newton: Gravitación Universal (1687)',
        subtitle: 'Principia Mathematica y la matematización universal de la caída y la órbita',
        visualType: 'newton-apple',
        highlight: 'F = G · M · m / r²  ⇒  La caída libre terrestre y la órbita lunar obedecen a la misma ley',
        paragraphs: [
          'En los Philosophiae Naturalis Principia Mathematica (1687), Isaac Newton demostró que la fuerza que hace caer un cuerpo hacia el suelo es idéntica a la aceleración centrípeta que retiene a la Luna en su órbita alrededor de la Tierra, expresada por la ley de inversa del cuadrado: F = G·M·m/r².',
          'Mediante el cálculo infinitesimal y sus tres leyes del movimiento, Newton derivó matemáticamente las leyes empíricas de Kepler y unificó la física terrestre con la celeste. Desde entonces, abandonar la Tierra dejó de ser una especulación literaria para convertirse en un problema calculable de balística y dinámica orbital.',
        ],
      },
    ],
  },
  {
    id: 'carrera-espacial',
    yearRange: '1903 – 1998',
    eraTitle: 'Cohetería, Carrera Espacial y Conquista Lunar',
    subtitle:
      'De la ecuación del cohete de Tsiolkovski al Sputnik 1, Yuri Gagarin, el alunizaje del Apolo 11 y la Estación Espacial Internacional.',
    iconName: 'Rocket',
    accentColor: '#f97316',
    summary:
      'Sustentada en la física de propulsión a reacción de Tsiolkovski y Goddard e impulsada por la competencia geopolítica de la Guerra Fría, la humanidad venció el pozo gravitatorio terrestre. En apenas cuatro décadas pasó del primer satélite artificial al alunizaje tripulado del Programa Apolo y a la permanencia continua en estaciones orbitales.',
    keyFigures: [
      'Konstantín Tsiolkovski',
      'Robert Goddard',
      'Serguéi Koroliov',
      'Yuri Gagarin',
      'John Houbolt',
      'Neil Armstrong',
      'Buzz Aldrin',
    ],
    detailSections: [
      {
        id: 'tsiolkovski-ecuacion',
        title: 'Tsiolkovski, Goddard y la Ecuación del Cohete (1903–1926)',
        subtitle: 'Propulsión por conservación del momento lineal en el vacío espacial',
        visualType: 'tsiolkovsky-rocket',
        highlight: 'Δv = v_e · ln(m₀ / m_f) · Primer cohete de combustible líquido de Goddard (1926)',
        paragraphs: [
          'En 1903, el teórico ruso Konstantín Tsiolkovski formuló la ecuación fundamental de la astronáutica, Δv = v_e · ln(m₀ / m_f), demostrando que en ausencia de atmósfera la única forma de acelerar una nave es expulsar masa a alta velocidad y emplear cohetes multietapa.',
          'El estadounidense Robert Goddard llevó esa teoría a la experimentación el 16 de marzo de 1926 al lanzar el primer cohete de combustible líquido. Décadas después, estos principios cristalizaron en los grandes lanzadores orbitales de mediados del siglo XX.',
        ],
      },
      {
        id: 'sputnik-vostok',
        title: 'Sputnik 1 y Vostok 1: El Amanecer Orbital (1957–1961)',
        subtitle: 'Primera velocidad cósmica (7.91 km/s) y el primer ser humano en órbita',
        visualType: 'sputnik',
        highlight: '4 de octubre de 1957 (Sputnik 1, 83.6 kg) · 12 de abril de 1961 (Yuri Gagarin, 108 min)',
        paragraphs: [
          'El 4 de octubre de 1957, la Unión Soviética puso en órbita al Sputnik 1, una esfera de aluminio pulido de 83.6 kg y 58 cm de diámetro cuya señal de radio recorrió el planeta durante tres semanas. Su órbita de 96 minutos demostró que la primera velocidad cósmica era alcanzable y catalizó la creación de la NASA en 1958.',
          'El 12 de abril de 1961, Yuri Gagarin completó una órbita terrestre en 108 minutos a bordo de la cápsula Vostok 1 a unos 327 km de altitud. Su vuelo validó los sistemas de soporte vital en microgravedad y la reentrada atmosférica controlada, abriendo la era de la astronáutica tripulada.',
        ],
      },
      {
        id: 'apolo-alunizaje',
        title: 'Saturno V y el Alunizaje del Apolo 11 (1969–1972)',
        subtitle: 'Encuentro en Órbita Lunar (LOR) y el descenso del Eagle en el Mar de la Tranquilidad',
        visualType: 'apollo',
        highlight: '34.5 MN de empuje · Inyección Translunar a 10.9 km/s · 382 kg de rocas lunares',
        paragraphs: [
          'Para cumplir el objetivo fijado en 1961 de llevar seres humanos a la Luna y traerlos de regreso, el Programa Apolo desarrolló el vector Saturno V —de 110 metros de altura y 34.5 MN de empuje— y adoptó la arquitectura de Encuentro en Órbita Lunar (LOR) defendida por John Houbolt, fraccionando la nave en un módulo orbital y un módulo lunar ultraligero.',
          'El 20 de julio de 1969, tras el histórico vuelo circunlunar del Apolo 8 (1968), Neil Armstrong y Buzz Aldrin descendieron en el módulo Eagle sobre el Mare Tranquillitatis mientras Michael Collins aguardaba en el Columbia. Las seis misiones que alunizaron hasta 1972 recolectaron 382 kg de muestras selenitas y desplegaron retrorreflectores láser aún operativos.',
        ],
      },
      {
        id: 'estaciones-satelites',
        title: 'Estaciones Orbitales y Constelaciones Satelitales (1971–1998)',
        subtitle: 'De Saliut, Skylab y Mir al ensamblaje de la Estación Espacial Internacional',
        visualType: 'satellites',
        highlight: 'Módulo Zaryá (1998) · Laboratorios permanentes en microgravedad a 408 km de altura',
        paragraphs: [
          'Tras la epopeya lunar, la astronáutica viró hacia la permanencia sostenida en órbita baja terrestre: Saliut 1 (1971) inauguró el concepto de estación espacial, Skylab (1973) demostró la habitabilidad prolongada y la estación Mir (1986–2001) consolidó más de una década de ocupación continua.',
          'En 1998, el lanzamiento del módulo Zaryá dio inicio al ensamblaje de la Estación Espacial Internacional (EEI), acompañada por el despliegue de redes globales de satélites de observación terrestre, telecomunicaciones y navegación orbital que redefinieron la ciencia planetaria y la vida moderna.',
        ],
      },
    ],
  },
  {
    id: 'era-moderna',
    yearRange: '2015 – 2026+',
    eraTitle: 'Era Moderna: James Webb y Horizonte Marciano',
    subtitle:
      'Cohetería reutilizable, astrofísica infrarroja en L2, retorno cislunar Artemis y la arquitectura interplanetaria hacia Marte.',
    iconName: 'Telescope',
    accentColor: '#fb7185',
    summary:
      'Hacia el 15 de noviembre de 2026, la exploración espacial vive una transformación estructural: la reutilización vertical de lanzadores redujo los costos de acceso orbital, el Telescopio Espacial James Webb cartografía el universo primitivo desde el punto L2 y el programa Artemis construye el puente cislunar hacia el horizonte marciano.',
    keyFigures: [
      'Telescopio James Webb (JWST)',
      'Programa Artemis & Orión',
      'Rovers Curiosity & Perseverance',
      'Helicóptero Ingenuity',
      'Walter Hohmann',
    ],
    detailSections: [
      {
        id: 'jwst-lagrange',
        title: 'El Telescopio Espacial James Webb en el Punto L2 (2021–2026)',
        subtitle: 'Espejo segmentado de 6.5 metros y espectroscopía infrarroja del cosmos temprano',
        visualType: 'james-webb',
        highlight: 'Órbita en L2 a 1.5 millones de km · Más de 5,800 exoplanetas catalogados al 2026',
        paragraphs: [
          'Lanzado el 25 de diciembre de 2021, el Telescopio Espacial James Webb (JWST) opera en halo alrededor del punto de Lagrange L2, a 1.5 millones de kilómetros de la Tierra. Su espejo primario segmentado de 18 hexágonos de berilio recubiertos de oro (6.5 metros de diámetro) y su escudo térmico de cinco capas le permiten observar en el infrarrojo cercano y medio.',
          'Durante sus campañas científicas hasta noviembre de 2026, el JWST ha revelado galaxias formadas apenas unos cientos de millones de años después del Big Bang y caracterizado atmósferas de mundos distantes mediante espectroscopía de tránsito, en un contexto astronómico que supera los 5,800 exoplanetas confirmados.',
        ],
      },
      {
        id: 'artemis-cislunar',
        title: 'Lanzadores Reutilizables y Programa Artemis (2015–2026)',
        subtitle: 'Retropropulsión vertical, cápsula Orión y presencia sostenible en el polo sur lunar',
        visualType: 'artemis',
        highlight: 'Reutilización propulsiva orbital · Hielo polar lunar y plataforma Gateway',
        paragraphs: [
          'Desde 2015, el aterrizaje vertical mediante retropropulsión y aletas hipersónicas permitió recuperar primeras etapas orbitales de forma rutinaria, reduciendo en un orden de magnitud el costo por kilogramo lanzado e impulsando una nueva economía espacial comercial y científica.',
          'En paralelo, el Programa Artemis —inaugurado con el vuelo circunlunar de Artemis I en 2022 con la nave Orión— articula la infraestructura cislunar rumbo al polo sur de la Luna, donde los depósitos de hielo de agua en cráteres permanentemente sombreados servirán como reserva estratégica de oxígeno y propelente.',
        ],
      },
      {
        id: 'horizonte-marciano',
        title: 'Rumbo a Marte: Ventanas de Hohmann y Proyecto Tango Horizon',
        subtitle: 'De Curiosity, Perseverance e Ingenuity al tránsito interplanetario tripulado',
        visualType: 'mars-route',
        highlight: '225 M km medios · Ventana sinódica cada 780 días · Síntesis ISRU (MOXIE / Sabatier)',
        paragraphs: [
          'En la superficie del Planeta Rojo, los rovers Curiosity (Cráter Gale) y Perseverance junto a los 72 vuelos históricos del helicóptero coaxial Ingenuity (Cráter Jezero) confirmaron que Marte albergó deltas fluviales, minerales arcillosos y condiciones químicas propicias para la habitabilidad antigua, mientras el experimento MOXIE demostró la generación de oxígeno puro a partir del CO₂ atmosférico.',
          'De cara al horizonte de 2026 y las próximas décadas, la hoja de ruta Tango Horizon proyecta el salto interplanetario aprovechando las ventanas sinódicas de transferencia de Hohmann cada 26 meses (con tránsitos de seis a nueve meses), integrando protección radiológica, descenso hipersónico y plantas químicas de Sabatier para producir metano y oxígeno directamente en Marte.',
        ],
      },
    ],
  },
];

export const SPACE_TIMELINE_DATA: SpaceEra[] = SPACE_TIMELINE_DATA_EN;

export function getSpaceTimelineData(lang: SiteLang): SpaceEra[] {
  return lang === 'es' ? SPACE_TIMELINE_DATA_ES : SPACE_TIMELINE_DATA_EN;
}
