[![Read in English](https://img.shields.io/badge/Read%20in-English-0ea5e9?style=for-the-badge)](README.md)

<sub>Este proyecto cuenta con el apoyo de [NASA](https://www.nasa.gov/), [NASA Space Apps Challenge](https://www.spaceappschallenge.org/), [CONAE](https://www.argentina.gob.ar/ciencia/conae), [Universidad de Palermo](https://www.palermo.edu/) e [IBM Argentina](https://www.ibm.com/ar-es).</sub><br/>
<sub>Todo el desarrollo del proyecto se realizó dentro de la ventana de la hackathon desde el 14/11/2026 a las 09:00 ART (UTC-3), verificable por la fecha de creación del repositorio (2026-11-14 16:56:55 UTC), hashes de commits (commit inicial [a3f7a4e](https://github.com/agustindiazcano/nasa-mars-tango-horizon/commit/a3f7a4e7d0bfa7ba5677b80eec3c6523eb61433b)) y [Pull Requests](https://github.com/agustindiazcano/nasa-mars-tango-horizon/pulls?q=is%3Apr).</sub>

# Tango Horizon: Sistemas de IA para EVA y Exploración de Marte

**Sistemas Multi-Agente Autónomos de IA para Actividades Extravehiculares (EVA)**

## Índice

- [Equipo: Tango Horizon (Buenos Aires, Argentina)](#equipo-tango-horizon-buenos-aires-argentina)
- [Enlaces del NASA Space Apps Challenge](#enlaces-del-nasa-space-apps-challenge)
- [Uso de IA](#uso-de-ia)
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
- **Recursos y Preguntas Frecuentes (FAQs):** https://www.spaceappschallenge.org/resources/ · https://www.spaceappschallenge.org/resources/participant-faqs/
- **Space Apps Challenge:** https://www.spaceappschallenge.org/

## Uso de IA

### Metodología de desarrollo asistido por IA (Software 3.0)

Este proyecto se construyó con desarrollo asistido por IA al estilo Software 3.0: los agentes de programación con IA participaron en todo el proceso de desarrollo (implementación, pruebas, CI/CD, pull requests, commits y documentación validados y diseñados por humanos, despliegue), bajo dirección y revisión humana.

- **Agentes de código:** Codex, Claude Code, Gemini Antigravity, IBM Bob, Meta Muse
- **Orquestación en paralelo y aislamiento:** Múltiples agentes ejecutados en paralelo bajo un agente orquestador coordinando modelos medianos, cada uno en su propio worktree y rama para evitar conflictos, junto con un agente code reviewer
- **IA para workflows:** ChatGPT, Gemini, Google AI Studio, Grok
- **Generación de modelos 3D:** Tripo AI (China), Meshy AI (Estados Unidos)

**Contratos para el contexto de los agentes.** Los agentes reciben su contexto mediante archivos de contrato: [`AGENTS.md`](AGENTS.md) (reglas), [`PENDING.md`](PENDING.md) (tareas abiertas priorizadas) y [`LASTCONTEXT.md`](LASTCONTEXT.md) (último estado y próximo paso). Cada tarea actualiza [`PENDING.md`](PENDING.md) y [`LASTCONTEXT.md`](LASTCONTEXT.md) para que el siguiente agente arranque desde el mismo estado.

**Responsabilidad humana (human in the loop).** Todos los planes, revisiones de código, validación de datos, diseños, formulaciones matemáticas, implementaciones y resultados empíricos fueron auditados y verificados por los autores.

## Licencia

Copyright (c) 2026 Agustin Diaz-Cano, Baltazar Salerno, Milagros Sotelo y Federico Yaconis.

Este proyecto se distribuye bajo la [Licencia MIT](LICENSE).
