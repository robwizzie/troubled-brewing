# TODO — Build Checklist & Open Questions

Read this and `PROJECT.md` first each session.

## Build checklist (v1)

### Foundation
- [x] Create `/docs/*` living documentation
- [x] Scaffold Vite + React + Router + token-based theming shell
- [x] `supabase/schema.sql` (all tables + RLS)
- [x] `supabase/seed.sql` (pages/sections/menu/hours/etc.)
- [x] `src/lib/supabase.js` client (anon key)
- [x] `src/lib/menuService.js` — `getMenu()` + `// FUTURE: SpotOn sync` stub
- [x] `src/lib/seed.js` fallback content
- [x] `src/styles/tokens.css` design tokens

### Public site
- [x] Section renderer registry + all section types
- [x] Nav, Footer, HoursToday, OrderButton, SEO, skeletons
- [x] Pages: Home, Menu, About, Events, Location, Contact, Community
- [x] Pages: Reviews, Gallery Wall, Troublemakers, Neighborhood
- [x] Page: TB Timeline (`/timeline`) + `timeline_grid` section + renderer
- [x] Pages: Privacy, Accessibility
- [x] 3 landing-page concepts (Gallery Wall lead, CONFIRMED), concept-swappable home
- [x] Official palette (black/green/pink/yellow) tuned to shop photos; Gallery Wall hero on sage wall
- [x] Social links (owner-managed) in footer + contact/community pages
- [x] Seed fallback + loading skeletons wired everywhere

### Admin
- [x] Supabase Auth login + protected routes
- [x] PageEditor + per-type section editors (core deliverable)
- [x] MenuManager, EventsManager, HoursEditor, QuickBlocks
- [x] Inbox, MediaLibrary
- [x] TestimonialsManager, GalleryManager, TroublemakersManager, LocalBusinessManager, TimelineManager
- [x] Social links editor in Quick Blocks
- [x] Google Profile settings (Place ID + refresh now)
- [x] Content governance: draft/publish, revisions + restore, preview mode
- [x] Image compression pipeline on upload
- [x] Help center + first-run checklist
- [x] Contextual hints, confirm modals, autosave drafts

### Integrations & infra
- [x] Forms → submissions (+ honeypot/spam guard); optional notify Edge Function
- [x] Google Places Edge Function (daily cache) → `google_profile`
- [x] GA4 + consent banner
- [x] Legal pages + footer links
- [x] Weekly backup GitHub Action
- [x] SEO: titles/meta, LocalBusiness JSON-LD, sitemap.xml, robots.txt, OG tags
- [x] GH Pages deploy workflow + CNAME + 404 SPA fix
- [ ] Lighthouse + a11y pass (do against a live deploy)

## Open questions for the client (from build plan §12)

1. Exact **SpotOn Order URL** for the "Order Now" links.
2. Final **menu + prices** to seed (placeholders in place).
3. **Photos** of space/food/drinks (or schedule a shoot).
4. Confirm **hours** + standing holiday closures.
5. **Mailchimp** account → embed/action URL (or set one up).
6. **Loyalty program** details for the loyalty page.
7. ~~**Look & feel** direction~~ — RECEIVED: palette is **black / green / pink / yellow** (tuned to shop photos). Exact hexes pending logo files.
8. Admin logins to create (Tom, Cat, Katie).
9. Confirm **registrar** access to point DNS.
10. **Google Place ID / GBP** link; confirm Google = source of truth for hours/location.
11. ~~Official whimsical look & feel notes~~ — RECEIVED (palette + reference photos in DESIGN.md). Finalize exact `tokens.css` hexes from the logo zip when it arrives.
12. **Gallery Wall photos** + a story for each piece.
13. **Troublemakers content** — photo, role, bio, fun facts per staffer.
14. **List of local businesses** they support — names, links, a sentence each.
15. ~~Which landing page concept~~ — CONFIRMED: **Gallery Wall** ("other ideas welcome"); still building all 3 to compare.
16. **TB Timeline content** — real milestones + dates (opening day, anniversaries, renovations, menu launches).
17. **Full social handles** — Instagram confirmed; need Facebook, TikTok, X, YouTube URLs.
18. **Confirm Local Love businesses** — Anthony's, Ralph's, Lula's exact names/categories/links (+ any more).
19. **Logo files (zip, via email) + photo album** — extract exact brand hexes; place logo on nav/footer; replace placeholder imagery.

## Notes
- v1 builds full functionality against Supabase; the site also runs entirely from `seed.js` if Supabase is not yet configured, so it's demoable/deployable immediately.
- Lighthouse/a11y final pass should run against the live GitHub Pages deploy.
