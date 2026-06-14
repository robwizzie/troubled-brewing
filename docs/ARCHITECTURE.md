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
- For each section `type` there are **two** components:
  - a **renderer** in `src/components/sections/` (public site), and
  - an **editor** in `src/admin/editors/` (admin panel).
- A central registry (`src/components/sections/registry.js` + `src/admin/editors/registry.js`) maps `type → component`. Adding a section type = add a renderer, an editor, register both, document in `CMS.md`.

Structured content that is *not* freeform (menu items, events, hours, team, gallery pieces, local businesses, testimonials) lives in its **own typed table** and is surfaced by "collection" section types (e.g. `menu_block` reads `menu_items`). This keeps that data clean and queryable instead of stuffed in jsonb.

See [CMS.md](./CMS.md) for the full type catalog and every `data` shape.

## Content governance (protect non-technical owners)

- **Draft / Publish:** editable records carry a `status` (`draft`|`published`) and a `draft_data` jsonb. The **public site reads published state only**; admins can preview drafts via `?preview=1`.
- **Revisions:** before any save, the previous state is snapshotted into `revisions`. Admin UI offers per-record History + one-click Restore. Retention capped (~20/record).
- **Guardrails:** confirm modals on destructive actions, required-field validation, localStorage autosave as a crash net.

See [CMS.md](./CMS.md) §governance and §5.7 of the build plan.

## The `menuService` + SpotOn future-sync stub

Menu data is read through a **single service module**, `src/lib/menuService.js`, exposing `getMenu()`. Today it reads the `menu_items` table (owner-maintained in admin). This indirection is deliberate:

> **FUTURE: SpotOn menu sync.** SpotOn has no open API — access requires becoming an approved Preferred Integration Partner, and OAuth2 `client_credentials` needs a Client Secret that *cannot* live in a static site, plus 24h tokens with no refresh. If the shop ever justifies it, swap **only** `getMenu()` to read from a Supabase Edge Function that holds the SpotOn secret, manages the token, listens to menu webhooks, and caches the menu to Postgres. Nothing else in the app changes. The stub is clearly marked in the file.

For v1, **online ordering is a deep link** to the shop's hosted SpotOn Order page (`VITE_SPOTON_ORDER_URL`), surfaced as a prominent "Order Now" CTA everywhere. We do not rebuild ordering.

## Resilience: the seed fallback

`src/lib/seed.js` contains hardcoded current content (menu, hours, copy, default sections per page). Every data function falls back to it. Consequences:

- The site works the instant it deploys, before any admin edits or even before Supabase is configured.
- If Supabase has an outage, the public site still renders real content.
- The weekly backup Action (see DEPLOYMENT) can regenerate this seed from live data.

## Repo structure

See build plan §10. Top level: `src/` (app), `supabase/` (schema + seed SQL + Edge Functions), `docs/`, `.github/workflows/`, `public/`, `scripts/`.

## Key architectural decisions

See [DECISIONS.md](./DECISIONS.md) — Supabase over static JSON (owner-editing is the whole point), section-based CMS over freeform HTML, menu in CMS over live SpotOn (partner approval pending), Google-as-source-of-truth for hours with manual fallback.
