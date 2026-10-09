# Diagramas

**Tareas:** TK-02 (casos de uso) y TK-03 (arquitectura y modelo de datos).

Los diagramas están escritos en [Mermaid](https://mermaid.js.org/), así que GitHub los muestra como imagen directamente en este archivo. Para exportarlos a PNG (por ejemplo, para el informe) se puede pegar cada bloque en <https://mermaid.live>.

## 1. Diagrama de casos de uso

El sistema tiene un solo actor humano, el **usuario de la tienda**, que administra el catálogo. PokéAPI y JSON Server son sistemas externos.

```mermaid
flowchart LR
    U(["👤 Usuario"])

    subgraph S["Sistema PokéCRUD"]
        direction TB
        UC1(["CU-01 Listar Pokémon"])
        UC2(["CU-02 Buscar por nombre o número"])
        UC3(["CU-03 Filtrar por tipo"])
        UC4(["CU-04 Ver detalle"])
        UC5(["CU-05 Agregar Pokémon"])
        UC6(["CU-06 Buscar en PokéAPI"])
        UC7(["CU-07 Editar Pokémon"])
        UC8(["CU-08 Eliminar Pokémon"])
        UC9(["CU-09 Confirmar eliminación"])
        UC10(["CU-10 Avisar error de conexión"])
    end

    API[["PokéAPI<br/>(solo lectura)"]]
    DB[["JSON Server<br/>(backend propio)"]]

    U --- UC1
    U --- UC2
    U --- UC3
    U --- UC4
    U --- UC5
    U --- UC7
    U --- UC8

    UC2 -. extiende .-> UC1
    UC3 -. extiende .-> UC1
    UC5 -. incluye .-> UC6
    UC8 -. incluye .-> UC9
    UC10 -. extiende .-> UC1

    UC6 --- API
    UC4 --- API
    UC1 --- DB
    UC4 --- DB
    UC5 --- DB
    UC7 --- DB
    UC8 --- DB
```

| Caso  | Historia | Descripción breve                                                                            |
| ----- | -------- | -------------------------------------------------------------------------------------------- |
| CU-01 | HU-03    | Ver los Pokémon guardados, 20 a la vez, con número, imagen, nombre, tipos, precio y stock    |
| CU-02 | HU-05    | Escribir un nombre parcial (`char`) o un número (`25`, `#025`) para filtrar la lista         |
| CU-03 | HU-14    | Elegir un tipo para ver solo los Pokémon que lo tienen; se combina con la búsqueda           |
| CU-04 | HU-04    | Ver la ficha con datos físicos, descripción en español (PokéAPI), habilidades y estadísticas |
| CU-05 | HU-03    | Elegir un Pokémon de PokéAPI, revisar el formulario prellenado y guardarlo                   |
| CU-06 | HU-03    | Buscar cualquier Pokémon de PokéAPI; si ya está guardado, se ofrece editarlo                 |
| CU-07 | HU-03    | Cambiar cualquier dato (incluidos precio y stock) con validaciones                           |
| CU-08 | HU-03    | Quitar un Pokémon del catálogo desde la ficha o deslizando el elemento de la lista           |
| CU-09 | HU-03    | Diálogo «¿Seguro que quieres eliminar…?» con Cancelar / Eliminar                             |
| CU-10 | HU-07    | Si una petición falla, mostrar un mensaje amigable y, en la lista, el botón «Reintentar»     |

## 2. Diagrama de arquitectura

Aplicación de una sola página (SPA) en el navegador o en el celular, con dos fuentes de datos.

```mermaid
flowchart TB
    subgraph Cliente["Cliente · Angular 22 + Ionic 9 (navegador o Capacitor)"]
        direction TB
        subgraph Pages["features/ (páginas)"]
            P1[PokedexPage<br/>lista · búsqueda · filtro]
            P2[PokemonDetailPage]
            P3[PokemonAddPage]
            P4[PokemonEditPage]
        end
        subgraph Shared["shared/"]
            C1[PokemonFormComponent]
            C2[TypeChipsComponent]
        end
        subgraph Services["services/"]
            S1[PokemonService<br/>CRUD /pokemon]
            S2[PokeApiService<br/>solo lectura]
            S3[UiService<br/>toasts · confirmación]
        end
        I1{{errorInterceptor<br/>core/interceptors}}
        H[HttpClient]
    end

    P1 & P2 & P4 --> S1
    P2 & P3 --> S2
    P3 --> S1
    P3 & P4 --> C1
    P1 & P2 --> C2
    P1 & P2 & P3 & P4 --> S3
    S1 & S2 --> H
    H --> I1
    I1 -. error .-> S3

    I1 -->|"HTTP REST<br/>GET · POST · PUT · DELETE"| JS[("JSON Server :3000<br/>backend/db.json")]
    I1 -->|"HTTPS GET"| PA[("PokéAPI<br/>pokeapi.co/api/v2")]

    SEED[/"scripts/seed-151.mjs<br/>npm run seed:151"/] -->|lee| PA
    SEED -->|escribe| JS
```

**Decisiones principales**

- **Backend propio:** PokéAPI es de solo lectura, así que los datos del CRUD viven en JSON Server. PokéAPI solo se usa para precargar los 151 y para buscar Pokémon nuevos al agregarlos.
- **Componentes standalone y signals:** cada página declara sus dependencias y su estado con `signal`/`computed`; no hay `NgModule`.
- **Recarga automática:** `PokemonService.version` cambia en cada alta, edición o baja, y la Pokédex se recarga sola.
- **Errores centralizados:** el interceptor muestra el mensaje y las páginas solo restauran su estado (spinner, «Reintentar»).

## 3. Modelo de datos

Recursos de `backend/db.json`. En esta entrega la app solo usa `pokemon`; `teams`, `favorites` y `customPokemon` siguen en el backend para cuando se activen esas secciones.

```mermaid
erDiagram
    POKEMON {
        int id PK "n.º de Pokédex nacional"
        string name
        string[] types "1 o 2 tipos"
        string[] abilities
        string imageUrl
        float height "metros"
        float weight "kilogramos"
        int baseExperience
        object stats "hp, attack, defense, specialAttack, specialDefense, speed (1-255)"
        int price "propio de la app, >= 0"
        int stock "propio de la app, >= 0"
        datetime createdAt
        datetime updatedAt
    }
    TEAM {
        int id PK
        string name
        string description
        int[] pokemonIds "max. 6"
        datetime createdAt
        datetime updatedAt
    }
    FAVORITE {
        int id PK
        int pokemonId FK
        string pokemonName
        string note
        int rating "1 a 5"
        datetime createdAt
    }
    CUSTOM_POKEMON {
        int id PK
        string name
        string[] types
        object stats "hp, attack, defense, speed"
        string imageUrl
        string description
        datetime createdAt
    }

    TEAM }o--o{ POKEMON : "pokemonIds"
    FAVORITE }o--|| POKEMON : "pokemonId"
```

## 4. Secuencia de una operación CRUD (UPDATE)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant E as PokemonEditPage
    participant F as PokemonFormComponent
    participant S as PokemonService
    participant I as errorInterceptor
    participant DB as JSON Server

    U->>E: Abre /pokemon/25/editar
    E->>S: getById(25)
    S->>I: GET /pokemon/25
    I->>DB: GET /pokemon/25
    DB-->>E: 200 Pokémon
    E->>F: initial = Pokémon (prellena)
    U->>F: Cambia precio y stock, toca «Guardar cambios»
    F->>F: Valida (stats 1-255, precio y stock >= 0)
    F-->>E: save(draft)
    E->>S: update({...actual, ...draft})
    S->>I: PUT /pokemon/25 (updatedAt nuevo)
    I->>DB: PUT /pokemon/25
    alt Éxito
        DB-->>S: 200
        S->>S: version + 1 (la Pokédex se recarga)
        E-->>U: Toast «Pikachu actualizado» y vuelve a la ficha
    else Error (backend apagado, 500…)
        DB--xI: error
        I-->>U: Toast con mensaje amigable
        E->>E: saving = false (sigue en el formulario)
    end
```
