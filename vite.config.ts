import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // ปรับลดการใช้ทรัพยากรสำหรับเครื่องสเปกจำกัด
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  build: {
    // ใช้ Rolldown แบบประหยัด RAM
    target: 'esnext',
    minify: 'esbuild',
  }
})