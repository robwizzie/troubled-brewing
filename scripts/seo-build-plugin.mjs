/* =============================================================================
   Build-time SEO: per-route static HTML, sitemap.xml and robots.txt.

   Why: GitHub Pages has no rewrites. Before this, a deep link like /menu was
   answered by 404.html — an HTTP 404 with a JS redirect — so crawlers saw a
   404 for every page but home, and link previewers (iMessage, Facebook,
   Slack…), which don't run JS, saw the home page's tags everywhere.

   After `vite build` this writes dist/<route>.html for every public route
   (GitHub Pages serves /menu from menu.html with a 200 and no trailing-slash
   redirect, matching the canonical URLs). Each is the built index.html with
   that route's <title>, description, canonical, Open Graph/Twitter tags and
   JSON-LD already in <head>, plus a <noscript> summary with links to every
   page. React boots exactly as before; <SEO/> then upserts the same tags.

   The data comes from src/lib/seo.js + src/lib/jsonld.js (loaded through a
   throwaway Vite SSR server so import.meta.env / JSON imports resolve the
   same way they do in the app). Supabase is never called at build time — the
   bundled seed (menu snapshot, hours, events) is the source.
   ============================================================================= */
import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

function lastCommitDate(root) {
  try {
    const d = execSync('git log -1 --format=%cs', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  } catch {
    /* not a git checkout — fall through */
  }
  return new Date().toISOString().slice(0, 10);
}

/** Pure part, exported for tests: every file the prerender writes, keyed by dist-relative path. */
export function buildSeoFiles({ template, seo, jsonld, seed, siteUrl, base = '/', lastmod }) {
  const files = {};
  for (const route of seo.SEO_ROUTES) {
    const meta = seo.resolveSeo({ path: route.path, siteUrl });
    const graph = jsonld.pageJsonLd(meta, { siteUrl, menuItems: seed.MENU_ITEMS, events: seed.EVENTS });
    const html = seo.prerenderHtml(template, meta, graph, { base });
    files[route.path === '/' ? 'index.html' : `${route.path.slice(1)}.html`] = html;
  }
  for (const r of seo.SEO_REDIRECTS) {
    files[`${r.from.slice(1)}.html`] = seo.redirectHtml(seo.absoluteUrl(siteUrl, r.to), `${base.replace(/\/$/, '')}${r.to}`);
  }
  files['sitemap.xml'] = seo.sitemapXml(siteUrl, { lastmod });
  files['robots.txt'] = seo.robotsTxt(siteUrl);
  return files;
}

export default function seoPrerender() {
  let config;
  return {
    name: 'tb-seo-prerender',
    apply: 'build',
    configResolved(c) {
      config = c;
    },
    async closeBundle() {
      const outDir = path.resolve(config.root, config.build.outDir);
      const template = await fs.readFile(path.join(outDir, 'index.html'), 'utf8');
      // imported lazily so tests can import buildSeoFiles without pulling in
      // Vite/esbuild (which refuse to load under jsdom)
      const { createServer } = await import('vite');
      const server = await createServer({
        configFile: false,
        root: config.root,
        mode: config.mode,
        envDir: config.envDir,
        logLevel: 'error',
        appType: 'custom',
        server: { middlewareMode: true, hmr: false },
        optimizeDeps: { noDiscovery: true, include: [] },
      });
      try {
        const seo = await server.ssrLoadModule('/src/lib/seo.js');
        const jsonld = await server.ssrLoadModule('/src/lib/jsonld.js');
        const seed = await server.ssrLoadModule('/src/lib/seed.js');
        const { SITE_URL } = await server.ssrLoadModule('/src/lib/config.js');
        const files = buildSeoFiles({
          template,
          seo,
          jsonld,
          seed,
          siteUrl: SITE_URL,
          base: config.base,
          lastmod: lastCommitDate(config.root),
        });
        await Promise.all(Object.entries(files).map(([rel, body]) => fs.writeFile(path.join(outDir, rel), body)));
        config.logger.info(`[seo] prerendered ${Object.keys(files).length} files for ${SITE_URL}`);
      } finally {
        await server.close();
      }
    },
  };
}
