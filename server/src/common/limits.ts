/** Escrituras del CRUD: 30/min por IP, además del límite global de 120/min (app.module.ts). */
export const WRITE_LIMIT = { default: { limit: 30, ttl: 60_000 } };
