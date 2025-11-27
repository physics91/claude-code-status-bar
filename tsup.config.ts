import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  platform: 'node',
  bundle: true,
  minify: false,
  treeshake: true,
  splitting: false,
  clean: true,
  dts: true,
  sourcemap: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  // 모든 외부 의존성을 external로 처리
  external: [
    'react',
    'ink',
    'commander',
    'chalk',
    'zod',
    'events',
    'fs',
    'path',
    'os',
    'child_process',
  ],
});
