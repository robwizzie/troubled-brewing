# CMS — Section Types, Data Shapes, Renderers & Editors

The CMS is **section-based**: each editable page is an ordered list of typed `sections`. For every type there is a public **renderer** (`src/components/sections/`); editing forms are generated from declarative schemas in `src/admin/editors/schemas.js` and rendered by the **on-page editor** (`/admin/editor`, `src/admin/editor/`) — there are no per-type editor files. Collection-backed types read from their own typed tables instead of jsonb.

> When you add a section type: (1) add the renderer, (2) add a schema entry (with a `manager` key if it's collection-backed), (3) register the renderer + label in `src/components/sections/registry.js`, (4) document it here.

## Section type catalog

| `type` | `data` shape (jsonb) | Backed by | Renderer |
|---|---|---|---|
| `hero` | `{ heading, subheading, background_image_url, cta_label, cta_url }` | data | `Hero.jsx` |
| `rich_text` | `{ heading, body_markdown }` | data | `RichText.jsx` |
| `image` | `{ image_url, alt, caption }` | data | `ImageBlock.jsx` |
| `gallery` | `{ images: [{url, alt}], layout }` | data | `Gallery.jsx` |
| `menu_block` | `{ heading, categories: [..] }` | `menu_items` | `MenuBlock.jsx` |
| `hours` | `{ heading }` | `hours`+`hours_overrides`/Google | `HoursSection.jsx` |
| `cta` | `{ heading, body, button_label, button_url }` | data | `CTA.jsx` |
| `events_list` | `{ heading }` | `events` | `EventsList.jsx` |
| `community_board` | `{ heading }` | `content_blocks` | `CommunityBoard.jsx` |
| `instagram` | `{ embed_handle }` | data | `InstagramFeed.jsx` |
| `map` | `{ address, embed_url }` | data | `MapSection.jsx` |
| `newsletter` | `{ heading, body, mailchimp_action_url }` | data | `Newsletter.jsx` |
| `reviews_hero` | `{ heading }` | `google_profile` | `ReviewsHero.jsx` |
| `testimonials_wall` | `{ heading, layout }` | `testimonials` | `TestimonialsWall.jsx` |
| `google_reviews_feed` | `{ heading, count }` | `google_profile` | `GoogleReviewsFeed.jsx` |
| `review_cta` | `{ heading, body, button_label }` | `google_profile.maps_url` | `ReviewCTA.jsx` |
| `gallery_wall_hero` | `{ heading, subheading, specials_label, specials_link, frames: [{ image_url, label, link, frame_style }] }` | data | `GalleryWallHero.jsx` |
| `immersive_gallery_hero` | `{ igh_eyebrow, igh_descriptor, igh_menu_label, igh_hours_label, igh_address, igh_special_label, igh_special_text, igh_mailchimp_action_url }` — the unbranded scene artwork (`images/wall/immersive-scene.jpg`) is the canvas; branding, frame-link labels (one per navbar destination), chalkboard hours, notes, and signup are live HTML over it (≥1020px); below that the scene becomes a banner and the links re-form as plaques | data | `ImmersiveGalleryHero.jsx` |
| `warm_storefront_hero` | `{ wsh_eyebrow, wsh_title, wsh_sub, background_image_url }` | data | `WarmStorefrontHero.jsx` |
| `cozy_editorial_hero` | `{ ceh_eyebrow, ceh_title, ceh_lead, ceh_signature, ceh_main_image_url, ceh_inset_image_url }` | data | `CozyEditorialHero.jsx` |
| `modern_coffee_hero` | `{ mch_eyebrow, mch_word, mch_brand, mch_lead, mch_drink_image_url }` | data | `ModernCoffeeHero.jsx` |
| `gallery_pieces_grid` | `{ heading }` | `gallery_pieces` | `GalleryPiecesGrid.jsx` |
| `troublemakers_grid` | `{ heading }` | `team_members` | `TroublemakersGrid.jsx` |
| `local_businesses_grid`| `{ heading }` | `local_businesses` | `LocalBusinessesGrid.jsx` |
| `timeline_grid` | `{ heading }` | `timeline_events` | `TimelineGrid.jsx` |
| `featured_drink` | `{ heading }` | `content_blocks.featured_drink` | `FeaturedDrink.jsx` |
| `announcement` | `{}` | `content_blocks.announcement_banner` | `AnnouncementBanner.jsx` |

> **Concept-hero keys are namespaced** (`igh_*`, `wsh_*`, `ceh_*`, `mch_*`) because all five homepage looks share the ONE home hero row's `data` object — the namespaces keep editing one look from bleeding into the others. Blank fields fall back to each concept's crafted default copy. `order_label`, `specials_link`, `ticker_items`, and `frames` are deliberately un-namespaced (shared by every look).

### Future-stub section types (built as no-op/coming-soon placeholders, not in v1 scope)

- `flavor_voting` — community flavor poll. Stub renderer + note.
- `drink_suggestions` — customer drink ideas. Stub renderer + note.

## Structured tables (collection-backed types read these)

`menu_items`, `events`, `hours`, `hours_overrides`, `testimonials`, `google_profile`, `gallery_pieces`, `team_members`, `local_businesses`, `timeline_events`, `content_blocks`, `submissions`, `revisions`. Full DDL in `supabase/schema.sql`; shapes summarized in the build plan §4.1, §5.5, §5.6.

> **Section editors are schema-driven.** Rather than one editor file per type, the on-page editor's `SectionPanel` renders forms from declarative schemas in `src/admin/editors/schemas.js` via the shared `FieldRenderer` (field types: text, textarea, markdown, image, select, number, price, date, checkbox, tags, `frames`, `images`, `funfacts`). Adding a type = add a renderer + a schema entry. Collection-backed types (`menu_block`, `timeline_grid`, …) carry a `manager` key so the panel shows a "Manage —" button that embeds the right collection manager in place (`src/admin/editor/sectionMeta.js`).

> **`content_blocks` keys:** `homepage_concept`, `featured_drink`, `staff_picks`, `loyalty_copy`, `announcement_banner`, `social_links` (Instagram/Facebook/TikTok/X/YouTube URLs — surfaced in footer + contact/community).

> **`frame_style` values** (gallery wall hero): `gilt-grand`, `gilt-thin`, `gold-botanical`, `gold-tapestry`, `bronze-carved`, `brass-chain`, `black-flat`, `black-mat`, `black-stacked`, `oval-gilt`, `oval-black` — one vintage molding recipe each, defined in `src/lib/frameStyles.js` (friendly labels for the admin select) + `src/styles/sections.css`. Legacy values from before the revamp (`gold`, `ornate`, `black`, `wood`, `green`, `pink`, `oval-*`) auto-map onto the new set via `normalizeFrameStyle()`, so rows saved earlier keep rendering. The hero's `specials_link` defaults to `/menu#specials`; `MenuBlock` maps that hash to the Specialty tab (any exact category key works too, e.g. `#seasonal`).

## Admin surfaces (`/admin`)

**The front door is the on-page editor** (`/admin` → `/admin/editor/:slug`, `src/admin/editor/`): the real site renders in an iframe canvas (`?canvas=1`, `src/canvas/CanvasApp.jsx`); hovering outlines and names each section; clicking opens a docked panel whose fields update the page live and autosave as a private draft; one **Publish** button pushes the page's drafts live. With nothing selected the panel shows the page outline (reorder ▲▼, hide 👁, delete 🗑, add section) + SEO fields. The home hero's panel includes the **Homepage look** concept switcher. Collection-backed sections embed their manager behind a "Manage —" button.

The sidebar layout survives as a slim **Settings** area for everything that isn't page content:

| Surface | Manages |
|---|---|
| **Hours Editor** | `hours` weekly grid + `hours_overrides` holidays |
| **Quick Blocks** | `content_blocks`: featured drink, staff picks, announcement banner, social links |
| **Google Profile Settings** | Place ID + GBP review URL + "refresh now" |
| **Inbox** | `submissions` — read/unread, filter by type (unread badge in the nav) |
| **Media Library** | browse/delete Storage images |
| **Help Center** (`/admin/help`) | plain-English guides, walkthrough video |
| **Content lists** | full-width `CollectionManager` pages for the 7 collections (same UI the editor embeds) |

## Content governance (§5.7)

- **Draft/Publish:** governed records carry `status` + `draft_data`. Public reads published `data`; admin preview (`?preview=1`) reads `draft_data`. For `sections`, `draft_data` is a whole-object REPLACEMENT of `data` (resolution rule: `draft_data ?? data`); for collection tables it's a partial-changes merge.
- **Autosave:** the on-page editor debounces edits (~700 ms) into `draft_data` via `saveDataDraftQuiet` — no revision churn (see below), no localStorage.
- **Revisions:** the on-page editor snapshots once per section per editing session + once on publish (`snapshotRecord`); explicit saves elsewhere snapshot per save. Per-record History with one-click Restore; retention capped ~20/record.
- **Guardrails:** confirm modals on delete/restore, required-field validation.

## Admin UX requirements

iPad-friendly (owners may use one behind the counter), plain-English labels, confirmation modals on delete, contextual "?" hints on non-obvious fields, toast confirmation per save.
