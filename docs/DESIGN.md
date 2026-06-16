# Design — Look & Feel

> The client sent official notes + reference photos of the shop and the TB logo. This doc captures the agreed direction and the token architecture so the final/exact values drop in by editing `src/styles/tokens.css` only — never by hunting through components.

## Direction: whimsical, eclectic, warm

The site should feel like **walking into the shop**: **sage-green walls**, a white pressed-tin ceiling, a **black marble counter**, warm wood, brass animal heads (the gold bespectacled fox!), dried flowers, and a dense wall of mismatched vintage framed art. Vintage-meets-playful. Independent, local, a little cheeky (the brand *is* "Trouble" / "Troublemakers" / the dapper top-hat fox). Tasteful motion, never gimmicky.

## Official brand palette: black · green · pink · yellow

Confirmed by the client and tuned to the reference photos. **Black + green are primary/structural; pink + yellow are playful accents.** Crucial accessibility discipline (flagged to the client): body copy is near-black on cream/white; the bold colors are used for **accents, buttons, and section bands** — never small body text — so contrast stays AA.

Mapping to the real space: **green = the sage/olive wall color**, **yellow = the warm brass/gold** (gold frames, brass fox heads & cups), **pink = the soft dusty-pink accents** (tray, florals), **black = frames, counter, and the logo**.

| Token | Value (placeholder, from photos) | Use |
|---|---|---|
| `--color-green` | `#7e8c54` | Sage-olive — the shop walls; decorative fills |
| `--color-green-deep` | `#545f33` | **Primary** buttons/structure (AA with white text) |
| `--color-green-soft` | `#e7ebd6` | Soft sage section bands |
| `--color-yellow` | `#e3b53f` | Warm brass/gold **accent** (pair with black text) |
| `--color-yellow-deep` | `#a87c1c` | Accent hover / brass detail |
| `--color-pink` | `#e98fb0` | Playful dusty pink (markers, frames) |
| `--color-pink-deep` | `#b0436e` | **Accent text** (eyebrows), readable on cream; announcement bar |
| `--color-black` | `#191512` | Frames, counter, footer, logo |
| `--color-cream` | `#f7f1e4` | Page background |
| `--color-paper` | `#fffdf7` | Card surfaces |
| `--color-ink` | `#221f1a` | Body text, near-black (AA) |

Semantic aliases (`--color-bg`, `--color-text`, `--color-primary`, `--color-accent`, `--color-accent-text`, `--color-surface`, `--focus-ring`) point at the palette so the whole theme reskins from a handful of lines. Old `--color-sage/-wood/-brass/-frame` names are kept as backward-compatible aliases mapped into the new palette.

> **Exact hexes still come from the logo files.** When the TB logo zip arrives, sample the precise brand hexes into `tokens.css` and the whole site reskins cleanly.

## Logo & mascot

Two black-on-white vintage logos were provided: (1) the **"TROUBLE BREWING"** ornate letterpress wordmark with scroll flourishes, and (2) the **dapper top-hat fox** drinking coffee over the wordmark with "HADDON HEIGHTS · NJ". The fox is a recurring in-shop motif (gold fox heads, fox figurines).

- **When the logo files land:** place the proper logo on the **nav** and **footer** (and any framed branding), and derive the favicon/OG image from it. Until then the nav uses a styled Fraunces wordmark as a stand-in. Drop files in `public/` and swap `Nav.jsx`/`Footer.jsx`.
- Lean on the fox + scrollwork motifs for whimsy where tasteful.

## Type pairing

- **Display / headings:** `Fraunces` — a characterful "old-style" variable serif with optical sizing; carries the vintage-whimsy. Heavy weights for big headings.
- **Body / UI:** `Work Sans` — clean, friendly, highly legible sans.
- Loaded via Google Fonts in `index.html`. Swap by changing the `<link>` + the `--font-display` / `--font-body` tokens.

## Motion

- Gentle frame tilt on hover, soft fade/slide on scroll-in, a slight "settling" animation when the Gallery Wall loads.
- **Always** respect `prefers-reduced-motion: reduce` — disable transforms/transitions for those users. Helpers live in `tokens.css` / `motion.css`.

## The Gallery Wall concept (signature)

Two related things — don't confuse them:

1. **Gallery Wall *landing concept*** (`gallery_wall_hero` section): the homepage hero recreated as a dense arrangement of vintage frames where **each frame is a product/feature** (a latte in a gold frame, a pastry in an oval frame, events in a black frame…). Frames animate on hover and link to sections/pages. This is the lead homepage concept.
2. **Gallery Wall *page*** (`/gallery-wall`): documents the **actual** framed art on the shop's wall — each real piece gets a photo, title, and a fun backstory. Owner-editable via `gallery_pieces`.

## Landing page concepts (client picks one)

The homepage hero is swappable via `content_blocks.homepage_concept` (`gallery_wall` | `warm_storefront` | `cozy_editorial`). All three are built so the client can review and choose.

1. **Gallery Wall** *(lead — CONFIRMED by client; "other ideas welcome")* — interactive framed hero rendered **on the sage-green wall** like the real shop, frames mounted on it. Each frame links to a key page: **Menu/Order, Troublemakers, Gallery Wall, Events, Timeline, Neighborhood** (+ Reviews, About). Memorable, unlike any template. We still build all three concepts so they can compare before final lock-in.
2. **Warm Storefront** — photography-led hero, big inviting shot of the space, hours-today + Order CTA. Lets the room sell itself.
3. **Cozy Editorial** — magazine layout, serif headlines, featured drink, a short "why we exist," soft scrolling rhythm.

## Accessibility (non-negotiable)

WCAG AA: semantic headings, alt text on all images, visible focus states, skip-to-content link, AA contrast on text, `prefers-reduced-motion` honored. Target Lighthouse > 90 mobile.

## Token architecture

All theme values live in `:root` in `src/styles/tokens.css` (color, type, spacing scale, radius, shadow, frame styles, motion timings). Components reference tokens only. This is how the client's final direction applies cleanly later.
