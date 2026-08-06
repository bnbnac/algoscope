/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        kdtree: resolve(root, 'kdtree/index.html'),
        kdtree2d: resolve(root, 'kdtree/2d/index.html'),
        kdtree3d: resolve(root, 'kdtree/3d/index.html'),
        octree: resolve(root, 'octree/index.html'),
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['**/*.test.ts'],
  },
});
