# NASA APIs

NASA and USGS data sources used by the project. Add each source with its endpoint, auth, and the fields the project reads.
Endpoints below come from public documentation and have not been tested against the project yet.

| Source | Base URL | Auth | Use |
|---|---|---|---|
| NASA Open APIs | `https://api.nasa.gov` | API key (`NASA_API_KEY`; `DEMO_KEY` has low rate limits) | Entry point for NASA public APIs |
| Mars Rover Photos | `https://api.nasa.gov/mars-photos/api/v1/rovers/{rover}/photos` | API key | Rover images by sol or Earth date |
| NASA Image and Video Library | `https://images-api.nasa.gov/search?q={query}` | None | Search images, video and audio |
| NASA Mars Trek (WMTS tiles) | `https://trek.nasa.gov/tiles/Mars/EQ/` | None | Global Mars map layers |
| USGS Astrogeology STAC | `https://stac.astrogeology.usgs.gov/api/` | None | Mars DTM and image products |
| PDS Geosciences Node | `https://pds-geosciences.wustl.edu` | None | Mars mission data archives |
| NASA OSDR | `https://osdr.nasa.gov/bio/repo/` | None | Space biology and health data |

## Configuration

- `NASA_API_KEY` goes in `.env` (see `.env.example`). Never commit the key.

## Per-source notes

Add one section per source: request example, response fields used, rate limits, caching.

# Validacion de APIs y fuentes (Aegis Mars)

Generado: 2026-11-14 04:34 con `validate_urls.py` (api key: personal). Fuente: `data-nasa.md.txt`.

Regla del evento: NASA no avala sitios no gubernamentales de EE.UU.; hay que respetar los terminos de uso de datos de cada sitio (CelesTrak, Zenodo, GitHub comunitarios, LMD/MCD, etc.).

## Resumen

| Veredicto | Cantidad | Significado |
|-----------|---------:|-------------|
| 🟢 SIRVE | 23 | HTTP 200 y devuelve datos descargables |
| 🟢 SIRVE-PAGINA | 93 | HTTP 200, pero es HTML: documentacion o portal, no API directa |
| 🟡 LIMITADA | 0 | 429 rate limit: la ruta responde, reintentar con key personal |
| 🟡 BLOQUEADA | 3 | 401/403/405: rechaza clientes automaticos, probar en navegador |
| 🔴 NO SIRVE | 18 | 404, DNS o timeout: no usar |

Columna **md**: como estaba marcada en el catalogo original. Si difiere del veredicto, esta el cambio a corregir.

## 1. Mars Trek (optical, topographic and thermal tiles)

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | FETCHED | 200 | HTML | https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=mars | Mars Trek WMTS documentation. Gives the URL template only. It does not list layer names in the text I could read, so get layer IDs from the page in a browser. |
| 🔴 NO SIRVE | OK | ReadTimeout | - | https://api.nasa.gov/mars-wmts/catalog | Mars Trek layer catalog on api.nasa.gov with preview per layer. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://trek.nasa.gov/tiles/apidoc/trekAPI.html?body=moon | Same documentation for the Moon. |
| 🔴 NO SIRVE | OK | 404 | HTML | https://trek.nasa.gov/tiles/Mars/EQ/Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml | Example GetCapabilities (Viking color mosaic). Pattern to copy for other layers. |
| 🔴 NO SIRVE | OK | 404 | HTML | https://trek.nasa.gov/tiles/Mars/EQ/Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/1/0/0.jpg | Example tile, zoom 1, row 0, col 0. |
| 🟢 SIRVE | OK | 200 | XML | https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/WMTSCapabilities.xml | Moon example GetCapabilities (LRO WAC). |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://nasa-open.vercel.app/trek | Third-party explorer of the Trek layers. Useful to see layer names. Not official. |
| 🟡 BLOQUEADA | UNVERIFIED | 403 | HTML | https://trek.nasa.gov/tiles/Mars/EQ/ | Base path for Mars equirectangular layers. |
| 🟡 BLOQUEADA | UNVERIFIED | 403 | HTML | https://trek.nasa.gov/tiles/Moon/SP/ | Moon south polar tiles (from the lunar prompt). |
| 🟢 SIRVE | SUSPECT | 200 | imagen | https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{Z}/{Y}/{X}.jpg | Layer ID given for MOLA color hillshade. Name not confirmed. |
| 🔴 NO SIRVE | SUSPECT | ReadTimeout | - | https://api.nasa.gov/mars-wmts/catalog/curiosity_ctx_mosaic/1.0.0//default/default028mm/{z}/{y}/{x}.png | Guessed path for the CTX Curiosity mosaic. The source file hedged it itself. A listing I found names the layer "CTX Mosaic - Curiosity Landing Site" and "HiRISE Mosaic - Curiosity Landing Site". |

## 2. Topography and elevation (MOLA, HiRISE DTM)

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://pds-geosciences.wustl.edu/missions/mgs/mola.html | MOLA landing page at PDS Geosciences. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://pds-geosciences.wustl.edu/missions/mgs/pedr.html | MOLA PEDR, along-track altimetry. Queries by lat, lon, orbit and time via ODE. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://pds-geosciences.wustl.edu/missions/mgs/megdr.html | MOLA MEGDR, global gridded topography. Best starting point for a DEM. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://pds.nasa.gov/data/mgs-m-mola-5-shadr-v1.0/mgsl_2025/aareadme.htm | MOLA PEDR/EGDR archive volume readme. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/MGS/MOLA/Intro.htm | ODE help page for MOLA products (PEDR, MEGDR, SHADR). |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://registry.opendata.aws/nasa-usgs-mars-hirise-dtms/ | HiRISE DTMs on AWS open data. Public bucket `s3://astrogeo-ard/mars/mro/hirise/controlled/dtm/`. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://stac.astrogeology.usgs.gov/docs/data/mars/hirise_dtms/ | Docs for the same DTMs, with a STAC catalog. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://github.com/GALE-Lab/Mars_DEMs | Index and footprint shapefile of more than 1,300 HiRISE DEMs (1 m/px) from UCLA. Use to check if a DEM covers the boxwork area. |
| 🔴 NO SIRVE | OK | ConnectTimeout | - | https://astropedia.astrogeology.usgs.gov/download/Mars/MarsReconnaissanceOrbiter/CTX/mars_mro_hirise_explorationzones_day_2023/ancillary/ReadMe_Mars_DEMs_UCLA_2023.pdf | Readme of the UCLA DEM archive (HiRISE 1 m, CTX 18 m). |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://www.uahirise.org/dtm/about.php | HiRISE team page on how DTMs are made. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://www.uahirise.org/dtm/ | HiRISE DTM index page. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://hirise-pds.lpl.arizona.edu/PDS/DTM/ | PDS copy of HiRISE DTMs at Arizona. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://pds.nasa.gov/ds-view/pds/viewProfile.jsp?dsid=MGS-M-MOLA-3-PEDR-L1A-V1.0 | PDS dataset profile for MOLA PEDR. |
| 🟢 SIRVE-PAGINA | SUSPECT | 200 | HTML | https://github.com/roncapat/NASA-Hirise-DTMs-DEMs-index | Repo named in your first chat. Not found, and your second file says it was deleted or made private. Use the UCLA index above. |

## 3. Thermal inertia and traction hazard (THEMIS, AI4MARS)

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://registry.opendata.aws/nasa-usgs-themis-mosaics/ | Controlled THEMIS infrared mosaics (about 100 m/px) on AWS. Fallback for thermal layers if Trek lacks them. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://data.nasa.gov/dataset/ai4mars-a-dataset-for-terrain-aware-autonomous-driving-on-mars | AI4MARS from JPL, semantic terrain labels. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://zenodo.org/records/15995036 | AI4MARS download on Zenodo. |

## 4. Minerals, spectra and subsurface (CRISM, TES, SHARAD, caves, gravity)

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://crismtypespectra.rsl.wustl.edu/ | CRISM type spectra library. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://pds-geosciences.wustl.edu/missions/mro/crism.htm | PDS Geosciences CRISM page. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://pds-geosciences.wustl.edu/missions/mro/sharad.htm | SHARAD radargrams (subsurface radar). |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://ode.rsl.wustl.edu/mars/ | Orbital Data Explorer, search portal for CRISM, SHARAD, MOLA. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://oderest.rsl.wustl.edu/ | ODE REST API documentation. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://www.mars.asu.edu/data/ | ASU Mars global datasets, including TES mineral maps. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://astrogeology.usgs.gov/search/map/mars_global_cave_candidate_catalog_v1_cushing | USGS Mars Global Cave Candidate Catalog (MGC3), coordinates of pits and skylights. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://pgda.gsfc.nasa.gov/products/57 | NASA Goddard Mars gravity models (GMM-3 / JGMRO_120D). Add `https://` before use. |

## 5. Radiation and space weather

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://pds-ppi.igpp.ucla.edu/volume/MSLRAD_1002/DOCUMENT/RAD_RDR_SIS.HTM | Software Interface Spec of the MSL RAD reduced data record. RAD data live at the PPI node (UCLA). |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://pds-ppi.igpp.ucla.edu/volume/MSLRAD_1001/DOCUMENT/RAD_EDR_SIS.HTM | Same for the raw experiment data record (EDR). |
| 🟢 SIRVE | OK | 200 | texto | https://pds-ppi.igpp.ucla.edu/volume/MSLRAD_1001/AAREADME.TXT | Volume readme for RAD EDR (binary files with PDS labels). |
| 🔴 NO SIRVE | OK | 404 | HTML | https://catalog.data.gov/dataset/msl-mars-radiation-assessment-detector-rdr-b9779 | data.gov listing for the RAD RDR dataset (id `msl-m-rad-3-rdr-v1.0`). |
| 🔴 NO SIRVE | OK | 404 | HTML | https://catalog.data.gov/dataset/msl-mars-radiation-assessment-detector-edr-5dda7 | data.gov listing for RAD EDR. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://pds-ppi.igpp.ucla.edu/mission/Mars%20Science%20Laboratory/msl/RAD | RAD instrument page at the PPI node. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://pds-ppi.igpp.ucla.edu/collection/MSL-M-RAD-3-RDR-V1.0:DATA | RAD RDR data collection. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://pds-ppi.igpp.ucla.edu/data/MSL-M-RAD-3-RDR-V1.0/DOCUMENT/RAD_RDR_SIS.HTM | Alternate path to the RDR SIS. The one above is the one I saw. |
| 🟢 SIRVE | UNVERIFIED | 200 | JSON | https://api.nasa.gov/DONKI/SEP | DONKI solar energetic particle events. |
| 🔴 NO SIRVE | UNVERIFIED | 400 | JSON | https://api.nasa.gov/DONKI/CME | DONKI coronal mass ejections. |
| 🟢 SIRVE | UNVERIFIED | 200 | JSON | https://api.nasa.gov/DONKI/CMEAnalysis?startDate=2026-10-15&endDate=2026-11-11&mostAccurateOnly=true&api_key=DEMO_KEY | CME analysis for a date range. |
| 🟢 SIRVE | UNVERIFIED | 200 | JSON | https://api.nasa.gov/DONKI/SEP?startDate=2026-10-15&endDate=2026-11-11&api_key=DEMO_KEY | SEP events for a date range. |
| 🟢 SIRVE | UNVERIFIED | 200 | JSON | https://api.nasa.gov/DONKI/WSAEnlilSimulations?api_key=DEMO_KEY | WSA-Enlil heliosphere simulations (propagation toward Mars). |

## 6. Weather and atmosphere (REMS, MEDA, Mars-GRAM, MCD)

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/meda.html | Perseverance MEDA environment data (CSV tables) at PDS Atmospheres. This is Jezero, not Gale. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://pds-geosciences.wustl.edu/missions/mars2020/ | Index of Perseverance instrument archives across PDS nodes. |
| 🟢 SIRVE | OK | 200 | PDF | https://ntrs.nasa.gov/api/citations/20210023957/downloads/Mars-GRAM%20User%20Guide.pdf | Mars-GRAM user guide (2021). |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://software.nasa.gov/software/MFS-33888-1 | Mars-GRAM page in the NASA software catalog (cited in a NASA poster). Download flow not checked. |
| 🟢 SIRVE | OK | 200 | PDF | https://ntrs.nasa.gov/api/citations/20190030390/downloads/20190030390.pdf | Mars-GRAM upgrade overview (2019). |
| 🟢 SIRVE | OK | 200 | PDF | https://ntrs.nasa.gov/api/citations/20240008401/downloads/Mars%20GRAM%20Poster%20Tenth%20Mars.pdf | 2024 poster on Mars-GRAM upgrades. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://www-mars.lmd.jussieu.fr/mars/access.html | Mars Climate Database access page. Web interface for moderate use; full netCDF version on request. |
| 🟢 SIRVE | OK | 200 | PDF | http://www-mars.lmd.jussieu.fr/mars/info_web/user_manual_5.2.pdf | MCD user manual (v5.2). (redirige a https://www-mars.lmd.jussieu.fr/mars/info_web/user_manual_5.2.pdf) |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/MARS/curiosity/rems.html | Curiosity REMS data (this is the Gale instrument you want). |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | http://www-mars.lmd.jussieu.fr/ | MCD main portal. (redirige a https://www-mars.lmd.jussieu.fr/) |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | http://www-mars.lmd.jussieu.fr/mcd_python/ | MCD Python web query interface. (redirige a https://www-mars.lmd.jussieu.fr/mcd_python/) |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://software.nasa.gov/software/MFS-33158-1 | Mars-GRAM 2010 in the software catalog. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://ntrs.nasa.gov/citations/20240012934 | Said to be a 2024 Mars-GRAM update. No hit in my searches. |

## 7. Oxygen production (MOXIE)

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE | OK | 200 | texto | https://pds.nasa.gov/data/pds4/releases/atmos/mars2020_moxie-20241224/readme_moxie.txt | MOXIE bundle readme. Raw, calibrated and derived data for sols 0 to 659; derived includes oxygen mass rate in g/hr. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://pds-atmospheres.nmsu.edu/data_and_services/atmospheres_data/PERSEVERANCE/moxie.html | MOXIE page at PDS Atmospheres. CSV at 1 Hz, bundle about 46.7 MB. |

## 8. Surface point-of-view images and audio

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://data.nasa.gov/dataset/mars-rover-photos-api | Dataset record of the Mars Rover Photos API. |
| 🔴 NO SIRVE | OK | 404 | HTML | https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/latest_photos?api_key=DEMO_KEY | Latest Curiosity photos. |
| 🔴 NO SIRVE | OK | 404 | HTML | https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=1000&api_key=DEMO_KEY | Photos by sol (25 per page). Add `&camera=NAVCAM` to filter. |
| 🔴 NO SIRVE | OK | 404 | HTML | https://api.nasa.gov/mars-photos/api/v1/manifests/curiosity | Mission manifest (max sol, photos per sol, cameras). |
| 🔴 NO SIRVE | UNVERIFIED | 404 | HTML | https://api.nasa.gov/mars-photos/api/v1/ | Base endpoint (listed in the first chat). |
| 🔴 NO SIRVE | UNVERIFIED | 404 | HTML | https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=XXXX&camera=NAVCAM&api_key=DEMO_KEY | Template from the first chat. Replace XXXX with a real sol. |
| 🟢 SIRVE | SUSPECT | 200 | JSON | https://mars.nasa.gov/api/v1/raw_image_items/ | Raw image JSON API cited in a later message. The mars.nasa.gov domain moved to science.nasa.gov. Not found. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://mars.nasa.gov/mars2020/multimedia/audio/ | Perseverance audio recordings. (redirige a https://science.nasa.gov/mars/resources/?types=audio&search=perseverance) |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://www.nasa.gov/sounds-from-beyond/ | Alternate audio page. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://science.nasa.gov/mission/mars-2020-perseverance/sounds-of-mars/ | Sounds of Mars pack (LIBS laser, Ingenuity rotor, wind, wheels). |

## 9. Suit and EVA telemetry schema (SUITS)

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://github.com/SUITS-Techteam/SUITS_Test_TSS | Test Telemetry Stream Server (REST plus WebSocket) for student teams. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://github.com/SUITS-Techteam/TSS_2024 | 2024 TSS in C, with a `public` folder holding the JSON files the server uses. Best verified source for variable naming. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://github.com/SUITS-Techteam/TSS2026 | Said to hold the 2026 schemas. Not seen in my searches. |
| 🟢 SIRVE-PAGINA | SUSPECT | 200 | HTML | https://github.com/SUITS-Techteam/TSS2027 | Not found in any search. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://github.com/NASA-SUITS-Teams | Org page named in the second file. Not seen. |

## 10. Medical and human standards (RAG corpus)

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://www.nasa.gov/ochmo/human-spaceflight-and-aviation-standards | OCHMO hub for NASA-STD-3001 Volumes 1 and 2. (redirige a https://www.nasa.gov/ochmo/human-spaceflight-and-aviation-standards/) |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://standards.nasa.gov/node/237 | Vol. 2 record (Human Factors, Habitability, Environmental Health), version E, active. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://standards.nasa.gov/node/238 | Vol. 1 record (Crew Health) with the public PDFs. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://www.nasa.gov/reference/1-0-scope-vol-2 | Scope page of Vol. 2 reference material. (redirige a https://www.nasa.gov/reference/1-0-scope-vol-2/) |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://science.nasa.gov/category/organizations/ochmo | OCHMO technical briefs. Includes the CO2 / hypercapnia brief (OCHMO-TB-004) and a venous thromboembolism in spaceflight page. (redirige a https://science.nasa.gov/category/organizations/ochmo/) |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://ntrs.nasa.gov/citations/20180004678 | Introduction to MEDPRAT. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://ntrs.nasa.gov/citations/20200000974 | MEDPRAT dynamic risk with inference networks. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://ntrs.nasa.gov/citations/20210000586 | MEDPRAT treatment clusters. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://ntrs.nasa.gov/citations/20240012058 | IMM vs MEDPRAT assessment (NASA/TM-20240012058). |
| 🟢 SIRVE | OK | 200 | PDF | https://ntrs.nasa.gov/api/citations/20240012058/downloads/TM-20240012058.pdf | PDF of the above. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://ntrs.nasa.gov/citations/20230013414 | IMPACT, successor to IMM. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://ntrs.nasa.gov/citations/20190027540 | Accepted Medical Condition List for exploration medical capability scoping. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://ntrs.nasa.gov/citations/20220003136 | Newer TM version of the same list (NASA/TM-2022-220299). |
| 🟢 SIRVE | OK | 200 | PDF | https://ntrs.nasa.gov/api/citations/20220003136/downloads/NASA-T_1.pdf | PDF of TM-2022-220299. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://ntrs.nasa.gov/archive/nasa/casi.ntrs.nasa.gov/20190027540.pdf | Archive PDF path of 20190027540. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://science.data.nasa.gov/features-events/data-software-highlights-june-2026 | NASA data highlights, mentions OSDR Biological Data API updates. |
| 🟢 SIRVE | UNVERIFIED | 200 | JSON | https://visualization.osdr.nasa.gov/biodata/api/v2/datasets/ | OSDR / GeneLab biological data API. |
| 🟢 SIRVE | UNVERIFIED | 200 | JSON | https://visualization.osdr.nasa.gov/biodata/api/ | OSDR API root. |
| 🔴 NO SIRVE | UNVERIFIED | 404 | HTML | https://osdr.nasa.gov/osdr/data/osd/files/ | OSDR file listing. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_1 | Alternate Vol. 1 URL from the second file. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://standards.nasa.gov/standard/NASA/NASA-STD-3001_VOL_2 | Alternate Vol. 2 URL from the second file. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://ntrs.nasa.gov/citations/20250004555 | Said to be Vol. 2 Rev E. Not seen. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://ntrs.nasa.gov/citations/20230000738 | Said to be IMPACT / MEDPRAT v2.0. Not seen. |
| 🟢 SIRVE-PAGINA | SUSPECT | 200 | HTML | https://ntrs.nasa.gov/citations/20230005442 | Presented as IMPACT-MD / MedID. A search by that number returned nothing related. Use 20240012058 and 20230013414 instead. |

## 11. Robots, spacecraft and 3D models

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://science.nasa.gov/3d-resources/ | NASA 3D resources hub. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://github.com/nasa/NASA-3D-Resources | GitHub mirror of the models. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://science.nasa.gov/3d-resources/mars-reconnaissance-orbiter-mro-a/ | MRO model page. |

## 12. Orbits, ephemeris and communications

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://celestrak.org/NORAD/documentation/gp-data-formats.php | CelesTrak GP query documentation (TLE, JSON, XML, CSV). No API key. CelesTrak refreshes groups about every 2 hours and returns 403 on faster repeats. |
| 🔴 NO SIRVE | OK | 404 | HTML | https://api.nasa.gov/api/tle/25544 | NASA TLE API (ISS example). Fed daily from CelesTrak. |
| 🔴 NO SIRVE | OK | 508 | HTML | http://tle.ivanstanojevic.me/api/tle | Backend of the NASA TLE API. (redirige a https://tle.ivanstanojevic.me/api/tle/) |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://eyes.nasa.gov/apps/dsn-now/dsn.html | DSN Now. Updates every 5 seconds. NASA notes it can be offline during maintenance. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://www.github.com/Vinz87/DSNMonitor | Community project that reads the DSN Now public XML. (redirige a https://github.com/Vinz87/DSNMonitor) |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://lightstreamer.com/customer-story/how-nasa-is-using-lightstreamer/ | Background on the ISS Lightstreamer telemetry feed. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://celestrak.org/NORAD/elements/ | CelesTrak current element sets portal. |
| 🟢 SIRVE | UNVERIFIED | 200 | texto | https://celestrak.org/NORAD/elements/gp.php?GROUP=STATIONS&FORMAT=TLE | Query example. Same pattern as the documented format. |
| 🟢 SIRVE | UNVERIFIED | 200 | XML | https://eyes.nasa.gov/dsn/data/dsn.xml | DSN live data file. The second file says it updates every minute and takes `?r=<timestamp>` to bypass cache. DSN Now says 5 seconds. |
| 🟢 SIRVE | UNVERIFIED | 200 | XML | https://eyes.nasa.gov/dsn/config.xml | DSN station and spacecraft config. |
| 🔴 NO SIRVE | UNVERIFIED | 404 | HTML | https://ssd.jpl.nasa.gov/api/horizons.html | JPL Horizons API documentation. |
| 🟢 SIRVE | UNVERIFIED | 200 | JSON | https://ssd.jpl.nasa.gov/api/horizons.api | Horizons endpoint. MRO NAIF id is -74, Mars barycenter 499. |
| 🔴 NO SIRVE | UNVERIFIED | 404 | HTML | https://push.lightstreamer.com/ISSLIVE | ISS live telemetry stream (ECLSS values). |

## 13. Other apps from earlier prompts (Earth and Moon, not the main Mars app)

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟡 BLOQUEADA | OK | 403 | HTML | https://wiki.earthdata.nasa.gov/x/mgnXCw | GIBS documentation (WMTS, WMS, TWMS endpoints). (redirige a https://idfs.earthdatacloud.nasa.gov/realms/edl/protocol/openid-connect/auth?acr_values=edl_mfa&client_id=edl&exclude_idps=esa-eoiam%2Cgoogle&redirect_uri=https%3A%2F%2Furs.earthdata.nasa.gov%2Ffederated_keycloak&response_type=code&scope=openid&state=eyJjbGllbnRfaWQiOiJ1MW9fOHpPdW9scU5qdUxRejZ3ellRIiwicmVkaXJlY3RfdXJpIjoiaHR0cHM6Ly93aWtpLmVhcnRoZGF0YS5uYXNhLmdvdi9wbHVnaW5zL3NlcnZsZXQvQ29uZmx1ZW5jZU9BdXRoMiIsInJlc3BvbnNlX3R5cGUiOiJjb2RlIiwic3RhdGUiOiIvcGFnZXMvdmlld3BhZ2UuYWN0aW9uP3BhZ2VJZD0xOTg2NDIwNzQifQ%3D%3D) |
| 🟢 SIRVE | OK | 200 | imagen | https://gibs.earthdata.nasa.gov/wmts/epsg4326/all/ | GIBS WMTS sample endpoint. |
| 🟢 SIRVE | UNVERIFIED | 200 | imagen | https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/ | GIBS endpoint used in the Earth prompt. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://firms.modaps.eosdis.nasa.gov/api/ | FIRMS fire data API (free key). |

## 14. Event, rules and Argentina

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://astrobiology.com/2026/09/04/registration-is-now-open-for-the-2026-nasa-space-apps-challenge/ | Official dates: 14 and 15 November, judging begins 16 November. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://astrobiology.com/event/nasa-space-apps-challenge-2026/ | Event listing. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://www.spaceappschallenge.org/2025/ | Space Apps site (2025 archive, links to the 2026 pages). |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://www.spaceappschallenge.org/2025/space-agency-partners/ | Agency partners. CONAE has supported the event since 2021. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://www.argentina.gob.ar/noticias/nasa-space-apps-un-desafio-alcanzado-junto-la-conae | CONAE and Space Apps in Argentina. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://cholilaonline.ar/2026/10/nasa-space-apps-challenge-comodoro-rivadavia-2026.html | Comodoro Rivadavia confirmed as a 2026 host site. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://diariopanorama.com/noticia/561417/benavente-participo-presentacion-hackaton-nasa-se-realizara-noviembre-santiago-estero | Santiago del Estero confirmed as a 2026 host site. |
| 🟢 SIRVE-PAGINA | OK | 200 | HTML | https://therecursive.com/nasa-space-apps-challenge-2026-where-to-join-it-in-cee | Overview of 2026: 14 challenges, theme "The Next Frontier". (redirige a https://www.therecursive.com/nasa-space-apps-challenge-2026-where-to-join-it-in-cee/) |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://spaceappschallenge.org | Registration and rules (named without a full URL). (redirige a https://www.spaceappschallenge.org/) |

## 16. Added by the team (2026-11-14)

| Veredicto | md | HTTP | Tipo | URL | Data que trae |
|---|---|---|---|---|---|
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://mars.nasa.gov/mars2020/multimedia/raw-images/ | Perseverance raw images (Mars 2020). Note: mars.nasa.gov moved to science.nasa.gov, so it may redirect. Perseverance is at Jezero, not Gale. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://worldview.earthdata.nasa.gov/ | NASA Worldview, Earth imagery browser (GIBS). Earth only, relevant to section 13. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://trek.nasa.gov/mars/#v=0.1&x=0&y=0&z=1&p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104905&d=&locale=&b=mars&e=-337.4999937044213%2C-160.13671576287905%2C337.4999937044213%2C160.13671576287905&sfz=&w= | Mars Trek web viewer. Use it to read layer names and IDs for section 1. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars | USGS Astrogeology interactive Mars maps (ArcGIS Hub). USGS is a U.S. Government site. |
| 🟢 SIRVE-PAGINA | UNVERIFIED | 200 | HTML | https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/ | Curiosity's proposed path up Mount Sharp. Useful as a reference for the route map in the Gale study site. |

## Contradicciones con el catalogo

| URL | md decia | Realidad |
|---|---|---|
| https://api.nasa.gov/mars-wmts/catalog | OK | NO SIRVE (HTTP 0) |
| https://trek.nasa.gov/tiles/Mars/EQ/Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml | OK | NO SIRVE (HTTP 404) |
| https://trek.nasa.gov/tiles/Mars/EQ/Viking_MDIM21_ClrMosaic_global_232m/1.0.0/default/default028mm/1/0/0.jpg | OK | NO SIRVE (HTTP 404) |
| https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/default/default028mm/{Z}/{Y}/{X}.jpg | SUSPECT | SIRVE (HTTP 200) |
| https://astropedia.astrogeology.usgs.gov/download/Mars/MarsReconnaissanceOrbiter/CTX/mars_mro_hirise_explorationzones_day_2023/ancillary/ReadMe_Mars_DEMs_UCLA_2023.pdf | OK | NO SIRVE (HTTP 0) |
| https://github.com/roncapat/NASA-Hirise-DTMs-DEMs-index | SUSPECT | SIRVE-PAGINA (HTTP 200) |
| https://catalog.data.gov/dataset/msl-mars-radiation-assessment-detector-rdr-b9779 | OK | NO SIRVE (HTTP 404) |
| https://catalog.data.gov/dataset/msl-mars-radiation-assessment-detector-edr-5dda7 | OK | NO SIRVE (HTTP 404) |
| https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/latest_photos?api_key=DEMO_KEY | OK | NO SIRVE (HTTP 404) |
| https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=1000&api_key=DEMO_KEY | OK | NO SIRVE (HTTP 404) |
| https://api.nasa.gov/mars-photos/api/v1/manifests/curiosity | OK | NO SIRVE (HTTP 404) |
| https://mars.nasa.gov/api/v1/raw_image_items/ | SUSPECT | SIRVE (HTTP 200) |
| https://github.com/SUITS-Techteam/TSS2027 | SUSPECT | SIRVE-PAGINA (HTTP 200) |
| https://ntrs.nasa.gov/citations/20230005442 | SUSPECT | SIRVE-PAGINA (HTTP 200) |
| https://api.nasa.gov/api/tle/25544 | OK | NO SIRVE (HTTP 404) |
| http://tle.ivanstanojevic.me/api/tle | OK | NO SIRVE (HTTP 508) |
