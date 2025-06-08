import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/fixtures/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/',
      ],
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.spec.ts'],
    watchExclude: ['node_modules', 'dist', '.tmp'],
  },
}); 