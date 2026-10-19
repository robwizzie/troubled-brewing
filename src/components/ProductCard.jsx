import { useEffect, useRef, useState } from 'react';
import { CoffeeCup, Beans, Hare } from './Motifs.jsx';
import { productImageSources, isCutout, slugifyDrink } from '../lib/productImage.js';
import { DIETARY_LABELS } from '../lib/menuService.js';

/* ONE product card, shared by the homepage "Signature sips" teaser and the
   Menu page's card layout — so a drink looks the same wherever a visitor meets
   it, and a photo added once in Menu Manager shows up in both places without
   anyone touching code. Before this, the two surfaces drew menu items with
   different markup and different photo rules, so the homepage could show art
   the menu page didn't have.

   Each product hangs in its own little vintage frame from the shared wall
   vocabulary (`.gw-frame__art--*`), with the name on a brass plate — the same
   moldings as the gallery wall, so the drinks read as part of the room.

   Photos resolve through src/lib/productImage.js (the item's own image, then
   the drop-in file), and fall back to a drawn motif — never a broken image,
   never an empty grey box. `onError` walks the list rather than giving up,
   because the drop-in file may simply not exist yet.

   CUTOUTS (a photo with its background removed — see isCutout) get a stage
   instead of a crop: a warm lit backdrop, a contact shadow on the "table",
   the whole item shown, and a little life — it rises into place the first
   time it scrolls into view (once it has actually loaded, so nothing
   animates an empty frame), then keeps gently bobbing and swaying on its
   own tempo — nothing reacts to the pointer. All of that motion is CSS and
   switches off under prefers-reduced-motion. */

const FRAME_STYLES = ['gilt-thin', 'black-flat', 'bronze-carved', 'gold-botanical', 'black-mat', 'gold-tapestry'];
/* the matted styles shrink the picture inside a wide mat — right for a
   photograph, but it leaves a cutout small and adrift, so cutouts hang in the
   full-bleed moldings only */
const CUTOUT_FRAMES = ['gilt-thin', 'black-flat', 'bronze-carved', 'gold-tapestry'];
/* and a slightly taller window (4:3, not 16:10) so a tall iced drink isn't
   dwarfed by the sandwiches beside it */
const MOTIFS = [CoffeeCup, Beans, Hare];

export function ProductArt({ item, index = 0, eager = false }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const sources = productImageSources(item);
  const src = sources[srcIdx];
  // a cached image can finish before React attaches onLoad — catch it here
  const imgRef = (el) => { if (el && el.complete && el.naturalWidth > 0 && !loaded) setLoaded(true); };
  if (!src) {
    const Motif = MOTIFS[index % MOTIFS.length];
    return (
      <span className="product__motif" aria-hidden="true">
        <Motif size={54} color="var(--color-yellow-deep)" />
      </span>
    );
  }
  const cutout = isCutout(src);
  return (
    <img
      ref={imgRef}
      className={`gw-frame__img${cutout ? ' product__cutout' : ''}${loaded ? ' is-loaded' : ''}`}
      src={src}
      alt={item.name}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => { setLoaded(false); setSrcIdx((i) => i + 1); }}
    />
  );
}

/* true once the card has been on screen — drives the one-time entrance */
function useSeen() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } },
      { threshold: 0.2, rootMargin: '0px 0px -30px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

/* `plate`: the name on a brass plate pinned to the frame (the homepage
   teaser, where the frame IS the picture) or, with plate={false}, printed
   above the description so the photo stays clear — the menu, where the
   photo is the thing people came to look at. */
export default function ProductCard({ item, index = 0, eager = false, plate = true }) {
  const flags = item.dietary_flags || [];
  const cutout = isCutout(productImageSources(item)[0]);
  const [ref, seen] = useSeen();
  const frames = cutout ? CUTOUT_FRAMES : FRAME_STYLES;
  return (
    <article
      ref={ref}
      id={item.name ? `item-${slugifyDrink(item.name)}` : undefined}
      className={`product${cutout ? ' product--cutout' : ''}${seen ? ' is-in' : ''}`}
      style={cutout ? { '--i': index % 8 } : undefined}
    >
      <span
        className={`gw-frame__art gw-frame__art--${frames[index % frames.length]} product__frame`}
        style={{ '--ar': cutout ? '4 / 3' : '16 / 10', '--tint': 'var(--color-paper)' }}
      >
        <ProductArt item={item} index={index} eager={eager} />
        {plate && <h3 className="brass-plate brass-plate--pin">{item.name}</h3>}
      </span>
      <div className="product__body">
        {!plate && <h4 className="product__name">{item.name}</h4>}
        {/* rendered even when empty — see .product__desc, it's what bottom-aligns
            the price line across a row of cards */}
        <p className="product__desc">{item.description || ''}</p>
        <p className="product__foot">
          {item.price != null && <span className="product__price">${Number(item.price).toFixed(2)}</span>}
          {flags.length > 0 && (
            <span className="product__flags">
              {flags.map((f) => (
                <span key={f} className="menu-item__flag" title={f}>{DIETARY_LABELS[f] || f}</span>
              ))}
            </span>
          )}
        </p>
      </div>
    </article>
  );
}
