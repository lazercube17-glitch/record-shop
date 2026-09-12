import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      '/rss': {
        target: 'https://a6.asurahosting.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/rss/, ''),
      },
    },
  },
})