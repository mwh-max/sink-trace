/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.js'],
  },
  base: '/sink-trace/',
  plugins: [react()],
  build: {
    sourcemap: false,
  },
  esbuild: {
    drop: ['console'],
  },
})
