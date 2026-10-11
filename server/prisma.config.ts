import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

// Prisma 7: esta URL solo la usa la CLI (migraciones), por eso es DIRECT_URL. La app se conecta con
// DATABASE_URL a través del adaptador PrismaPg (src/prisma/prisma.service.ts). Ver DECISIONES D-017.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DIRECT_URL') },
});
