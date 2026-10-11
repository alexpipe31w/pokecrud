# Datos: idempotencia, atomicidad y concurrencia

Aplica a todo lo que escribe en base de datos: endpoints, webhooks, jobs, crons, colas.
Stack de referencia: Prisma + Postgres/Supabase, NestJS, Next.js App Router.

---

## 1. Idempotencia

**Regla:** toda operación que pueda ejecutarse dos veces con la misma entrada debe dejar el mismo resultado que una. Webhooks, crons, jobs en cola, reintentos de red y botones que el usuario puede pulsar dos veces entran aquí.

### La clave de idempotencia

Tiene que venir **del emisor**, no generarla tú: `data.id` de Mercado Pago, `event.id` de Wompi, `messageId` de WhatsApp, o una cabecera `Idempotency-Key` que exiges al cliente. Un `cuid()` generado en tu servidor no sirve: en el segundo intento genera otro.

Si la clave se compone, el constraint también: `@@unique([tenantId, externalId])`.

### El antipatrón: `SELECT` suelto + `INSERT`

```ts
// MAL — dos webhooks simultáneos pasan ambos el if
const existe = await prisma.payment.findUnique({ where: { externalId } });
if (!existe) await prisma.payment.create({ data: { ... } });
```

La comprobación y la escritura no son atómicas: entre una y otra cabe la otra petición. **La decisión la toma la base de datos, no el proceso:**

```ts
// BIEN — el UNIQUE de la BD serializa
await prisma.payment.upsert({
  where:  { externalId },          // exige @unique(externalId) en el schema
  create: { externalId, ... },
  update: {},                       // segunda vez: no toca nada
});
```

**El `upsert` solo protege si el `@unique` existe y la migración está aplicada.** Verifícalo antes de darlo por bueno; si no está, el `upsert` no protege nada y ese es el hallazgo.

Variante cuando solo quieres insertar y seguir:

```ts
const r = await prisma.$executeRaw`
  INSERT INTO webhook_events (external_id, payload)
  VALUES (${externalId}, ${payload}::jsonb)
  ON CONFLICT (external_id) DO NOTHING`;
if (r === 0) return Response.json({ ok: true, duplicated: true });  // ya procesado
```

### Dedupe que envenena

Marcar el evento como procesado **antes** de procesarlo. Si el procesamiento falla, el reintento se descarta y el evento se pierde para siempre.

```ts
// MAL
await marcarProcesado(eventId);
await procesar(evento);            // si peta, el reintento se ignora
```

La marca va **al final**, o dentro de la misma transacción que el efecto. Y si el evento falla, el registro se queda en `pending`/`failed`, nunca en `processed`.

### Efectos no idempotentes dentro de un handler idempotente

El `upsert` está bien pero el correo se manda dos veces igual, o el stock se descuenta dos veces. **Cada efecto necesita su propia protección.** Los efectos externos (correo, mensaje, cobro) van fuera de la transacción y con su propio registro de "ya enviado".

### Cómo buscarlo
```bash
grep -rn "findUnique\|findFirst" --include="*.ts" src app | grep -v test
grep -rn "upsert\|ON CONFLICT" --include="*.ts" src app
grep -rn "@@unique\|@unique" --include="schema.prisma" .
grep -rln "webhook\|Webhook" --include="*.ts" src app
```

---

## 2. Atomicidad

**Regla:** varias escrituras que deben cuadrar entre sí van en **una** transacción. O se ve el resultado completo, o el anterior; nunca un estado a medias.

```ts
await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: { ... } });
  await tx.product.update({ where: { id }, data: { stock: { decrement: n } } });
  await tx.payment.create({ data: { orderId: order.id, ... } });
});
```

### Nada de red dentro de la transacción

Mandar el correo o llamar a la pasarela dentro del `$transaction` alarga el lock (bloqueando a todos los demás mientras un tercero responde) y ata el rollback a un sistema que no puede hacer rollback. **Los efectos externos van fuera y después**, o por outbox.

```ts
// MAL
await prisma.$transaction(async (tx) => {
  const o = await tx.order.create({ ... });
  await fetch('https://api.pasarela.com/charge', { ... });   // ← fuera de aquí
});
```

### Escrituras que cruzan sistemas

Escribir en tu BD y llamar a la API del CRM en el mismo flujo: si la segunda falla, quedan desincronizados y no hay rollback posible. Opciones reales, elige una y **escríbela**:

- **Outbox** — la escritura local y una fila `outbox_events` en la misma transacción; un worker lee el outbox y llama al tercero con reintentos. Es la respuesta correcta casi siempre.
- **Saga / compensación** — defines la operación inversa y la ejecutas si el paso siguiente falla.
- **Reconciliación** — un cron periódico compara ambos lados y corrige las diferencias.

Lo que no vale es "escrituras sueltas y esperanza". Si el proyecto no tiene ninguna de las tres, el hallazgo es que no está escrito **cuál es la compensación** cuando el segundo sistema falla.

### Aislamiento

El nivel por defecto de Postgres (`READ COMMITTED`) **no** impide que dos transacciones lean el mismo valor y lo pisen. Para invariantes que dependen de leer-y-decidir, o subes el nivel o usas un guard en el `UPDATE` (sección siguiente):

```ts
await prisma.$transaction(fn, { isolationLevel: 'Serializable' });  // y maneja el error de serialización con reintento
```

`Serializable` puede abortar la transacción con un error de serialización: **hay que reintentarla**. Si no lo manejas, has cambiado una corrupción silenciosa por un 500.

### Cómo buscarlo
```bash
grep -rn "\$transaction" --include="*.ts" src app
grep -rn -A10 "\$transaction" --include="*.ts" src app | grep "fetch(\|axios\|sendMail\|http"
```
Y a la inversa: en cada handler con dos o más escrituras sin `$transaction`, pregúntate qué queda a medias si la segunda falla. Esa respuesta es el escenario del hallazgo.

---

## 3. Concurrencia

**Asume siempre dos peticiones simultáneas sobre el mismo registro.** Si no puedes nombrar qué las serializa, hay un problema.

### Leer-restar-guardar: el más caro

```ts
// MAL — vende de más
const p = await prisma.product.findUnique({ where: { id } });
if (p.stock >= n) {
  await prisma.product.update({ where: { id }, data: { stock: p.stock - n } });
}
```

Dos peticiones leen `stock = 1`, las dos pasan el `if`, las dos escriben `0`. Se vendió dos veces.

```ts
// BIEN — atómico en la BD, y falla solo si no hay stock
const r = await prisma.product.updateMany({
  where: { id, stock: { gte: n } },
  data:  { stock: { decrement: n } },
});
if (r.count === 0) throw new ConflictException('sin stock');
```

`{ decrement: n }` es atómico, pero **solo es correcto con el `where: { stock: { gte: n } }`**. Sin esa condición no hay carrera pero sí stock negativo. Y refuerza la invariante en la base, que es lo único que no se puede saltar:

```sql
ALTER TABLE products ADD CONSTRAINT stock_no_negativo CHECK (stock >= 0);
```

Lo mismo aplica a saldos, cupos de aforo, contadores de uso y límites de plan.

### Bloqueo pesimista

Cuando de verdad necesitas leer y decidir con el registro bloqueado (flujos de dinero):

```ts
await prisma.$transaction(async (tx) => {
  const [row] = await tx.$queryRaw`SELECT saldo FROM cuentas WHERE id = ${id} FOR UPDATE`;
  if (row.saldo < monto) throw new Error('saldo insuficiente');
  await tx.$executeRaw`UPDATE cuentas SET saldo = saldo - ${monto} WHERE id = ${id}`;
});
```

`FOR UPDATE` fuera de una transacción no bloquea nada: el lock se libera al instante.

### Bloqueo optimista

Para edición concurrente desde paneles (dos personas editando la misma ficha, el último gana y machaca en silencio):

```prisma
model Cita { id String @id; version Int @default(0); ... }
```
```ts
const r = await prisma.cita.updateMany({
  where: { id, version },                       // la versión que leyó el cliente
  data:  { ...cambios, version: { increment: 1 } },
});
if (r.count === 0) throw new ConflictException('modificado por otro usuario');
```

### Colas: claim atómico

Dos workers no pueden coger el mismo item. `findMany` + `update` no sirve.

```sql
UPDATE jobs SET status = 'processing', worker_id = $1, claimed_at = now()
WHERE id = (
  SELECT id FROM jobs WHERE status = 'pending'
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```

`SKIP LOCKED` es lo que hace que el segundo worker se lleve otro item en vez de esperar. Y todo job necesita **timeout de claim**: si un worker muere en `processing`, otro debe poder recuperarlo pasado un tiempo (`claimed_at < now() - interval '5 minutes'`), con tope de reintentos para no reintentar eternamente un job envenenado.

### Crons solapándose

Un cron cada minuto cuya ejecución tarda tres. En pods con `crontab` y en Vercel Cron esto pasa de verdad. Usa un advisory lock de Postgres, que se libera solo si el proceso muere:

```ts
const [{ pg_try_advisory_lock: got }] = await prisma.$queryRaw`SELECT pg_try_advisory_lock(${LOCK_ID})`;
if (!got) return;              // ya hay otra ejecución en curso: salir limpio
try { await trabajo(); } finally { await prisma.$queryRaw`SELECT pg_advisory_unlock(${LOCK_ID})`; }
```

Un flag en una fila también vale, pero necesita TTL: si el proceso muere, el flag se queda puesto para siempre.

### Cómo buscarlo
```bash
grep -rn "decrement\|increment" --include="*.ts" src app
grep -rn -A6 "findUnique\|findFirst" --include="*.ts" src app | grep "update("
grep -rn "FOR UPDATE\|SKIP LOCKED\|advisory" --include="*.ts" --include="*.sql" .
grep -rn "@Cron\|node-cron\|crontab" --include="*.ts" src app
```

---

## Migraciones sin downtime

Una migración también es código de producción, y corre mientras la versión anterior sigue viva:

- **Añadir columna `NOT NULL` sin default rompe** la versión desplegada. Hazlo en tres pasos: añadir nullable → rellenar por lotes → poner `NOT NULL`.
- **Renombrar o borrar una columna rompe** la versión anterior durante el despliegue. Añade la nueva, escribe en ambas, migra, y borra la vieja en un despliegue posterior.
- **`CREATE INDEX` bloquea la tabla.** En Postgres usa `CREATE INDEX CONCURRENTLY` (fuera de transacción).
- **Los backfills van por lotes con límite**, nunca un `UPDATE` de la tabla entera.
- Toda migración debería poder revertirse, o dejar escrito por qué no.
