# Bitácora

> Solo se **añade al final**. Nunca se borra ni se edita lo de otro. Una entrada por sesión (o por
> trozo cerrado si la sesión fue larga). Copia la plantilla:

```
## AAAA-MM-DD HH:MM · @nombre · <ID tarea> · rama `feature/...`
**Qué se hizo:** …
**Archivos clave:** `ruta` (qué), …
**Cómo se probó (salida real):**
    npm test → 42 passed …
**Quedó a medias / roto:** … (o "nada")
**Decisiones nuevas:** D-0XX … (o "ninguna")
**El siguiente debe empezar por:** <instrucción concreta, p. ej. "abrir src/app/game/map-scene/x.ts y terminar la función y()">
```

---

## 2026-10-11 · @alex (Claude) · PLAN-MAESTRO · rama `feature/plan-maestro`

**Qué se hizo:** revisión del repo (solo esqueleto: 5 páginas con `PagePlaceholderComponent`, JSON Server
con 3 recursos, proceso Scrum). Decisión de no empezar de cero (D-001). Plan maestro completo:
`VISION.md`, `ARQUITECTURA.md`, `DISENO.md`, `ROADMAP.md` (F0–F8), `DECISIONES.md` (D-001…D-011),
`ESTADO.md`, esta bitácora. `CLAUDE.md` con las reglas de relevo. Comandos `/inicio` y `/cierre`.
Hook `SessionStart` que inyecta `ESTADO.md`. Skills esenciales copiadas a `.claude/skills/`.
**Archivos clave:** `CLAUDE.md`, `AGENTS.md`, `docs/plan/*`, `.claude/commands/*`, `.claude/hooks/session-start.js`,
`.claude/settings.json`, `.claude/skills/*`, `.gitignore`.
**Cómo se probó (salida real):** comprobado contra PokéAPI en vivo: `pokemon-species` count = 1025;
#25 con `cries.latest`, `showdown` y `home`; #1025 con grito y sin `showdown`; `capture_rate` #25 = 190.
Android SDK y Android Studio (con `jbr`) presentes en el PC de Alex; Java del sistema es 1.8 (no sirve
para Capacitor 8 → usar el `jbr`). Hook de arranque ejecutado a mano (ver salida en el PR).
No se tocó código de la app.
**Quedó a medias / roto:** nada.
**Decisiones nuevas:** D-001 a D-011.
**El siguiente debe empezar por:** `/inicio` → coger F0-01 y escribir `docs/plan/fases/F0-fundaciones.md`
con la skill `writing-plans`.
