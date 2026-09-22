import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [tailwindcss(), react()],
    server: {
      proxy: {
        '/api': `http://localhost:${env.DEMO_API_PORT ?? '4100'}`,
      },
    },
  }
})
