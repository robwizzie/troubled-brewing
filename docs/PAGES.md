# Pages

Every public page is **section-composed** (see CMS.md) so the owner can rearrange and edit it. Each is seeded with sensible default sections. Routing uses React Router with a GitHub Pages SPA fallback (see DEPLOYMENT.md).

| # | Page | Route | Purpose | Default seeded sections |
|---|---|---|---|---|
| 1 | Home | `/` | First impression + funnel to Order | `gallery_wall_hero` (or chosen concept) → `featured_drink` → `hours` strip → `cta` (Order) → La Colombe `rich_text` → community teaser → `instagram` → `announcement` (if set) → `newsletter` |
| 2 | Menu | `/menu` | Browse the menu, order | `menu_block` (category-tabbed, dietary filters) → `cta` (Order on SpotOn) |
| 3 | About | `/about` | Tom & Cat's story, La Colombe, why local | `hero` → `rich_text` (story) → `rich_text` (La Colombe, factual) → `image`/`gallery` |
| 4 | Events & Community | `/events` | Upcoming events, host-an-event | `hero` → `events_list` → `cta` (host an event → catering) |
| 5 | Hours & Location | `/location` | Live hours, map, parking, contact | `hours` → `map` → `rich_text` (parking) → `cta` (call/email) |
| 6 | Contact | `/contact` | General + catering inquiry forms | `rich_text` (intro) → contact form → catering form (→ `submissions`) |
| 7 | Community | `/community` | Events calendar, community board, loyalty, customer photos | `events_list` → `community_board` → `rich_text` (loyalty, informational) → `instagram` |
| 8 | Reviews | `/reviews` | Google rating + curated testimonials + fresh reviews | `reviews_hero` → `testimonials_wall` → `google_reviews_feed` → `review_cta` |
| 9 | Gallery Wall | `/gallery-wall` | The real framed art, with stories | `hero` → `gallery_pieces_grid` |
| 10 | Troublemakers | `/troublemakers` | The team, bios + fun facts | `hero` → `troublemakers_grid` |
| 11 | Neighborhood / Local Love | `/neighborhood` | Local businesses they support (community + SEO) | `hero` → `local_businesses_grid` → `cta` |
| — | Privacy | `/privacy` | Privacy policy (forms/newsletter/analytics) | static legal content |
| — | Accessibility | `/accessibility` | Accessibility statement + contact | static legal content |
| — | Admin | `/admin/*` | Auth-gated CMS (not in sitemap, noindex) | see CMS.md |

## Navigation

Primary nav: Home, Menu, About, Events, Location, Reviews, plus a "More" grouping for Gallery Wall, Troublemakers, Neighborhood, Community, Contact. A persistent **Order Now** button (SpotOn deep link) sits in the header on every page. Footer links: all pages + Privacy, Accessibility, Instagram, newsletter.

## Concept-swappable home

The Home hero swaps between `gallery_wall` (lead), `warm_storefront`, and `cozy_editorial` via `content_blocks.homepage_concept` so the client can review all three and lock one in. See DESIGN.md.

## SEO per page

Each page's `<title>` + meta description come from the `pages` table (editable) with seed defaults. `LocalBusiness` JSON-LD on Home + Location. All public pages in `sitemap.xml`; `/admin` is noindex.
