import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
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
