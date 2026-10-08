import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/__newdebugbar/assets/',
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    lib: {
      entry: 'resources/js/newdebugbar.js',
      name: 'NewDebugBarAssets',
      formats: ['iife'],
      fileName: () => 'newdebugbar.js',
      cssFileName: 'newdebugbar',
    },
  },
});
