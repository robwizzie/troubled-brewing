import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Base path. The site currently deploys as a GitHub *project page* under
// `/troubled-brewing/` (e.g. robwiscount.org/troubled-brewing/), so assets must
// be served from that subpath. When it moves to the apex custom domain
// (troublebrewingcoffeehouse.com), set VITE_BASE_PATH=/ (and re-add the CNAME +
// set 404.html pathSegmentsToKeep=0). See docs/DEPLOYMENT.md.
const base = process.env.VITE_BASE_PATH || '/troubled-brewing/';

export default defineConfig({
  plugins: [react()],
  base,
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
