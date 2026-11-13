import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  // In development, API calls go to the local server started from /server.
  server: { proxy: { '/v1': 'http://127.0.0.1:8787' } },
  preview: { proxy: { '/v1': 'http://127.0.0.1:8787' } },
})
