# Diseño — cómo se tiene que ver y sentir

> Destilado de las skills de diseño de Alex (`emil-design-eng`, `apple-design`, `impeccable`).
> Tus compañeros quizá no tengan esas skills instaladas: **este archivo es la norma** para todos.
> Si tienes `impeccable` instalada, úsala para pantallas nuevas en modo _Experience_ (mapa,
> captura, combate) y _Operate_ (Pokédex, colección, equipos, ajustes), respetando lo de aquí.

## 1. Mundo visual (la dirección, no se discute en cada pantalla)

**"Aventura de campo, de noche y de día".** Un juego de exploración real, no una app de gestión:

- El **mapa es el protagonista** y casi todo vive encima de él como capas flotantes translúcidas
  (botón de Poké Ball central abajo, avatar/nivel arriba-izquierda, brújula y clima arriba-derecha).
  La navegación por pestañas de Ionic **desaparece**: se sustituye por el menú de la Poké Ball.
- Superficies: vidrio esmerilado (`backdrop-filter: blur(20px) saturate(160%)`) con borde superior
  claro, sombras profundas en paneles grandes, ligeras en chips. Nada de tarjetas planas grises.
- **El color lo ponen los tipos de Pokémon.** La interfaz base es neutra (tinta azul noche + crema),
  y cada pantalla de un Pokémon se tiñe con el color de su tipo principal.
- Tema: el mapa cambia a nocturno de 19:00 a 6:00 (hora local). La UI sigue al mapa.

## 2. Tokens (se crean en F0-04 en `src/theme/tokens.scss`, y no se escriben colores sueltos)

```scss
:root {
  /* Base */
  --ink: #0f1a2b; /* texto principal, paneles de noche */
  --ink-2: #33415c;
  --paper: #fbf7ee; /* paneles de día */
  --paper-2: #efe8d8;
  --accent: #ff4d4d; /* rojo Poké Ball: acción principal */
  --accent-ink: #ffffff;
  --gold: #ffcb3d; /* recompensas, shiny, Excelente */
  --success: #3ccf8e;
  --danger: #ff5a5f;

  /* Tipos (colores canónicos de la comunidad, legibles en ambos temas) */
  --t-normal: #a8a77a;
  --t-fire: #ee8130;
  --t-water: #6390f0;
  --t-electric: #f7d02c;
  --t-grass: #7ac74c;
  --t-ice: #96d9d6;
  --t-fighting: #c22e28;
  --t-poison: #a33ea1;
  --t-ground: #e2bf65;
  --t-flying: #a98ff3;
  --t-psychic: #f95587;
  --t-bug: #a6b91a;
  --t-rock: #b6a136;
  --t-ghost: #735797;
  --t-dragon: #6f35fc;
  --t-dark: #705746;
  --t-steel: #b7b7ce;
  --t-fairy: #d685ad;

  /* Movimiento */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1); /* entradas y respuesta a toques */
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1); /* cosas que se mueven en pantalla */
  --ease-drawer: cubic-bezier(0.32, 0.72, 0, 1); /* hojas y paneles */
  --dur-press: 120ms;
  --dur-small: 180ms;
  --dur-panel: 320ms;

  /* Radios y espacio (escala de 4) */
  --r-chip: 999px;
  --r-card: 20px;
  --r-sheet: 28px;
  --s-1: 4px;
  --s-2: 8px;
  --s-3: 12px;
  --s-4: 16px;
  --s-6: 24px;
  --s-8: 32px;
}
```

## 3. Tipografía

- Display (títulos, nombres de Pokémon, "¡Capturado!"): una fuente con carácter redondeada y gruesa,
  autoalojada en `src/assets/fonts/` con licencia OFL (propuesta: **Fredoka** o **Baloo 2**; se fija
  en F0-04 y se anota en DECISIONES). Tracking negativo en tamaños grandes (`-0.02em`), interlineado 1.05.
- Texto y datos: `system-ui` (Roboto en Android). Números de stats con `font-variant-numeric: tabular-nums`.
- Nada de mayúsculas sostenidas en párrafos. Botones en frase normal ("Lanzar", no "LANZAR").

## 4. Movimiento — reglas (de Emil Kowalski y Apple, aplicadas al juego)

1. **¿Debe animarse?** Lo que se ve 100 veces por sesión (abrir el menú, cambiar de filtro) es rápido
   (≤180 ms) o nada. Lo raro y emocionante (captura, evolución, shiny, ganar un torneo) **sí** se
   recrea: ahí está el "wow".
2. Toda animación tiene propósito: respuesta al toque, continuidad espacial, estado, celebración.
3. **Solo `transform` y `opacity`** en la UI (GPU). Nunca `transition: all`. Nunca desde `scale(0)`:
   desde `scale(0.95)` + `opacity: 0`.
4. Entradas con `--ease-out`; nada de `ease-in` en UI. UI ≤ 300 ms; las escenas de juego pueden durar más.
5. **Botones**: respuesta en _pointer-down_, `scale(0.97)` en `:active`, + háptico ligero + clic suave.
6. **Gestos (lanzar la Ball, arrastrar hojas)**: seguimiento 1:1 con el dedo respetando el punto
   donde se agarró, `setPointerCapture`, velocidad de suelta → el objeto continúa con esa velocidad
   (sin "costura" entre arrastre y animación). Muelles críticamente amortiguados por defecto; rebote
   (amortiguamiento ~0.8) **solo** cuando hubo impulso (un lanzamiento, un flick).
7. **Interrumpible**: un panel que se cierra se puede volver a agarrar. Nunca bloquear la entrada
   durante una transición de UI.
8. **Continuidad espacial**: lo que entra por abajo sale por abajo. Mapa → encuentro: el Pokémon del
   mapa crece hacia el centro mientras entra la cámara; captura → colección: la Ball vuela al icono.
9. **Escalonado** en listas (Pokédex, colección): 30–50 ms entre elementos, sin bloquear el toque.
10. **Sonido + háptico + animación en el mismo frame** (causalidad y armonía). Si llega tarde, se quita.
11. `prefers-reduced-motion`: se sustituyen desplazamientos y muelles por fundidos cortos; el juego
    sigue siendo jugable. Ajuste propio "Reducir efectos" en el perfil.

## 5. Momentos estrella (aquí se gana la nota — cuidar cada frame)

| Momento                       | Lo que tiene que pasar                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Aparece un Pokémon en el mapa | hierba que se agita en su celda → emerge con un pequeño salto + grito bajito según distancia  |
| Entrar al encuentro           | zoom al Pokémon, viñeta, entra la cámara, el Pokémon "aterriza" con polvo y su grito completo |
| Lanzar                        | Ball sigue el dedo, estela según velocidad, giro si es curva, círculo de precisión latiendo   |
| Impacto                       | destello, Pokémon se convierte en luz roja y es absorbido, Ball cae con rebote físico         |
| Sacudidas                     | 1-3 sacudidas con pausa tensa, háptico fuerte y "clic" en cada una                            |
| Captura                       | estrellas, "¡Capturado!" en display, XP/caramelos contando, fanfarria corta                   |
| Escape                        | la Ball se abre con destello, el Pokémon sale con sacudida de enfado y grito                  |
| Shiny                         | destello dorado al aparecer + sonido propio + brillo permanente en la colección               |
| Evolución                     | silueta blanca pulsando entre forma A y B acelerando → estallido → forma nueva                |
| Golpe en combate              | partículas del tipo del movimiento, sacudida de pantalla proporcional al daño, número de daño |
| Campeón de torneo             | confeti con colores de tipos del equipo ganador, trofeo, música de victoria                   |

## 6. Estados que hay que diseñar (nunca pantalla en blanco)

Cargando dataset (barra con Pokémon caminando) · sin permiso de ubicación (explicación + botón +
modo joystick) · GPS débil (aviso pequeño, no bloquea) · sin cámara/permiso (modo sin AR) ·
sin internet (mapa en caché + aviso) · servidor despertando (mensaje simpático, reintento automático
con backoff) · colección vacía (invitación a salir a capturar) · rival desconectado en combate
(cuenta atrás 60 s).

## 7. Accesibilidad mínima

Contraste AA en textos sobre vidrio (subir opacidad del panel si el fondo es claro), áreas táctiles
≥ 44 px, nunca solo color para comunicar (efectividad con texto e icono), lectores de pantalla con
`aria-label` en botones de icono, respeta tamaño de texto del sistema (unidades `rem`).
