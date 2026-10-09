# Plan de pruebas de software

**Proyecto:** PokéCRUD · **Tarea:** TK-04 (plan de pruebas y pruebas funcionales) y TK-05 (pruebas unitarias)
**Versión probada:** rama `feature/IS-22-filtro-por-tipo` (sobre `develop` en `9b62f46`)
**Fecha de ejecución:** 8 de octubre de 2026

## 1. Objetivo

Verificar que las cuatro operaciones del CRUD (crear, leer, actualizar y eliminar), la búsqueda, el filtro por tipo y el manejo de errores funcionan según los criterios de aceptación de las historias HU-03, HU-04, HU-05, HU-07 y HU-14, y que los cambios quedan guardados en el backend propio.

## 2. Alcance

| Incluido                                                     | Fuera de alcance                                           |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| Pokédex: listado, scroll infinito, búsqueda, filtro por tipo | Equipos, Favoritos y Mis Pokémon (ocultos en esta entrega) |
| Ficha de detalle                                             | Compilación nativa Android/iOS con Capacitor               |
| Agregar, editar y eliminar Pokémon                           | Pruebas de carga o rendimiento                             |
| Mensajes de error (interceptor) y estado «Reintentar»        | Disponibilidad de PokéAPI (servicio externo)               |
| Servicios, formulario y páginas (pruebas unitarias)          |                                                            |

## 3. Niveles y tipos de prueba

| Nivel                    | Herramienta                                | Qué se prueba                                                      | Cómo se ejecuta                               |
| ------------------------ | ------------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------- |
| Unitarias                | Vitest + Angular TestBed                   | Servicios, interceptor, formulario y páginas con HTTP simulado     | `npm test`                                    |
| Funcionales (caja negra) | Navegador Chrome, vista móvil y escritorio | Casos de uso completos sobre la app real con JSON Server encendido | Casos CP-01 a CP-17 (sección 6)               |
| API                      | Postman (colección del repositorio)        | Endpoints GET, POST, PUT, PATCH y DELETE de cada recurso           | Runner de Postman (ver Figura 18 del informe) |
| Estáticas                | ESLint + Prettier                          | Estilo y errores comunes del código                                | `npm run lint` y `npm run format:check`       |

## 4. Entorno de pruebas

| Elemento         | Valor                                                                      |
| ---------------- | -------------------------------------------------------------------------- |
| Sistema          | Windows 11                                                                 |
| Node.js          | 24.20.0                                                                    |
| Navegador        | Google Chrome, tema oscuro del sistema                                     |
| Vista móvil      | 390 × 844 px (escala 2×, táctil)                                           |
| Vista escritorio | 1280 × 800 px                                                              |
| Backend          | JSON Server en `http://localhost:3000` con `backend/db.json` (151 Pokémon) |
| App              | `ng serve` en `http://localhost:8100`                                      |

Antes de cada ejecución se restaura la base de datos para que los resultados se puedan repetir (`npm run api:reset` o una copia de `db.json`).

## 5. Criterios de aceptación del plan

- Todas las pruebas unitarias pasan y `npm run lint` no reporta errores.
- Todos los casos funcionales de prioridad alta pasan.
- Ningún caso deja la base de datos en un estado inconsistente (por ejemplo, stock negativo).
- No aparecen errores inesperados en la consola del navegador.

## 6. Casos de prueba funcionales

Prioridad: **A** = alta (operación CRUD), **M** = media.

| ID    | Historia | Operación | Prioridad | Precondición                     | Pasos                                                                | Resultado esperado                                                                                                                                 | Resultado | Evidencia                                                        |
| ----- | -------- | --------- | --------- | -------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------- |
| CP-01 | HU-03    | READ      | A         | Backend con 151 Pokémon          | Abrir `/tabs/pokedex`                                                | Se ven 20 Pokémon y el contador «151 de 151 Pokémon»                                                                                               | ✅ Pasa   | `HU-03_04_lista-primeros-20-escritorio.jpg`                      |
| CP-02 | HU-03    | READ      | M         | CP-01                            | Desplazarse hasta el final de la lista                               | Se cargan 20 más (40 visibles)                                                                                                                     | ✅ Pasa   | `HU-03_05_infinite-scroll-40.jpg`                                |
| CP-03 | HU-05    | READ      | A         | CP-01                            | Escribir «pikachu» en el buscador                                    | Un único resultado: Pikachu                                                                                                                        | ✅ Pasa   | `HU-05_01_buscar-pikachu.jpg`                                    |
| CP-04 | HU-05    | READ      | M         | CP-01                            | Escribir «#150»                                                      | Un único resultado: Mewtwo                                                                                                                         | ✅ Pasa   | —                                                                |
| CP-05 | HU-05    | READ      | M         | CP-01                            | Escribir «missingno»                                                 | Mensaje «No se encontró ningún Pokémon»                                                                                                            | ✅ Pasa   | `HU-05_03_sin-resultados.jpg`                                    |
| CP-06 | HU-14    | READ      | A         | CP-01                            | Tocar el chip «Fuego»                                                | Solo Pokémon con tipo Fuego (12 de 151) y el contador «12 de 151 Pokémon de tipo Fuego»                                                            | ✅ Pasa   | `HU-14_01_filtro-tipo-fuego.jpg`                                 |
| CP-07 | HU-14    | READ      | M         | CP-06                            | Con «Fuego» activo, escribir «char»                                  | Charmander, Charmeleon y Charizard                                                                                                                 | ✅ Pasa   | `HU-14_02_filtro-tipo-y-busqueda.jpg`                            |
| CP-08 | HU-14    | READ      | M         | CP-06                            | Borrar la búsqueda y tocar «Todos»                                   | Vuelven a verse los 151                                                                                                                            | ✅ Pasa   | —                                                                |
| CP-09 | HU-14    | READ      | M         | Vista de escritorio              | Tocar «Planta»                                                       | Solo Pokémon de tipo Planta (14); los chips bajan de línea y todos son visibles                                                                    | ✅ Pasa   | `HU-14_03_filtro-tipo-escritorio.jpg`                            |
| CP-10 | HU-04    | READ      | A         | Pikachu guardado                 | Abrir `/pokemon/25`                                                  | Ficha con #025, imagen, tipos, precio, stock, descripción y estadísticas                                                                           | ✅ Pasa   | `HU-03_11_editar-guardado.jpg`                                   |
| CP-11 | HU-03    | UPDATE    | A         | CP-10                            | Tocar editar, poner stock «-1» y guardar                             | Mensaje «Debe ser 0 o más»; no se guarda y se queda en el formulario                                                                               | ✅ Pasa   | `HU-03_09_editar-validacion.jpg`                                 |
| CP-12 | HU-03    | UPDATE    | A         | CP-10                            | Cambiar precio a 12345 y stock a 3, y guardar                        | Toast «Pikachu actualizado», vuelve a la ficha con los nuevos valores; la API devuelve price=12345, stock=3, `updatedAt` nuevo y `createdAt` igual | ✅ Pasa   | `HU-03_10_editar-formulario.jpg`, `HU-03_11_editar-guardado.jpg` |
| CP-13 | HU-03    | DELETE    | A         | CP-10                            | Tocar eliminar y elegir «Cancelar»                                   | El Pokémon sigue en la base de datos                                                                                                               | ✅ Pasa   | `HU-03_12_eliminar-confirmacion.jpg`                             |
| CP-14 | HU-03    | DELETE    | A         | CP-10                            | Tocar eliminar y confirmar «Eliminar»                                | Toast «Pikachu eliminado», vuelve a la Pokédex; `GET /pokemon/25` responde 404                                                                     | ✅ Pasa   | `HU-03_13_eliminado.jpg`                                         |
| CP-15 | HU-03    | CREATE    | A         | Pikachu no está guardado (CP-14) | Tocar «+», buscar «pikachu», elegirlo y tocar «Agregar a la Pokédex» | Formulario prellenado; toast «Pikachu agregado a la Pokédex»; `GET /pokemon/25` responde 200                                                       | ✅ Pasa   | `HU-03_07_agregar-formulario-prellenado.jpg`                     |
| CP-16 | HU-03    | CREATE    | M         | Bulbasaur guardado               | Tocar «+», buscar «bulbasaur» y elegirlo                             | Aviso «ya está en la base de datos» con botón «Editarlo»; no se duplica                                                                            | ✅ Pasa   | `HU-03_03_agregar-buscar-pokeapi.jpg`                            |
| CP-17 | HU-07    | —         | A         | JSON Server apagado              | Abrir `/tabs/pokedex`                                                | Estado de error con «Reintentar» y un solo toast «No se pudo conectar con la base de datos…»                                                       | ✅ Pasa   | `HU-07_01_interceptor-backend-apagado.jpg`                       |

Todas las evidencias están en `docs/evidencias/`. Las capturas `HU-03_09` a `HU-03_13`, `HU-07_01` y `HU-14_01` a `HU-14_03` se tomaron en esta ejecución; las de CP-01 a CP-05, CP-15 y CP-16 son las que el equipo ya había adjuntado en Jira y muestran el mismo comportamiento.

### Observación sobre la consola

En CP-15 el navegador registra un `404 (Not Found)` en `GET /pokemon/25`. Es esperado: antes de crear, la app consulta si el Pokémon ya existe y JSON Server responde 404 cuando no está. No hubo otros errores en consola.

## 7. Pruebas unitarias

`npm test` ejecuta **59 pruebas en 14 archivos**, todas aprobadas (8 de octubre de 2026).

| Archivo                              | Pruebas | Qué cubre                                                                            |
| ------------------------------------ | ------- | ------------------------------------------------------------------------------------ |
| `poke-api.service.spec.ts`           | 10      | Lista, búsqueda por número/nombre, conversión de datos de PokéAPI, descripción       |
| `pokemon.service.spec.ts`            | 5       | GET, POST, PUT y DELETE contra JSON Server                                           |
| `error.interceptor.spec.ts`          | 8       | Mensajes por tipo de error, 404 sin aviso, error reenviado, toast sin repetir        |
| `pokemon-form.component.spec.ts`     | 8       | Prellenado, envío y validaciones (nombre, tipos, stats 1–255, precio, normalización) |
| `pokedex.page.spec.ts`               | 11      | Listado, scroll infinito, filtro por tipo, búsqueda combinada, eliminar/cancelar     |
| `pokemon-add.page.spec.ts`           | 4       | Búsqueda en PokéAPI, prellenado, POST y aviso de duplicado                           |
| `pokemon-edit.page.spec.ts`          | 4       | Carga, PUT conservando `createdAt`, fallo del backend, Pokémon inexistente           |
| `pokemon-detail.page.spec.ts`        | 2       | Ficha con datos y Pokémon inexistente                                                |
| Otros (app, pestañas y placeholders) | 7       | Que los componentes se creen                                                         |

## 8. Resumen de resultados

| Tipo              | Ejecutados | Aprobados   | Fallidos |
| ----------------- | ---------- | ----------- | -------- |
| Casos funcionales | 17         | 17          | 0        |
| Pruebas unitarias | 59         | 59          | 0        |
| Lint (ESLint)     | —          | Sin errores | —        |

## 9. Defectos encontrados y corregidos durante la ejecución

| N.º | Defecto                                                                                                  | Corrección                                                                         |
| --- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | El interceptor de errores de la HU-07 no estaba en el código (solo había un README).                     | Se implementó `core/interceptors/error.interceptor.ts` y se registró en `main.ts`. |
| 2   | Al fallar el backend, algunas páginas mostraban un toast genérico además del mensaje del interceptor.    | Las páginas dejan el aviso al interceptor y solo restauran su estado.              |
| 3   | En escritorio los chips del filtro por tipo se cortaban y no se podía llegar a los últimos con el mouse. | Desde 768 px los chips bajan de línea.                                             |
| 4   | Los mensajes de error mostraban comillas invertidas (`` `npm run api` ``).                               | Se cambiaron por «npm run api».                                                    |
