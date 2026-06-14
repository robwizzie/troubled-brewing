# Design — Look & Feel

> The client's official look & feel notes are still pending (TODO item #11). This doc captures the agreed *direction* and the token architecture so the final palette/fonts drop in by editing `src/styles/tokens.css` only — never by hunting through components.

## Direction: whimsical, eclectic, warm

The site should feel like **walking into the shop**: green walls, a pressed-tin ceiling, warm wood, and a dense wall of mismatched framed art. Vintage-meets-playful. Independent, local, a little cheeky (the brand *is* "Trouble" / "Troublemakers"). Tasteful motion, never gimmicky.

## Palette (placeholder, pulled from the real space)

Defined as design tokens in `tokens.css`. Refine when client notes arrive.

| Token | Value | Use |
|---|---|---|
| `--color-sage` | `#7c8a5b` | Primary — the green walls |
| `--color-sage-deep` | `#5c6a42` | Hover/active green |
| `--color-wood` | `#7a5230` | Warm wood brown |
| `--color-cream` | `#f6efe1` | Page background, soft |
| `--color-ink` | `#2b2520` | Body text, near-black |
| `--color-brass` | `#b08436` | Brass/gold accent (frames, CTAs) |
| `--color-brass-bright`| `#caa24e` | Accent hover |
| `--color-frame` | `#1c1814` | Black picture frames |
| `--color-paper` | `#fffdf8` | Card surfaces |

Semantic aliases (`--color-bg`, `--color-text`, `--color-primary`, `--color-accent`, `--color-surface`) point at the palette so the whole theme reskins from a handful of lines.

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

1. **Gallery Wall** *(lead / client favorite)* — interactive framed-products hero. Memorable, unlike any template.
2. **Warm Storefront** — photography-led hero, big inviting shot of the space, hours-today + Order CTA. Lets the room sell itself.
3. **Cozy Editorial** — magazine layout, serif headlines, featured drink, a short "why we exist," soft scrolling rhythm.

## Accessibility (non-negotiable)

WCAG AA: semantic headings, alt text on all images, visible focus states, skip-to-content link, AA contrast on text, `prefers-reduced-motion` honored. Target Lighthouse > 90 mobile.

## Token architecture

All theme values live in `:root` in `src/styles/tokens.css` (color, type, spacing scale, radius, shadow, frame styles, motion timings). Components reference tokens only. This is how the client's final direction applies cleanly later.
