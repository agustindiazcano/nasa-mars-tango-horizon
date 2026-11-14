# Último contexto

> Resumen de la sesión anterior. Se sobrescribe al final de cada sesión.

**Fecha:** 2026-11-14
**Agente:** Claude Code

## Qué se hizo

- Se creó la estructura de instrucciones para agentes en un directorio que estaba vacío:
  - `AGENTS.md`: fuente única de instrucciones.
  - `CLAUDE.md` y `GEMINI.md`: solo importan `AGENTS.md` con `@AGENTS.md`.
  - `LASTCONTEXT.md` (este archivo) y `PENDING.md`, importados desde `AGENTS.md`.
- Se agregó en `AGENTS.md` la regla obligatoria de leer siempre `PENDING.md` y `LASTCONTEXT.md` antes de cada sesión.
- Se creó `README.md` (título "Tango Horizon", secciones Team, AI Usage y License) y el archivo `LICENSE` con la licencia MIT a nombre de Agustin Diaz-Cano y Baltazar Salerno.
- Se inicializó git (rama `main`) y se configuró `origin` → https://github.com/agustindiazcano/nasa-mars-tango-horizon.git. El remoto está vacío; todavía no hay commits ni push.
- Se agregó en `AGENTS.md` la regla de cierre de tarea: commit al terminar, y pedir permiso para el PR y para avanzar con la siguiente.

## Decisiones

- Las reglas se escriben solo en `AGENTS.md` para no duplicarlas entre herramientas.
- `LASTCONTEXT.md` se sobrescribe en cada sesión (no es un historial); lo que falta hacer va en `PENDING.md`.
- Los dos archivos de memoria van en mayúsculas, igual que `AGENTS.md`.

## Estado en que quedó

- El proyecto todavía no tiene código. Los 7 archivos de la raíz están sin commitear.
- La sección "Proyecto" de `AGENTS.md` tiene un TODO: falta describir objetivo, stack y comandos.
