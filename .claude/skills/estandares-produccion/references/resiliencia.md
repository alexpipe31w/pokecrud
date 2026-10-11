# Resiliencia: disponibilidad y degradación

Aplica a toda integración con un tercero: pasarelas de pago, LLM, WhatsApp, CRM, correo, almacenamiento, y a cualquier llamada de servicio a servicio.

**Premisa:** todo lo que está al otro lado de la red se cae, y se cae de la peor forma — no devolviendo un error, sino tardando. Un servicio caído se detecta en un segundo; un servicio lento te agota el pool de conexiones y tumba la app entera.

---

## 1. Timeouts

**Sin timeout no hay disponibilidad.** Es el control más barato y el que más se olvida.

```ts
// MAL — espera indefinidamente
const r = await fetch(url);

// BIEN
const r = await fetch(url, { signal: AbortSignal.timeout(5_000) });
```

- **Cada llamada externa lleva el suyo**, ajustado a lo que hace: 2–3 s para un servicio interno, 5–10 s para una pasarela, más para un LLM (pero acotado, y entonces mejor en cola).
- **Timeout también en la base de datos**: `statement_timeout` en Postgres y timeout de adquisición del pool. Una query sin límite bloquea una conexión indefinidamente.
- **El timeout total del endpoint debe ser menor que el del cliente** que lo llama (y menor que el máximo de la plataforma: en Vercel, el límite de la función). Si no, el cliente se rinde, reintenta, y tú sigues trabajando en la petición abandonada — duplicando la carga justo cuando peor estás.
- **Al abortar, cancela de verdad**: propaga el `AbortSignal` hacia abajo para no seguir gastando en trabajo que nadie va a leer.

```bash
grep -rn "fetch(\|axios\.\|httpService\." --include="*.ts" src app | grep -v "timeout\|AbortSignal"
```

---

## 2. Reintentos

Tres cosas separadas, y las tres se hacen mal por separado:

**a) Solo sobre operaciones idempotentes.** Reintentar un cobro sin clave de idempotencia es cobrar dos veces. Si la operación no es idempotente, o la haces idempotente (ver `datos-y-concurrencia.md`) o no se reintenta.

**b) Con backoff exponencial **y jitter**.** Sin jitter, todos los clientes que fallaron reintentan a la vez y rematan al servicio que se estaba recuperando (*thundering herd*):

```ts
async function conReintentos<T>(fn: () => Promise<T>, intentos = 3): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      if (i >= intentos - 1 || !esReintentable(e)) throw e;
      const base = Math.min(1000 * 2 ** i, 10_000);
      await new Promise(r => setTimeout(r, Math.random() * base));   // full jitter
    }
  }
}
```

**c) Solo lo que tiene sentido reintentar.** 5xx, 429 y errores de red, sí. **4xx, no**: un 400 va a seguir siendo 400 tres veces más, y un 401 igual. Y si viene `Retry-After`, respétalo en vez de inventarte el intervalo.

**Tope siempre.** Reintentos sin límite convierten un fallo transitorio en una tormenta permanente. Lo que agota los reintentos va a una cola de fallidos (*dead letter*) con su contexto, no al vacío.

---

## 3. Qué pasa cuando el tercero está caído

**Elige una de las tres y escríbela en el código.** Un `catch` que devuelve `null` y sigue no es ninguna:

- **Degradar** — seguir sin esa función. El bloque de recomendaciones no aparece, pero la ficha de producto carga. Sirve para lo accesorio.
- **Encolar** — aceptar la petición, responder al usuario y procesar cuando el tercero vuelva. Sirve para correos, mensajes y sincronizaciones.
- **Fallar limpio** — 503 con `Retry-After` y un mensaje claro. Sirve cuando sin el tercero la operación no tiene sentido (no puedes cobrar sin pasarela).

Lo que nunca vale es fingir que salió bien.

### Un servicio secundario no puede tumbar el principal

Que falle el correo de confirmación no puede hacer fallar la creación de la orden.

```ts
const orden = await crearOrden(datos);                        // camino crítico
enviarCorreo(orden).catch(e =>                                // accesorio: aislado
  logger.error({ err: e, ordenId: orden.id }, 'fallo al enviar confirmación'));
return Response.json(orden);
```

Ojo: un `.catch()` que solo loguea significa que el correo **se pierde**. Si el correo importa, va a cola con reintentos, no a un `catch` silencioso. Decide cuál de las dos cosas es y sé explícito.

---

## 4. Circuit breaker

Cuando un tercero está caído, seguir llamándolo gasta timeouts (y conexiones) en cada petición. El cortacircuitos deja de llamar durante un rato:

- **Cerrado** → pasa todo. Cuenta fallos en una ventana.
- **Abierto** → tras N fallos, falla al instante sin llamar, durante un intervalo (30–60 s).
- **Semiabierto** → deja pasar una petición de prueba; si va bien, cierra; si no, vuelve a abrir.

Vale la pena cuando el tercero es crítico y de alto volumen. Para una integración que se llama tres veces al día, es sobreingeniería: con timeout y reintentos acotados basta. **Dilo cuando decidas no ponerlo.**

---

## 5. Carga y recursos

- **Pool de conexiones a la BD acotado y consciente del entorno.** En serverless, cada instancia abre su propio pool: 100 instancias × 10 conexiones agotan Postgres. Usa un pooler (PgBouncer, Supabase pooler, Prisma Accelerate) y baja el `connection_limit`.
- **Trabajo pesado fuera del ciclo petición-respuesta**: generar PDFs, llamar a un LLM, mandar 200 correos. Cola o cron.
- **Backpressure**: si la cola crece más rápido de lo que se vacía, hay que rechazar o frenar la entrada, no acumular hasta reventar la memoria.
- **Apagado ordenado**: al recibir `SIGTERM`, deja de aceptar peticiones nuevas, termina las que están en curso (con un tope), cierra el pool y sal. Sin esto, cada despliegue corta peticiones a la mitad.
- **Health checks separados**: *liveness* (el proceso está vivo) distinto de *readiness* (puede atender: BD accesible, migraciones aplicadas). Confundirlos hace que el orquestador reinicie procesos sanos.

---

## 6. Idempotencia hacia fuera

Cuando **tú** llamas a un tercero y no sabes si llegó (timeout), el reintento puede duplicar. Manda una clave de idempotencia si el proveedor la soporta (`Idempotency-Key` en Stripe, `X-Idempotency-Key` en Mercado Pago) y **guárdala junto a la operación local** para reusar exactamente la misma en el reintento. Si generas una nueva en cada intento, la clave no sirve de nada.

---

## Autoverificación

1. ¿Qué pasa si este servicio tarda 60 segundos en responder? ¿Cuántos workers me quedan libres?
2. Si reintento esta operación, ¿puede cobrar o crear dos veces?
3. Si este tercero lleva una hora caído, ¿qué ve el usuario? ¿Qué pasa con lo que no se envió?
4. Si mi endpoint tarda más que el timeout del cliente, ¿qué pasa con el trabajo que sigue corriendo?
5. Cuando despliego, ¿qué pasa con las peticiones en vuelo?
