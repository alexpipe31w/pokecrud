// Rol de administrador del inventario `/pokemon` (F0-12, D-023). Desde server/:
//   npm run admin -- list                 → quién es ADMIN
//   npm run admin -- grant <correo>       → da el rol
//   npm run admin -- revoke <correo>      → lo quita (surte efecto en la siguiente petición: el rol no va en el token)
// Idempotente: dar el rol a quien ya lo tiene no cambia nada. A propósito NO hay endpoint para esto: solo
// quien tiene la contraseña de la BD (server/.env) puede nombrar administradores.
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const USAGE = 'Uso: npm run admin -- list | grant <correo> | revoke <correo>';

async function main(): Promise<void> {
  const [action, rawEmail] = process.argv.slice(2);
  if (action !== 'list' && action !== 'grant' && action !== 'revoke') {
    throw new Error(USAGE);
  }
  const url = process.env['DATABASE_URL'];
  if (!url)
    throw new Error(
      'DATABASE_URL no está definida (ver docs/plan/SECRETOS.md)',
    );
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: url, max: 1 }),
  });
  try {
    if (action === 'list') {
      const admins = await prisma.player.findMany({
        where: { role: 'ADMIN' },
        select: { email: true, nickname: true },
        orderBy: { email: 'asc' },
      });
      if (admins.length === 0) console.log('No hay administradores.');
      for (const a of admins) console.log(`${a.email} (${a.nickname})`);
      return;
    }

    // Mismo criterio que el registro: el correo se guarda en minúsculas y sin espacios.
    const email = rawEmail?.trim().toLowerCase();
    if (!email) throw new Error(USAGE);
    const role = action === 'grant' ? 'ADMIN' : 'PLAYER';
    const { count } = await prisma.player.updateMany({
      where: { email },
      data: { role },
    });
    if (count === 0) {
      throw new Error(
        `No existe ningún jugador con el correo ${email}: que se registre primero en la app.`,
      );
    }
    console.log(`${email} → ${role}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
