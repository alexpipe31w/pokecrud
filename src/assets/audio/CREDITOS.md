# Créditos de audio (D-010)

PokéCRUD GO es un proyecto académico sin ánimo de lucro (D-010): no se publica en tiendas ni se monetiza.

## Efectos de sonido — propios

Todos los efectos del juego (`tap`, `hit`, `hit-super`, `hit-weak`, `hit-crit`, `miss`, `faint`, `heal`,
`stat-up`, `stat-down`, `status`, `victory`) los **genera el propio juego** a partir de recetas de síntesis
(osciladores y ruido con envolvente) en `src/app/services/game/sfx-synth.ts` (F2-08, D-044). No hay archivos de
audio de terceros: son obra del equipo de PokéCRUD GO.

## Gritos de los Pokémon

Se descargan en el momento de [PokeAPI/cries](https://github.com/PokeAPI/cries)
(`cries/pokemon/latest/{id}.ogg`). Los gritos son de Nintendo / Game Freak / The Pokémon Company; se usan con fines
educativos, como el resto de datos y medios de PokéAPI (D-010).

## Música

Todavía no hay música (tarea F2-10). Cuando llegue: solo libre (CC0 / CC BY, con su atribución aquí) o propia.

## Añadir un sonido grabado

1. Solo licencias libres (CC0 preferida) o propio. Anotar aquí: archivo, autor, licencia y enlace.
2. Guardarlo en `src/assets/audio/sfx/<nombre>.ogg` y añadir `<nombre>` a `SFX_CATALOG` en `audio.service.ts`.
