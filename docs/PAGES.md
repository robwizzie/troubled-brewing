# Pages

Every public page is **section-composed** (see CMS.md) so the owner can rearrange and edit it. Each is seeded with sensible default sections. Routing uses React Router with a GitHub Pages SPA fallback (see DEPLOYMENT.md).

| # | Page | Route | Purpose | Default seeded sections |
|---|---|---|---|---|
| 1 | Home | `/` | First impression + funnel to Order | `immersive_gallery_hero` by default (or chosen concept; a real photo of the room, the live open/closed chalkboard, the owner-editable **Today's Special** note, and the salon hang of framed photographs — no generated artwork) → `featured_drink` → `hours` strip → `cta` (Order) → La Colombe `rich_text` → community teaser → `instagram` → `announcement` (if set) → `newsletter` |
| 2 | Menu | `/menu` | Browse the menu, order | `menu_block` (category-tabbed, dietary filters) → `cta` (Order on SpotOn) |
| 3 | About | `/about` | Tom & Cat's story, La Colombe, why local | `photo_hero` (the room) → `photo_story` (Tom & Cat, front door) → `pull_quote` (a real Google review) → `photo_mosaic` strip (what we pour: La Colombe / Metolius + drink photos) → `photo_story` (why local) → `photo_mosaic` salon (the room) → `cta` with photo (visit / order) |
| 4 | Events & Community | `/events` | Upcoming events, the board, host-an-event | `photo_hero` full → `events_list` (posters with date blocks; past events with photos as a wall; photo empty state) → `community_board` → `cta` with photo (host an event → catering) → `rich_text` (loyalty) → `instagram` |
| 5 | Hours & Location | `/location` | Find us first, then live hours, parking, contact | `photo_hero` full (storefront: "Look for the black door at 514") → `visit_panel` (**Find us**: map + live hours, today highlighted) → `rich_text` note (parking) → `photo_story` (Station Ave → Local Love) → `photo_story` (step inside: the counter) → `cta` with photo (order ahead) |
| 6 | Contact | `/contact` | General + catering inquiry forms | `rich_text` (intro) → contact form → catering form (→ `submissions`) |
| ~~7~~ | ~~Community~~ | ~~`/community`~~ | **Retired** — folded into Events; the route redirects there | — |
| 8 | Reviews | `/reviews` | Google rating + curated testimonials + fresh reviews | `reviews_hero` → `testimonials_wall` → `google_reviews_feed` → `review_cta` |
| 9 | Gallery Wall | `/gallery-wall` | The real framed art, with stories | `gallery_wall_room` (the shop's photograph of the wall, every frame in it clickable — choosing one pans and magnifies the photo under a spotlight and raises a card with the credits and story) → `gallery_pieces_grid` (the same collection as a catalogue) |
| 10 | Troublemakers | `/troublemakers` | The team, bios + fun facts | `photo_hero` (behind the counter) → `troublemakers_grid` (polaroids) → `pull_quote` (a real review about the staff) → `cta` with photo |
| 11 | Neighborhood / Local Love | `/neighborhood` | Local businesses they support (community + SEO) | `hero` → `local_businesses_grid` → `cta` |
| 12 | TB Timeline | `/timeline` | Scrollable timeline of TB milestones (opening day, anniversaries, launches) | `photo_hero` (the gallery wall) → `timeline_grid` (string of frames, year tags) → `cta` with photo |
| 13 | Gift Cards | `/gift-cards` | "Give someone Trouble": buy a SpotOn e-gift card | `gift_cards` (hero line + drawn gift card and the top-hat fox, "Buy an e-gift card" → SpotOn in a new tab, how-it-works line, four occasion cards → the same link) |
| 14 | Past Boards | `/chalkboard` | "What was on the board last fall?" | Not CMS sections: `ChalkboardPage.jsx` lists the public `chalkboard_history` boards by month (≥2, else a short note) and opens the `PastBoards` flip-through; also opened from **See past boards** under the homepage chalkboard |
| — | Privacy | `/privacy` | Privacy policy (forms/newsletter/analytics) | static legal content |
| — | Accessibility | `/accessibility` | Accessibility statement + contact | static legal content |
| — | Admin | `/admin/*` | Auth-gated CMS (not in sitemap, noindex) | see CMS.md |

## Navigation

Primary nav: Home, Menu, About, Events, Location, Reviews, plus a "More" grouping for Gallery Wall, Troublemakers, **Our Story So Far (Timeline)**, Neighborhood, Gift Cards, Contact. (**/community was retired** — its events list duplicated /events, and its board, loyalty note and Instagram strip moved there; the route stays as a redirect to /events.) A persistent **Order Now** button (SpotOn deep link) sits in the header on every page. Footer links: all pages + Privacy, Accessibility, **social links** (Instagram, Facebook, TikTok, X, YouTube — owner-managed), newsletter. Social links also appear on the contact page.

## Concept-swappable home

The Home hero swaps between `immersive_gallery` (lead/default), `gallery_wall`, `warm_storefront`, `cozy_editorial`, `modern_coffee`, and the five real-photo looks — `tagged_wall`, `closer_look`, `scrapbook`, `wall_tour`, `pastry_case` — via `content_blocks.homepage_concept` so the client can review them and lock one in. **Preview any of them without saving: `/?concept=<name>`** — the preview carries a pill bar at the bottom that flips between every look. See DESIGN.md.

## SEO per page

Each page's `<title>` + meta description come from the `pages` table (editable), defaulting to `src/lib/seo.js`, which also sets each page's OG card (`public/og/*.jpg`, regenerate with `python3 scripts/generate-og-images.py`). Every page carries CafeOrCoffeeShop + WebPage + BreadcrumbList JSON-LD (WebSite on Home, Menu on /menu, Event on /events). The build prerenders each public route to static HTML and generates `sitemap.xml` + `robots.txt`; `/admin`, previews and the 404 are noindex.
