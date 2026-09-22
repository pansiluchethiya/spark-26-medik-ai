import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [tailwindcss(), react()],
    build: {
      minify: 'esbuild',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react-dom/') || id.includes('node_modules/react/') || id.includes('node_modules/scheduler/')) return 'vendor'
            if (id.includes('node_modules/react-markdown/') || id.includes('node_modules/remark-gfm/') || id.includes('node_modules/rehype-sanitize/') || id.includes('node_modules/mdast-') || id.includes('node_modules/unified/')) return 'markdown'
            return undefined
          },
        },
      },
    },
    server: {
      proxy: {
        '/api': `http://localhost:${env.DEMO_API_PORT ?? '4100'}`,
      },
    },
  }
})
