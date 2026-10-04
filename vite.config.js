import { defineConfig } from 'vite';

const frontendPort = Number(process.env.TABLETOP_UI_PORT ?? 5173);
if (!Number.isInteger(frontendPort) || frontendPort < 1 || frontendPort > 65535) throw new Error('TABLETOP_UI_PORT deve estar entre 1 e 65535.');

export default defineConfig({
  base: '/Tabletop/',
  server: {
    host: '127.0.0.1',
    port: frontendPort,
    strictPort: true,
    proxy: {
      '/api': `http://127.0.0.1:${process.env.TABLETOP_PORT || 3001}`,
    },
    watch: { ignored: ['**/data/**'] },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('GLTFLoader')) return 'model-loader';
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
});
