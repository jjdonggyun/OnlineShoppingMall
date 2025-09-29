import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,              // ← 0.0.0.0로 바인드 (모바일 접속 가능)
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000', // ← 이미지도 프록시
    },
  },
})
