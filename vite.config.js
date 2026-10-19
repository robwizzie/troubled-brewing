import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import seoPrerender from './scripts/seo-build-plugin.mjs';

// Base path. The site currently deploys as a GitHub *project page* under
// `/troubled-brewing/` (e.g. robwiscount.org/troubled-brewing/), so assets must
// be served from that subpath. When it moves to the apex custom domain
// (troublebrewingcoffeehouse.com), set the repo variable VITE_BASE_PATH=/
// (deploy.yml passes it through; 404.html adapts by itself). See docs/DEPLOYMENT.md.
const base = process.env.VITE_BASE_PATH || '/troubled-brewing/';

export default defineConfig({
  // seoPrerender: after the build, writes a static HTML page per public route
  // (own title/description/canonical/OG/JSON-LD) + sitemap.xml + robots.txt.
  plugins: [react(), seoPrerender()],
  base,
  // Route smoke tests (`npm test`). jsdom + a stubbed matchMedia/IntersectionObserver
  // (test/setup.js) is enough to prove every public route renders off the seed
  // fallbacks, which is the failure mode that actually bites this data layer.
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.js'],
    include: ['test/**/*.test.{js,jsx}'],
    restoreMocks: true,
  },
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
