import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  // In development, API calls go to the local server started from /server.
  // ALLOW_ALL_HOSTS=1 lets a remote preview (cloud session, tunnel) reach the dev server. Leave it off locally.
  server: { proxy: { '/v1': 'http://127.0.0.1:8787' }, allowedHosts: process.env.ALLOW_ALL_HOSTS ? true : undefined },
  preview: { proxy: { '/v1': 'http://127.0.0.1:8787' } },
})
