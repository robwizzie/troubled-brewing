# Deployment

## Hosting: GitHub Pages (free, static)

The site builds to `dist/` and is published to GitHub Pages. The deploy is automated by `.github/workflows/deploy.yml` (build with Vite, publish via the official Pages Actions). Pages source = **GitHub Actions**.

### Required repository secrets (Settings → Secrets and variables → Actions)

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GA4_MEASUREMENT_ID` (optional)
- `VITE_SPOTON_ORDER_URL`
- `VITE_SITE_URL` (e.g. `https://troublebrewingcoffeehouse.com`)
- `SUPABASE_SERVICE_ROLE_KEY` (used only by the weekly backup workflow)

The anon key is safe to ship (RLS-gated). The service_role key is used **only** by the backup Action, never in the site bundle.

## SPA routing fix (no server rewrites on Pages)

We use clean URLs (BrowserRouter), so a hard refresh on e.g. `/menu` would 404 on Pages. Fix = the **spa-github-pages** technique:

- `public/404.html` captures the unknown path and redirects to `index.html` with the path encoded in the query string.
- A small inline script in `index.html` (already present) decodes it back into `history` before React Router boots.

`404.html` is copied into `dist/` automatically because it lives in `public/`. Chosen over `HashRouter` for clean, SEO-friendly URLs.

## Custom domain

1. `public/CNAME` contains `troublebrewingcoffeehouse.com` (copied into `dist/` on build).
2. At **Squarespace Domains** (the registrar), set DNS:
   - Four `A` records on the apex `@` → GitHub Pages IPs:
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One `CNAME` record `www` → `robwizzie.github.io` (the Pages host).
   - (Optional) `AAAA` records to the GitHub Pages IPv6 addresses.
3. In the repo: Settings → Pages → set the custom domain to `troublebrewingcoffeehouse.com`, then **Enable "Enforce HTTPS"** once the cert provisions (can take up to ~24h).

## Base path

Deployed at the apex domain ⇒ Vite `base: '/'` (already set). If it ever moves to a project page, change `base` and the asset paths accordingly.

## Weekly backups (§5.11)

`.github/workflows/backup.yml` runs weekly: `scripts/backup.mjs` uses the `SUPABASE_SERVICE_ROLE_KEY` Action secret to export all content tables to `backups/YYYY-MM-DD.json` and commits it. This doubles as a refreshed seed-fallback source and an offsite safety net.

### Restore steps

1. Pick the desired `backups/YYYY-MM-DD.json`.
2. For a full restore, use the Supabase SQL editor or a small script to upsert each table's rows from the JSON (service_role).
3. For a single record, copy its object from the backup and paste into the relevant admin editor, or upsert directly.
4. The in-app **Revisions** history (per record, last ~20) covers most "oops" cases without needing a file restore.

## First deploy checklist

1. Push to the default branch (or merge the PR).
2. Settings → Pages → Source: GitHub Actions.
3. Add the repository secrets above.
4. Confirm the `deploy` workflow ran green and the site loads (it works from seed even before Supabase is configured).
5. Add the custom domain + DNS, enable HTTPS.
6. Run `schema.sql` + `seed.sql` in Supabase; create admin users; deploy Edge Functions.
