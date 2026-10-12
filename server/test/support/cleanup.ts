import type { PrismaService } from '../../src/prisma/prisma.service.js';

/** Dominio de TODAS las cuentas de prueba (e2e, Postman, pruebas a mano). Nunca se usa para cuentas reales. */
export const TEST_DOMAIN = '@pokecrud.test';

/** Margen para no tocar cuentas de una ejecución que sigue en marcha (otro archivo e2e, un Runner de Postman). */
const STALE_AFTER_MS = 60 * 60 * 1000;

/**
 * Borra los jugadores de prueba de ESTE archivo (`<prefix>…@pokecrud.test`) y los de prueba con más de una hora
 * (restos de Postman o de ejecuciones cortadas). Antes cada archivo borraba todos los `@pokecrud.test`: con los
 * archivos en paralelo, el primero en terminar borraba los jugadores de los demás a mitad de test (FK → 500).
 */
export async function cleanupTestPlayers(
  prisma: PrismaService,
  prefix: string,
): Promise<void> {
  await prisma.player.deleteMany({
    where: {
      email: { endsWith: TEST_DOMAIN },
      OR: [
        { email: { startsWith: prefix } },
        { createdAt: { lt: new Date(Date.now() - STALE_AFTER_MS) } },
      ],
    },
  });
}
