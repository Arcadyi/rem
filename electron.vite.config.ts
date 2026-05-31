import { defineConfig } from 'electron-vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['better-sqlite3'],
        input: {
          index: 'src/main/index.ts',
          'steamShutdown.worker': 'src/main/workers/steamShutdown.worker.ts'
        }
      }
    }
  },
  preload: {},
  renderer: {
    plugins: [svelte()]
  }
})
