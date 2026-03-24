import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        // Keep browser Host (e.g. localhost:5173) so OAuth libs that resolve relative callback URLs match Google/GitHub console entries for the dev origin.
        changeOrigin: false,
      },
    },
  },
});
