import { defineConfig } from 'vite';

const frontendPort = Number(process.env.TABLETOP_UI_PORT ?? 5173);
if (!Number.isInteger(frontendPort) || frontendPort < 1 || frontendPort > 65535) throw new Error('TABLETOP_UI_PORT deve estar entre 1 e 65535.');

export default defineConfig(({mode})=>({
  base: './',
  define: { 'import.meta.env.VITE_TABLETOP_STORAGE': JSON.stringify(mode==='pages'?'browser':'server') },
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
    outDir: mode==='pages'?'dist-pages':'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('GLTFLoader')) return 'model-loader';
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('/src/tutorial/')) return 'tutorial';
          if (id.includes('/src/authoring/building') || id.includes('/src/authoring/room-') || id.includes('/src/authoring/surroundings') || id.includes('/src/authoring/furnishing') || id.includes('/src/authoring/quick-build') || id.includes('/src/authoring/polish') || id.includes('/src/authoring/anchoring') || id.includes('/src/authoring/mountain') || id.includes('/src/authoring/water') || id.includes('/src/authoring/vegetation')) return 'authoring';
        },
      },
    },
  },
}));
