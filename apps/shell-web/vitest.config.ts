import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    tsconfigRaw: JSON.stringify({
      compilerOptions: {
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ESNext',
        resolveJsonModule: true,
        useDefineForClassFields: true,
      },
    }),
  },
  resolve: {
    alias: {
      '@daria': fileURLToPath(new URL('../../packages', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
})
