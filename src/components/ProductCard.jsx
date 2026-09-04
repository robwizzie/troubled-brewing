import { useState } from 'react';
import { CoffeeCup, Beans, Hare } from './Motifs.jsx';
import { productImageSources } from '../lib/productImage.js';
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
   because the drop-in file may simply not exist yet. */

const FRAME_STYLES = ['gilt-thin', 'black-flat', 'bronze-carved', 'gold-botanical', 'black-mat', 'gold-tapestry'];
const MOTIFS = [CoffeeCup, Beans, Hare];

export function ProductArt({ item, index = 0, eager = false }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const sources = productImageSources(item);
  const src = sources[srcIdx];
  if (!src) {
    const Motif = MOTIFS[index % MOTIFS.length];
    return (
      <span className="product__motif" aria-hidden="true">
        <Motif size={54} color="var(--color-yellow-deep)" />
      </span>
    );
  }
  return (
    <img
      className="gw-frame__img"
      src={src}
      alt={item.name}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setSrcIdx((i) => i + 1)}
    />
  );
}

export default function ProductCard({ item, index = 0, eager = false }) {
  const flags = item.dietary_flags || [];
  return (
    <article className="product">
      <span
        className={`gw-frame__art gw-frame__art--${FRAME_STYLES[index % FRAME_STYLES.length]} product__frame`}
        style={{ '--ar': '16 / 10', '--tint': 'var(--color-paper)' }}
      >
        <ProductArt item={item} index={index} eager={eager} />
        <h3 className="brass-plate brass-plate--pin">{item.name}</h3>
      </span>
      <div className="product__body">
        {item.description && <p className="product__desc">{item.description}</p>}
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
