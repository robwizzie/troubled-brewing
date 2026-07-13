# Integrations

All env vars are `VITE_`-prefixed (exposed at build to the client) **except** secrets used only inside Supabase Edge Functions / GitHub Actions, which are stored as Supabase function secrets or Action secrets and never shipped to the browser.

## Environment variables

| Var | Where set | Public? | Purpose |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` local / Action secret | yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env` local / Action secret | yes (RLS-gated) | Public read + auth |
| `VITE_GA4_MEASUREMENT_ID` | `.env` local / Action secret | yes | GA4 (loads after consent) |
| `VITE_SPOTON_ORDER_URL` | `.env` local / Action secret | yes | "Order Now" deep link |
| `VITE_SITE_URL` | `.env` local / Action secret | yes | canonical / sitemap / JSON-LD |
| `SUPABASE_SERVICE_ROLE_KEY` | **Action secret only** | **NO** | weekly backup export |
| `GOOGLE_PLACES_API_KEY` | **Supabase function secret only** | **NO** | Places API (billable, server-side) |
| `RESEND_API_KEY` | **Supabase function secret only** | **NO** | form-notify emails |
| Instagram access token | **`private_secrets` table row** (not a secret/env) | **NO** (RLS: no policies) | last-4 posts feed — a table row because the token **self-rotates**: the edge function must persist the refreshed token, which function secrets can't do |

## Supabase

1. Create a free project at supabase.com. Note the Project URL + anon key (Settings → API) and the service_role key (server-only).
2. Run `supabase/schema.sql` then `supabase/seed.sql` in the SQL editor (schema creates tables + RLS; seed loads pages/sections/menu/hours/etc.).
3. Create admin users (Auth → Users) for Tom, Cat, Katie (email/password). They log in at `/admin`.
4. Create a public Storage bucket `media` for owner image uploads (1GB free).
5. Deploy Edge Functions in `supabase/functions/` (`notify`, `google-profile`, `instagram-feed`) and set their secrets.
6. The public **menu is live from this moment**: owners edit items in `/admin` → Menu Manager (`menu_items` table) and the site reads them directly — no extra wiring.

### Already-provisioned project? Run this once (SQL editor)

Projects created before the Google-hours + Instagram work need these additions
(fresh projects just run the updated `schema.sql`). Note: the two `create policy`
lines error harmlessly if re-run — everything else is idempotent, matching the
repo's run-once schema style.

```sql
-- Google structured hours
alter table google_profile add column if not exists weekday_periods jsonb default '[]';

-- Instagram cache (public read)
create table if not exists instagram_feed (
  id int primary key default 1,
  handle text,
  posts jsonb default '[]',
  fetched_at timestamptz,
  constraint instagram_feed_singleton check (id = 1)
);
alter table instagram_feed enable row level security;
create policy "public read instagram_feed" on instagram_feed for select using (true);
create policy "admin all instagram_feed"   on instagram_feed for all to authenticated using (true) with check (true);
insert into instagram_feed (id, handle) values (1, 'troublebrewingcoffee') on conflict (id) do nothing;

-- Server-only secrets (NO policies on purpose; service_role bypasses RLS)
create table if not exists private_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
alter table private_secrets enable row level security;
revoke all on table private_secrets from anon, authenticated;
```

Seeded before the home page gained the reviews carousel + signature sips? Re-sync once:

```sql
delete from sections where page_slug = 'home';
-- then re-run ONLY the "-- HOME ---" insert block from supabase/seed.sql
delete from testimonials; -- placeholder quotes; owners add real favorites in /admin
alter table testimonials add column if not exists image_url text default ''; -- review photos
```

### Row Level Security summary

- **anon:** SELECT on public content tables (sections only where `visible` + published); INSERT on `submissions` only.
- **authenticated:** full read/write on everything.
- **service_role:** used only by backups/Edge Functions, never in the browser.

## Image pipeline (§5.9)

Owners upload large phone photos, so the uploader (`src/admin/lib/uploadImage.js`) **compresses client-side before upload** with `browser-image-compression`: cap longest edge (~2000px hero / ~1200px cards), target < 300KB, strip EXIF, prefer WebP. It shows size before/after and enforces a friendly max-size error. Public `<img>` use `loading="lazy"` + `srcset` where it matters; hero is preloaded. This protects performance and the 1GB Storage cap.

## Google Places (reviews + hours/location)

- A Supabase Edge Function `google-profile` calls Places **Place Details (v1)** server-side (key never exposed), caches `rating`, `review_count`, up to 5 reviews, address, geo, phone, the `weekdayDescriptions` display strings (`weekday_hours`) **and the structured `regularOpeningHours.periods` (`weekday_periods`)** into the `google_profile` table. Runs daily (cron, added by hand in Dashboard → Database → Cron via `net.http_post` with an `Authorization: Bearer <anon key>` header) + on-demand from the admin "Refresh now".
- **Hours contract (implemented):** once `weekday_periods` is cached, the site's open/closed pill and weekly table run off **Google** (`googleWeekly()` in `src/lib/hours.js` converts periods — venue-local times — into the manual table's shape). The admin `hours` grid is the **fallback** when Google data is absent, and owner `hours_overrides` (holidays) **always** apply on top of either source. The Hours editor shows a note when Google is live.
- The homepage quote frames also prefer real cached Google reviews (rating ≥4, tidy length), topped up by curated testimonials; the Reviews page feed reads the same cache.
- Need from client: Google **Place ID** (or business name+address to look it up) and a Google Cloud project + Places API key (free $200/mo credit easily covers a single shop). Set the Place ID in `/admin` → Google Profile, deploy, click **Refresh now** — rating, reviews, and live hours all light up at once.

## Instagram (last 4 posts)

- A Supabase Edge Function `instagram-feed` fetches the shop's last 4 posts via the **"Instagram API with Instagram Login"** (the old Basic Display API died Dec 2024) and caches them into the `instagram_feed` table. The homepage polaroid strip renders them (each linking to its post) and falls back to static shop photos whenever the cache is empty.
- **Token setup (one-time):** the @troublebrewingcoffee account must be a **Business or Creator** account → at developers.facebook.com create a **Business-type app** → add the **Instagram** product → "API setup with Instagram login" → log in as the shop account → **Generate token** (long-lived, ~60 days) → Supabase Dashboard → Table Editor → `private_secrets` → insert row `key = instagram_token`, `value = <token>`.
- Deploy `supabase functions deploy instagram-feed`, invoke it once (the admin has no button yet — `curl` the function URL with the anon key), confirm `instagram_feed.posts` filled, then add a **12-hour cron** (`0 */12 * * *`, same `net.http_post` + anon-key header pattern as google-profile).
- **Why 12h and why a table row:** Instagram's CDN image URLs **expire on their own** (hours–days) — the cron re-fetch is what keeps images alive. And the function **self-rotates** the token (refreshes when >7 days old, persisting the new one), which is why it lives in the RLS-locked `private_secrets` table rather than a function secret (secrets can't be rewritten by the function). The token only dies after ~53+ days of cron outage, an account password change, or a Meta security checkpoint — paste a fresh token to recover; meanwhile the site silently shows the static strip.

## Mailchimp (newsletter)

Embedded form. The `newsletter` section stores the `mailchimp_action_url`; the form POSTs to Mailchimp directly (no server). Free under 500 contacts. Need the client's Mailchimp embed/action URL (TODO #5).

## SpotOn (ordering + future menu sync)

- **v1:** deep-link "Order Now" to the shop's hosted SpotOn Order URL (`VITE_SPOTON_ORDER_URL`). No API.
- **Future:** SpotOn has no open API (Preferred Integration Partner application + cert required; OAuth2 client_credentials with a secret that can't live client-side; 24h tokens, no refresh). If justified later, a Supabase Edge Function becomes the token broker + webhook cache and `menuService.getMenu()` flips to read it. Have **Cat (the merchant)** request API access from her SpotOn rep — carries more weight than a developer cold-applying. Stub lives in `src/lib/menuService.js`.

## Google Analytics 4 (§5.10)

Standard gtag snippet, **gated behind the consent banner** — GA4 only loads after the visitor accepts. Tracks page views and key events: Order-Now clicks (primary conversion), menu views, form submits, newsletter signups, outbound clicks to local businesses + Google reviews. Measurement ID via `VITE_GA4_MEASUREMENT_ID`. Give Tom/Cat/Katie access to the GA4 property.

## Forms & notifications (§6)

Contact + catering forms INSERT into `submissions` (anon allowed by RLS). Honeypot field + simple timing/rate check for spam (no paid captcha). Optional `notify` Edge Function emails the owners via Resend (free 3,000/mo). v1 minimum: submissions appear in the admin Inbox.
