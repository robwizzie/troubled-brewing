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

## Supabase

1. Create a free project at supabase.com. Note the Project URL + anon key (Settings → API) and the service_role key (server-only).
2. Run `supabase/schema.sql` then `supabase/seed.sql` in the SQL editor (schema creates tables + RLS; seed loads pages/sections/menu/hours/etc.).
3. Create admin users (Auth → Users) for Tom, Cat, Katie (email/password). They log in at `/admin`.
4. Create a public Storage bucket `media` for owner image uploads (1GB free).
5. Deploy Edge Functions in `supabase/functions/` (`notify`, `google-profile`) and set their secrets.

### Row Level Security summary

- **anon:** SELECT on public content tables (sections only where `visible` + published); INSERT on `submissions` only.
- **authenticated:** full read/write on everything.
- **service_role:** used only by backups/Edge Functions, never in the browser.

## Image pipeline (§5.9)

Owners upload large phone photos, so the uploader (`src/admin/lib/uploadImage.js`) **compresses client-side before upload** with `browser-image-compression`: cap longest edge (~2000px hero / ~1200px cards), target < 300KB, strip EXIF, prefer WebP. It shows size before/after and enforces a friendly max-size error. Public `<img>` use `loading="lazy"` + `srcset` where it matters; hero is preloaded. This protects performance and the 1GB Storage cap.

## Google Places (reviews + hours/location)

- A Supabase Edge Function `google-profile` calls Places **Place Details** server-side (key never exposed), caches `rating`, `review_count`, up to 5 reviews, address, geo, phone, and `opening_hours.weekday_text` into the `google_profile` table. Runs daily (cron) + on-demand from admin "refresh now".
- The site reads `google_profile` from Supabase (static-safe). Hours/Location default to Google as source of truth (client asked) with the manual `hours`/`hours_overrides` tables as editable fallback + holiday overrides.
- Need from client: Google **Place ID** (or business name+address to look it up) and a Google Cloud project + Places API key (free $200/mo credit easily covers a single shop). See build plan §5.5.

## Mailchimp (newsletter)

Embedded form. The `newsletter` section stores the `mailchimp_action_url`; the form POSTs to Mailchimp directly (no server). Free under 500 contacts. Need the client's Mailchimp embed/action URL (TODO #5).

## SpotOn (ordering + future menu sync)

- **v1:** deep-link "Order Now" to the shop's hosted SpotOn Order URL (`VITE_SPOTON_ORDER_URL`). No API.
- **Future:** SpotOn has no open API (Preferred Integration Partner application + cert required; OAuth2 client_credentials with a secret that can't live client-side; 24h tokens, no refresh). If justified later, a Supabase Edge Function becomes the token broker + webhook cache and `menuService.getMenu()` flips to read it. Have **Cat (the merchant)** request API access from her SpotOn rep — carries more weight than a developer cold-applying. Stub lives in `src/lib/menuService.js`.

## Google Analytics 4 (§5.10)

Standard gtag snippet, **gated behind the consent banner** — GA4 only loads after the visitor accepts. Tracks page views and key events: Order-Now clicks (primary conversion), menu views, form submits, newsletter signups, outbound clicks to local businesses + Google reviews. Measurement ID via `VITE_GA4_MEASUREMENT_ID`. Give Tom/Cat/Katie access to the GA4 property.

## Forms & notifications (§6)

Contact + catering forms INSERT into `submissions` (anon allowed by RLS). Honeypot field + simple timing/rate check for spam (no paid captcha). Optional `notify` Edge Function emails the owners via Resend (free 3,000/mo). v1 minimum: submissions appear in the admin Inbox.
