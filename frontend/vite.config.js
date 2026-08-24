import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Keep local auth/API responses and dev assets from being reused after a
    // backend or frontend change. Production builds use hashed asset names.
    headers: {
      "Cache-Control": "no-store",
    },
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})
