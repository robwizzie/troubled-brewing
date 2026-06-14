import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Deployed at the apex domain (troublebrewingcoffeehouse.com) via GitHub Pages,
// so the base path is '/'. If this ever moves to a project page
// (user.github.io/repo) change `base` to '/repo/'. See docs/DEPLOYMENT.md.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Keep chunks reasonable for fast mobile loads (Lighthouse > 90 goal).
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
});
