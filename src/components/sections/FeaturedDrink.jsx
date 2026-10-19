import { useState } from 'react';
import Reveal from '../Reveal.jsx';
import { useFeaturedDrink } from '../../lib/featured.js';
import { asset } from '../../lib/config.js';
import { isCutout, productImageSources } from '../../lib/productImage.js';
import { SkeletonBlock } from '../Skeleton.jsx';
import { CoffeeCup } from '../Motifs.jsx';

/* "This Week's Trouble" featured drink, edited in admin Quick Blocks. The photo
   hangs in a gold specimen oval on a patch of the shop's green wall — the
   newest piece on the gallery.

   WHICH drink is decided in src/lib/featured.js: normally a real menu item
   (content_blocks.featured_drink.item), pulled live from the menu with its
   real price — and never one the shop has switched off (that falls back to an
   available specialty drink). The manual name/price only apply when no menu
   item is chosen.

   Photo resolution order:
     menu item  the block's own photo, then the item's (its image_url, then
                the drop-in public/images/drinks/<name-slug>.jpg — see
                productImage.js), then the drawn cup. The generic
                drinks/featured.jpg is NOT used here: it's a photo of one
                particular hot latte, and would mislabel any other drink.
     manual     the admin-set image_url, then drinks/featured.jpg, then the
                drawn cup (so the frame never sits empty).

   A CUTOUT photo (background removed — see isCutout) is staged in the oval
   rather than cropped by it: shown whole (contain) with breathing room and a
   soft drop shadow on the frame's warm ground. No hover effects. */
export default function FeaturedDrink({ data = {} }) {
  const { heading = "This Week's Trouble" } = data;
  const drink = useFeaturedDrink();
  const [srcIdx, setSrcIdx] = useState(0);

  const sources = drink
    ? [...new Set([drink.image_url, ...(drink.item ? productImageSources(drink.item) : [asset('images/drinks/featured.jpg')])].filter(Boolean))]
    : [];
  const src = sources[srcIdx];
  const cutout = isCutout(src);
  const price = drink?.price;
  const hasPrice = price != null && price !== '' && Number.isFinite(Number(price));

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <div className="featured">
          <div className="featured__media">
            {drink === undefined ? (
              <SkeletonBlock height={280} />
            ) : (
              <span className={`gw-frame__art gw-frame__art--oval-gilt featured__frame${cutout ? ' featured__frame--cutout' : ''}`} style={{ '--ar': '1 / 1', '--tint': '#fbf7ec' }}>
                {src ? (
                  <img
                    className={`gw-frame__img${cutout ? ' featured__cutout' : ''}`}
                    src={src}
                    alt={drink?.name || 'Featured drink'}
                    loading="lazy"
                    onError={() => setSrcIdx((i) => i + 1)}
                  />
                ) : (
                  <CoffeeCup className="featured__cup" size={104} color="var(--color-yellow-deep)" />
                )}
                {drink?.name && <span className="brass-plate brass-plate--pin">{drink.name}</span>}
              </span>
            )}
          </div>
          <div className="featured__body">
            <p className="eyebrow">{heading}</p>
            <h2>{drink?.name || 'This week’s feature'}</h2>
            {drink?.description && <p className="featured__desc">{drink.description}</p>}
            {hasPrice && <p className="featured__price">${Number(price).toFixed(2)}</p>}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
