# Decisions Log (append-only)

Short record of meaningful decisions and *why*, so settled choices aren't re-litigated.

---

**2026-06 — Supabase, not static JSON-in-repo.**
The owner self-editing requirement is the whole project. Static JSON would force non-technical owners to commit to git to change the menu — unacceptable. Supabase gives a real login-and-edit experience while the public site stays fully static (reads via the RLS-gated anon key). Trade-off: a third-party dependency, mitigated by the bundled `seed.js` fallback.

**2026-06 — Section-based CMS, not freeform HTML/page-builder.**
Typed sections with constrained `data` shapes keep owners from breaking layout while still allowing rearrangement. Each type = renderer + editor. More upfront work than a rich-text blob, but far safer and more on-brand.

**2026-06 — Menu lives in our CMS, not the live SpotOn API (v1).**
SpotOn has no open API: requires Preferred Integration Partner approval + certification, OAuth2 `client_credentials` with a Client Secret that cannot live in a static site, and 24h tokens with no refresh (needs a persistent backend). Overkill for one location. Owner maintains the display menu in admin (~2 min to update, decoupled from POS reliability). Architected behind `menuService.getMenu()` so a future Edge-Function-backed SpotOn sync is a one-module swap. **Future:** have Cat (merchant) request API access from her SpotOn rep.

**2026-06 — Online ordering = deep link to SpotOn Order, not a rebuilt cart.**
The shop already moved ordering to SpotOn Order (commission-free, feeds the POS, integrates Order-with-Google). We surface a prominent "Order Now" CTA linking to their hosted URL. Zero rebuild, zero risk.

**2026-06 — Clean-URL SPA routing (BrowserRouter + 404 redirect), not HashRouter.**
Cleaner, more SEO-friendly URLs. Cost is the `404.html` redirect shim, which is well-understood (spa-github-pages).

**2026-06 — Google Places API via daily-cached Edge Function for reviews/hours, with owner-curated testimonials as the backbone.**
Places returns only 5 algorithm-picked reviews and its key must be server-side (billable). So: owner-curated `testimonials` table guarantees a great page and lets them feature their *best* reviews; the cached Places data layers in live rating/count + a rotating set + a "Leave a review" CTA. Hours/Location default to Google as source of truth (client asked) with manual tables as editable fallback for holidays. Avoids recurring cost of paid review widgets.

**2026-06 — Draft/Publish + Revisions for governance.**
Non-technical owners will make mistakes. Public reads published state only; drafts are previewable; every save snapshots prior state for one-click restore. Makes editing low-stakes.

**2026-06 — Fraunces + Work Sans type pairing; sage/wood/brass/cream palette.**
Placeholder direction matching the whimsical, vintage-meets-playful in-store feel (green walls, wood, brass frames). All theme values are tokens so the client's final notes reskin the site without touching components.

**2026-06 — Reorder via up/down controls (accessible) as the baseline; drag-and-drop is an enhancement.**
Up/down move buttons are robust, keyboard-accessible, and dependency-light. Drag-and-drop can layer on later without changing the data model (`display_order`).

**2026-06 — Official palette: black / green / pink / yellow, tuned to the shop photos.**
Client confirmed the brand palette. Mapped to the real space: green = the sage/olive walls, yellow = the brass/gold metallics (frames, fox heads, cups), pink = the dusty-pink accents, black = frames/counter/logo. Kept token-driven with the *old* sage/wood/brass names as backward-compatible aliases so nothing broke. **Accessibility discipline (flagged to client):** near-black body text on cream/white; bold colors only for accents/buttons/section bands — eyebrows use readable deep pink, never low-contrast yellow. Exact hexes still to be sampled from the logo files.

**2026-06 — Gallery Wall landing CONFIRMED; hero rendered on the sage-green wall.**
Client confirmed the frames-as-navigation concept ("other ideas welcome"), so it stays the lead — but all three concepts remain selectable for comparison. The hero now sits on the sage wall with framed "art" mounted on it, echoing the shop. Frames link to the key pages: Menu/Order, Troublemakers, Gallery Wall, Events, Timeline, Neighborhood (+ Reviews, About).

**2026-06 — Added TB Timeline page + owner-managed social links.**
New `/timeline` ("Our Story So Far") backed by `timeline_events` with a `timeline_grid` section + manager — a whimsical, SEO-friendly milestone story. Social links live in `content_blocks.social_links` (owner-editable in Quick Blocks) and surface in the footer everywhere + the contact/community pages. `timeline_events` got `status`/`draft_data` beyond the client's base DDL so it shares the same governance + CollectionManager as every other collection.

---

## Out of scope for v1 (build stubs, document, don't wire) — from build plan §12.5 / §13

- **Live SpotOn menu/API sync** — gated on Partner approval; `menuService` stub ready.
- **Flavor voting / drink suggestions** — section-type stubs only; enable post-launch with traffic.
- **Loyalty program logic** — `/community` loyalty section is informational in v1.
- Gift cards, Book-the-Space, "Now Pouring" spotlight, blog, merch, events RSVP/ticketing, Troublemaker-of-the-month, admin Site-Stats tile, multi-photo galleries per item — roadmap, architected to add without rework.
