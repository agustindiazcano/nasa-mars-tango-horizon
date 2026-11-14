[![Read in English](https://img.shields.io/badge/Read%20in-English-0ea5e9?style=for-the-badge)](README.md)

<sub>Este proyecto cuenta con el apoyo de [NASA](https://www.nasa.gov/), [NASA Space Apps Challenge](https://www.spaceappschallenge.org/), [CONAE](https://www.argentina.gob.ar/ciencia/conae), [Universidad de Palermo](https://www.palermo.edu/) e [IBM Argentina](https://www.ibm.com/ar-es).</sub>

# Tango Horizon: Sistemas de IA para EVA y Exploración de Marte

**Sistemas Multi-Agente Autónomos de IA para Actividades Extravehiculares (EVA)**

## Índice

- [Equipo: Tango Horizon (Buenos Aires, Argentina)](#equipo-tango-horizon-buenos-aires-argentina)
- [Enlaces del NASA Space Apps Challenge](#enlaces-del-nasa-space-apps-challenge)
- [Metodología de desarrollo asistido por IA (Software 3.0)](#metodología-de-desarrollo-asistido-por-ia-software-30)
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
- **Space Apps Challenge:** https://www.spaceappschallenge.org/

## Metodología de desarrollo asistido por IA (Software 3.0)

Este proyecto se construyó con desarrollo asistido por IA al estilo Software 3.0: los agentes de programación con IA participaron en todo el proceso de desarrollo (implementación, pruebas, CI/CD, pull requests, commits y documentación validados y diseñados por humanos, despliegue), bajo dirección y revisión humana. Agentes de programación utilizados: Codex, Claude Code y Gemini Antigravity.

**Contratos para el contexto de los agentes.** Los agentes reciben su contexto mediante archivos de contrato: [`AGENTS.md`](AGENTS.md) (reglas), [`PENDING.md`](PENDING.md) (tareas abiertas priorizadas) y [`LASTCONTEXT.md`](LASTCONTEXT.md) (último estado y próximo paso). Cada tarea actualiza [`PENDING.md`](PENDING.md) y [`LASTCONTEXT.md`](LASTCONTEXT.md) para que el siguiente agente arranque desde el mismo estado.

**Responsabilidad humana (human in the loop).** Todos los planes, revisiones de código, validación de datos, diseños, formulaciones matemáticas, implementaciones y resultados empíricos fueron auditados y verificados por los autores.

## Licencia

Copyright (c) 2026 Agustin Diaz-Cano, Baltazar Salerno, Milagros Sotelo y Federico Yaconis.

Este proyecto se distribuye bajo la [Licencia MIT](LICENSE).
