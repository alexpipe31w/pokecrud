---
description: Arranque de sesión PokéCRUD GO — ponerse al día y reclamar una tarea
argument-hint: '[ID de tarea opcional, p. ej. F1-03] [tu nombre]'
---

Vas a empezar una sesión en PokéCRUD GO. Sigue la **REGLA 1 de `CLAUDE.md`** al pie de la letra:

1. Ejecuta `git fetch --all`, `git checkout develop` y `git pull`. Si hay cambios locales sin commitear,
   para y pregúntame qué hacer con ellos (no los descartes).
2. Lee completos: `docs/plan/ESTADO.md`, `docs/plan/ROADMAP.md`, `docs/plan/ARQUITECTURA.md`,
   `docs/plan/DECISIONES.md`, `docs/plan/DISENO.md` y las 3 últimas entradas de `docs/plan/BITACORA.md`.
   Si existe el plan detallado de la fase actual en `docs/plan/fases/`, léelo también.
3. Tarea: si en los argumentos viene un ID (`$ARGUMENTS`), esa. Si no, la primera `[ ]` del ROADMAP con
   todas sus dependencias en `[x]`. Si la fase no tiene plan detallado, la tarea es escribirlo primero
   (skill `writing-plans`).
4. Si no sé tu nombre por los argumentos, pregúntame quién soy (Alex, Kenneth o Samuel) antes de reclamar.
5. Reclama la tarea: `[ ]` → `[~] (@nombre, fecha de hoy)` en ROADMAP, ponla en "En curso" de ESTADO,
   crea la rama `feature/<ID>-descripcion` desde `develop`, commit `"<ID>: reclama tarea"` y push.
   Si el push o el pull muestran que otro ya la reclamó, elige otra y avísame.
   5b. Si la tarea ya está `[~]` de otro compañero y vengo a **retomarla** (se le acabaron los tokens): no crees rama
   nueva; `git checkout` de SU rama, `git pull`, lee su "Punto de guardado" en ESTADO.md y sigue desde ese paso.
6. Respóndeme en 3-5 líneas: qué tarea cogiste, qué vas a hacer, riesgos que ves. Luego empieza.

Durante el trabajo haz `/guardar` al terminar cada paso del plan y como mucho cada 20 min (REGLA 2b).
Usa las skills del proyecto cuando toquen: `test-driven-development` para lógica en
`shared/` y `server/`, `estandares-produccion` para todo endpoint/socket/migración,
`systematic-debugging` ante cualquier fallo, `verification-before-completion` antes de decir que algo
está hecho, `webapp-testing` para probar la UI en vista móvil. La norma visual es `docs/plan/DISENO.md`.
