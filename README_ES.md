[![Read in English](https://img.shields.io/badge/Read%20in-English-0ea5e9?style=for-the-badge)](README.md)

<sub>Este proyecto cuenta con el apoyo de [NASA](https://www.nasa.gov/), [NASA Space Apps Challenge](https://www.spaceappschallenge.org/), [CONAE](https://www.argentina.gob.ar/ciencia/conae), [Universidad de Palermo](https://www.palermo.edu/) e [IBM Argentina](https://www.ibm.com/ar-es).</sub><br/>
<sub>Todo el desarrollo del proyecto se realizó dentro de la ventana de la hackathon desde el 14/11/2026 a las 09:00 ART (UTC-3), verificable por la fecha de creación del repositorio (2026-11-14 16:56:55 UTC), hashes de commits (commit inicial [a3f7a4e](https://github.com/agustindiazcano/nasa-mars-tango-horizon/commit/a3f7a4e7d0bfa7ba5677b80eec3c6523eb61433b)) y [Pull Requests](https://github.com/agustindiazcano/nasa-mars-tango-horizon/pulls?q=is%3Apr).</sub>

# Tango Horizon: Sistemas de IA para EVA y Exploración de Marte

**Sistemas Multi-Agente Autónomos de IA para Actividades Extravehiculares (EVA)**

## Índice

- [Equipo: Tango Horizon (Buenos Aires, Argentina)](#equipo-tango-horizon-buenos-aires-argentina)
- [Enlaces del NASA Space Apps Challenge](#enlaces-del-nasa-space-apps-challenge)
- [Uso de IA](#uso-de-ia)
- [README técnico completo (Modelos y Tecnologías)](#readme-tecnico-completo)
- [Licencia](#licencia)

## Equipo: Tango Horizon (Buenos Aires, Argentina)

- **Agustin Diaz Cano:** Maestrando en Ingeniería en Sistemas ([UTN, FRBA](https://frba.utn.edu.ar/)) · [LinkedIn](https://www.linkedin.com/in/agustindiazcano/) · [Portfolio](https://www.agustindiazcano.com/) · [GitHub](https://github.com/agustindiazcano) · [Qollab](https://qollab.xyz/u/agustindiazcano) · [YouTube](https://www.youtube.com/@agustin-diaz-cano)
- **Baltazar Salerno:** Desarrollador Frontend · [GitHub](https://github.com/S-Baltazar)
- **Milagros Sotelo:** Estudiante de Ingeniería en Sistemas ([UTN, FRBA](https://frba.utn.edu.ar/)) · [GitHub](https://github.com/Milagros-Sotelo)
- **Federico Yaconis:** Desarrollador 3D y QA

## Enlaces del NASA Space Apps Challenge

- **Equipo:** https://www.spaceappschallenge.org/2026/find-a-team/tango-horizon/?tab=project
- **Evento local — Sede [Universidad de Palermo](https://www.palermo.edu/) (Buenos Aires, Argentina):** https://www.spaceappschallenge.org/2026/local-events/buenos-aires/
- **Desafío — Interplanetary Survival Guide: Martian Map:** https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/
- **Reglas (Términos y Condiciones para Participantes):** https://www.spaceappschallenge.org/legal/
- **Guía de entrega de proyectos (Submission Guide):** https://www.spaceappschallenge.org/resources/project-submission-guide/
- **Recursos y Preguntas Frecuentes (FAQs):** https://www.spaceappschallenge.org/resources/ · https://www.spaceappschallenge.org/resources/participant-faqs/
- **Space Apps Challenge:** https://www.spaceappschallenge.org/

## Uso de IA

### Metodología de desarrollo asistido por IA (Software 3.0)

Este proyecto se construyó con desarrollo asistido por IA al estilo Software 3.0: los agentes de programación con IA participaron en todo el proceso de desarrollo (implementación, pruebas, CI/CD, pull requests, commits y documentación validados y diseñados por humanos, despliegue), bajo dirección y revisión humana.

- **Agentes de código:** Codex, Claude Code, Gemini Antigravity, IBM Bob, Meta Muse
- **Orquestación en paralelo y aislamiento:** Múltiples agentes ejecutados en paralelo bajo un agente orquestador coordinando modelos medianos, cada uno en su propio worktree y rama para evitar conflictos, junto con un agente code reviewer
- **IA para workflows:** ChatGPT, Gemini, Google AI Studio, Grok

**Contratos para el contexto de los agentes.** Los agentes reciben su contexto mediante archivos de contrato: [`AGENTS.md`](AGENTS.md) (reglas), [`PENDING.md`](PENDING.md) (tareas abiertas priorizadas) y [`LASTCONTEXT.md`](LASTCONTEXT.md) (último estado y próximo paso). Cada tarea actualiza [`PENDING.md`](PENDING.md) y [`LASTCONTEXT.md`](LASTCONTEXT.md) para que el siguiente agente arranque desde el mismo estado.

**Responsabilidad humana (human in the loop).** Todos los planes, revisiones de código, validación de datos, diseños, formulaciones matemáticas, implementaciones y resultados empíricos fueron auditados y verificados por los autores.

<a id="readme-tecnico-completo"></a>
<details>
<summary><strong>Ver README completo — Arquitectura, Modelos y Tecnologías</strong></summary>

## Resumen del sistema

Tango Horizon es un simulador 3D en tiempo real de operaciones EVA sobre cartografía NASA/USGS del cráter Gale, que combina física y bioastronáutica determinista (`@th/shared`), voz multilingüe manos libres, control remoto móvil por WebSocket y un sistema multi-agente jerárquico protegido por Run-Time Assurance (`GUARDIAN`).

- **Orquestación de voz y multi-agente (`server/src/agents/`):** Las órdenes por voz entran por `SUIT.VOICE-EXEC` (nivel rápido) y escalan a `BASE` (nivel grande), que coordina agentes de dominio (`SUIT.HEALTH`, `EVA-PLANNER`, `SCIENCE`, `WEATHER-RAD`, `MAINTENANCE`) y planificadores por unidad (`ROBOT.<id>`).
- **Servidores MCP en proceso (`server/src/agents/tools/mcp.ts`):** Seis servidores MCP (`terrain`, `environment`, `suit`, `fleet`, `hud`, `knowledge`) corren dentro del mismo proceso sobre `InMemoryTransport`.
- **RAG BM25 sobre estándares (`server/src/agents/tools/knowledge.ts`):** Búsqueda BM25 en memoria sobre fragmentos de `NASA-STD-3001` (Vol. 1 y 2), `OCHMO`, `AMCL`, `Mars-GRAM` y `MOXIE` (`server/corpus/chunks.json`) con citas de documento y página.
- **Run-Time Assurance (`GUARDIAN`, `server/src/agents/guardian.ts`):** Límites duros deterministas (pendiente máxima por vehículo, radio de exclusión de 15 m para cápsula O2, 2 m de despeje del brazo manipulador, restricción de vuelo por polvo `tau < 1.8`, prohibición de pirotecnia cerca de trajes 100 % O2) combinados con un juez LLM de seguridad y prompt injection.
- **Failover de 3 proveedores LLM (`server/src/llm/provider.ts`):** Conmutación automática entre Google Cloud Vertex AI (primario por ADC), Google AI Studio y Meta Muse API, más respaldo determinista offline (`offline.ts`).

## Modelos utilizados

| Componente / Nivel | Modelo / Arquitectura | Proveedor / Framework | Uso y notas |
|---|---|---|---|
| Orquestador (`large`) | `google/gemini-4-carbon` (respaldo: `gemini-4-carbon`, `muse-wonder-1.0`) | Vertex AI / Google AI Studio / Meta Muse | Planificador `BASE` y orquestación de herramientas y agentes |
| Agentes de dominio y visión (`medium`, `vision`) | `google/gemini-4-argon` (respaldo: `gemini-4-argon`, `muse-wonder-1.0`) | Vertex AI / Google AI Studio / Meta Muse | `SUIT.HEALTH`, `EVA-PLANNER`, `SCIENCE`, `WEATHER-RAD`, `MAINTENANCE`, `ROBOT.<id>` y análisis de cámara de rover |
| Ejecutor de voz del traje (`fast`) | `google/gemini-4-hydrogen` (respaldo: `gemini-4-hydrogen`, `muse-spark-1.3`) | Vertex AI / Google AI Studio / Meta Muse | Comandos rápidos de HUD, telemetría y enrutamiento de voz (`SUIT.VOICE-EXEC`) |
| Juez de seguridad (`judge`) | `google/gemini-4-argon` (respaldo: `gemini-4-argon`, `muse-spark-1.3`) | Vertex AI / Google AI Studio / Meta Muse | Evaluación contextual de seguridad y prompt injection en `GUARDIAN` |
| Síntesis de voz neural (TTS) | Voces Journey (`es-US-Journey-D`, `en-US-Journey-D`, `fr-FR`, `de-DE`, `it-IT`) | Google Cloud Text-to-Speech | Respuestas habladas vía `/api/tts` con caché SHA-1 en memoria |
| Prospector de hidratación (`tango-horizon-hydration-v1`) | Ensamble `GradientBoostingRegressor` (media + cuantiles) | scikit-learn (Python) | Indicador de hidrógeno mineral superficial (`R² = 0.364`, `Spearman = 0.582`, CV espacial 500 m, `n = 1,567`) |
| Predictor de tormentas (`rems_hgbr_quantile_v1`) | `HistGradientBoostingRegressor` por cuantiles (`q = 0.1, 0.5, 0.9`) + CQR | scikit-learn (Python) | Pronóstico 1–3 soles de opacidad `tau` desde mareas REMS (`MY 34` retenido, `Spearman = 0.765–0.796`) |
| Detector de vetas minerales (`tango-horizon-veins-v1`) | `facebook/dinov2-small` congelado (`dinov2_vits14`) + `LogisticRegression` (con respaldo Gabor/morfológico) | PyTorch, Hugging Face `transformers`, scikit-learn | Detección visual de vetas candidatas y mapas de calor en Mastcam/MAHLI (`ROC-AUC = 0.845`, `PR-AUC = 0.796`, `n = 117`) |
| Activos 3D | Generación de mallas 3D (GLB) | Meshy AI | Modelos 3D de rovers, astronauta y módulos de base |

## Tecnologías e infraestructura

| Capa | Tecnologías |
|---|---|
| Frontend y visor 3D | TypeScript, Vite, Three.js (`three` WebGL2), HUD 3D curvo en CSS, Web Speech API, Web Audio API, `qrcode`, `@vercel/analytics` |
| Backend y runtime de agentes | Node.js 22, Fastify 5 (`@fastify/static`, `@fastify/websocket`, `@fastify/rate-limit`), `@modelcontextprotocol/sdk` (`InMemoryTransport`), Zod (`zod`, `zod-to-json-schema`), SDK `openai`, `google-auth-library` |
| Física compartida y tests | TypeScript (`@th/shared`: tasa metabólica Pandolf, flujo estrangulado, balística RK4, dosis por factor de vista de cielo, planificadores de ruta), Vitest (`vitest`) |
| Ciencia de datos y pipeline GIS | Python 3, NumPy, Pandas, SciPy, scikit-learn, `joblib`, PyTorch (`torch`), `transformers`, Pillow, Matplotlib, Rasterio, PyProj, PyMuPDF (`pymupdf`), Requests |
| Google Cloud e IaC | Terraform (`infra/terraform/`), Cloud Run, Cloud Build, Artifact Registry, Secret Manager, Vertex AI, Cloud Text-to-Speech, Cloud IAM (`tango-horizon-sa`) |
| Contenedores, hosting y CI/CD | Docker (`node:22-slim` multi-etapa), GitHub Actions (`.github/workflows/ci.yml` jobs paralelos de test y build), Vercel (CDN Edge + rewrite `/remote`), GitHub (ramas y Pull Requests), `deploy.sh` |

## Workspaces y comandos

- `shared/` (`@th/shared`): núcleo de física determinista, esquemas y diccionarios i18n (`EN`/`ES`/`FR`/`DE`/`IT`).
- `server/` (`@th/server`): API Fastify, servidores MCP en proceso, RAG BM25, `GUARDIAN`, proxy TTS y relay WebSocket (`/ws/remote`).
- `web/`: visor 3D Vite + Three.js, controlador de voz y datasets NASA/USGS en `web/public/data/`.
- `tools/`: scripts offline en Python para ingestión de datos, terreno, corpus RAG y entrenamiento ML.
- `infra/terraform/`: definición de infraestructura en Google Cloud para el proyecto `nasa-tango-horizon`.

```bash
npm install
npm run dev:web
npm test
npm run build
```

</details>

## Licencia

Copyright (c) 2026 Agustin Diaz-Cano, Baltazar Salerno, Milagros Sotelo y Federico Yaconis.

Este proyecto se distribuye bajo la [Licencia MIT](LICENSE).
