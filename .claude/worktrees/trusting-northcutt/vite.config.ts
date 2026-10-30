import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy for Go-UPC API to avoid CORS
      '/api/goupc': {
        target: 'https://go-upc.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/goupc/, ''),
      },
      // Proxy for UPCItemDB API to avoid CORS
      '/api/upcitemdb': {
        target: 'https://api.upcitemdb.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/upcitemdb/, ''),
      },
    },
  },
})
