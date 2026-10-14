---
description: Punto de guardado rápido (commit + push + ESTADO) para que otro compañero pueda seguir si se acaban los tokens
argument-hint: '[nota opcional]'
---

Haz un **punto de guardado** ahora mismo, rápido (máximo 3-4 llamadas a herramientas). Es la REGLA 2b de
`CLAUDE.md`. No es el cierre: después sigues trabajando en lo mismo.

1. `git add` de lo que has cambiado en esta tarea (nunca `.env`, `environment.local.ts`, keystores;
   comprueba con `git diff --cached --name-only`).
2. Si el código **compila y los tests pasan** → commit `"<ID>: <qué avanzaste>"`.
   Si **no** (estás a medias) → commit igualmente: `"<ID>: WIP <qué avanzaste> (no compila: <por qué>)"`.
   Un WIP en tu rama `feature/...` está bien; perder el trabajo no.
3. En `docs/plan/ESTADO.md`, sección "En curso", deja la línea de tu tarea así (reescríbela, no acumules):
   `- <ID> (@nombre) · rama feature/... · **Punto de guardado AAAA-MM-DD HH:MM**: hecho <pasos ya marcados>;
ahora en <paso exacto del plan de fase>; siguiente: <acción concreta>; estado: compila ✅ / WIP ❌ <motivo>.`
   Si estás siguiendo un plan de `docs/plan/fases/`, marca `[x]` en los pasos terminados de ESE archivo.
4. Inclúyelo en el mismo commit (o un segundo commit `"<ID>: punto de guardado"`) y **`git push`**.
5. Responde con una sola línea: `💾 Guardado <hash> · siguiente: <acción>`. Y sigue con el trabajo.

Nota del usuario: $ARGUMENTS
