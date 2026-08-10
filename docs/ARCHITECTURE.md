# Architecture

## Hosting model

```
                ┌─────────────────────────────────────────────┐
                │  GitHub Pages (100% static, free)            │
   visitor ───► │  React + Vite SPA  (built from `dist/`)      │
                │  - reads content at runtime via anon key     │
                │  - falls back to bundled seed.js if offline  │
                └──────────────┬──────────────────────────────┘
                               │  HTTPS, anon key (RLS-gated)
                               ▼
                ┌─────────────────────────────────────────────┐
                │  Supabase (free tier)                        │
                │  - Postgres: pages, sections, menu, ...      │
                │  - Auth: owner + GM accounts (admin panel)   │
                │  - Storage: owner-uploaded images (1GB)      │
                │  - Edge Functions: email notify, Google      │
                │    Places cache, future SpotOn token broker  │
                └─────────────────────────────────────────────┘
```

The deployed site is fully static. There is **no application server**. The only secret that ships to the browser is the Supabase **anon key**, which is safe to expose because every table is protected by Row Level Security (RLS): anon can only read public content and insert form submissions; everything else requires an authenticated admin session.

## Data flow

1. **Public read path:** Page mounts → calls a typed data function in `src/lib/` (e.g. `getPage(slug)`, `menuService.getMenu()`) → those call Supabase via the anon client → if Supabase is unconfigured or unreachable, the function returns hardcoded content from `src/lib/seed.js`. The UI always shows loading skeletons first, never a blank flash, and never looks broken.
2. **Admin write path:** `/admin` → Supabase Auth email/password login → authenticated client → full read/write on all tables. Edits write a prior-state snapshot to `revisions` before applying (governance, see below).
3. **Forms:** Public anon INSERT into `submissions`. An optional Supabase Edge Function emails the owners on insert (Resend free tier).

## The section-based CMS (the heart of the project)

Every editable page is a **list of typed sections** rendered in order. This is what makes the site Squarespace-style editable.

- `pages` — fixed, seeded set (home, menu, about, ...). Holds title + meta description.
- `sections` — rows belonging to a page. Each has a `type`, a `display_order`, a `visible` flag, and a `data` jsonb blob whose shape depends on the type.
- For each section `type` there is a **renderer** in `src/components/sections/` (public site); editing forms are generated from declarative **schemas** in `src/admin/editors/schemas.js` — no per-type editor files. A central registry (`src/components/sections/registry.js`) maps `type → renderer + label`. Adding a section type = add a renderer + a schema entry, register, document in `CMS.md`.

### The on-page editor (`/admin/editor`)

Admins edit **on the real page**, Squarespace-style. The editor (`src/admin/editor/`) embeds the public site in an `<iframe src=".../?canvas=1">` — the app boots as its own document (`src/canvas/CanvasApp.jsx`), so viewport units, media queries, and all `document`/`window` behavior resolve against the canvas, and the 📱 toggle shows the honest mobile layout. Sections are loaded by the parent (including hidden + draft rows) and pushed over origin-checked postMessage; clicking a section on the canvas opens a docked panel whose fields update the canvas live and autosave to `draft_data` (debounced, per-row-serialized — `src/admin/editor/editorStore.js`); one **Publish** button applies the page's drafts. Collection-backed sections embed their `CollectionManager` behind a "Manage —" button, and a `dataVersion` bump (`src/lib/dataVersion.js`) tells the canvas's self-fetching sections to refetch in place.

Structured content that is *not* freeform (menu items, events, hours, team, gallery pieces, local businesses, testimonials) lives in its **own typed table** and is surfaced by "collection" section types (e.g. `menu_block` reads `menu_items`). This keeps that data clean and queryable instead of stuffed in jsonb.

See [CMS.md](./CMS.md) for the full type catalog and every `data` shape.

## Content governance (protect non-technical owners)

- **Draft / Publish:** editable records carry a `status` (`draft`|`published`) and a `draft_data` jsonb. The **public site reads published state only**; admins can preview drafts via `?preview=1`.
- **Revisions:** explicit saves snapshot prior state into `revisions`; the on-page editor's debounced autosave snapshots once per section per editing session (+ once on publish) so typing can't churn through the retention cap. Admin UI offers per-record History + one-click Restore. Retention capped (~20/record).
- **Guardrails:** confirm modals on destructive actions, required-field validation; autosaved `draft_data` in Postgres is the crash net.

See [CMS.md](./CMS.md) §governance and §5.7 of the build plan.

## The `menuService` + SpotOn menu sync

Menu data is read through a **single service module**, `src/lib/menuService.js`, exposing `getMenu()`. It reads the `menu_items` table, falling back to the bundled snapshot. That table is now **kept aligned with SpotOn automatically**:

> **SpotOn menu sync (implemented).** SpotOn's partner API is application-gated, but the shop's hosted ordering page is public — so a scheduled GitHub Action (`.github/workflows/spoton-menu-sync.yml` → `scripts/sync-spoton-menu.mjs`) reads that page daily exactly like a customer's browser (static HTML first, headless Chrome if needed), detects the menu payload structurally, and mirrors it into `menu_items`: names/prices/categories/availability/order follow SpotOn; owner descriptions, photos, and dietary tags are preserved; items that leave SpotOn are hidden, never deleted; a failed parse writes nothing. It also commits the refreshed `src/data/spoton-menu.json`, so the no-Supabase fallback tracks SpotOn too. If the shop ever gets official API access (via Cat's SpotOn rep), the scraper inside that one script becomes real API calls + webhooks — nothing else changes.

**Online ordering stays a deep link** to the shop's hosted SpotOn Order page (`VITE_SPOTON_ORDER_URL`), surfaced as a prominent "Order Now" CTA everywhere. The site only *views* the menu; we do not rebuild ordering.

## Resilience: the seed fallback

`src/lib/seed.js` contains hardcoded current content (menu, hours, copy, default sections per page). Every data function falls back to it. Consequences:

- The site works the instant it deploys, before any admin edits or even before Supabase is configured.
- If Supabase has an outage, the public site still renders real content.
- The weekly backup Action (see DEPLOYMENT) can regenerate this seed from live data.

## Repo structure

See build plan §10. Top level: `src/` (app), `supabase/` (schema + seed SQL + Edge Functions), `docs/`, `.github/workflows/`, `public/`, `scripts/`.

## Key architectural decisions

See [DECISIONS.md](./DECISIONS.md) — Supabase over static JSON (owner-editing is the whole point), section-based CMS over freeform HTML, SpotOn-as-source-of-truth for the menu via a scheduled public-page sync (partner API still gated), Google-as-source-of-truth for hours with manual fallback.
