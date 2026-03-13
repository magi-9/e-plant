import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const allowedHosts = (env.VITE_ALLOWED_HOSTS || 'localhost,127.0.0.1')
    .split(',')
    .map((host: string) => host.trim())
    .filter(Boolean)

  return {
    plugins: [react()],
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.ts'],
    },
    resolve: {
      // Deduplicate React to prevent multiple-instance errors (e.g. from stale service-worker caches)
      dedupe: ['react', 'react-dom'],
      alias: {
        react: resolve('./node_modules/react'),
        'react-dom': resolve('./node_modules/react-dom'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5001,
      allowedHosts,
      hmr: {
        host: env.VITE_HMR_HOST || 'localhost',
        port: 5001,
      },
    },
  }
})
