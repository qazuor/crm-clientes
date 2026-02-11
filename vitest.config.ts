import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'prisma'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      include: [
        // Hooks (all tested via renderHook + MSW)
        'src/hooks/*.ts',
        // Validation schemas (all tested)
        'src/lib/validations/*.ts',
        // Lib pure utilities (tested)
        'src/lib/badge-utils.ts',
        'src/lib/timeout.ts',
        'src/lib/constants.ts',
        'src/lib/utils.ts',
        // Pure services (tested)
        'src/lib/services/template-render-service.ts',
        'src/lib/services/whatsapp-format-service.ts',
        // Components with tests
        'src/components/ui/Breadcrumbs.tsx',
        'src/components/ui/FilterBadge.tsx',
        'src/components/ui/PageJumpInput.tsx',
        'src/components/BulkActionsBar.tsx',
        'src/components/ClienteTableHeader.tsx',
        'src/components/ClienteRow.tsx',
      ],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/*-types.ts',
        'src/**/index.ts',
      ],
      thresholds: {
        statements: 75,
        branches: 70,
        functions: 75,
        lines: 75,
      },
    },
  },
});
