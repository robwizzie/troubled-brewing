# Pages

Every public page is **section-composed** (see CMS.md) so the owner can rearrange and edit it. Each is seeded with sensible default sections. Routing uses React Router with a GitHub Pages SPA fallback (see DEPLOYMENT.md).

| # | Page | Route | Purpose | Default seeded sections |
|---|---|---|---|---|
| 1 | Home | `/` | First impression + funnel to Order | `immersive_gallery_hero` by default (or chosen concept; a real photo of the room, the live open/closed chalkboard, the owner-editable **Today's Special** note, and the salon hang of framed photographs — no generated artwork) → `featured_drink` → `hours` strip → `cta` (Order) → La Colombe `rich_text` → community teaser → `instagram` → `announcement` (if set) → `newsletter` |
| 2 | Menu | `/menu` | Browse the menu, order | `menu_block` (category-tabbed, dietary filters) → `cta` (Order on SpotOn) |
| 3 | About | `/about` | Tom & Cat's story, La Colombe, why local | `hero` → `rich_text` (story) → `rich_text` (La Colombe, factual) → `image`/`gallery` |
| 4 | Events & Community | `/events` | Upcoming events, the board, host-an-event | `hero` → `events_list` → `community_board` → `cta` (host an event → catering) → `rich_text` (loyalty) → `instagram` |
| 5 | Hours & Location | `/location` | Find us first, then live hours, parking, contact | `hero` → `map` (**Find us**) → `hours` → `rich_text` (parking) → `cta` (call) |
| 6 | Contact | `/contact` | General + catering inquiry forms | `rich_text` (intro) → contact form → catering form (→ `submissions`) |
| ~~7~~ | ~~Community~~ | ~~`/community`~~ | **Retired** — folded into Events; the route redirects there | — |
| 8 | Reviews | `/reviews` | Google rating + curated testimonials + fresh reviews | `reviews_hero` → `testimonials_wall` → `google_reviews_feed` → `review_cta` |
| 9 | Gallery Wall | `/gallery-wall` | The real framed art, with stories | `hero` → `gallery_pieces_grid` |
| 10 | Troublemakers | `/troublemakers` | The team, bios + fun facts | `hero` → `troublemakers_grid` |
| 11 | Neighborhood / Local Love | `/neighborhood` | Local businesses they support (community + SEO) | `hero` → `local_businesses_grid` → `cta` |
| 12 | TB Timeline | `/timeline` | Scrollable timeline of TB milestones (opening day, anniversaries, launches) | `hero` → `timeline_grid` |
| — | Privacy | `/privacy` | Privacy policy (forms/newsletter/analytics) | static legal content |
| — | Accessibility | `/accessibility` | Accessibility statement + contact | static legal content |
| — | Admin | `/admin/*` | Auth-gated CMS (not in sitemap, noindex) | see CMS.md |

## Navigation

Primary nav: Home, Menu, About, Events, Location, Reviews, plus a "More" grouping for Gallery Wall, Troublemakers, **Our Story So Far (Timeline)**, Neighborhood, Contact. (**/community was retired** — its events list duplicated /events, and its board, loyalty note and Instagram strip moved there; the route stays as a redirect to /events.) A persistent **Order Now** button (SpotOn deep link) sits in the header on every page. Footer links: all pages + Privacy, Accessibility, **social links** (Instagram, Facebook, TikTok, X, YouTube — owner-managed), newsletter. Social links also appear on the contact page.

## Concept-swappable home

The Home hero swaps between `immersive_gallery` (lead/default), `gallery_wall`, `warm_storefront`, `cozy_editorial`, and `modern_coffee` via `content_blocks.homepage_concept` so the client can review them and lock one in. See DESIGN.md.

## SEO per page

Each page's `<title>` + meta description come from the `pages` table (editable) with seed defaults. `LocalBusiness` JSON-LD on Home + Location. All public pages in `sitemap.xml`; `/admin` is noindex.
