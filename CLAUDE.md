# PokéCRUD GO — instrucciones para cualquier IA (y humano) que trabaje aquí

Este repo lo trabajan **3 personas, cada una con su propia cuenta de Claude**, por relevos:
cuando a uno se le acaban los tokens, sigue el siguiente. Nadie tiene memoria de las
sesiones de los demás. **La única memoria compartida es lo que está escrito en `docs/plan/`.**
Si no lo escribes ahí, para el siguiente no existió.

Equipo: Alex Felipe (PO/SM · dev), Kenneth Ramirez Burgos (dev), Samuel David Florez Ramirez (dev).

---

## REGLA 1 — Al EMPEZAR una sesión (obligatorio, antes de tocar código)

1. `git fetch --all && git checkout develop && git pull`
2. Lee, en este orden y completos:
   1. `docs/plan/ESTADO.md` — dónde vamos, quién tiene qué, qué sigue. **Lo más importante.**
   2. `docs/plan/ROADMAP.md` — todas las tareas con su ID, criterio de aceptación y estado.
   3. `docs/plan/ARQUITECTURA.md` — stack, carpetas, modelos, protocolos. No inventes otra.
   4. `docs/plan/DECISIONES.md` — lo que ya se decidió y por qué. No lo re-discutas.
   5. Las últimas 3 entradas de `docs/plan/BITACORA.md`.
      (`docs/plan/VISION.md` solo si vas a diseñar una mecánica nueva.)
3. Elige la **primera tarea `[ ]` libre** del ROADMAP cuyas dependencias estén `[x]`.
   Si el humano te pidió una concreta, esa.
4. **Reclámala ANTES de programar** (esto es el candado entre compañeros):
   - En `ROADMAP.md` cambia `[ ]` → `[~]` y añade `(@nombre, AAAA-MM-DD)`.
   - En `ESTADO.md` ponla en "En curso".
   - `git checkout -b feature/<ID>-descripcion`, commit `"<ID>: reclama tarea"` y **push inmediato**.
   - Si al hacer push ves que otro ya la reclamó, suéltala y coge otra.
5. Dile al humano en 3-5 líneas: qué tarea coges, qué vas a hacer, y si ves algún riesgo.

Atajo: el comando `/inicio` hace todo esto. El hook de arranque te muestra `ESTADO.md` solo.

## REGLA 2 — Al TERMINAR (o cuando el humano diga "me quedo sin tokens", o veas que el contexto se acaba)

**No esperes al final.** Si la tarea es larga, haz esto cada vez que cierres un trozo que funcione.

1. Deja el código **compilando**: `npm run build`, `npm run lint` y `npm test` en verde.
   Si algo queda roto, NO lo escondas: escríbelo en ESTADO.md → "Bloqueos / roto".
2. Actualiza `docs/plan/ROADMAP.md`: `[~]` → `[x]` si cumple TODO el criterio de aceptación;
   si no, déjalo `[~]` y escribe debajo qué falta exactamente.
3. Reescribe `docs/plan/ESTADO.md` (es una foto del ahora, no un histórico):
   fase actual, lo hecho, en curso, siguiente paso concreto, bloqueos.
4. Añade **al final** de `docs/plan/BITACORA.md` una entrada con la plantilla que hay ahí:
   quién, qué tarea, qué se hizo, archivos clave, cómo se probó (salida real), qué quedó a medias,
   y **"el siguiente debe empezar por: …"** con una instrucción concreta.
5. Si tomaste una decisión de diseño que otro podría deshacer sin querer → `DECISIONES.md`.
6. Commit `"<ID>: …"` + push de la rama. Si la tarea está `[x]`, abre PR a `develop`.
7. Al humano: resumen de 5 líneas + el link del PR.

Atajo: el comando `/cierre` hace todo esto.

## REGLA 2b — Guardar DURANTE el trabajo (los tokens se acaban sin avisar)

Cuando a una cuenta de Claude Pro se le acaba el límite, la sesión **se corta de golpe**: no da tiempo a
`/cierre`. Lo que no esté **pusheado** no existe para el siguiente compañero. Por eso se guarda todo el rato:

- **Cuándo hacer `/guardar`** (commit + push + línea de "En curso" en ESTADO.md con el paso exacto):
  1. al terminar **cada paso** del plan de fase (`docs/plan/fases/…`), marcando su casilla `[x]`;
  2. como mucho cada **20 minutos** de trabajo, aunque estés a medias (commit `WIP`, diciendo si compila);
  3. **antes** de algo largo o arriesgado: instalar dependencias, migraciones, refactors, builds del APK;
  4. en cuanto Claude Code avise de que te acercas al límite de uso, o el humano diga "me quedan pocos tokens";
  5. justo antes de que se compacte la conversación (contexto largo).
- Un commit `WIP` en tu rama `feature/...` está **bien**. Perder dos horas de trabajo, no.
- **Red de seguridad automática:** el hook `Stop` (`.claude/hooks/checkpoint-guard.js`) no te deja terminar
  un turno si hay cambios sin commit o sin push y el último commit tiene más de 20 min. Si salta, haz
  `/guardar` y sigue; no lo desactives.
- **Quien retoma** una tarea `[~]` de otro: haz `git fetch` y `git checkout` de **su rama** (no crees otra),
  lee su "Punto de guardado" en ESTADO.md y su última entrada de bitácora, y sigue desde el paso indicado.
  Cambia el `(@nombre)` de la tarea al tuyo y anótalo en la bitácora ("retomo de @X en el paso N").

## REGLA 3 — Calidad (el objetivo es GANAR, no "que funcione")

- Lo que se entrega tiene que **verse y sentirse como un juego de verdad**: animaciones,
  sonido, feedback háptico, transiciones. Una pantalla que funciona pero se ve de formulario
  de Ionic por defecto **no está terminada**. Ver la sección "Listón de calidad" en `VISION.md`.
- **Prueba en el móvil** (o en vista móvil del navegador, 390×844) antes de marcar `[x]`.
  GPS, cámara, giroscopio y sonido solo se validan de verdad en un Android real.
- Nunca digas "funciona" sin haberlo ejecutado. Pega la salida del build/test en la bitácora.
- No metas datos inventados de Pokémon: todo sale de PokéAPI (dataset generado, ver ARQUITECTURA).
- Rendimiento: 60 fps en el mapa y en la captura en un Android de gama media. Nada de cargar
  los 1025 Pokémon en memoria de golpe ni de llamar a PokéAPI en bucle.
- El servidor manda en todo lo competitivo (capturas, combates, torneos). El cliente nunca decide
  si capturó ni cuánto daño hizo: si no, cualquiera hace trampa con la consola.

## REGLA 4 — Cosas que NO se hacen

- No cambiar el stack ni la estructura de carpetas sin anotarlo en `DECISIONES.md` y avisar al humano.
- No push directo a `main` ni a `develop`. Rama `feature/<ID>-…` → PR a `develop`.
- **El repo es PÚBLICO. No subir secretos** (clave de Google Maps, contraseña de la BD). Van en
  `src/environments/environment.local.ts` y `server/.env` (en `.gitignore`). **Si el humano te pasa esos
  valores, sigue `docs/plan/SECRETOS.md` al pie de la letra**: crear el archivo en la ruta exacta, comprobar
  que Git lo ignora, probar sin imprimir el secreto y nunca repetirlo en chat, docs, commits ni bitácora.
  Si al empezar la sesión faltan esos archivos y la tarea los necesita, pídeselos al humano (Alex los reparte por privado).
- No borrar ni reescribir entradas de la bitácora de otros. Solo se añade al final.
- No reclamar más de una tarea a la vez por persona.
- No refactorizar "de paso" lo que no es de tu tarea: anótalo en ROADMAP como tarea nueva.
- No publicar en Play Store: Pokémon es marca de Nintendo/Game Freak; esto es un proyecto académico
  sin ánimo de lucro (ver DECISIONES D-010).

## Footguns del stack (verificados)

- **Ionic 9: todo se importa de `@ionic/angular`.** `@ionic/angular/standalone` NO existe (las guías
  de internet son de Ionic 8 y fallan).
- Angular 22 es **zoneless**: el estado de la UI va en `signal()`/`computed()`. Si algo no se repinta,
  es porque no es una signal.
- Windows: en PowerShell usa `npm.cmd` (npm.ps1 está bloqueado). **Nunca** `Set-Content` para escribir
  `.ts`: mete BOM y ESLint revienta. Usa las herramientas de edición del agente.
- Node 22.22+ o 24.15+. Capacitor 8 Android necesita **JDK 21** (usa el `jbr` de Android Studio,
  no el Java 8 del sistema). Ver ARQUITECTURA → "Generar el APK".
- Los sprites `showdown` (GIF animado) NO existen para todos: p. ej. #1025 no tiene. Siempre fallback
  a `home` → `official-artwork` → `front_default`.
- Los gritos (`cries`) son `.ogg`; en Android WebView funcionan. No asumir que existen `legacy`.

## Convenciones (del curso, se mantienen)

- Jira proyecto `IS`. Los IDs del ROADMAP (`F1-03`, etc.) se enlazan a una incidencia `IS-XX`
  cuando el PO la crea; commits `IS-XX: mensaje` si existe, si no `F1-03: mensaje`.
- Definición de Hecho del README sigue vigente + lo de la REGLA 3.
- Idioma: código en inglés, textos de la UI, docs y commits en **español**.
