import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    open: true,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,          // Disable sourcemap in prod (saves ~3MB on Vercel)
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          // Split heavy PDF/DOCX libs into separate chunk → faster initial load
          'vendor-doc': ['pdfjs-dist', 'mammoth'],
        }
      }
    }
  }
});
