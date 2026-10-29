import path from 'node:path'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const here = import.meta.dirname

export default defineConfig({
  plugins: [vue()],
  server: { host: '127.0.0.1' },
  resolve: {
    alias: {
      '@': path.resolve(here, './src'),
      // Generated Wails bindings are shared protocol code, not UI.
      '@bindings': path.resolve(here, '../frontend/bindings'),
      // One runtime instance, so events registered here reach the bindings too.
      '@wailsio/runtime': path.resolve(here, './node_modules/@wailsio/runtime'),
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
