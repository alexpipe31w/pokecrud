# Guía para el docente — cómo probar PokéCRUD GO

Avance del 13 de octubre de 2026 · Ingeniería de Software · Equipo: Alex Felipe (PO/SM), Kenneth Ramirez Burgos,
Samuel David Florez Ramirez.

PokéCRUD GO es un juego para Android al estilo Pokémon GO construido sobre el CRUD de la asignatura: mapa real con GPS,
Pokémon que aparecen según el lugar, la hora y el clima, captura en realidad aumentada, colección y Pokédex de las 1025
especies, evolución, equipos, combate contra la IA y **combate en tiempo real entre dos jugadores**. El servidor propio
(NestJS + PostgreSQL) está publicado en Internet, así que la app funciona sin instalar nada más.

---

## 1. Instalar la app (Android 7 o superior)

1. En el móvil, abrir la página de la versión: **<https://github.com/alexpipe31w/pokecrud/releases/latest>** y descargar
   `PokeCRUD-GO-avance.apk`.
2. Abrir el archivo. Android pedirá permitir "instalar aplicaciones de origen desconocido" para el navegador o el gestor
   de archivos: aceptarlo (la app no está en Play Store porque es un proyecto académico sin ánimo de lucro).
3. Abrir **PokéCRUD**. La primera vez el servidor gratuito puede estar dormido: aparece una Poké Ball que se tambalea
   con el mensaje "servidor despertando". **Tarda hasta 1 minuto**; después todo va rápido.
4. Pulsar **Crear cuenta** (correo, apodo y contraseña) o entrar con una cuenta existente.
5. Dar permiso de **ubicación** (el mapa) y de **cámara** (la realidad aumentada). Si se niegan, la app sigue
   funcionando: el avatar se mueve con un joystick y el encuentro usa un fondo ilustrado.

> Sin móvil Android no es posible ver el juego completo: depende de GPS, cámara, brújula y vibración. Lo que sí se puede
> revisar desde un PC está en las secciones 4 y 5.

---

## 2. Recorrido por todas las funciones

Todo se abre desde el **menú de la Poké Ball** (botón rojo abajo en el mapa).

| #   | Qué probar                             | Cómo                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Mapa**                               | Mapa 3D de Google con tu avatar, brújula, clima real y modo noche (19:00-6:00). La música cambia de día a noche.                                                                                                                                                                                                                                                                                                  |
| 2   | **Moverse sin salir de casa**          | Menú → **Joystick: Sí**. Aparece un joystick para caminar por el mapa. (Con el GPS real basta con andar.)                                                                                                                                                                                                                                                                                                         |
| 3   | **Pokémon salvajes**                   | Salen entre la hierba alrededor (todos los jugadores ven los mismos en el mismo sitio). Tocar uno lejano dice "Acércate más"; acercarse con el joystick y tocarlo.                                                                                                                                                                                                                                                |
| 4   | **Encuentro y captura**                | El Pokémon aparece a tamaño real sobre la cámara (o un fondo). Botón ⓘ: su ficha (PC, tipo, altura). **Deslizar la Poké Ball hacia arriba** para lanzarla; si el dedo da una vuelta antes, es bola curva. Abajo se eligen Super Ball y Baya Frambu. Fallar no gasta bola.                                                                                                                                         |
| 5   | **¡Capturado!**                        | Sacudidas, estrellas, XP y "+3 caramelos". El **servidor** decide la captura (no se puede hacer trampa desde el móvil).                                                                                                                                                                                                                                                                                           |
| 6   | **Mis Pokémon**                        | Menú → Mis Pokémon: orden por PC/fecha/número y filtros por tipo, shiny y favorito.                                                                                                                                                                                                                                                                                                                               |
| 7   | **Ficha y evolución**                  | Tocar un Pokémon: IVs, estadísticas, movimientos, mapa de dónde se capturó, cambiar el mote, marcar favorito, transferir (con "Deshacer"). Con caramelos suficientes: **Evolucionar** (animación de evolución).                                                                                                                                                                                                   |
| 8   | **Pokédex**                            | Menú → Pokédex: las 1025 especies por generación (sin ver / vistas / capturadas). Cada ficha: descripción, debilidades calculadas, cadena evolutiva y botón **♡ Favorito** con estrellas y nota.                                                                                                                                                                                                                  |
| 9   | **Favoritos**                          | Menú → Favoritos: las especies marcadas con su valoración.                                                                                                                                                                                                                                                                                                                                                        |
| 10  | **Equipos**                            | Menú → Equipos → Crear equipo: elegir hasta 6 Pokémon capturados. Editar, quitar y borrar.                                                                                                                                                                                                                                                                                                                        |
| 11  | **Personalizados**                     | Menú → Personalizados: inventar un Pokémon (nombre, tipos, estadísticas con deslizadores, imagen por URL).                                                                                                                                                                                                                                                                                                        |
| 12  | **Inventario (CRUD de la asignatura)** | Menú → Inventario: la tienda de 151 Pokémon con precio y stock, búsqueda y ficha. **Agregar / editar / eliminar** solo para cuentas administradoras (ver sección 3).                                                                                                                                                                                                                                              |
| 13  | **Combate contra la IA**               | Menú → Combate de prueba: elegir rival (fácil, normal, difícil), movimientos con su eficacia, cambiar de Pokémon, rendirse.                                                                                                                                                                                                                                                                                       |
| 14  | **Combate en vivo (PvP)**              | Necesita **dos personas con la app** (dos móviles) y un equipo cada una. Menú → Combate en vivo → una pulsa **Invitar** (sale un código de 6 letras) y la otra **Tengo un código**. Cara a cara → **¡A combatir!** Turnos de 30 s (si no eliges, el servidor juega por ti), aviso si el rival se desconecta (tiene 60 s para volver), rendirse. También existe **Buscar rival** (empareja a quien esté buscando). |
| 15  | **Ajustes y salida**                   | Menú: Reducir efectos (menos animación), Cerrar sesión.                                                                                                                                                                                                                                                                                                                                                           |

Consejos: cada cuenta nueva empieza con 30 Poké Balls, 5 Super Balls y 5 Bayas Frambu. Para el PvP hace falta haber
capturado al menos un Pokémon y crear un equipo con él (el combate se juega a nivel 50 para que sea justo).

---

## 3. Probar el CRUD con Postman (desde el PC)

La API del curso sigue el mismo contrato que tenía JSON Server (`_sort`, `_order`, `name_like`, `_page`, `_limit`,
cabecera `X-Total-Count`) y está en **<https://pokecrud-server.onrender.com>**
(estado: <https://pokecrud-server.onrender.com/health/ready> → `{"status":"ok","db":"ok"}`).

1. Importar en Postman `backend/postman/PokeCRUD.postman_collection.json`.
2. En las variables de la colección poner `baseUrl` = `https://pokecrud-server.onrender.com`.
3. Ejecutar la colección entera en el **Runner**: registra un jugador de prueba, usa su token y crea sus propios
   equipos, favoritos y personalizados (se puede repetir).
4. Las escrituras del inventario `/pokemon` (crear, editar, borrar) exigen rol **ADMIN** y fallan con 403 para un jugador
   normal (es a propósito). Para probarlas: registrarse en la app y pedirnos que activemos el rol en esa cuenta; después
   poner su correo y contraseña en `adminEmail` y `adminPassword`. (No publicamos contraseñas en el repositorio porque es
   público.)

| Recurso                | Endpoint                                                                     | Métodos                        | Acceso                          |
| ---------------------- | ---------------------------------------------------------------------------- | ------------------------------ | ------------------------------- |
| Inventario             | `/pokemon`, `/pokemon/:id`                                                   | GET · POST, PUT, PATCH, DELETE | leer: público · escribir: ADMIN |
| Equipos                | `/teams`, `/teams/:id`                                                       | GET, POST, PUT, PATCH, DELETE  | sesión (solo lo tuyo)           |
| Favoritos              | `/favorites`, `/favorites/:id`                                               | GET, POST, PUT, PATCH, DELETE  | sesión (solo lo tuyo)           |
| Pokémon personalizados | `/customPokemon`, `/customPokemon/:id`                                       | GET, POST, PUT, PATCH, DELETE  | sesión (solo lo tuyo)           |
| Cuenta                 | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me` | POST · GET                     | —                               |

---

## 4. Revisar el código y las pruebas (desde el PC)

- **Código:** rama `main` (esta entrega). Estructura y stack en el [README](../README.md); arquitectura en
  [`docs/plan/ARQUITECTURA.md`](plan/ARQUITECTURA.md).
- **Cómo se trabajó:** [`docs/plan/ROADMAP.md`](plan/ROADMAP.md) (todas las tareas con su criterio de aceptación y
  estado), [`docs/plan/BITACORA.md`](plan/BITACORA.md) (qué hizo cada uno, cómo lo probó y con qué resultado),
  [`docs/plan/DECISIONES.md`](plan/DECISIONES.md) (59 decisiones técnicas con su porqué). Cada cambio entró por Pull
  Request con integración continua obligatoria (pestaña _Actions_ de GitHub: lint, pruebas y compilación de la app y del
  servidor).
- **Evidencias:** [`docs/evidencias/`](evidencias/) — capturas por tarea (p. ej. `F3-05_*` evolución, `F5-04_*` combate
  en vivo con dos cuentas), vídeos del móvil y la música del juego en `F2-10_musica/*.wav`.
- **Ejecutar las pruebas automáticas** (Node 22.22+ o 24.15+; no necesitan base de datos ni claves):

```bash
git clone https://github.com/alexpipe31w/pokecrud.git
cd pokecrud
npm install
npm test
npm run test:shared
```

Para las del servidor, Prisma necesita dos variables con cualquier dirección (no se conecta a nada; es lo mismo que hace
la integración continua). En Git Bash o Linux/macOS:

```bash
cd server
export DATABASE_URL=postgresql://ci:ci@localhost:5432/ci DIRECT_URL=postgresql://ci:ci@localhost:5432/ci
npm install
npm test
```

En PowerShell: `$env:DATABASE_URL='postgresql://ci:ci@localhost:5432/ci'; $env:DIRECT_URL=$env:DATABASE_URL` y
después `npm.cmd install` y `npm.cmd test` dentro de `server`.

Resultado esperado de este avance: app 571 pruebas, motor compartido 178, servidor 64 unitarias. (Las 114 pruebas de
extremo a extremo del servidor necesitan una base de datos PostgreSQL; se ejecutan en el equipo de desarrollo.)

> Correr la app completa en un PC requiere claves privadas (base de datos, Google Maps) que por seguridad no están en el
> repositorio; por eso la forma de probarla es el APK de la sección 1.

---

## 5. Qué está hecho y qué falta en este avance

**Hecho (55 tareas):** fundaciones (dataset de 1025 especies desde PokéAPI, servidor NestJS + PostgreSQL publicado,
autenticación segura, CRUD del curso migrado, APK, CI) · mapa con GPS · Pokémon deterministas por lugar, hora y clima ·
encuentro en realidad aumentada con modelos 3D · lanzamiento y captura decididos por el servidor · efectos de sonido y
música propios · colección, ficha, caramelos, evolución, Pokédex 1025 · inventario, equipos, favoritos y personalizados
con el diseño del juego · motor de combate fiel a la calculadora de Showdown e IA de 3 niveles · PvP en tiempo real con
invitación por código, turnos de 30 s, reconexión y resultado guardado.

**Falta:** torneos (F6), espectadores del PvP, realidad aumentada con ARCore (Pokémon fijo en el suelo al rodearlo) y
combate en AR, extras (Poképaradas, amigos e intercambio, incursiones, huevos, ranking) y la fase de entrega final (APK
firmado de release, pasada de rendimiento y de seguridad, guion de la demo). El detalle está en
[`docs/plan/ROADMAP.md`](plan/ROADMAP.md).
