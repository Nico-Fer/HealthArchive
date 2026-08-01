import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // draft-js (y otras libs pensadas para webpack) referencian `global`,
  // que Vite no define. Sin esto la app crashea con "global is not defined".
  define: {
    global: 'globalThis',
  },
  server: {
    port: 3000,
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Bootstrap 5.3 compilado desde source emite deprecations de dart-sass
        // (@import, funciones de color legacy). Son cosméticas; sin esto el
        // build es ilegible.
        api: 'modern-compiler',
        quietDeps: true,
        silenceDeprecations: ['import'],
      },
    },
  },
});
