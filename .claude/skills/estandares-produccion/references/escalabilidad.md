# Escalabilidad

Aplica a listados, búsquedas, reportes, y a cualquier consulta cuyo coste crezca con los datos.

**Premisa:** todo funciona con 50 filas. Los problemas de escalabilidad no se notan al escribir el código, se notan seis meses después y de golpe. Por eso se resuelven al escribirlo.

---

## 1. N+1

Una query dentro de un bucle sobre resultados de otra query. Es el problema de rendimiento más común y el más fácil de evitar.

```ts
// MAL — 1 + N consultas
const ordenes = await prisma.order.findMany({ where: { tenantId } });
for (const o of ordenes) {
  o.cliente = await prisma.customer.findUnique({ where: { id: o.customerId } });
}

// BIEN — una consulta
const ordenes = await prisma.order.findMany({
  where: { tenantId },
  include: { cliente: true },
});
```

Cuando no puedes usar `include` (fuentes distintas, lógica intermedia), trae todo de una y agrupa en memoria:

```ts
const clientes = await prisma.customer.findMany({ where: { id: { in: ids } } });
const porId = new Map(clientes.map(c => [c.id, c]));
```

Ojo con el caso disfrazado: un `Promise.all` sobre un array de queries no es N+1 de latencia, pero **sí son N conexiones simultáneas al pool**. Con 500 elementos, agotas el pool igual.

```bash
grep -rn -A6 "for (const\|\.map(async\|forEach(async" --include="*.ts" src app | grep "prisma\.\|supabase\.\|fetch("
```

---

## 2. Paginación

**Todo listado tiene límite desde el día uno.** Un `findMany()` sin `take` es una bomba de relojería.

```bash
grep -rn "findMany(" --include="*.ts" src app | grep -v "take:"
```

- **Offset (`skip`/`take`)** — vale para paneles con números de página y pocos datos. Se degrada mal: `OFFSET 100000` hace que Postgres recorra y descarte 100.000 filas. Y si se insertan filas mientras paginas, hay elementos duplicados o saltados.
- **Cursor** — lo correcto para listados grandes, feeds y scroll infinito. Ordena por una columna única y estable (o por par `(createdAt, id)` para desempatar) y filtra por el cursor:

```ts
const items = await prisma.message.findMany({
  where: { conversationId },
  orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  take: 50,
  ...(cursor && { cursor: { id: cursor }, skip: 1 }),
});
```

- **Tope máximo del lado del servidor.** Si el cliente pide `limit=10000`, se le da 100. El límite no lo decide quien llama.
- **Nada de `SELECT *`**: usa `select` con los campos que de verdad pinta la UI. Traer un `payload` JSON de 200 KB por fila para mostrar el nombre es el 90 % del tiempo de respuesta.
- **`count()` sobre tablas grandes es caro.** Para "hay más", pide `take: limit + 1` y mira si sobra uno, en vez de contar el total.

---

## 3. Índices

**Toda columna usada en `WHERE`, `JOIN` u `ORDER BY` de una ruta caliente necesita índice.** Y el índice tiene que estar en una **migración aplicada**, no solo en el `schema.prisma`.

- **El orden importa en los índices compuestos.** `@@index([tenantId, createdAt])` sirve para filtrar por tenant y ordenar por fecha; al revés, no.
- **Paginar por cursor exige que el índice cubra el `orderBy`**, o Postgres ordenará en memoria toda la tabla.
- **Índice único parcial** para invariantes condicionales:
  ```sql
  CREATE UNIQUE INDEX un_carrito_activo ON carts (user_id) WHERE status = 'active';
  ```
- **Los índices no son gratis**: ralentizan las escrituras y ocupan disco. No indexes por si acaso; indexa lo que el `where` real usa.
- **Verifica con datos, no con intuición**: `EXPLAIN ANALYZE` sobre la query real. Un `Seq Scan` sobre una tabla grande en una ruta caliente es el hallazgo.

```bash
grep -rn "@@index\|@@unique" --include="schema.prisma" .
grep -rn "CREATE INDEX\|CREATE UNIQUE INDEX" prisma/migrations supabase/migrations 2>/dev/null
```

Con MCP de Supabase de solo lectura, confirma en la base real: el `schema.prisma` puede mentir si la migración no se aplicó.

---

## 4. Crecimiento sin techo

Todo lo que solo crece necesita **política de retención escrita**: logs, histórico de ejecuciones, eventos de webhook, mensajes, notificaciones, sesiones caducadas, subidas.

- Borrado o archivado por antigüedad, en un cron **por lotes con límite** (un `DELETE` de millones de filas bloquea la tabla).
- Particionado por fecha si el volumen lo justifica.
- Para ficheros: caducidad en el almacenamiento (Cloudinary/Blob/S3), no solo en tu tabla.

Si no hay política, dilo: "esta tabla crece sin techo y no hay retención definida" es un hallazgo legítimo aunque hoy tenga 200 filas.

---

## 5. Trabajo pesado y caché

- **Fuera del ciclo petición-respuesta** todo lo que tarde: PDFs, exportaciones a Excel, llamadas a LLM, envíos masivos, sincronizaciones. Cola o cron, y al usuario se le responde "lo estamos preparando".
- **Exportaciones**: en streaming o por lotes. Cargar 100.000 filas en memoria para generar un Excel tumba el proceso.
- **Caché** solo cuando ya mediste. Y entonces define desde el principio **cómo se invalida**: caché sin invalidación clara es datos viejos servidos con confianza. Etiquetas o claves versionadas; nunca "ya se irá renovando".
- **Agregados precalculados** (contadores, totales del dashboard) actualizados de forma incremental o por cron, no recalculados en cada carga con un `count(*)` sobre toda la tabla.

---

## Autoverificación

1. ¿Cuántas consultas lanza este endpoint? ¿Depende del número de resultados?
2. ¿Qué devuelve si hay un millón de filas? ¿Y cuánto tarda?
3. ¿Cada columna de mi `where` y mi `orderBy` tiene índice **en una migración aplicada**?
4. ¿Esta tabla tiene techo? Si no, ¿quién la limpia?
5. ¿Cuántos bytes por fila estoy trayendo, y cuántos pinta la UI?
