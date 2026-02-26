import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Deduplicate React to prevent multiple-instance errors (e.g. from stale service-worker caches)
    dedupe: ['react', 'react-dom'],
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5001,
    hmr: {
      host: 'localhost',
      port: 5001,
    },
  }
})
