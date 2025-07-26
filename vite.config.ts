import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // allows external connections
    strictPort: true,
    port: 5173,
    watch: {
      usePolling: true
    }
  }
})
