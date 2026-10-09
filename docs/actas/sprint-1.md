# Actas del Sprint 1: Fundamentos y Pokédex

**Tarea:** TK-07 · **Periodo del sprint:** 28 de septiembre al 9 de octubre de 2026
**Participantes:** Alex Felipe Palomino (Product Owner y Scrum Master), Kenneth Ramirez Burgos y Samuel David Florez (equipo de desarrollo)

> Fuente: Informe de sprints del 8 de octubre de 2026 e historial de Jira (proyecto ING SOFTWARE, clave IS).

---

## Acta de Sprint Review

**Fecha:** 8 de octubre de 2026

### Objetivo del sprint

Dejar configurado el proyecto Angular + Ionic, el backend con JSON Server funcionando y la Pokédex consultando la PokéAPI (listado, búsqueda y detalle).

**¿Se cumplió?** Sí, en lo funcional. Se completaron 23 de 29 puntos (79 %), más los 5 puntos de la HU-07 adelantados del Sprint 2.

### Incremento presentado

| Elemento                                                              | Responsable            | Estado                                        | Pts |
| --------------------------------------------------------------------- | ---------------------- | --------------------------------------------- | --- |
| HU-01 Proyecto base Angular + Ionic                                   | Alex Felipe Palomino   | Terminada (1 oct)                             | 3   |
| HU-02 Backend propio con JSON Server                                  | Alex Felipe Palomino   | Terminada (1 oct)                             | 5   |
| TK-01 Repositorio, ramas y Definición de Hecho                        | Alex Felipe Palomino   | Terminada (1 oct)                             | 2   |
| HU-03 Listar Pokémon con paginación y CRUD                            | Samuel David Florez    | Terminada (8 oct)                             | 5   |
| HU-04 Ver el detalle de un Pokémon                                    | Samuel David Florez    | Terminada (8 oct)                             | 5   |
| HU-05 Buscar por nombre o número                                      | Samuel David Florez    | Terminada (8 oct)                             | 3   |
| HU-07 Servicios Angular y manejo de errores (adelantada del Sprint 2) | Alex Felipe Palomino   | Terminada (1 oct)                             | 5   |
| HU-06 Navegación por pestañas                                         | Kenneth Ramirez Burgos | Retirada de Jira (la barra sí está en la app) | 3   |
| TK-02 Visión y casos de uso                                           | Samuel David Florez    | Retirada de Jira                              | 3   |

### Demostración

- Carga de los 151 Pokémon desde PokéAPI al backend con `npm run seed:151`.
- Listado con scroll infinito, búsqueda con espera de 400 ms y ficha de detalle.
- CRUD: agregar desde PokéAPI con formulario prellenado, editar y eliminar con confirmación.
- Estado de error con «Reintentar» cuando el backend está apagado.
- Verificación: lint sin errores, 28 pruebas unitarias y 36 pruebas de Postman aprobadas; probado en escritorio y en 375 px.

### Retroalimentación y cambios de alcance

- El equipo decidió concentrar el CRUD pedido por el profesor en el catálogo de Pokémon y dejar fuera de la entrega Equipos, Favoritos y Mis Pokémon (HU-08 a HU-13 y HU-15 a HU-18).
- Se retiraron de la ficha los botones «Agregar a favoritos» y «Agregar a equipo» (commit `106e3cd`).
- Quedan pendientes las capturas de UPDATE y DELETE y el filtro por tipo (HU-14).

### Backlog replanificado para el Sprint 2

| N.º | Actividad                                                                     | Responsable                                                  |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | Revisar e integrar a `develop` el Pull Request de `feature/IS-11-pokedex-151` | Alex Felipe Palomino (revisor) y Samuel David Florez (autor) |
| 2   | Probar y dejar evidencia de UPDATE y DELETE                                   | Kenneth Ramirez Burgos                                       |
| 3   | Filtro por tipo en la Pokédex (antigua HU-14)                                 | Alex Felipe Palomino                                         |
| 4   | Diagramas de casos de uso y de arquitectura (antiguas TK-02 y TK-03)          | Samuel David Florez                                          |
| 5   | Iniciar el sprint en Jira y actualizar HU-02 y HU-07 al nuevo alcance         | Kenneth Ramirez Burgos                                       |

---

## Acta de Sprint Retrospective

**Fecha:** 8 de octubre de 2026

### ¿Qué salió bien?

- Dividir el trabajo en épicas e historias con criterios de aceptación y casos de uso dejó claro el alcance de cada parte.
- Construir un backend propio desbloqueó el CRUD, y la PokéAPI permitió cargar los 151 Pokémon con datos completos.
- Las historias cerradas tienen evidencias y comentarios de cierre, y el código se verificó con pruebas automáticas.

### ¿Qué se puede mejorar?

- Mantener Jira al día: el Sprint 1 nunca se inició en el tablero y se eliminaron elementos sin dejar registro del cambio de alcance.
- Cumplir la Definición de Hecho antes de mover una historia a Listo: las historias de la Pokédex se cerraron con el Pull Request pendiente.
- Dejar el trabajo de cada integrante asignado a su nombre para que el reparto del esfuerzo sea visible.

### Compromisos para el Sprint 2

| Compromiso                                                                               | Responsable               |
| ---------------------------------------------------------------------------------------- | ------------------------- |
| Hacer reuniones breves de seguimiento                                                    | Todo el equipo            |
| Mover las tarjetas de Jira en el momento en que cambia su estado                         | Todo el equipo            |
| Cerrar una historia solo después de que otro integrante revise e integre su Pull Request | Todo el equipo            |
| Acordar en equipo cualquier cambio de alcance antes de retirarlo del tablero             | Alex Felipe Palomino (PO) |
| Asignar al menos una historia a cada integrante por sprint                               | Alex Felipe Palomino (SM) |
