# Brand images — drop your files here

Put the files below in this folder (`public/images/brand/`) using these **exact
names** (all lowercase). They appear on the site automatically — until a file
exists, the site shows a tasteful fallback, so nothing ever looks broken.

Prefer **transparent PNG** (or SVG). Trim whitespace so they sit nicely.

| File name | What it is | Where it shows |
|---|---|---|
| `logo-primary.png` | Primary logo — the **TROUBLE BREWING** wordmark | Navbar brand (top-left) |
| `logo-secondary.png` | Secondary logo | Reserved (easy to place on request) |
| `logo-fox.png` | Primary logo **with the fox** (the round badge) | Footer brand mark |
| `fox-mascot.png` | The standing **dapper top-hat fox** (line art) | Easter eggs: beside the navbar logo + peeking in the footer |
| `fox-head.png` | The **gold fox-head sculpture** photo | Tucked into the Gallery Wall on the homepage |

## Notes
- **Sizes:** logos look best ~600–1000px wide; `fox-head.png` ~600–900px tall;
  `fox-mascot.png` ~600–1000px tall. They're scaled down in CSS, so bigger is fine.
- The footer is dark, so dark line-art logos are auto-inverted to show as
  cream/white there. If you upload a light/white version instead, tell your
  developer and we'll drop the inversion.
- **Gallery Wall frame photos** (latte, pastry, etc.) are added a different way —
  in the admin panel: **Pages → Home → Gallery Wall hero → each frame → Image.**
  Those upload to storage; they don't go in this folder.
