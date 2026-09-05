# Gallery Wall photos — drop your picks here

Save your chosen photos in **this folder** (`public/images/wall/`) using these
**exact filenames** (all lowercase, `.jpg`). Each frame on the homepage gallery
wall picks up its file automatically. Until a file exists you just see the
tasteful labelled "poster" — nothing ever looks broken.

| Filename | Frame (shape + vintage style) | What photo to use |
|---|---|---|
| `order-menu.jpg` | **Order / Menu** — tall portrait, grand carved gold | A signature **iced drink** shot — the pink→red ombre refresher in the branded *Trouble Brewing* glass, or the Banana-Split iced coffee (DRINKS). Vertical. |
| `troublemakers.jpg` | **The Troublemakers** — square, black + white mat (with a layered second frame) | A **barista at work** — the latte-art pour / steaming milk at the espresso bar (DRINKS). Centered. |
| `gallery-wall.jpg` | **The Gallery Wall** — tall portrait, woven gold tapestry | A **portrait shot of the real green gallery wall** of frames (INTERIOR). Vertical. |
| `whats-on.jpg` | **Events** — tall **oval**, black Victorian | The **cookie dipped into the latte** in the yellow cup (DRINKS). Subject centered. |
| `our-story-so-far.jpg` | **The Journey** — wide landscape, antique carved bronze | A **wide interior** — the room with tin ceiling + plants, or the storefront / floor logo (INTERIOR). Horizontal. |
| `local-love.jpg` | **Local Love** — wide landscape, gold + cream mat (was an oval — a rectangle shows MORE of this photo, so no re-crop needed) | **Two people toasting** with the dark branded mugs (DRINKS). Subjects centered. |
| `reviews.jpg` | **Reviews** — **circle**, gold specimen oval on a cream ground | **Latte-art rosetta, top-down** in a dark cup (DRINKS). Subject centered. |
| `our-story.jpg` | **Our Story** — wide landscape, thin brass on a hanging chain | The **brass condiment station w/ dried flowers**, or the **espresso machine** pulling a shot (INTERIOR). Horizontal. |

## Tips
- **Shape matters:** portraits → vertical photos; landscapes → horizontal; the
  **ovals + circle crop the edges**, so keep the subject **centered**.
- The frame's **label sits on a little engraved brass nameplate** at the bottom,
  so busy photos are fine — you don't need empty space in the shot.
- Export as **JPG**, roughly **1000–1600px** on the long edge (bigger is fine;
  it's scaled down). If you only have a PNG, save it as `.jpg` anyway — or tell
  me and I'll switch that frame's extension.

## The two little side pieces (next to the welcome sign)
These are **decorative photos** — no label, and they are NOT clickable links.

| Filename | Side piece (shape) | What photo to use |
|---|---|---|
| `flank-coffee.jpg` | Left **oval** | A nice **coffee** close-up — a latte-art cup or espresso (DRINKS). Subject centered. |
| `flank-food.jpg` | Right tall rectangle | A nice **food** close-up — a pastry/scone or a plated bite (FOOD). |

Until you add these two, the spots show a little drawn coffee-cup / beans icon.
They only appear on wider desktop screens (hidden on tablet/phone).

Note: the **Events** frame still uses `whats-on.jpg` and **The Journey** frame
still uses `our-story-so-far.jpg` — only the on-screen labels changed, so you do
**not** need to rename those files.

## The Immersive Gallery scene (`immersive-scene.jpg`)

The homepage uses one **café scene** as its canvas — all lettering, frame
labels, the chalkboard, notes and the signup panel are live HTML drawn over it,
so the copy stays editable and scales with the image.

**The pictures in its frames are yours.** The scene was drawn with placeholder
artwork in the frames; the site hangs your own photographs over them, one frame
at a time as you add them. The eight photos listed above are what's in there
now, and every one of them is editable in the admin under **Edit your site →
the hero → "The pictures on your wall"** — swap the photo, rename the label,
point it somewhere else, or change its frame. Uploads there win over the files
in this folder.

- The file here is **`immersive-scene.jpg`**, **1536×1024** (3:2). Export a new
  one from the same composition if the artwork is refreshed.
- If the scene is ever **re-generated with the frames moved**, both the hotspot
  boxes and the measured picture windows in `src/lib/wallPieces.js`
  (`x/y/w/h` and `art`) need re-measuring to match.
- The frame still waiting on a photo is **Visit Us**. Save a storefront /
  "find us" shot here as **`location.jpg`** (landscape, subject centred) and it
  hangs like the rest. Until then it shows the scene's own painted picture on
  desktop, and a little chalk address sign on a phone.
- Under 1020px the scene becomes a backdrop banner and the wall **re-hangs
  itself below it** as a salon hang of these same photographs — every
  destination a real framed picture with a brass nameplate. So these files are
  what phone visitors actually see.
- The scene file is the **largest asset on the site** and every phone downloads
  it. When you re-export the artwork, keep it around **1536px** on the long edge
  and aim for **under ~400 KB** — the current file is ~2.4 MB, which is the one
  real drag on mobile load time.
