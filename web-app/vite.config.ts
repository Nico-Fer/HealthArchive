import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // loadEnv junta los .env del ambiente con las variables del proceso
  // (que es de donde salen en Vercel) y se queda con las que empiezan con VITE_.
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  // La URL del API se embebe en build time: si falta, el bundle sale con
  // `undefined` como base y todos los fetch fallan recién en runtime. Cortamos acá.
  if (mode === 'production' && !env.VITE_API_URL) {
    throw new Error(
      'Falta VITE_API_URL para el build de producción. ' +
        'En Vercel se setea como Environment Variable del proyecto (ver docs/deploy.md).'
    );
  }

  return {
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
  };
});
