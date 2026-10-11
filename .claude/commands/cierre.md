---
description: Cierre de sesión PokéCRUD GO — dejar todo documentado para el siguiente compañero
argument-hint: "[nota opcional, p. ej. 'me quedo sin tokens']"
---

Vas a cerrar la sesión (o un trozo de trabajo). Sigue la **REGLA 2 de `CLAUDE.md`**. Prioridad absoluta:
que el siguiente compañero (otra cuenta de Claude, sin memoria de esta sesión) pueda seguir sin preguntar.
Si vas justo de contexto/tokens, haz los pasos 3-6 aunque no te dé tiempo a más.

1. Ejecuta `npm run build`, `npm run lint` y `npm test` (y en `server/` sus equivalentes si existe).
   Guarda la salida real (resumida).
2. Si algo falla y no se arregla en pocos minutos, NO lo escondas: anótalo como roto.
3. `docs/plan/ROADMAP.md`: marca `[x]` solo si se cumple TODO el criterio de aceptación. Si no, deja `[~]` y
   escribe debajo, con sangría, qué falta exactamente.
4. Reescribe `docs/plan/ESTADO.md` (fase, hecho, en curso, siguiente paso concreto, bloqueos, URLs).
5. Añade al FINAL de `docs/plan/BITACORA.md` una entrada con la plantilla del archivo, incluida la salida de
   los tests y la línea **"El siguiente debe empezar por:"** con una instrucción accionable (archivo y función).
6. Si hubo decisiones de diseño o arquitectura, añádelas a `docs/plan/DECISIONES.md`.
7. `git add` solo de lo que toca (nunca `.env`, keys, keystores), commit `"<ID>: …"` y push de la rama.
   Si la tarea quedó `[x]`, abre PR a `develop` con la plantilla de `.github/pull_request_template.md`.
8. Dame un resumen de 5 líneas + link del PR o de la rama.

Nota del usuario: $ARGUMENTS
