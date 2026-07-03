# CMS — Section Types, Data Shapes, Renderers & Editors

The CMS is **section-based**: each editable page is an ordered list of typed `sections`. For every type there is a public **renderer** (`src/components/sections/`) and an admin **editor** (`src/admin/editors/`), wired through registries. Collection-backed types read from their own typed tables instead of jsonb.

> When you add a section type: (1) add the renderer, (2) add the editor, (3) register both in the two `registry.js` files, (4) document it here.

## Section type catalog

| `type` | `data` shape (jsonb) | Backed by | Renderer | Editor |
|---|---|---|---|---|
| `hero` | `{ heading, subheading, background_image_url, cta_label, cta_url }` | data | `Hero.jsx` | `HeroEditor.jsx` |
| `rich_text` | `{ heading, body_markdown }` | data | `RichText.jsx` | `RichTextEditor.jsx` |
| `image` | `{ image_url, alt, caption }` | data | `ImageBlock.jsx` | `ImageEditor.jsx` |
| `gallery` | `{ images: [{url, alt}], layout }` | data | `Gallery.jsx` | `GalleryEditor.jsx` |
| `menu_block` | `{ heading, categories: [..] }` | `menu_items` | `MenuBlock.jsx` | `MenuBlockEditor.jsx` |
| `hours` | `{ heading }` | `hours`+`hours_overrides`/Google | `HoursSection.jsx` | `HoursSectionEditor.jsx` |
| `cta` | `{ heading, body, button_label, button_url }` | data | `CTA.jsx` | `CTAEditor.jsx` |
| `events_list` | `{ heading }` | `events` | `EventsList.jsx` | `EventsListEditor.jsx` |
| `community_board` | `{ heading }` | `content_blocks` | `CommunityBoard.jsx` | `CommunityBoardEditor.jsx` |
| `instagram` | `{ embed_handle }` | data | `InstagramFeed.jsx` | `InstagramEditor.jsx` |
| `map` | `{ address, embed_url }` | data | `MapSection.jsx` | `MapEditor.jsx` |
| `newsletter` | `{ heading, body, mailchimp_action_url }` | data | `Newsletter.jsx` | `NewsletterEditor.jsx` |
| `reviews_hero` | `{ heading }` | `google_profile` | `ReviewsHero.jsx` | `ReviewsHeroEditor.jsx` |
| `testimonials_wall` | `{ heading, layout }` | `testimonials` | `TestimonialsWall.jsx` | `TestimonialsWallEditor.jsx` |
| `google_reviews_feed` | `{ heading, count }` | `google_profile` | `GoogleReviewsFeed.jsx` | `GoogleReviewsFeedEditor.jsx` |
| `review_cta` | `{ heading, body, button_label }` | `google_profile.maps_url` | `ReviewCTA.jsx` | `ReviewCTAEditor.jsx` |
| `gallery_wall_hero` | `{ heading, subheading, specials_label, specials_link, frames: [{ image_url, label, link, frame_style }] }` | data | `GalleryWallHero.jsx` | `GalleryWallHeroEditor.jsx` |
| `gallery_pieces_grid` | `{ heading }` | `gallery_pieces` | `GalleryPiecesGrid.jsx` | `GalleryPiecesGridEditor.jsx` |
| `troublemakers_grid` | `{ heading }` | `team_members` | `TroublemakersGrid.jsx` | `TroublemakersGridEditor.jsx` |
| `local_businesses_grid`| `{ heading }` | `local_businesses` | `LocalBusinessesGrid.jsx` | `LocalBusinessesGridEditor.jsx` |
| `timeline_grid` | `{ heading }` | `timeline_events` | `TimelineGrid.jsx` | schema-driven |
| `featured_drink` | `{ heading }` | `content_blocks.featured_drink` | `FeaturedDrink.jsx` | `FeaturedDrinkEditor.jsx` |
| `announcement` | `{}` | `content_blocks.announcement_banner` | `AnnouncementBanner.jsx` | (Quick Blocks) |

### Future-stub section types (built as no-op/coming-soon placeholders, not in v1 scope)

- `flavor_voting` — community flavor poll. Stub renderer + note.
- `drink_suggestions` — customer drink ideas. Stub renderer + note.

## Structured tables (collection-backed types read these)

`menu_items`, `events`, `hours`, `hours_overrides`, `testimonials`, `google_profile`, `gallery_pieces`, `team_members`, `local_businesses`, `timeline_events`, `content_blocks`, `submissions`, `revisions`. Full DDL in `supabase/schema.sql`; shapes summarized in the build plan §4.1, §5.5, §5.6.

> **Section editors are schema-driven.** Rather than one editor file per type, the admin `SectionEditor` renders forms from declarative schemas in `src/admin/editors/schemas.js` (field types: text, textarea, markdown, image, select, number, `frames`, `images`). Adding a type = add a renderer + a schema entry. Collection-backed types (`menu_block`, `timeline_grid`, …) edit just their heading and point the owner to the relevant manager.

> **`content_blocks` keys:** `homepage_concept`, `featured_drink`, `staff_picks`, `loyalty_copy`, `announcement_banner`, `social_links` (Instagram/Facebook/TikTok/X/YouTube URLs — surfaced in footer + contact/community).

> **`frame_style` values** (gallery wall hero): `gilt-grand`, `gilt-thin`, `gold-botanical`, `gold-tapestry`, `bronze-carved`, `brass-chain`, `black-flat`, `black-mat`, `black-stacked`, `oval-gilt`, `oval-black` — one vintage molding recipe each, defined in `src/lib/frameStyles.js` (friendly labels for the admin select) + `src/styles/sections.css`. Legacy values from before the revamp (`gold`, `ornate`, `black`, `wood`, `green`, `pink`, `oval-*`) auto-map onto the new set via `normalizeFrameStyle()`, so rows saved earlier keep rendering. The hero's `specials_link` defaults to `/menu#specials`; `MenuBlock` maps that hash to the Specialty tab (any exact category key works too, e.g. `#seasonal`).

## Admin panel surfaces (`/admin`)

| Surface | Manages |
|---|---|
| **Page Editor** | sections per page: edit inline, reorder, toggle visibility, add/remove from allowed types, publish |
| **Menu Manager** | `menu_items` — add/edit/delete, category + dietary tags, image upload, reorder, availability |
| **Events Manager** | `events` — add/edit/delete upcoming events + image |
| **Hours Editor** | `hours` weekly grid + `hours_overrides` holidays |
| **Quick Blocks** | `content_blocks`: featured drink, staff picks, announcement banner |
| **Testimonials Manager** | `testimonials` — add/edit/delete/reorder, mark featured |
| **Gallery Manager** | `gallery_pieces` — pieces + stories |
| **Troublemakers Manager** | `team_members` — staff, bios, fun facts, photos, active toggle |
| **Local Business Manager** | `local_businesses` |
| **TB Timeline Manager** | `timeline_events` — milestones with flexible date labels |
| **Google Profile Settings** | Place ID + GBP review URL + "refresh now" |
| **Inbox** | `submissions` — read/unread, filter by type |
| **Media Library** | browse/delete Storage images |
| **Help Center** (`/admin/help`) | plain-English guides, first-run checklist, walkthrough video |

## Content governance (§5.7)

- **Draft/Publish:** governed records carry `status` + `draft_data`. Public reads published `data`; admin preview (`?preview=1`) reads `draft_data`. Per-item Publish + "Publish all on this page".
- **Revisions:** every save snapshots prior state into `revisions`; per-record History with one-click Restore; retention capped ~20/record.
- **Guardrails:** confirm modals on delete/restore/publish-all, required-field validation, localStorage autosave while editing.

## Admin UX requirements

iPad-friendly (owners may use one behind the counter), plain-English labels, confirmation modals on delete, contextual "?" hints on non-obvious fields, toast confirmation per save.
