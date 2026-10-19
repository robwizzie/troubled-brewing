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

**Public routes no longer depend on it.** `404.html` answers with an HTTP 404,
which is what crawlers saw for every deep link. The build now prerenders a real
page per public route (`dist/menu.html`, `dist/about.html`, …; Pages serves
`/menu` from `menu.html` with a 200) with that page's title, description,
canonical, Open Graph/Twitter tags and JSON-LD already in the HTML, and writes
`sitemap.xml` + `robots.txt` (scripts/seo-build-plugin.mjs, data in
src/lib/seo.js). `404.html` is now only the fallback for unknown URLs and
admin deep links, and is `noindex`.

## Base path (IMPORTANT — read before changing the domain)

The site is built as a GitHub **project page**, served under the repo subpath
**`/troubled-brewing/`** (e.g. `https://robwiscount.org/troubled-brewing/`). Three
things must agree on that subpath or you get a blank page with `/assets/... 404`:

1. **Vite base** — `vite.config.js` defaults `base` to `/troubled-brewing/`
   (override with the `VITE_BASE_PATH` build env var).
2. **Router basename** — `src/main.jsx` sets React Router's `basename` from
   `import.meta.env.BASE_URL` automatically (no action needed).
3. **SPA fallback** — `public/404.html` keeps **1** leading path segment
   (`segmentCount = 1`).

> Symptom we hit: deployed at `/troubled-brewing/` but `base` was `/`, so the HTML
> requested `/assets/...` (404) → blank page. Fixed by the three items above.

## Custom domain

`public/CNAME` is deliberately absent: the deploy uses GitHub Actions, and for
that kind of Pages site the custom domain lives in **Settings → Pages**, not in
a file. Until that's set, the site serves at `/troubled-brewing/`.

### Switching to troublebrewingcoffeehouse.com — checklist

What the domain looks like today (checked 2026-10-18):

- **Registrar: GoDaddy** (registered 2017-10-09, renews 2028-10-09).
- **DNS is hosted at Wix**: the nameservers are `ns4.wixdns.net` / `ns5.wixdns.net`.
  The apex and `www` point at Wix, which answers with a "ConnectYourDomain
  Error" page. The old Wix site is gone, so nothing there needs keeping.
- **Email is live and must keep working**: Microsoft 365, bought through GoDaddy.
  These records must exist wherever DNS ends up:

  | Type | Host | Value |
  |---|---|---|
  | MX (10) | `@` | `troublebrewingcoffeehouse-com.mail.protection.outlook.com` |
  | TXT | `@` | `v=spf1 include:secureserver.net -all` |
  | TXT | `@` | `MS=ms78702240` |
  | CNAME | `autodiscover` | `autodiscover.outlook.com` |

Steps:

1. **Repo → Settings → Pages → Custom domain** = `troublebrewingcoffeehouse.com` → Save.
   GitHub shows a DNS check that stays red until step 2 lands.
2. **DNS.** Either edit the records where they are now (Wix → Domains →
   troublebrewingcoffeehouse.com → DNS records), or, more simply long-term,
   move DNS home to GoDaddy: My Products → the domain → DNS → Nameservers →
   **Change → "GoDaddy default"**. If you move it, first re-create the four
   email records above in GoDaddy's DNS. GoDaddy's M365 setup usually adds
   them itself, but check. Either way, set:
   - `A` `@` → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
     (delete any other apex `A` records, including Wix's `185.230.63.*`)
   - `CNAME` `www` → `robwizzie.github.io`
   - (optional) `AAAA` `@` → `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
3. **Repo → Settings → Secrets and variables → Actions → Variables**: add
   `VITE_BASE_PATH` = `/`. Also set the `VITE_SITE_URL` secret to
   `https://troublebrewingcoffeehouse.com`. Then re-run **Deploy** (Actions tab).
   `deploy.yml` passes the variable to the build. `public/404.html` works out
   its own path depth from the URL, so it needs no edit.
4. When the Pages DNS check turns green, tick **Enforce HTTPS**. The certificate can take up to about 24 hours.
5. **Supabase → Authentication → URL Configuration**: set Site URL to
   `https://troublebrewingcoffeehouse.com` and add `https://troublebrewingcoffeehouse.com/**`
   to the redirect URLs, so admin magic links land on the new domain.
6. `sitemap.xml`, `robots.txt`, canonicals and the `og:` tags are generated at
   build time from `VITE_SITE_URL` (default: the apex domain), so no change is needed. `robwiscount.org/troubled-brewing/` redirects by itself
   once the custom domain is set.

## Weekly backups (§5.11)

`.github/workflows/backup.yml` runs weekly: `scripts/backup.mjs` uses the `SUPABASE_SERVICE_ROLE_KEY` Action secret to export all content tables to `backups/YYYY-MM-DD.json` and commits it. This doubles as a refreshed seed-fallback source and an offsite safety net.

### Restore steps

**Whole project came back empty** (every API call says `PGRST205 Could not find
the table … in the schema cache`, e.g. after a pause/restore):

1. `node scripts/build-restore-sql.mjs > restore.sql`. It uses the newest
   backup by default; pass a path to choose another. A ready-built copy from the
   2026-10-12 backup is committed at `supabase/restore/full-restore.sql`.
2. Supabase → SQL Editor → New query → paste the file → **Run**. In order, it runs:
   schema → backup rows (`on conflict do nothing`) → `supabase/migrations/*` → `notify pgrst, 'reload schema'`.
   It's safe to run twice. It's also safe on a project that still has data: existing rows are left alone.
3. If the tables were actually there and only the API had lost track of
   them, `notify pgrst, 'reload schema';` on its own is the whole fix.

**One record:** copy its object from the backup and paste it into the matching admin
editor, or upsert it directly. The in-app **Revisions** history (the last ~20 per
record) covers most "oops" cases without a file restore.

`scripts/backup.mjs` refuses to write a backup when any table fails, so a
paused or empty project can't put a hollow file at the top of `backups/`.

## First deploy checklist

1. Push to the default branch (or merge the PR).
2. Settings → Pages → Source: GitHub Actions.
3. Add the repository secrets above.
4. Confirm the `deploy` workflow ran green and the site loads (it works from seed even before Supabase is configured).
5. Add the custom domain + DNS, enable HTTPS.
6. Run `schema.sql` + `seed.sql` in Supabase; create admin users; deploy Edge Functions.
