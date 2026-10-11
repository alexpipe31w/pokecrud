# Visión — PokéCRUD GO

> "Igual y mejor que Pokémon GO". El profe dijo: el más chingón gana. Este documento dice
> **qué** es el juego y **qué listón** tiene que pasar. El **cómo** está en `ARQUITECTURA.md`.

## La idea en una frase

Sales a la calle con el móvil, en el mapa (Google Maps real, en 3D, girando con tu brújula)
aparecen Pokémon de **las 9 generaciones (1025 especies)** según dónde estás, la hora y el
clima real; tocas uno, se abre la **cámara con el Pokémon en realidad aumentada** a su tamaño
real, gruñendo con su grito oficial; le lanzas la Poké Ball con el dedo; lo capturas; luego
combates contra tus compañeros **en tiempo real** y armas **torneos** en clase.

## Por qué es "mejor que Pokémon GO" (lo que lo diferencia)

| Pokémon GO                                                 | Nosotros                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Combate de tocar rápido, sin tipos de movimiento complejos | **Combate por turnos tipo juego principal**: estadísticas base, IVs, naturaleza, nivel, STAB, críticos, efectividad de tipos (18×18), precisión, estados (quemado, paralizado, dormido, envenenado, congelado). Toda la "ficha" del Pokémon importa.                  |
| Pokémon en AR siempre del mismo tamaño "bonito"            | **Tamaño real** en AR según la altura de PokéAPI (un Wailord no cabe en la pantalla, un Joltik es diminuto) con variación individual (XS/XL).                                                                                                                         |
| Comportamiento igual para todos                            | **Personalidad en la captura** según la ficha: los rápidos (velocidad alta) esquivan más, los de `capture_rate` bajo se escapan más, los legendarios casi no se dejan; tipo Fantasma se vuelve semi-transparente, Fuego deja partículas, Agua salpica, Volador flota. |
| Torneos solo en eventos oficiales                          | **Torneos creados por cualquiera** con código de sala, bracket en vivo y espectadores.                                                                                                                                                                                |
| Pokédex en inglés con datos escasos                        | Pokédex en **español** con descripción oficial, cadena evolutiva, debilidades calculadas, grito, hábitat.                                                                                                                                                             |
| —                                                          | **Módulo CRUD del curso integrado en el juego**: equipos (para combatir), favoritos, y Pokémon personalizados creados por ti que pueden aparecer en el mapa de tu grupo.                                                                                              |

## Pilares (lo que tiene que estar sí o sí)

1. **Mapa vivo con GPS** — Google Maps vectorial inclinado 60°+, rota con la brújula, avatar 3D
   que camina cuando te mueves, Pokémon 3D animados sobre el mapa, hierba que se mueve donde hay
   spawn, ciclo día/noche real, clima real (lluvia → más tipo Agua, etc.).
2. **Encuentro y captura en AR** — cámara de fondo, el Pokémon anclado en el espacio con el
   giroscopio (si giras el móvil se queda en su sitio), modo sin AR para quien no tenga giroscopio.
   Gesto de lanzar con física, efecto curva, círculo de precisión (Bien/Genial/Excelente),
   Poké Ball que se abre, absorbe con luz, se sacude 1-3 veces, fanfarria o escape.
   Bayas y distintas Balls. Shiny 1/512 con destello.
3. **Colección** — Mis Pokémon con nivel, PC, IVs (barras), naturaleza, género, shiny, dónde y
   cuándo se capturó. Evolución con caramelos (animación de evolución). Pokédex 1025 con
   vistos/capturados por generación.
4. **Combate** — vs IA (entrenadores y gimnasios), **PvP en tiempo real** con un compañero
   (por invitación o código), animaciones de ataque por tipo, barras de vida, textos de
   "¡Es súper eficaz!", sonido. El servidor es el árbitro.
5. **Torneos** — crear sala 4/8/16 jugadores, bracket eliminación directa, emparejamiento
   automático, ronda siguiente al terminar, espectadores, campeón con celebración.
6. **Sonido y tacto** — gritos oficiales de los 1025, efectos de cada acción, música de mapa
   (día/noche) y de combate, vibración en lanzamientos, sacudidas y golpes. Volumen ajustable.
7. **APK instalable** en Android que se lleva a la presentación.

## Extras (si hay tokens — y los hay)

- Poképaradas y gimnasios en lugares reales (puntos de OpenStreetMap: parques, iglesias, monumentos).
- Incursiones (raids) cooperativas contra un jefe con varios jugadores a la vez.
- Amigos, intercambio de Pokémon, regalos.
- Huevos que eclosionan caminando X km (podómetro por GPS).
- Clasificación (ranking) del grupo / de la universidad.
- Logros y medallas.

## Listón de calidad ("Definición de Hecho" del juego)

Una pantalla o mecánica NO está terminada hasta que:

- **Se siente de juego, no de app de gestión.** Tipografía con carácter, colores del juego,
  nada de listas grises de Ionic por defecto. Cada toque tiene respuesta (animación ≤150 ms,
  sonido y/o vibración).
- **Movimiento con sentido:** entradas y salidas animadas, transiciones entre mapa ↔ captura ↔
  combate con continuidad (la Poké Ball, el Pokémon). Respeta "reducir movimiento" del sistema.
- **Estados vacíos, de carga y de error diseñados** (sin GPS, sin cámara, sin internet,
  servidor dormido, permiso denegado). Nunca una pantalla en blanco o un `undefined`.
- **60 fps** en un Android de gama media. Probado en móvil real si toca GPS/cámara/giroscopio.
- **Datos reales**: todo lo que se muestra de un Pokémon sale de PokéAPI.
- Lint + tests en verde y entrada en la bitácora con la evidencia.

## Qué se presenta (demo final, 5-7 min)

1. Abrir el APK en el móvil → splash animado → login.
2. Mapa en la calle/campus: Pokémon alrededor, girar → el mapa gira.
3. Captura en AR de uno (shiny si hay suerte; el modo demo permite forzar uno).
4. Pokédex y detalle de lo capturado, evolución.
5. Combate PvP en vivo entre dos móviles del equipo, proyectado.
6. Final de un torneo de 4 con los tres + el profe como espectador o jugador.
