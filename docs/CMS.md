# CMS — Section Types, Data Shapes, Renderers & Editors

The CMS is **section-based**: each editable page is an ordered list of typed `sections`. For every type there is a public **renderer** (`src/components/sections/`); editing forms are generated from declarative schemas in `src/admin/editors/schemas.js` and rendered by the **on-page editor** (`/admin/editor`, `src/admin/editor/`) — there are no per-type editor files. Collection-backed types read from their own typed tables instead of jsonb.

> When you add a section type: (1) add the renderer, (2) add a schema entry (with a `manager` key if it's collection-backed), (3) register the renderer + label in `src/components/sections/registry.js`, (4) document it here.

## Section type catalog

| `type` | `data` shape (jsonb) | Backed by | Renderer |
|---|---|---|---|
| `hero` | `{ eyebrow, heading, subheading, background_image_url, cta_label, cta_url }` — `cta_url` renders as a router link for `/paths`, a real anchor for `https://` and `tel:` | data | `Hero.jsx` |
| `rich_text` | `{ heading, body_markdown, variant: ''\|'lead'\|'alt'\|'note' }` — `lead` is the centered opening paragraph with the cup motif, `alt` sits on a sage band, `note` is a static taped-up note (Location's Parking — the fox quotes that row, so it stays a rich_text) | data | `RichText.jsx` |
| `image` | `{ image_url, alt, caption }` | data | `ImageBlock.jsx` |
| `gallery` | `{ heading, images: [{url, alt}] }` | data | `Gallery.jsx` |
| `menu_block` | `{ heading, categories: [..], layout: 'auto'\|'cards'\|'list', show_chalkboard }` — `show_chalkboard` (default true) adds a small "Today's chalkboard" thumbnail under the heading while `chalkboard_photo` is live (`ChalkboardStrip.jsx`); nothing renders otherwise. `auto` (default) draws photo cards as soon as any item has an `image_url`, the classic price list until then; `cards` uses the shared `ProductCard`, the same card the homepage drinks teaser draws | `menu_items` | `MenuBlock.jsx` |
| `hours` | `{ heading, intro }` | `hours`+`hours_overrides`/Google | `HoursSection.jsx` |
| `cta` | `{ heading, body, button_label, button_url, eyebrow?, image_url?, image_alt?, frame_style?, secondary_label?, secondary_url? }` — with an `image_url` it renders as the sage photo panel with the photo in a gallery frame (same type on purpose: the fox reads the Events host cta by type) | data | `CTA.jsx` |
| `events_list` | `{ heading, intro, empty_heading, empty_message, empty_image_url, empty_image_alt, instagram_handle, show_past, past_heading }` — poster cards with a calendar date block; `show_past` adds a photo wall of past events that have an image | `events` | `EventsList.jsx` |
| `community_board` | `{ heading, intro }` | `content_blocks.staff_picks` | `CommunityBoard.jsx` |
| `instagram` | `{ heading, body, embed_handle }` | `instagram_feed` + data | `InstagramFeed.jsx` |
| `map` | `{ heading, address, button_label, note, embed_url }` | data | `MapSection.jsx` |
| `newsletter` | `{ heading, body, mailchimp_action_url }` | data | `Newsletter.jsx` |
| `reviews_hero` | `{ heading, subheading }` | `google_profile` | `ReviewsHero.jsx` |
| `testimonials_wall` | `{ heading, layout }` | `testimonials` (via `lib/reviews.js`) | `TestimonialsWall.jsx` |
| `google_reviews_feed` | `{ heading, count }` — the COMPLETE Google list, newest first: every cached review that passes the owner's star floor + hidden list, including ones also hand-picked as testimonials (deduped only Google-vs-Google). `count` no longer caps it — it only sizes the first batch (min 12); more append as the visitor scrolls, plus a "Show all N reviews" button. States the true count, and links to Google when `google_profile.review_count` is larger than the cache | `google_profile` (via `lib/reviews.js`, `only: 'google', order: 'newest'`) | `GoogleReviewsFeed.jsx` |
| `review_cta` | `{ heading, body, button_label }` | `google_profile.maps_url` | `ReviewCTA.jsx` |
| `gallery_wall_hero` | `{ heading, subheading, specials_label, specials_link, frames: [{ image_url, label, link, frame_style }] }` | data | `GalleryWallHero.jsx` |
| `immersive_gallery_hero` | `{ igh_eyebrow, igh_descriptor, igh_scene_image_url, igh_menu_label, igh_hours_label, igh_address, igh_special_label, igh_special_text, igh_wall_heading, igh_mailchimp_action_url, igh_pieces: [{ id, label, to, img, frame }] }` — the café-scene artwork is the canvas; branding, frame labels, chalkboard hours, the taped note and the signup are live HTML over it (≥1020px). The pictures inside its frames are part of the artwork — nothing is drawn over them; `igh_scene_image_url` swaps the room. Below 1020px the wall re-hangs itself as a salon hang of the shop's photographs. `igh_special_text` unset = the featured drink's name (`lib/featured.js`), `''` hides the note. `igh_pieces` are per-piece overrides matched **by `id`** onto `src/lib/wallPieces.js` | data | `ImmersiveGalleryHero.jsx` |
| `warm_storefront_hero` | `{ wsh_eyebrow, wsh_title, wsh_sub, background_image_url }` | data | `WarmStorefrontHero.jsx` |
| `cozy_editorial_hero` | `{ ceh_eyebrow, ceh_title, ceh_lead, ceh_signature, ceh_main_image_url, ceh_inset_image_url }` | data | `CozyEditorialHero.jsx` |
| `modern_coffee_hero` | `{ mch_eyebrow, mch_word, mch_brand, mch_lead, mch_drink_image_url }` | data | `ModernCoffeeHero.jsx` |
| `tagged_wall_hero` | `{ twh_eyebrow, twh_title, twh_sub, twh_hint, twh_menu_label, twh_photo_url, twh_tags }` — the **real** wall photo with paper luggage tags tied to frames; `twh_tags` is one `piece \| label \| link` per line, `piece` an id from `src/lib/galleryWall.js` | data | `TaggedWallHero.jsx` |
| `closer_look_hero` | `{ clh_eyebrow, clh_title, clh_sub, clh_menu_label, clh_photo_url }` — the real wall photo under a brass magnifying glass, with a museum label read from the same data as /gallery-wall (a different "today's pick" each day; it tours on its own until someone takes the glass) | `gallery_pieces` | `CloserLookHero.jsx` |
| `scrapbook_hero` | `{ sbh_eyebrow, sbh_title, sbh_sub, sbh_hours_label, sbh_menu_label, sbh_photo_url }` — the real wall photo taped into a scrapbook with hand-written notes on what's visibly in it, plus linked snapshots of the shop | data | `ScrapbookHero.jsx` |
| `wall_tour_hero` | `{ wth_eyebrow, wth_title, wth_sub, wth_menu_label, wth_photo_url }` — the real wall in a gilt frame, panning frame to frame (same `viewFor()` math as /gallery-wall) | data | `WallTourHero.jsx` |
| `step_inside_hero` | `{ sih_title, sih_sub, sih_photo_url }` — sticky real-wall photo that zooms frame to frame as the page scrolls, one live chapter per frame; lighting follows the shop's hours (`?lights=on\|off` to preview) | `menu_items`, `google_profile`, `testimonials`, `hours` | `StepInsideHero.jsx` |
| `pastry_case_hero` | `{ pch_eyebrow, pch_title, pch_sub, pch_board_title, pch_menu_label, pch_photo_url, pch_drinks, pch_chalk_max_days }` — the real counter photo with a chalkboard of live menu items + prices. When `content_blocks.chalkboard_photo` is live (see below) the drawn board is replaced by the staff photo of the real chalkboard, in the same frame; `pch_chalk_max_days` (optional, not in the editor) overrides the block's `max_age_days` | `menu_items` + `content_blocks.chalkboard_photo` | `PastryCaseHero.jsx` |
| `gallery_wall_room` | `{ heading, intro, hint, image_url }` — the shop's own photograph of the wall with a hotspot over every piece in it; opening one pans and magnifies the photograph under a spotlight and raises a card with the credits and the story. Hotspot geometry lives in `src/lib/galleryWall.js` and is **measured against `public/images/wall/gallery-wall.jpg`** — a different `image_url` still renders, but the hotspots have to be re-measured in code to match it. A `gallery_pieces` row claims a frame with its `wall_spot` | `gallery_pieces` | `GalleryWallRoom.jsx` |
| `gallery_pieces_grid` | `{ heading, intro }` — each piece hangs in a real molding with a museum label: title, **artist** (linked via `artist_url`), medium and date | `gallery_pieces` | `GalleryPiecesGrid.jsx` |
| `troublemakers_grid` | `{ heading, intro, empty_message }` — polaroids; `drink` links to `/menu#item-<slug>` when it names a menu item | `team_members` | `TroublemakersGrid.jsx` |
| `local_businesses_grid`| `{ heading, intro, order_by: 'street'\|'manual', show_us }` — `street` orders by the leading number in each `address`, laying the page out as a walk down the avenue with the shop's own door marked in place | `local_businesses` | `LocalBusinessesGrid.jsx` |
| `timeline_grid` | `{ heading, intro, fill_images, fill_caption, end_label }` — a string of frames; milestones without their own `image_url` borrow `fill_images`, tagged `fill_caption` ("The shop today") | `timeline_events` | `TimelineGrid.jsx` |
| `featured_drink` | `{ heading }` | `content_blocks.featured_drink` — `{ item, description, image_url, name, price }`. `item` = an exact menu name, pulled live (name, price, photo) by `lib/featured.js`; `description`/`image_url` override the menu's when non-empty; `name`/`price` are used only when no `item` is set. A missing/unavailable item (or a manual `name` matching an unavailable item) falls back to the best available specialty item — an unavailable drink is never featured | `FeaturedDrink.jsx` |
| `announcement` | `{}` | `content_blocks.announcement_banner` | `AnnouncementBanner.jsx` |

> **Concept-hero keys are namespaced** (`igh_*`, `wsh_*`, `ceh_*`, `mch_*`, `twh_*`, `clh_*`, `sbh_*`, `wth_*`, `pch_*`, `sih_*`) because all the homepage looks share the ONE home hero row's `data` object — the namespaces keep editing one look from bleeding into the others. Blank fields fall back to each concept's crafted default copy. `order_label`, `specials_link`, `ticker_items`, and `frames` are deliberately un-namespaced (shared by every look).

**Photo-led inside pages** (About, Location, Events, Troublemakers, Timeline — see `supabase/migrations/2026-10-19-pages-glowup.sql`). Image urls under `/images/pages/<name>.jpg` are the shop's own photos shipped in `public/images/pages/`; `src/lib/pagePhotos.js` gives them a WebP srcset (800/1400/2000w), any other url renders as-is. Frames use the gallery wall's `frame_style` vocabulary. One orchestrated motion per page at most, always off under reduced motion.

| Type | Data shape | Source | Renderer |
|---|---|---|---|
| `photo_hero` | `{ eyebrow, heading, subheading, image_url, image_alt, caption, layout: 'framed'\|'full', frame_style, focus, cta_label, cta_url, secondary_label, secondary_url }` | data | `PhotoHero.jsx` |
| `photo_story` | `{ eyebrow, heading, body_markdown, image_url, image_alt, caption, frame_style, image_side: 'right'\|'left', inset_url, inset_alt, inset_frame, link_label, link_url, tone: 'paper'\|'sage' }` — frames swing onto their nails as they scroll in | data | `PhotoStory.jsx` |
| `pull_quote` | `{ quote, attribution, source }` — real quotes only; renders nothing without one | data | `PullQuote.jsx` |
| `photo_mosaic` | `{ eyebrow, heading, intro, badges, images: [{url, alt, caption?}], layout: 'salon'\|'strip', tone }` | data | `PhotoMosaic.jsx` |
| `visit_panel` | `{ heading, address, embed_url, directions_label, phone_label, phone_url, hours_heading }` — map + live hours letterboard (today highlighted) | data + hours | `VisitPanel.jsx` |

### Future-stub section types (built as no-op/coming-soon placeholders, not in v1 scope)

- `flavor_voting` — community flavor poll. Stub renderer + note.
- `drink_suggestions` — customer drink ideas. Stub renderer + note.

## Structured tables (collection-backed types read these)

`menu_items`, `events`, `hours`, `hours_overrides`, `testimonials`, `google_profile`, `gallery_pieces`, `team_members`, `local_businesses`, `timeline_events`, `content_blocks`, `submissions`, `revisions`. Full DDL in `supabase/schema.sql`; shapes summarized in the build plan §4.1, §5.5, §5.6.

> **Section editors are schema-driven.** Rather than one editor file per type, the on-page editor's `SectionPanel` renders forms from declarative schemas in `src/admin/editors/schemas.js` via the shared `FieldRenderer` (field types: text, textarea, markdown, image, select, number, price, date, checkbox, tags, `frames`, `wallpieces`, `images`, `funfacts`). Adding a type = add a renderer + a schema entry. Collection-backed types (`menu_block`, `timeline_grid`, …) carry a `manager` key so the panel shows a "Manage —" button that embeds the right collection manager in place (`src/admin/editor/sectionMeta.js`). A manager entry is normally a `CollectionManager` config (a table + fields); it may instead be `{ title, component }`, which the panel renders as-is — that's how `social_proof` / `google_reviews_feed` reach the Reviews control room, which edits a cached library plus a settings block rather than a row-per-item collection.

> **`content_blocks` keys:** `homepage_concept`, `featured_drink`, `staff_picks`, `loyalty_copy`, `announcement_banner`, `social_links` (Instagram/Facebook/TikTok/X/YouTube URLs — surfaced in footer + contact/community), `review_settings`.

### Today's chalkboard (`content_blocks.chalkboard_photo`)

Staff photograph the shop's real chalkboard from **Settings → 📷 Today's chalkboard** (`/admin/chalkboard`, `src/admin/managers/ChalkboardManager.jsx`). Phone-first: a "Take a photo" button (`accept="image/*" capture="environment"` — opens the rear camera) beside a normal "Choose a photo"; a local preview (nothing uploads until **Publish**); an optional caption; and "Take it down after" (1/2/3/5/7 days). Publishing compresses in the browser (`uploadImage` preset `chalkboard`: ≤1600px long edge, WebP q≈0.82, ≤~450 KB), uploads to the public `media` bucket at `chalkboard/<timestamp>-<name>.webp`, deletes the previous `chalkboard/` photo (best effort), and upserts:

```json
{ "url": "https://…/storage/v1/object/public/media/chalkboard/…webp",
  "path": "chalkboard/…webp", "caption": "Pumpkin cold foam is back",
  "updated_at": "2026-10-19T13:05:00.000Z", "enabled": true, "max_age_days": 3 }
```

"Re-publish" (no new photo) bumps `updated_at` when the board hasn't changed; **Remove — go back to the drawn board** sets `enabled: false` (the photo/url are kept).

The site (`src/lib/chalkboard.js` → `useChalkboardPhoto`, `isChalkboardLive`) shows the photo only when `enabled === true`, `url` is set and the photo is fresh: its age in calendar days on the shop's clock (America/New_York, upload day = 0) is below `max_age_days` (default 3 → shown the upload day and the next two days). Stale, disabled, url-less, missing, a failed fetch, or an image that fails to load → the drawn live-menu board, always. The hero labels it "Updated today / yesterday / Tue" and opens it full-size in `PhotoLightbox` (Esc / ✕ / backdrop to close, focus returned, native pinch-zoom on phones).

Storage/RLS: no new policy — the existing bucket-wide `media` policies (public read, authenticated insert/update/delete) and `content_blocks` policies cover it. `supabase/migrations/2026-10-19-chalkboard-photo.sql` only inserts the row (switched off) if it's missing; the admin's upsert creates it anyway on first publish.

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

### The three collection pages

`gallery_pieces`, `team_members` and `local_businesses` all render "a photo, a name and some words", but each one carries the fields its subject actually needs, and every one of them is optional — a card holds its shape when only the name is filled in.

- **Gallery Wall.** Real people made the work in that room, so `artist` / `artist_url` / `medium` / `year_label` are columns rather than something crammed into the story text, and the artist's name links wherever they want people sent. `frame_style` picks a molding from `frameStyles.js`; left blank, the page cycles the moldings so an unset wall still reads as collected. An unphotographed piece shows a warm blank in its frame, not a placeholder glyph on grey. `wall_spot` pins the row to one of the frames in the wall photograph (`src/lib/galleryWall.js`), which is how the credits and story reach `gallery_wall_room`; leave it blank for a piece that isn't in that photo.
- **Troublemakers.** `pronouns` (asked for, never assumed), `started_label`, and `drink` — their go-to order, given its own emphasis on the card because it answers the question these people field all day. `fun_facts` stays an open key/value map, so owners can invent their own.
- **Local Love.** `address` drives both the directions link and the walk-down-the-street ordering; `logo_url` is an upload slot rather than anything fetched, with a drawn monogram standing in; `we_love` is the specific thing they send people for, which is the line customers act on.

### Products: one card, two pages

`src/components/ProductCard.jsx` is the single product card, drawn by both the homepage `signature_drinks` teaser and `menu_block`'s card layout, so a drink looks the same wherever a visitor meets it. Photos resolve through `src/lib/productImage.js` — the item's `image_url`, then the drop-in file `public/images/drinks/<name-slug>.jpg`, then a drawn motif — and `src/lib/menuService.js` owns the selection helpers (`pickProducts`, `hasProductPhotos`) both sections share. Everything comes from the live `menu_items` rows, so the landing page and the Menu page can never disagree about a price, description or picture.

**Cutout photos.** A menu photo whose file name contains `cutout` (a background-removed PNG/WebP — e.g. upload `iced-latte-cutout.png` in Menu Manager) is staged instead of cropped: shown whole on a warm lit backdrop with a contact shadow, rising in once and then gently bobbing (`isCutout` in `productImage.js`; styles under "CUTOUT products" in `sections.css`).

**`food_showcase` — "Fresh off the counter" shelf** (`FoodShowcase.jsx`). A reusable section: the sage wall with one long walnut shelf, every cutout menu item standing on it with a hand-lettered price tag swinging beneath; category buttons filter it; tapping an item opens the shop's SpotOn order page in a new tab (`orderUrlFor` in `src/lib/order.js`; tracked as `order_now_click`, `location: 'food_shelf'`). (`/menu#item-<slug>` still scrolls a menu card into view and glows it, for any link that uses it.) Data: `heading`, `subheading`, `items` (names, optional), `categories` (optional), `hide_filters`, `hide_prices`, `include_photos` (let non-cutout photos in). It hides itself when no item has a photo. Placed first on Menu and under the hero on Home by `supabase/migrations/2026-10-18-food-showcase.sql` (or add it from the editor: "Food & drink shelf (photos)").

### The homepage wall

`src/lib/wallPieces.js` holds the wall as data: one entry per destination, carrying both places it hangs.

- **On the scene** — `x/y/w/h` are % boxes over the 1536×1024 artwork, tuned so the brass nameplate lands on the frame's bottom edge. Nothing is drawn inside the box: the pictures in the room are part of the artwork and are edited there.
- **On a phone** — `frame` (a molding), `ar` (its shape) and `small` (hangs at 84% of the column).

Shared by both: `img`, and the drawn stand-in (`motif` + hand-lettered `caption`) shown until that photograph exists. The label, link, photo and molding are owner-editable via the hero's `igh_pieces`, merged by `mergeWallPieces()`.

Rows merge **by `id`, not by position**: matching by index meant that adding or removing a piece silently re-pointed every photograph the owner had chosen after it. A blank field means "use the built-in", so a half-filled row keeps whatever it didn't set; the sentinel `'-'` in `img` means "hang this one as its drawn stand-in".

`WALL_OBJECTS` hangs the shop's gold fox-head and brass hare among the pictures, keyed to the piece they follow so the masonry carries them into different columns.

> **`frame_style` values** (gallery wall hero): `gilt-grand`, `gilt-thin`, `gold-botanical`, `gold-tapestry`, `bronze-carved`, `brass-chain`, `black-flat`, `black-mat`, `black-stacked`, `oval-gilt`, `oval-black` — one vintage molding recipe each, defined in `src/lib/frameStyles.js` (friendly labels for the admin select) + `src/styles/sections.css`. Legacy values from before the revamp (`gold`, `ornate`, `black`, `wood`, `green`, `pink`, `oval-*`) auto-map onto the new set via `normalizeFrameStyle()`, so rows saved earlier keep rendering. The hero's `specials_link` defaults to `/menu#specials`; `MenuBlock` maps that hash to the Specialty tab (any exact category key works too, e.g. `#seasonal`).

## Admin surfaces (`/admin`)

**The front door is the on-page editor** (`/admin` → `/admin/editor/:slug`, `src/admin/editor/`): the real site renders in an iframe canvas (`?canvas=1`, `src/canvas/CanvasApp.jsx`); hovering outlines and names each section; clicking opens a docked panel whose fields update the page live and autosave as a private draft; one **Publish** button pushes the page's drafts live. With nothing selected the panel shows the page outline (reorder ▲▼, hide 👁, delete 🗑, add section) + SEO fields. The home hero's panel includes the **Homepage look** concept switcher. Collection-backed sections embed their manager behind a "Manage —" button.

The sidebar layout survives as a slim **Settings** area for everything that isn't page content:

| Surface | Manages |
|---|---|
| **Hours Editor** | `hours` weekly grid + `hours_overrides` holidays |
| **Today's chalkboard** (`/admin/chalkboard`) | `content_blocks.chalkboard_photo` — snap/upload the real chalkboard, caption, publish / remove (see above) |
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
