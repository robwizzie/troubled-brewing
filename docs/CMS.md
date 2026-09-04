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
| `menu_block` | `{ heading, categories: [..], layout: 'auto'\|'cards'\|'list' }` — `auto` (default) draws photo cards as soon as any item has an `image_url`, the classic price list until then; `cards` uses the shared `ProductCard`, the same card the homepage drinks teaser draws | `menu_items` | `MenuBlock.jsx` |
| `hours` | `{ heading }` | `hours`+`hours_overrides`/Google | `HoursSection.jsx` |
| `cta` | `{ heading, body, button_label, button_url }` | data | `CTA.jsx` |
| `events_list` | `{ heading }` | `events` | `EventsList.jsx` |
| `community_board` | `{ heading }` | `content_blocks` | `CommunityBoard.jsx` |
| `instagram` | `{ embed_handle }` | data | `InstagramFeed.jsx` |
| `map` | `{ address, embed_url }` | data | `MapSection.jsx` |
| `newsletter` | `{ heading, body, mailchimp_action_url }` | data | `Newsletter.jsx` |
| `reviews_hero` | `{ heading }` | `google_profile` | `ReviewsHero.jsx` |
| `testimonials_wall` | `{ heading, layout }` | `testimonials` (via `lib/reviews.js`) | `TestimonialsWall.jsx` |
| `google_reviews_feed` | `{ heading, count }` — `count` is the page size; the rest sit behind "Show more" | `google_profile` (via `lib/reviews.js`) | `GoogleReviewsFeed.jsx` |
| `review_cta` | `{ heading, body, button_label }` | `google_profile.maps_url` | `ReviewCTA.jsx` |
| `gallery_wall_hero` | `{ heading, subheading, specials_label, specials_link, frames: [{ image_url, label, link, frame_style }] }` | data | `GalleryWallHero.jsx` |
| `immersive_gallery_hero` | `{ igh_eyebrow, igh_descriptor, igh_banner_image_url, igh_menu_label, igh_hours_label, igh_address, igh_special_label, igh_special_text, igh_wall_heading, igh_mailchimp_action_url, igh_pieces: [{ id, label, to, img, frame }] }` — the lead homepage look. A real photograph of the shop with the brand lettered over it, then the counter (live hours + taped special), then the salon hang of framed photographs, then the order CTA + signup. **No generated artwork** — the room is CSS, the pictures are the shop's own. `igh_pieces` are per-picture overrides matched **by `id`** onto `src/lib/wallPieces.js` (see below) | data | `ImmersiveGalleryHero.jsx` |
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

> **Section editors are schema-driven.** Rather than one editor file per type, the on-page editor's `SectionPanel` renders forms from declarative schemas in `src/admin/editors/schemas.js` via the shared `FieldRenderer` (field types: text, textarea, markdown, image, select, number, price, date, checkbox, tags, `frames`, `wallpieces`, `images`, `funfacts`). Adding a type = add a renderer + a schema entry. Collection-backed types (`menu_block`, `timeline_grid`, …) carry a `manager` key so the panel shows a "Manage —" button that embeds the right collection manager in place (`src/admin/editor/sectionMeta.js`). A manager entry is normally a `CollectionManager` config (a table + fields); it may instead be `{ title, component }`, which the panel renders as-is — that's how `social_proof` / `google_reviews_feed` reach the Reviews control room, which edits a cached library plus a settings block rather than a row-per-item collection.

> **`content_blocks` keys:** `homepage_concept`, `featured_drink`, `staff_picks`, `loyalty_copy`, `announcement_banner`, `social_links` (Instagram/Facebook/TikTok/X/YouTube URLs — surfaced in footer + contact/community), `review_settings`.

### Reviews: one selection rule, every surface

`src/lib/reviews.js` is the single place that decides which reviews the site shows and in what order. `loadReviews({ only, minLength })` merges the two sources into one shape — the cached Google library (`google_profile.reviews`) and hand-picked `testimonials` — dedupes them by author+text (a review imported as a testimonial disappears from the Google side, so a quote never hangs twice on one page), applies the owner's rules, and sorts: pinned → featured → carries a photo → newest.

The owner's rules live in the `review_settings` content block, keyed by `reviewKey(author, text)` so they survive Google reshuffling which five reviews it returns each refresh:

```jsonc
{ "min_rating": 4,          // the star floor — nothing below it shows anywhere
  "hidden":  { "<key>": true },   // never show this one
  "pinned":  { "<key>": true },   // show it first, everywhere
  "photos":  { "<key>": "https://…" } } // Places returns no review photos; owners attach them
```

Edited in **admin → Reviews** (`src/admin/managers/ReviewsManager.jsx`), reachable both from the sidebar and from the homepage reviews strip / reviews feed in the editor. `SocialProof`, `GoogleReviewsFeed` and `TestimonialsWall` all read through `loadReviews()` — no surface re-implements "a good review".

### Products: one card, two pages

`src/components/ProductCard.jsx` is the single product card, drawn by both the homepage `signature_drinks` teaser and `menu_block`'s card layout, so a drink looks the same wherever a visitor meets it. Photos resolve through `src/lib/productImage.js` — the item's `image_url`, then the drop-in file `public/images/drinks/<name-slug>.jpg`, then a drawn motif — and `src/lib/menuService.js` owns the selection helpers (`pickProducts`, `hasProductPhotos`) both sections share. Everything comes from the live `menu_items` rows, so the landing page and the Menu page can never disagree about a price, description or picture.

### The homepage wall

`src/lib/wallPieces.js` holds the wall as data: one entry per destination — a stable `id`, its molding, its shape, its photograph, and the drawn stand-in (motif + hand-lettered `caption`) used until that photograph exists. The label, link, photo and molding are owner-editable via the hero's `igh_pieces`, merged by `mergeWallPieces()`.

Rows merge **by `id`, not by position**: matching by index meant that adding or removing a piece silently re-pointed every photograph the owner had chosen after it. A blank field means "use the built-in", so a half-filled row keeps whatever it didn't set; the sentinel `'-'` in `img` means "hang this one as its drawn stand-in".

`WALL_OBJECTS` hangs the shop's gold fox-head and brass hare among the pictures, keyed to the piece they follow so the masonry carries them into different columns.

> **`frame_style` values** (gallery wall hero): `gilt-grand`, `gilt-thin`, `gold-botanical`, `gold-tapestry`, `bronze-carved`, `brass-chain`, `black-flat`, `black-mat`, `black-stacked`, `oval-gilt`, `oval-black` — one vintage molding recipe each, defined in `src/lib/frameStyles.js` (friendly labels for the admin select) + `src/styles/sections.css`. Legacy values from before the revamp (`gold`, `ornate`, `black`, `wood`, `green`, `pink`, `oval-*`) auto-map onto the new set via `normalizeFrameStyle()`, so rows saved earlier keep rendering. The hero's `specials_link` defaults to `/menu#specials`; `MenuBlock` maps that hash to the Specialty tab (any exact category key works too, e.g. `#seasonal`).

## Admin surfaces (`/admin`)

**The front door is the on-page editor** (`/admin` → `/admin/editor/:slug`, `src/admin/editor/`): the real site renders in an iframe canvas (`?canvas=1`, `src/canvas/CanvasApp.jsx`); hovering outlines and names each section; clicking opens a docked panel whose fields update the page live and autosave as a private draft; one **Publish** button pushes the page's drafts live. With nothing selected the panel shows the page outline (reorder ▲▼, hide 👁, delete 🗑, add section) + SEO fields. The home hero's panel includes the **Homepage look** concept switcher. Collection-backed sections embed their manager behind a "Manage —" button.

The sidebar layout survives as a slim **Settings** area for everything that isn't page content:

| Surface | Manages |
|---|---|
| **Hours Editor** | `hours` weekly grid + `hours_overrides` holidays |
| **Quick Blocks** | `content_blocks`: featured drink, staff picks, announcement banner, social links |
| **Google Profile Settings** | Place ID + GBP review URL + "refresh now" |
| **Reviews** (`/admin/reviews`) | every cached Google review: the star floor, hide/feature per review, attach a review photo, promote one to a hand-picked favorite. Writes `content_blocks.review_settings`; also embeddable in the editor panel from the homepage reviews strip |
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

**Phone-friendly too.** Under 900px the editor stops being a split view and stacks: the canvas on top, the panel as a bottom sheet (≤58dvh, its own scroll, `overscroll-behavior: contain`) — see the responsive block at the end of `src/admin/editor/editor.css`. The preview-width toggles hide (a phone canvas is already phone width), controls get 34px touch targets, and panel inputs are 16px so iOS doesn't zoom the page on focus. Heights use `dvh`, not `vh`, or iOS Safari's URL bar hides the Publish button.
