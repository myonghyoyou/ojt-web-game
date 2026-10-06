import { defineConfig } from 'tsup';

// @ojt/game ships TypeScript source, so it is bundled into the server build instead of required at runtime.
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  noExternal: ['@ojt/game'],
  clean: true,
});
