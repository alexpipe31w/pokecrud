import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Un archivo cada vez: cada uno levanta su app con un pool de 5 conexiones y el session pooler de Supabase admite
    // 15 clientes EN TOTAL (compartidos con Render y los servidores locales). En paralelo daba EMAXCONNSESSION → 500.
    fileParallelism: false,
  },
});
