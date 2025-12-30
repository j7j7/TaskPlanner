import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        modifyResponse: (response) => {
          // Ensure cookies are passed through
          const setCookie = response.headers['set-cookie'];
          if (setCookie) {
            response.headers['set-cookie'] = setCookie;
          }
        },
      },
    },
  },
})
