# AGENTS.md

Instrucciones compartidas para todos los agentes de código (Claude Code, Gemini CLI, Codex, etc.).
`CLAUDE.md` y `GEMINI.md` solo importan este archivo: cualquier regla nueva va acá.

## Regla obligatoria: antes de cada sesión

**SIEMPRE, antes de hacer cualquier otra cosa en una sesión, leer `PENDING.md` y `LASTCONTEXT.md`.** Sin excepciones, aunque la tarea pedida parezca no tener relación.

@LASTCONTEXT.md
@PENDING.md

Si tu herramienta no resuelve los `@imports` de arriba, abrí los dos archivos a mano antes de responder.

Si el usuario no indica otra cosa, continuar por la tarea de mayor prioridad de `PENDING.md`.

## Regla obligatoria: al terminar cada tarea

1. Hacer commit de los cambios de esa tarea (un commit por tarea, con mensaje que la describa).
2. Actualizar `PENDING.md` y `LASTCONTEXT.md` e incluirlos en ese commit.
3. **Pedir permiso al usuario** antes de abrir el PR y antes de avanzar con la siguiente tarea. No hacer push/PR ni empezar otra tarea sin su confirmación.

## Proyecto

`nasa-mars-tango-horizon` — <!-- TODO: describir en 1-2 líneas el objetivo del proyecto, stack y comandos (instalar, correr, testear) -->

## Memoria entre sesiones

| Archivo | Contenido | Cuándo actualizarlo |
|---|---|---|
| `LASTCONTEXT.md` | Lo último que se hizo: resumen de la sesión anterior, decisiones y estado en que quedó el trabajo | Al terminar cada sesión (se sobrescribe, no se acumula) |
| `PENDING.md` | Lista de tareas pendientes con prioridad | Cada vez que se completa, agrega o reprioriza una tarea |

### Al terminar una sesión (o un bloque de trabajo importante)

1. Reescribir `LASTCONTEXT.md` con: fecha, qué se hizo, archivos tocados, decisiones tomadas y por qué, y en qué punto exacto quedó el trabajo.
2. Actualizar `PENDING.md`: sacar lo completado, agregar lo nuevo, reordenar prioridades.
3. No dejar en `LASTCONTEXT.md` nada que ya esté en `PENDING.md` (uno es historia reciente, el otro es lo que falta).

## Convenciones

- Responder en el idioma en que escribe el usuario (normalmente español).
- Prioridades con semáforo: 🔴 bloqueante/urgente, 🟡 siguiente, 🟢 después, ⚪ backlog.
