import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The 3D scene is lazy-loaded (see App.tsx), so three.js lands in its own chunk automatically.
export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1200 },
});
