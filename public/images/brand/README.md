# Brand images — drop your files here

Put the files below in this folder (`public/images/brand/`) using these **exact
names** (all lowercase). They appear on the site automatically — until a file
exists you see a tasteful fallback, so nothing ever looks broken.

| File name | What it is | Where it shows |
|---|---|---|
| `logo-primary.png` | Primary logo — the **TROUBLE BREWING** wordmark | Navbar brand + the big footer wordmark |
| `logo-secondary.png` | Secondary logo | Reserved (tell us where you want it) |
| `logo-fox.png` | Primary logo **with the fox** (the round badge) | Reserved / optional |
| `fox-mascot.png` | The standing **dapper top-hat fox** (line art) | Easter egg beside the navbar logo |
| `fox-head.png` | The **gold fox-head sculpture** photo | Tucked into the Gallery Wall on the homepage |
| `footer-banner.png` | The **fox emerging from coffee** banner (wide) | Top band of the footer |

## Backgrounds — you do NOT have to pre-remove the white box
- **Logos** (`logo-*`): a plain **white background is fine**. The nav and footer
  sit on cream and use CSS `mix-blend-mode: multiply`, which makes the white
  disappear so only the artwork shows. Transparent PNG/SVG is still the gold
  standard (sharpest, works anywhere) — use it if it's easy, but white works.
- **Fox + banner** (`fox-*`, `footer-banner`): please **export transparent**
  where possible. `fox-head.png` especially must be transparent (it sits on the
  green wall). `footer-banner.png` can keep its own dark→cream artwork.

## Sizes
- Logos ~600–1200px wide; `fox-head.png` ~600–900px tall; `fox-mascot.png`
  ~600–1000px tall; `footer-banner.png` wide (~1600–2400px). Bigger is fine —
  everything is scaled down in CSS.

## Gallery Wall frame photos
Per-frame photos (latte, pastry, etc.) are added in the admin panel:
**Pages → Home → Gallery Wall hero → each frame → Image** — not in this folder.
