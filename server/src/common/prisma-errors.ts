import { Prisma } from '../generated/prisma/client.js';

const isKnown = (err: unknown, code: string): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === code;

/** El registro no existe (o no es del jugador: el `where` filtra por `playerId`). */
export const isNotFound = (err: unknown): boolean => isKnown(err, 'P2025');

/** Violación de una restricción UNIQUE (p. ej. id de Pokédex repetido, favorito repetido). */
export const isUniqueViolation = (err: unknown): boolean =>
  isKnown(err, 'P2002');
