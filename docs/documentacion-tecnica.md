# Documentación técnica

**Tarea:** TK-06 · Versión 0.1.0 · Octubre de 2026

Este documento explica cómo está construida PokéCRUD para que cualquier integrante pueda mantenerla. Para instalar y correr el proyecto, ver el [README](../README.md). Los diagramas están en [diagramas.md](diagramas.md).

## 1. Visión general

PokéCRUD es una SPA hecha con **Angular 22** (componentes standalone y signals) e **Ionic 9**, empaquetable como app móvil con **Capacitor 8**. Gestiona un catálogo de Pokémon con precio y stock:

- **PokéAPI** (`https://pokeapi.co/api/v2`) es la fuente de los datos oficiales y es de solo lectura.
- **JSON Server** (`http://localhost:3000`) es el backend propio donde se guardan las altas, ediciones y bajas.

Las URLs están en `src/environments/environment.ts` (`pokeApiUrl`, `apiUrl`). `ng build` usa `environment.prod.ts`.

## 2. Estructura del código

```
src/app/
├── app.routes.ts                 # Rutas raíz (carga diferida de cada página)
├── core/
│   ├── constants/                # APP_NAME, POKEDEX_PAGE_SIZE, tipos con nombre y color
│   ├── interceptors/             # errorInterceptor (HU-07)
│   ├── layout/tabs/              # Barra de pestañas (solo «Pokédex» visible)
│   └── utils/pokemon-defaults.ts # Precio/stock por defecto, sprite, formato #001
├── features/                     # Una carpeta por pantalla
│   ├── pokedex/                  # Lista, búsqueda, filtro por tipo, eliminar (HU-03, HU-05, HU-14)
│   ├── pokemon-detail/           # Ficha (HU-04)
│   ├── pokemon-add/              # Buscar en PokéAPI y agregar (HU-03)
│   ├── pokemon-edit/             # Editar (HU-03)
│   └── teams/ favorites/ my-pokemon/  # Ocultas en esta entrega
├── models/pokemon.model.ts       # Pokemon, PokemonDraft, PokemonStats, PokemonRef
├── services/
│   ├── pokemon.service.ts        # CRUD sobre /pokemon
│   ├── poke-api.service.ts       # Lectura de PokéAPI + filterRefs()
│   └── ui.service.ts             # Toasts y diálogo de confirmación
└── shared/components/
    ├── pokemon-form/             # Formulario reactivo de agregar/editar
    └── type-chips/               # Chips de color con los tipos en español
```

## 3. Rutas

| Ruta                  | Componente          | Notas                                                             |
| --------------------- | ------------------- | ----------------------------------------------------------------- |
| `/tabs/pokedex`       | `PokedexPage`       | Ruta inicial; cualquier ruta desconocida redirige aquí            |
| `/pokemon/nuevo`      | `PokemonAddPage`    | Va antes de `/pokemon/:id` para que «nuevo» no sea un id          |
| `/pokemon/:id`        | `PokemonDetailPage` | `id` llega como `input()` gracias a `withComponentInputBinding()` |
| `/pokemon/:id/editar` | `PokemonEditPage`   |                                                                   |

## 4. Servicios

### `PokemonService` (backend propio)

| Método          | Petición                           | Efecto                                          |
| --------------- | ---------------------------------- | ----------------------------------------------- |
| `getAll()`      | `GET /pokemon?_sort=id&_order=asc` |                                                 |
| `getById(id)`   | `GET /pokemon/:id`                 |                                                 |
| `exists(id)`    | `GET /pokemon/:id`                 | `true`/`false` (un 404 se convierte en `false`) |
| `create(draft)` | `POST /pokemon`                    | Agrega `createdAt` y `updatedAt`                |
| `update(p)`     | `PUT /pokemon/:id`                 | Renueva `updatedAt`                             |
| `delete(id)`    | `DELETE /pokemon/:id`              |                                                 |

`create`, `update` y `delete` incrementan la señal `version`. La Pokédex la observa con un `effect` y se recarga sola cuando se vuelve a ella.

### `PokeApiService` (solo lectura)

- `listAll()`: pide una sola vez `GET /pokemon?limit=2000` y la guarda en caché con `shareReplay`. Descarta los id ≥ 10000, que son formas especiales (megas, regionales).
- `search(term)`: filtra esa lista con `filterRefs()`.
- `getById(idOrName)`: trae un Pokémon y lo convierte en `PokemonDraft` (alturas en m, pesos en kg, stats con nombres en camelCase, precio y stock por defecto).
- `getDescription(id)`: última descripción en español de `pokemon-species`.

`filterRefs(list, term)` es la regla de búsqueda: si el término es un número (`25`, `#025`) busca por id exacto; si no, por nombre parcial.

### `UiService`

- `toast(mensaje, color)`: aviso en la parte inferior durante 2,5 s.
- `errorToast(mensaje)`: igual, pero no repite el mismo mensaje dentro de 3 s (lo usa el interceptor cuando fallan varias peticiones a la vez).
- `confirm(título, mensaje)`: diálogo con Cancelar/Eliminar; resuelve `true` si se confirma.

## 5. Interceptor de errores (HU-07)

`core/interceptors/error.interceptor.ts` se registra en `main.ts` con `provideHttpClient(withInterceptors([errorInterceptor]))`.

| Error                                   | Mensaje                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| Sin conexión con JSON Server (status 0) | «No se pudo conectar con la base de datos. ¿Está corriendo «npm run api»?»     |
| Sin conexión con PokéAPI (status 0)     | «No se pudo conectar con PokéAPI. Revisa tu conexión a internet.»              |
| 5xx                                     | «El servidor tuvo un problema. Intenta de nuevo en un momento.»                |
| 400 / 422                               | «Los datos enviados no son válidos.»                                           |
| 404                                     | Sin aviso: la página muestra su propio estado («no está en la base de datos»…) |
| Otros                                   | «Ocurrió un error inesperado (código N).»                                      |

El error se vuelve a lanzar, así que cada página decide qué hacer con su estado (quitar el spinner, mostrar «Reintentar», reactivar el botón de guardar). Las páginas **no** muestran su propio toast para errores HTTP, para no duplicar el mensaje.

## 6. Pantallas

### Pokédex (`PokedexPage`)

Estado con signals: `pokemon` (todo lo que devuelve el backend), `term` (búsqueda), `type` (tipo elegido o `null`) y `shown` (cuántos se muestran).

```
filtered = filterByType(filterRefs(pokemon, term), type)
visible  = filtered.slice(0, shown)
```

- Muestra 20 Pokémon (`POKEDEX_PAGE_SIZE`) y 20 más con cada `ion-infinite-scroll`. Al cambiar la búsqueda o el tipo, vuelve a 20.
- **Filtro por tipo (HU-14):** `availableTypes` lista solo los tipos que tiene al menos un Pokémon guardado, en el orden de `POKEMON_TYPES`. Tocar el tipo activo o «Todos» quita el filtro. En pantallas de 768 px o más los chips bajan de línea; en el celular se desplazan de lado.
- Deslizar un elemento muestra Editar y Eliminar. Eliminar pide confirmación.
- Si el backend no responde, se muestra el estado de error con «Reintentar».

### Detalle, Agregar y Editar

- **Detalle** carga el Pokémon del backend y la descripción de PokéAPI. Si la descripción falla, la ficha se muestra sin ella.
- **Agregar** busca en la lista de PokéAPI (máximo 30 resultados a la vez). Al elegir uno, consulta en paralelo si ya existe (`exists`) y sus datos (`getById`). Si ya existe, avisa y ofrece editarlo en lugar de duplicarlo.
- **Editar** usa el mismo `PokemonFormComponent` y hace `PUT` con `{ ...actual, ...cambios }`, conservando `createdAt`.

### Formulario (`PokemonFormComponent`)

| Campo                                                     | Validación                       |
| --------------------------------------------------------- | -------------------------------- |
| Nombre                                                    | Obligatorio, máx. 30 caracteres  |
| Tipos                                                     | Al menos uno (se guardan máx. 2) |
| Altura, peso, exp. base                                   | Obligatorios, ≥ 0                |
| Precio, stock                                             | Obligatorios, ≥ 0 (stock entero) |
| PS, Ataque, Defensa, Ataque esp., Defensa esp., Velocidad | Obligatorios, entre 1 y 255      |

Al enviarse, normaliza el nombre y las habilidades (minúsculas, sin espacios) y convierte los números.

## 7. Backend (JSON Server)

- `npm run api` sirve `backend/db.json` en el puerto 3000 con `--watch`. Cada alta, edición o baja escribe en ese archivo.
- `npm run api:reset` copia `backend/db.seed.json` sobre `db.json`.
- `npm run seed:151` (`scripts/seed-151.mjs`) consulta PokéAPI y reescribe los 151 Pokémon. Usa las mismas reglas de precio y stock que `core/utils/pokemon-defaults.ts`:
  - `price = max(1, baseExperience) × 100`
  - `stock = (id × 7 mod 50) + 5`
- La colección de Postman está en `backend/postman/`.

## 8. Calidad

| Comando                | Qué hace                                                                    |
| ---------------------- | --------------------------------------------------------------------------- |
| `npm test`             | 59 pruebas unitarias con Vitest (ver [plan de pruebas](plan-de-pruebas.md)) |
| `npm run lint`         | ESLint con las reglas de angular-eslint                                     |
| `npm run format:check` | Comprueba el formato con Prettier                                           |

Convenciones de las pruebas: el HTTP se simula con `HttpTestingController`; `UiService` y `NavController` se reemplazan por objetos con `vi.fn()` para comprobar los toasts y la navegación sin abrir componentes de Ionic.

## 9. Cómo agregar una funcionalidad

1. Crear la rama `feature/IS-XX-descripcion` desde `develop`.
2. Página nueva: carpeta en `features/`, componente standalone y ruta con `loadComponent` en `app.routes.ts`.
3. Datos nuevos en el backend: agregar la colección a `db.json` **y** a `db.seed.json`, la interfaz en `models/` y un servicio en `services/`.
4. Escribir las pruebas `*.spec.ts` junto al archivo.
5. `npm run lint`, `npm test`, revisar en vista móvil y abrir el Pull Request hacia `develop`.

## 10. Limitaciones conocidas

- JSON Server es un backend de desarrollo: no tiene autenticación y guarda todo en un archivo.
- La app necesita internet para las imágenes (sprites de GitHub) y para agregar Pokémon nuevos.
- La lista completa se trae en una sola petición y se pagina en el cliente; es suficiente para cientos de Pokémon.
