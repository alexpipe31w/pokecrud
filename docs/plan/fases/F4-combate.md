# F4 · Motor de combate y combate contra IA — Plan de implementación

> **Para IAs:** usa la skill `executing-plans` (o `subagent-driven-development`). Cada tarea = una tarea del ROADMAP
> (`F4-02` … `F4-06`) = **una rama y un PR**. Antes: REGLA 1 de `CLAUDE.md`. Al acabar: REGLA 2. Marca las casillas
> `- [ ]` de TU tarea en TU rama según avances (punto de guardado para el siguiente compañero).

**Objetivo:** combates por turnos "de juego principal" donde **toda la ficha del Pokémon importa** (VISION): stats
base + IVs + naturaleza + nivel, 18 tipos, STAB, crítico, precisión, prioridad, PP, estados y cambios de stats. Primero
contra la IA (F4); el PvP (F5) y los torneos (F6) reutilizan **el mismo motor** en el servidor.

**Arquitectura (ARQUITECTURA §7, D-007):** el motor vive en `shared/engine/battle/`, TypeScript puro sin Angular ni
Nest, probado con Vitest en Node. El núcleo es un **reducer puro**:

```
resolveTurn(state, actions, rng) → { state: nuevoEstado, events: BattleEvent[] }
```

Mismo estado + mismas acciones + misma semilla = mismo resultado. La app anima los `events` uno tras otro; el
servidor (F5) ejecuta el mismo código con SU RNG y manda los eventos a los dos jugadores. **El cliente nunca calcula
el daño en PvP** (REGLA 3).

**Simplificaciones v1 (D-007, se mantienen):** EV = 0, sin habilidades, sin objetos equipados, sin clima de combate,
1 vs 1 activo con equipos de hasta 6. Nivel real contra la IA; **normalizado a 50** en PvP y torneos.

## Qué movimientos soporta la v1 (medido sobre `moves.json`, 706 movimientos, 2026-10-11)

| Grupo | Nº | v1 |
| --- | --- | --- |
| Con poder (físicos y especiales), incl. multigolpe (24), drenaje (10), retroceso (9), prioridad ≠ 0 (49), crítico alto (23) | 442 | ✔ |
| De estado con cambios de stats, estado alterado (quemado, paralizado, envenenado, dormido, congelado, confusión) o curación | 108 | ✔ |
| De estado con otros efectos (Remolino, Pantalla Luz, Metrónomo, Drenadoras, Protección…) | 126 | ✘ |
| De daño sin poder fijo (Sísmico, Furia Dragón, Guillotina, Contraataque…) | 30 | ✘ (F7 si sobra tiempo) |

**550 de 706 (78 %).** `isSupportedMove(move)` (F4-03) decide; los Pokémon **no reciben** movimientos no soportados
(se filtran al elegir los 4 por defecto, también en `movesAtLevel` del servidor, F2-06). Si a una especie no le
queda ninguno, usa **Placaje** (id 33) como reserva.

**Hueco del dataset (ARREGLADO en F4-02, ver D-029):** `moves.json` no trae a quién afectan los cambios de stats
(`target` de PokéAPI: `user` / `selected-pokemon` / …) ni la probabilidad de **retroceso** (`flinch_chance`). Sin
`target`, "Puño Incremento" subiría el ataque del rival. Se añaden `target` y `flinchChance` en
`scripts/build-dataset.mjs` y se regenera (≈ 15 min la primera vez; luego sale de `.cache/`).

## Contrato del motor (lo que F4-05, F4-06, F5 y F6 consumen)

```ts
// shared/engine/battle/types.ts
interface BattlePokemon {
  uid: string;                 // id del CaughtPokemon o generado para la IA
  speciesId: number; level: number; types: TypeName[];
  stats: { hp; attack; defense; specialAttack; specialDefense; speed };   // ya calculados (stats.ts)
  hp: number;                  // PS actuales
  moves: { moveId: number; pp: number; maxPp: number }[];  // 1-4
  status: null | 'burn' | 'paralysis' | 'poison' | 'toxic' | 'sleep' | 'freeze';
  statusTurns: number;         // sueño restante / contador de tóxico
  volatile: { confusion: number; flinch: boolean };        // se limpia al cambiar
  stages: { attack; defense; specialAttack; specialDefense; speed; accuracy; evasion };  // −6…+6
}
interface BattleSide { name: string; team: BattlePokemon[]; active: number }
interface BattleState { turn: number; sides: [BattleSide, BattleSide]; winner: 0 | 1 | null }
type BattleAction =
  | { kind: 'move'; moveIndex: number }        // índice 0-3 del activo
  | { kind: 'switch'; teamIndex: number }
  | { kind: 'forfeit' };
type BattleEvent =                              // textos en español los compone la UI (i18n fuera del motor)
  | { kind: 'move'; side; moveId } | { kind: 'miss'; side } | { kind: 'damage'; side; amount; hpAfter }
  | { kind: 'effectiveness'; side; multiplier } | { kind: 'crit'; side } | { kind: 'status'; side; status }
  | { kind: 'stat'; side; stat; change } | { kind: 'heal'; side; amount; hpAfter } | { kind: 'faint'; side }
  | { kind: 'switch'; side; teamIndex } | { kind: 'cant-move'; side; reason } | { kind: 'win'; side } | …;
```

`resolveTurn` valida las acciones (`BattleError` si el índice no existe, el movimiento no tiene PP o se cambia a un
debilitado) y **nunca muta** el estado de entrada (devuelve uno nuevo). Debilitado → el lado debe mandar una acción
`switch` en el turno siguiente (o pierde si no le quedan).

## Reglas (Gen V+; donde PokéAPI/Bulbapedia y Showdown coinciden)

- **Stats** (`stats.ts`): `PS = floor((2B+IV)·L/100)+L+10`; resto `floor((floor((2B+IV)·L/100)+5)·nat)`, nat 1,1 /
  0,9 / 1 según la naturaleza (tabla de 25). Etapas ±6: `max(2,2+e)/max(2,2−e)`; precisión/evasión con /3.
- **Orden:** prioridad del movimiento > velocidad efectiva (etapas, parálisis ×0,5) > empate al azar. Cambiar de
  Pokémon va antes que cualquier movimiento.
- **Daño** (`damage.ts`): `floor(floor(floor(2L/5+2)·P·A/D)/50)+2`, luego × crítico 1,5 (ignora etapas negativas
  del atacante y positivas del defensor) × aleatorio `(85..100)/100` × STAB 1,5 × efectividad × quemado 0,5 (físico),
  con `floor` tras cada paso como Showdown; mínimo 1 si la efectividad no es 0.
- **Crítico:** etapa 0 = 1/24, 1 = 1/8, 2 = 1/2, ≥3 = siempre (`critRate` del movimiento suma etapas).
- **Precisión:** `accuracy × etapas(precisión − evasión)`; `accuracy: null` no falla nunca.
- **Estados:** quemado (−1/16 PS/turno, físico ×0,5), parálisis (25 % no se mueve, velocidad ×0,5), veneno (−1/8),
  tóxico (−n/16 creciente), sueño (1-3 turnos), congelado (20 % de descongelarse por turno; un ataque de Fuego lo
  descongela), confusión (2-5 turnos, 33 % se golpea con 40 de poder). Inmunidades por tipo: Fuego no se quema,
  Eléctrico no se paraliza, Veneno/Acero no se envenenan, Hielo no se congela.
- **Efectos del movimiento:** cambios de stats al objetivo correcto (`target`), drenaje y retroceso (`drain` ±%),
  curación (`healing`), multigolpe (2-5 con reparto 35/35/15/15), retroceso del rival (`flinchChance`, solo si va
  antes).
- **Fin:** gana quien deja al rival sin Pokémon en pie; `forfeit` = rendirse.

## Orden y paralelismo

```
F4-02 tipos + stats (+ dataset con target) ─> F4-03 daño/precisión/crítico ─> F4-04 reducer + estados ─┬─> F4-05 escena
                                                                                                        └─> F4-06 IA
```

F4-02…F4-04 son **solo `shared/`** (sin móvil, sin servidor): las puede hacer cualquiera. F4-05 y F4-06 pueden ir en
paralelo (la escena juega contra una IA "elige al azar" hasta que llegue F4-06).

## Mapa de archivos

| Archivo | Tarea | Responsabilidad |
| --- | --- | --- |
| `scripts/build-dataset.mjs`, `shared/data/dataset.types.ts`, `src/assets/data/moves.json` | F4-02 | `target` y `flinchChance` en cada movimiento |
| `shared/engine/battle/type-chart.ts` (+ spec) | F4-02 | Tabla 18×18 y `effectiveness(atk, defTypes)` |
| `shared/engine/battle/natures.ts`, `stats.ts` (+ spec) | F4-02 | Naturalezas y stats Gen III+ con IV, nivel y etapas |
| `shared/engine/battle/moves.ts` (+ spec) | F4-03 | `isSupportedMove`, `defaultMoves(learnset, nivel)` |
| `shared/engine/battle/damage.ts` (+ spec) | F4-03 | Daño, crítico, precisión, orden de turno |
| `shared/engine/battle/types.ts` | F4-04 | Contrato de arriba |
| `shared/engine/battle/battle-engine.ts` (+ spec) | F4-04 | `createBattle`, `resolveTurn` (reducer puro) |
| `shared/engine/battle/ai.ts` (+ spec) | F4-06 | Elección de la IA |
| `src/app/features/battle/**` | F4-05 | Escena, cola de eventos, textos, animaciones |
| `server/src/encounters/encounters.service.ts` | F4-03 | `movesAtLevel` filtra con `isSupportedMove` |

## F4-02 · Tabla de tipos y stats

- [x] **Paso 1 — dataset:** en `build-dataset.mjs`, añadir a cada movimiento `target: m.target.name` y
  `flinchChance: m.meta?.flinch_chance ?? 0`; tipos en `dataset.types.ts`; `npm run dataset` (≈ 15 min la primera
  vez); comprobar con `npm run test:shared` que el dataset sigue válido y añadir un test de que `swords-dance` →
  `user` y `growl` → `all-opponents`. Commit del JSON regenerado.
- [x] **Paso 2 — `type-chart.ts`:** construir la matriz desde `types.json` (fuente: PokéAPI) y comprobarla contra la
  tabla canónica escrita a mano en el test (18×18 = 324 casillas; las 0 de Normal/Lucha→Fantasma, Eléctrico→Tierra,
  Tierra→Volador, Psíquico→Siniestro, Fantasma→Normal, Veneno→Acero, Dragón→Hada). `effectiveness('ground',
  ['electric','flying']) === 0`, `('ice', ['dragon','flying']) === 4`.
- [x] **Paso 3 — `natures.ts` + `stats.ts`:** (hecho en un solo `stats.ts`) tabla de 25 naturalezas (5 neutras); `calcStats(base, ivs, level,
  nature)`; `stageMultiplier(stage)` y `accuracyStageMultiplier(stage)`. Tests con casos de Bulbapedia (Garchomp
  nv 78 del ejemplo de la fórmula) y extremos (nivel 1, IV 0/31).
- [x] **Paso 4:** `npm run test:shared`, lint y build de app y server; REGLA 2.
- [x] **Extra (hallazgo, D-029):** `target` NO basta para los de daño → también `metaCategory`; regla en
  `shared/engine/battle/moves.ts` (`statChangeTarget`, `statChangeChance`) con tests sobre el dataset real.

## F4-03 · Daño, precisión, crítico, prioridad

- [ ] **Paso 1 — `moves.ts`:** `isSupportedMove`, `defaultMoves(learnset, level, moves)` (los 4 últimos soportados;
  reserva Placaje). Cambiar `movesAtLevel` del servidor para que use el mismo filtro (test en `encounters.service.spec`).
- [ ] **Paso 2 — `damage.ts`:** `calcDamage({attacker, defender, move, crit, roll})` determinista (roll 85-100 lo pasa
  quien llama) + `rollCrit`, `rollAccuracy`, `turnOrder`. **Tests contra la calculadora de Showdown**
  (calc.pokemonshowdown.com): anotar en el spec al menos 6 casos (físico/especial, STAB, súper eficaz ×4, poco
  eficaz, inmune, crítico, quemado) con el rango mínimo-máximo que da la calculadora (sin habilidades ni objetos).
- [ ] **Paso 3:** tests de orden (prioridad gana a velocidad, parálisis, empate reproducible con semilla).
- [ ] **Paso 4:** REGLA 2.

## F4-04 · Estados y cambios de stats (reducer)

- [ ] **Paso 1 — `types.ts`** con el contrato de arriba.
- [ ] **Paso 2 — `createBattle(sides)` y `resolveTurn`:** cambios, orden, PP, precisión, daño, efectos secundarios,
  estados al final del turno, debilitados, victoria. Sin mutar la entrada (test con `structuredClone` + `toEqual`).
- [ ] **Paso 3 — tests por regla:** cada estado (incluidas inmunidades), etapas ±6 topadas, drenaje/retroceso,
  multigolpe, retroceso del rival, confusión, cambio forzado tras debilitarse, rendición. Un test de "combate completo"
  con semilla fija cuyo registro de eventos se compara con uno guardado (snapshot).
- [ ] **Paso 4:** propiedad: 1.000 combates aleatorios entre equipos al azar con semillas distintas terminan siempre
  (< 500 turnos) sin excepciones y sin PS fuera de [0, máx].
- [ ] **Paso 5:** REGLA 2.

## F4-05 · Escena de combate (app)

- [ ] **Paso 1:** ruta `/combate/prueba` (con `authGuard`) que monta un combate local contra un rival de prueba con
  `createBattle` y RNG con semilla aleatoria.
- [ ] **Paso 2:** escena (DISENO, modo _Experience_ con `impeccable`): los dos Pokémon con arte `home`, barras de PS
  (`app-hp-bar`), nombre y nivel, menú de 4 movimientos con tipo, PP y **efectividad prevista** contra el rival,
  botón de cambiar Pokémon y de huir.
- [ ] **Paso 3:** cola de eventos: cada `BattleEvent` → texto en español + animación (golpe con partículas del tipo,
  sacudida proporcional al daño, número de daño, barra que baja, estado con icono). Respeta "reducir movimiento".
- [ ] **Paso 4:** sonidos (gritos al entrar y al debilitarse, golpe; los SFX llegan con F2-08) y hápticos.
- [ ] **Paso 5:** probar en vista móvil 390×844 y en un Android real; capturas en `docs/evidencias/`. REGLA 2.

## F4-06 · IA rival

- [ ] **Paso 1 — `ai.ts`:** `chooseAction(state, side, rng, nivel)`: daño esperado de cada movimiento (precisión ×
  daño medio × efectividad), un movimiento de estado útil si el rival no lo tiene ya, cambiar si su activo está en
  clara desventaja de tipos; ruido según dificultad (fácil 40 % al azar, normal 15 %, difícil 0 %).
- [ ] **Paso 2:** 3 entrenadores de prueba en `shared/data/trainers.ts` (equipos de 3 con especies del dataset).
- [ ] **Paso 3:** test: la IA "difícil" gana ≥ 70 % contra la "fácil" con equipos espejo en 500 combates con semilla.
- [ ] **Paso 4:** conectar en la escena de F4-05. REGLA 2.

## Riesgos

- **Precisión de la fórmula:** sin la comparación con Showdown (F4-03 paso 2) no se puede afirmar que el daño es
  "como en los juegos". Es el criterio de aceptación de F4-03.
- **Rendimiento:** el reducer clona estado por turno; con equipos de 6 es trivial (< 1 ms), no hace falta inmutabilidad
  estructural.
- **Movimientos no soportados ya guardados:** los `CaughtPokemon` capturados antes de F4-03 pueden tener alguno. Al
  montar un combate se sustituyen por `defaultMoves` (y se anota cuántos en el log).
