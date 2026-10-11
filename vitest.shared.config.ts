import { defineConfig } from 'vitest/config';

// Tests de la lógica pura (shared/) en Node, separados de `ng test` (que corre en jsdom).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['shared/**/*.spec.ts'],
  },
});
