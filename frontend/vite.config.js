import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: { outDir: '../backend/web', emptyOutDir: true }, // Flask serves this folder
  server: {
    host: true, // listen on LAN so the phone can open it
    allowedHosts: true,
    proxy: { '/api': 'http://127.0.0.1:5000' },
  },
})
