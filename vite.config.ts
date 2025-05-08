import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'esnext',
    lib: {
      entry: 'index.tsx',
      name: 'Avvvatars',
      fileName: (format) => `avvvatars-solid.${format}.js`,
    },
    rollupOptions: {
      external: ['solid-js'],
      output: {
        globals: {
          'solid-js': 'Solid',
        },
      },
    },
  },
  server: {
    port: 5173,
  },
})
