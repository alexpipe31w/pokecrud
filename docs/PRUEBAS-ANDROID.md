# Pruebas en un Android real — guía paso a paso

Guía para comprobar **personalmente** todo lo que hace PokéCRUD GO en el móvil y sacar las evidencias que faltan en
las tareas que quedaron `[~]` o con "Pendiente: un Android". Escrita para el **Redmi Note 10 de Samuel** (M2101K7BL,
Android 12, MIUI), vale para cualquier Android 7+.

> El repo es **público**. Antes de subir una captura o un vídeo, mírala: nada de la cámara enseñando tu casa, ni el mapa
> centrado en tu dirección, ni correos o contraseñas en pantalla. Si sale algo así, recórtala o repítela en otro sitio.

---

## 0. Direcciones útiles

| Qué                            | Dirección                                                    |
| ------------------------------ | ------------------------------------------------------------ |
| Repositorio                    | <https://github.com/alexpipe31w/pokecrud>                    |
| Servidor (Render)              | <https://pokecrud-server.onrender.com>                       |
| ¿Está despierto el servidor?   | <https://pokecrud-server.onrender.com/health/ready> → `"ok"` |
| Inventario público (JSON)      | <https://pokecrud-server.onrender.com/pokemon?_limit=5>      |
| Depurar el WebView desde el PC | `chrome://inspect` en el Chrome del PC (móvil por cable)     |

Truco: abre `/health/ready` en el navegador del móvil **1 minuto antes** de probar. Render gratis se duerme a los 15 min
y tarda hasta 1 min en despertar; si no, la app enseña la Poké Ball de "servidor despertando" (también es una prueba).

Dentro de la app **no hay barra de direcciones**: todo se abre desde el **menú de la Poké Ball** (botón rojo abajo en el
mapa). Para saber dónde estás, estas son las rutas internas:

| Pantalla              | Ruta interna           | Cómo se llega                              |
| --------------------- | ---------------------- | ------------------------------------------ |
| Iniciar sesión        | `/login`               | al abrir sin sesión                        |
| Crear cuenta          | `/registro`            | "Crear cuenta" en el login                 |
| Mapa (principal)      | `/mapa`                | al entrar                                  |
| Encuentro (AR)        | `/encuentro/:id`       | tocar un Pokémon cercano en el mapa        |
| Mis Pokémon           | `/coleccion`           | menú → Mis Pokémon                         |
| Ficha del capturado   | `/coleccion/:id`       | tocar uno en Mis Pokémon                   |
| Equipos               | `/equipos`             | menú → Equipos                             |
| Pokédex 1025          | `/pokedex`             | menú → Pokédex                             |
| Ficha de especie      | `/pokedex/:id`         | tocar una especie vista                    |
| Favoritos             | `/favoritos`           | menú → Favoritos                           |
| Personalizados        | `/personalizados`      | menú → Personalizados                      |
| Inventario (IS-11)    | `/inventario`          | menú → Inventario                          |
| Combate en vivo (PvP) | `/pvp`, `/pvp/combate` | menú → Combate en vivo                     |
| Combate contra la IA  | `/combate/prueba`      | menú → Combate de prueba                   |
| Spike de cámara (dev) | `/dev/ar`              | **sin botón**: se abre por cable (paso P2) |

---

## 1. Instalar la versión nueva

El APK que tenía el Redmi era del 12-oct (sin colección, evolución, PvP ni música). Hay que poner el de `develop`.

**Opción A — por cable (la buena, deja medir fps):**

1. En el móvil: _Ajustes → Sobre el teléfono →_ tocar 7 veces **Versión de MIUI** (activa Opciones de desarrollador).
2. _Ajustes → Ajustes adicionales → Opciones de desarrollador:_ **Depuración USB** = sí e **Instalar vía USB** = sí
   (MIUI pide la cuenta Mi y SIM para este último).
3. Cable USB al PC, aceptar "¿Permitir depuración USB?" en el móvil.
4. En el PC, en la carpeta del proyecto (con `src/environments/environment.local.ts`, que trae la clave de Maps):

```bash
npm run apk -- --install
```

Genera `android/app/build/outputs/apk/debug/app-debug.apk` (~12 MB, habla con Render) y lo instala.

**Opción B — sin cable:** copiar ese `app-debug.apk` al móvil (Drive, WhatsApp "a mí mismo", USB) y abrirlo; aceptar
"instalar apps desconocidas" para la app desde la que lo abres. Sirve igual para **el segundo móvil del PvP**.

**MIUI mata apps en segundo plano.** Para que no se cierre en la calle: mantener pulsado el icono → _Información de la
app → Ahorro de batería → Sin restricciones_ e _Inicio automático_ = sí.

---

## 2. Cómo sacar las evidencias en el Redmi

- **Captura:** deslizar **tres dedos hacia abajo** (o Encendido + Bajar volumen). Quedan en `DCIM/Screenshots`.
- **Vídeo:** _Centro de control_ (deslizar desde arriba a la derecha) → **Grabar pantalla**. En su engranaje:
  resolución 1080p, **Sonido: interno** (para la música y los gritos), velocidad 60 fps. Quedan en `DCIM/ScreenRecorder`.
- **Pasarlas al PC:** por cable en modo "Transferencia de archivos", o desde el PC con adb:

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" pull /sdcard/DCIM/Screenshots ./capturas-redmi
```

- **Nombre al subirlas:** `docs/evidencias/<ID>_<NN>_redmi-<que-se-ve>.<png|jpg|mp4>`, p. ej.
  `F1-07_09_redmi-calle-pokemon.png`. Los `.mp4` que pesen más de ~20 MB: recortarlos o bajarlos a 720p.

---

## 3. Recorrido completo (todas las funciones)

Marca cada casilla al comprobarla. Las que tienen **📸** conviene capturarlas; las de **⏳** cierran tareas pendientes
(sección 4).

### 3.1 Cuenta y arranque (F0-07, F1-09)

- [ ] Abrir la app con el servidor dormido → Poké Ball que se tambalea, "servidor despertando", no se queda en blanco. 📸
- [ ] Crear cuenta nueva (correo, apodo, contraseña) o entrar con la tuya. Contraseña mala → mensaje de error claro.
- [ ] Cerrar la app del todo (multitarea) y abrirla → **sigue con la sesión** (Keystore).

### 3.2 Mapa (F1-03, F1-04, F1-05, F1-10)

- [ ] Aceptar **ubicación** → mapa 3D de Google inclinado, tu avatar en tu posición, edificios en 3D.
- [ ] **Brújula** arriba a la derecha: girar el móvil → el mapa gira. Tocarla → alterna "norte arriba" / "sígueme".
- [ ] **Clima** (chip arriba): coincide con el tiempo real de tu zona.
- [ ] **Placa del jugador** arriba a la izquierda: apodo, nivel y barra de XP; mochila con las bolas.
- [ ] De **19:00 a 6:00** el mapa pasa a modo noche y el HUD se oscurece aunque el móvil esté en modo claro. 📸 (día y noche)
- [ ] **Avatar:** quieto respira; andando camina; trotando corre; sombra debajo y círculo de alcance que late. ⏳ F1-05
- [ ] **Joystick:** menú → _Joystick: Sí_ → aparece; medio recorrido camina, a tope corre. **Volver a _No_ al acabar.**

### 3.3 Pokémon en el mapa (F1-06, F1-07)

- [ ] Brotan Pokémon alrededor agitando una mata de hierba; al irse se desvanecen. ⏳ F1-07
- [ ] Al acercarte, **grito bajito** del Pokémon.
- [ ] Tocar uno lejano → "Acércate más para atraparlo". 📸
- [ ] Tocar uno al alcance (≤ 40 m) → entra al encuentro.
- [ ] (Opcional, con otra persona) Dos móviles en el mismo sitio ven **los mismos** Pokémon.

### 3.4 Encuentro en realidad aumentada (F2-04a, F2-04b, F2-12, F2-13, F2-15)

- [ ] Entrada: el Pokémon cae con polvo, **grito y vibración a la vez**.
- [ ] Aceptar **cámara** → el Pokémon sobre la imagen real, a su tamaño (XS/XL); girar el móvil y se queda en su sitio. 📸
      (Apunta a una pared o al suelo, no a tu casa.)
- [ ] Modelo **3D** con animación (Pikachu, Charizard vuela, Gengar semitransparente…); arrastrar con el dedo lo gira.
- [ ] Botón **ⓘ** → ficha (tipos, nivel, PC, altura/peso, categoría, descripción). Otra vez ⓘ → se esconde.
- [ ] Interruptor AR apagado → fondo ilustrado. "Huir" → vuelve al mapa.

### 3.5 Lanzamiento y captura (F2-05, F2-06, F2-07, F3-02a)

- [ ] **Deslizar la Poké Ball hacia arriba** recto y firme → acierta. Flojo → "¡Casi!" y **no gasta** bola.
- [ ] Dar una vuelta con el dedo antes de soltar → **bola curva**.
- [ ] Elegir Super Ball / Baya Frambu abajo → el aro cambia de color.
- [ ] Al acertar: luz roja, la bola cae, 1-3 sacudidas con "clac" y vibración → **¡Capturado!** con estrellas, fanfarria,
      XP contando y **"+3 caramelos de …"**. 📸 ⏳ F3-02a
- [ ] O escapa / huye. La mochila solo baja cuando la bola toca al Pokémon.

### 3.6 Colección (F3-02b, F3-03, F3-05)

- [ ] Menú → **Mis Pokémon**: rejilla con PC, nivel, color del tipo; ★ shiny. Bajar → carga más (con 30+). 📸
- [ ] Hoja de **orden** (Recientes / PC / Nº, ↑↓) y **filtros** (18 tipos, Shiny, Favoritos).
- [ ] Ficha: arte + **grito**, PC, ✎ mote, ★ favorito, IVs con estrellas, stats con ▲▼, movimientos, **mapa mini** de
      dónde se capturó (ojo con la privacidad), fecha y bola. 📸
- [ ] **Transferir** → confirmación → "Deshacer" 5 s (deshacer y comprobar que vuelve; luego transferir uno de verdad →
      +1 caramelo).
- [ ] **Evolucionar** (con caramelos suficientes; 50 en cadenas de una evolución, 25/100 en las de dos): silueta que
      parpadea acelerando → destello → forma nueva con grito y vibración. 📹 ⏳ F3-05

### 3.7 Pokédex, favoritos, equipos, personalizados (F3-04, F3-06a/b/c)

- [ ] Menú → **Pokédex**: 9 generaciones con "capturados/total"; sin ver = silueta "???", vistas, capturadas (Poké Ball).
- [ ] Ficha de especie: descripción en español, debilidades, cadena evolutiva, hábitat, grito.
- [ ] **♡ Favorito** → estrellas 1-5 y nota → aparece en menú → **Favoritos**.
- [ ] Menú → **Equipos** → crear equipo con hasta 6 capturados, editar, borrar. (Hace falta uno para el PvP.)
- [ ] Menú → **Personalizados** → crear uno (nombre, 1-2 tipos, deslizadores de stats, URL de imagen), editar, borrar.
- [ ] Menú → **Inventario**: 151 con precio y stock, buscador, ficha. Con cuenta **ADMIN** (la de Samuel): agregar desde
      PokéAPI, editar y eliminar con confirmación. Con cuenta normal no salen esos botones.

### 3.8 Combate contra la IA (F4-05, F4-06, F2-08, F2-10)

- [ ] Menú → **Combate de prueba** → elegir rival (fácil / normal / difícil).
- [ ] Movimientos con tipo, PP y eficacia prevista; animación por tipo; **sonidos** de golpe (muy eficaz, poco eficaz,
      crítico), gritos, vibración; **música de combate**.
- [ ] Cambiar de Pokémon, cambio forzado al debilitarse, victoria / derrota.

### 3.9 Música y sonido (F2-08, F2-10) ⏳

- [ ] Mapa de día: tema tranquilo en bucle. De noche: otro tema (más lento, menor). Combate: tema rápido.
- [ ] Al cambiar de pantalla la música hace **fundido**, nunca suenan dos a la vez; en el encuentro, silencio.
- [ ] Pulsar Inicio con la música sonando → se calla; volver → sigue.
- [ ] Volumen: la música **no tapa** los gritos ni los efectos. Anotar la impresión. 📹 (con sonido interno)

### 3.10 Combate en vivo — PvP (F5-02…F5-04) ⏳ — necesita **dos móviles**

- [ ] Los dos con el APK nuevo, cuentas distintas y un equipo cada uno.
- [ ] Móvil A: menú → **Combate en vivo** → **Invitar** → código de 6 letras. Móvil B: **Tengo un código** → escribirlo.
- [ ] Cara a cara con los tipos → **¡A combatir!** en los dos.
- [ ] Turnos: elegir movimiento en ambos; "esperando al rival"; resultado igual en las dos pantallas.
- [ ] Dejar pasar **30 s** sin elegir en uno → el servidor juega por él.
- [ ] **Desconexión:** activar modo avión en B unos segundos → A ve "rival desconectado"; quitar el modo avión → vuelve
      al combate donde iba (tiene 60 s).
- [ ] **Rendirse** en un segundo combate. También probar **Buscar rival** en los dos a la vez.

### 3.11 Ajustes

- [ ] Menú → **Reducir efectos: Sí** → menos partículas y la evolución es un fundido. Volver a _No_.
- [ ] **Cerrar sesión** → vuelve al login.

---

## 4. Pruebas que cierran tareas pendientes (el orden recomendado)

| #   | Tarea                   | Qué falta exactamente                                                         | Dónde       | Evidencia                              |
| --- | ----------------------- | ----------------------------------------------------------------------------- | ----------- | -------------------------------------- |
| P1  | **F2-10** (opcional)    | Oír la música en el móvil y su volumen frente a gritos y efectos (3.9)        | Casa        | `F2-10_01_redmi-musica.mp4`            |
| P2  | **F2-01 / D-045**       | `/dev/ar` en el Redmi: cámara elegida, campo de visión estable, fps (abajo)   | Casa, cable | `F2-01_07…_redmi-*.png`                |
| P3  | **F3** (opcional)       | Vistazo en Android: scroll de Mis Pokémon ≥ 55 fps, ficha, Pokédex, evolución | Casa, cable | `F3-0x_NN_redmi-*.png` / `.mp4`        |
| P4  | **F1-05 3b + F1-07 7b** | Andar y trotar en la calle con GPS: ≥ 55 fps con avatar y Pokémon (abajo)     | **Calle**   | `F1-05_06_redmi-*`, `F1-07_09_redmi-*` |
| P5  | **F5-04** (criterio)    | Combate PvP entre **dos móviles reales** grabado en vídeo (3.10)              | Dos móviles | `F5-04_10_dos-moviles.mp4`             |
| —   | F2-11 / F2-14 / F4-07   | ARCore y combate en AR: **aún no están programados**; no hay nada que probar  | —           | —                                      |

### P2 — Spike de cámara en el Redmi (`/dev/ar`, D-045)

Con el móvil por cable, Claude (o tú desde `chrome://inspect` → _inspect_ en el WebView de PokéCRUD → consola) abre la
pantalla oculta:

```js
history.pushState({}, '', '/dev/ar');
dispatchEvent(new PopStateEvent('popstate'));
```

1. Aceptar la cámara. Arriba pone **"Cámara: Cám. N"**: anotar cuál abre (en el A36 la buena es la 0; la gran angular
   deforma). Si hay varias, el botón de ciclar cámaras deja comparar.
2. Pikachu sobre una **mesa**: girar el móvil despacio a izquierda y derecha. Si el Pokémon "patina" con el giro, mover el
   deslizador **Campo de visión** hasta que se quede pegado a la mesa. Anotar el valor (en el A36, 64°). 📸
3. **Medir batería (~2 min)** con el móvil apoyado y quieto → tabla de fps por configuración. 📸 de la tabla.
4. **Deriva 20 s** con el móvil quieto → anotar los grados.

Resultado → una fila "Redmi Note 10" en D-045 (DECISIONES) y la línea de F2-01 del ESTADO marcada.

### P4 — La calle (F1-05 3b + F1-07 7b)

Antes de salir, **con el cable puesto**, Claude deja corriendo dentro de la app un registro de fps que guarda cada
segundo (sobrevive a desenchufar el cable mientras no se cierre la app). Después:

1. Menú → **Joystick: No** (imprescindible: con joystick el avatar no usa el GPS).
2. Desenchufar. Salir con luz de día, la app abierta en el mapa y la pantalla encendida (bajar el tiempo de bloqueo o
   tocarla de vez en cuando).
3. **Andar** 2-3 min a paso normal → el avatar camina y el mapa le sigue suave. **Trotar** 1 min → el avatar corre.
   Parar → respira. 📹 un trozo de cada uno (con grabador de pantalla; recorta o desenfoca nombres de calles si es tu
   barrio).
4. Contar cuántos Pokémon hay en pantalla; acercarse a uno → **grito bajito**; tocar uno lejos → "Acércate más"; uno
   cerca → encuentro (y capturarlo, de paso P3/F3-02a). 📸
5. Volver, enchufar el cable y Claude lee el registro: fps medio, p5 y tirones. Si la media es ≥ 55 → F1-05 y F1-07 `[x]`.

---

## 5. Al terminar

Pasar las capturas al PC (sección 2) y pedirle a Claude que las suba: las renombra, las revisa por privacidad, anota los
resultados en ROADMAP / ESTADO / BITÁCORA (y D-045 en DECISIONES), marca las tareas `[x]` que cumplan su criterio y abre
el PR a `develop`.
