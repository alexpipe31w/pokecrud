import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // En serie por defecto: con DATABASE_URL en el session pooler (5432, .env antiguo) cada archivo abre un pool de 5 y
    // entre todos superan los 15 clientes (EMAXCONNSESSION → 500). Con el transaction pooler (6543, F0-10) en paralelo
    // también pasa: `npx vitest run --config ./vitest.config.e2e.ts --fileParallelism`. Cada archivo borra solo SUS
    // jugadores (test/support/cleanup.ts).
    fileParallelism: false,
  },
});
