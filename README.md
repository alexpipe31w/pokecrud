# PokéCRUD

> **🚧 En transformación a PokéCRUD GO** (mapa con GPS, captura en realidad aumentada, combates en tiempo real y torneos).
> El plan, el estado y las reglas de trabajo del equipo están en [`docs/plan/`](docs/plan/) y [`CLAUDE.md`](CLAUDE.md). **Empieza por [`docs/plan/ESTADO.md`](docs/plan/ESTADO.md).**

App móvil/web hecha con **Angular + Ionic** que consulta la [PokéAPI](https://pokeapi.co/) y gestiona un inventario de Pokémon (listar, buscar, agregar, editar y eliminar) sobre un servidor propio con **NestJS + PostgreSQL** (antes JSON Server, ver `backend/legacy/`).

Proyecto de la asignatura Ingeniería de Software, gestionado con Scrum en Jira (proyecto `IS`).

## Equipo

| Integrante                  | Rol                                       |
| --------------------------- | ----------------------------------------- |
| Alex Felipe                 | Product Owner / Scrum Master · Desarrollo |
| Kenneth Ramirez Burgos      | Desarrollo                                |
| Samuel David Florez Ramirez | Desarrollo                                |

## Stack

| Capa           | Tecnología                                                 |
| -------------- | ---------------------------------------------------------- |
| Frontend       | Angular 22 (standalone components) + Ionic 9 + Capacitor 8 |
| API externa    | PokéAPI (`https://pokeapi.co/api/v2`), solo lectura        |
| Backend propio | NestJS + Prisma + PostgreSQL (`http://localhost:3000`)     |
| Calidad        | ESLint + Prettier, pruebas unitarias con Vitest            |
| Gestión        | Git + GitHub, Jira (Scrum)                                 |

## Requisitos

- Node.js 22.22.3 o superior (o 24.15+) y npm 10 o superior. Angular CLI 22 no arranca con versiones anteriores; se revisa con `node -v`.
- Git

## Instalación

```bash
git clone https://github.com/alexpipe31w/pokecrud.git
cd pokecrud
git checkout develop
npm install
```

## Cómo correr el proyecto

Se necesitan **dos terminales**: una para el servidor y otra para la app. Antes, una sola vez: crear `server/.env`
(ver `docs/plan/SECRETOS.md`) y `cd server && npm install`.

```bash
# Terminal 1: servidor NestJS en http://localhost:3000
cd server
npm run start:dev

# Terminal 2: app en http://localhost:8100
npx ionic serve
```

`npm start` hace lo mismo que `ionic serve`, pero abre en `http://localhost:4200`.

## Scripts

| Comando            | Qué hace                                                 |
| ------------------ | -------------------------------------------------------- |
| `npm start`        | Levanta la app en modo desarrollo                        |
| `npm run seed:151` | Precarga en la BD los primeros 151 Pokémon desde PokéAPI |
| `npm run build`    | Compila la app en `www/`                                 |
| `npm test`         | Ejecuta las pruebas unitarias                            |
| `npm run lint`     | Revisa el código con ESLint                              |
| `npm run format`   | Formatea el código con Prettier                          |

## Estructura del proyecto

```
pokecrud/
├── backend/
│   ├── legacy/               # JSON Server archivado (F0-08): db.json y db.seed.json (semilla del servidor)
│   └── postman/              # Colección de Postman con todas las peticiones
├── scripts/seed-151.mjs      # Precarga los 151 Pokémon desde PokéAPI
├── server/                  # Servidor NestJS (ver server/README.md)
├── docs/evidencias/          # Capturas que se adjuntan en Jira
└── src/
    ├── environments/         # pokeApiUrl y serverUrl
    └── app/
        ├── core/             # Layout (pestañas), constantes e interceptores
        ├── shared/           # Componentes reutilizables
        ├── features/         # Una carpeta por pantalla
        ├── services/         # Servicios que consumen las APIs
        └── models/           # Interfaces TypeScript
```

## Rutas de la app

| Ruta                  | Pantalla                                                                                 | Historia            |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------- |
| `/inventario`         | Inventario de la tienda (lista, buscar, editar, eliminar); `/tabs/pokedex` redirige aquí | HU-03, HU-05, HU-14 |
| `/pokemon/nuevo`      | Agregar: buscar en PokéAPI por número o nombre y formulario prellenado                   | HU-03               |
| `/pokemon/:id`        | Detalle de un Pokémon (tipo, stats, precio, stock)                                       | HU-04               |
| `/pokemon/:id/editar` | Editar un Pokémon                                                                        | HU-03               |

> Las secciones **Equipos**, **Favoritos** y **Mis Pokémon** están ocultas en esta entrega: no aparecen en la app ni tienen ruta. Su código sigue en `src/app/features/` y sus endpoints en el backend, por si se activan más adelante.

## Backend propio (servidor NestJS)

PokéAPI es de solo lectura, así que los datos del CRUD se guardan en el servidor NestJS (`server/`), con el **mismo contrato que tenía JSON Server** (`_sort`, `_order`, `name_like`, `_page`, `_limit` + cabecera `X-Total-Count`). La URL base en local es `http://localhost:3000`.

- `/pokemon` es el inventario compartido de la clase: **leer es público, escribir exige sesión**.
- `/teams`, `/favorites` y `/customPokemon` exigen sesión y cada jugador solo ve lo suyo (lo de otro da 404).

| Recurso                | Endpoint                                | Métodos                       |
| ---------------------- | --------------------------------------- | ----------------------------- |
| Equipos                | `/teams` y `/teams/:id`                 | GET, POST, PUT, PATCH, DELETE |
| Favoritos              | `/favorites` y `/favorites/:id`         | GET, POST, PUT, PATCH, DELETE |
| Pokémon personalizados | `/customPokemon` y `/customPokemon/:id` | GET, POST, PUT, PATCH, DELETE |
| Pokémon (inventario)   | `/pokemon` y `/pokemon/:id`             | GET, POST, PUT, PATCH, DELETE |

### Modelo de datos

- **Team:** `id, name, description, pokemonIds[] (máx. 6), createdAt, updatedAt`
- **Favorite:** `id, pokemonId, pokemonName, note, rating (1-5), createdAt`
- **CustomPokemon:** `id, name, types[], stats { hp, attack, defense, speed }, imageUrl, description, createdAt`
- **Pokemon:** `id (n.º de Pokédex nacional), name, types[], abilities[], imageUrl, height (m), weight (kg), baseExperience, stats { hp, attack, defense, specialAttack, specialDefense, speed }, price, stock, createdAt, updatedAt`

  Los datos vienen de PokéAPI. La base de datos arranca con los primeros 151 y desde "Agregar" se puede sumar cualquier otro Pokémon de PokéAPI (formas especiales como megas no se listan). `price` y `stock` no existen en PokéAPI: se generan al precargar (precio = experiencia base × 100) y se editan desde la app.

La semilla (`cd server && npm run db:seed`) carga los primeros 151 Pokémon y, para un jugador demo, 2 equipos, 3 favoritos y 1 Pokémon personalizado de ejemplo.

Para probar los endpoints, importar en Postman `backend/postman/PokeCRUD.postman_collection.json` y ejecutar la colección entera en el Runner: registra un jugador de prueba, usa su token y crea sus propios datos, así que se puede repetir las veces que haga falta.

## Flujo de trabajo con Git

- `main`: versión estable que se entrega al final de cada sprint.
- `develop`: rama de integración. **Las ramas nuevas salen de aquí.**
- `feature/IS-XX-descripcion`: una rama por historia o tarea de Jira.

```bash
git checkout develop
git pull
git checkout -b feature/IS-11-listar-pokemon
# ... trabajar ...
git commit -m "IS-11: listado de Pokémon con paginación"
git push -u origin feature/IS-11-listar-pokemon
```

Después se abre un Pull Request hacia `develop` y otro integrante lo revisa.

### Convenciones

- **Ramas:** `feature/IS-XX-descripcion-corta` (o `fix/IS-XX-...` para errores).
- **Commits:** `IS-XX: mensaje`. La clave vincula el commit con la incidencia en Jira.
- **Pull Requests:** siempre hacia `develop`, usando la plantilla del repositorio.
- No se hace push directo a `main` ni a `develop`.

## Definición de Hecho (DoD)

Una historia está terminada cuando:

- [ ] El código está en `develop` mediante un Pull Request revisado por otro integrante.
- [ ] Cumple todos los criterios de aceptación de la historia.
- [ ] No hay errores en consola y se probó en navegador y en vista móvil.
- [ ] `npm run lint` y `npm test` pasan.
- [ ] Las capturas de evidencia están adjuntas en la historia de Jira.
