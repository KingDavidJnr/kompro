import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Frontend dev server configuration.
 *
 * The backend exposes the API under /api. During development we proxy those
 * requests to the backend (default http://localhost:5000) so cookies stay
 * same-origin and the httpOnly session cookie works without CORS complications.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
