import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getContentBlock } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { asset } from '../../lib/config.js';
import { SkeletonBlock } from '../Skeleton.jsx';
import { CoffeeCup } from '../Motifs.jsx';

/* "This Week's Trouble" featured drink, edited in admin Quick Blocks. The photo
   hangs in a gold specimen oval on a patch of the shop's green wall — the
   newest piece on the gallery. Photo resolution order: the admin-set image_url,
   then the drop-in file public/images/drinks/featured.jpg, then the drawn cup
   (so the frame never sits empty). */
export default function FeaturedDrink({ data = {} }) {
  const { heading = "This Week's Trouble" } = data;
  const [drink, setDrink] = useState(undefined);
  const [srcIdx, setSrcIdx] = useState(0);

  const version = useDataVersion('content_blocks');
  useEffect(() => {
    let alive = true;
    getContentBlock('featured_drink').then((d) => alive && setDrink(d));
    return () => { alive = false; };
  }, [version]);

  const sources = [drink?.image_url, asset('images/drinks/featured.jpg')].filter(Boolean);
  const src = sources[srcIdx];

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <div className="featured">
          <div className="featured__media">
            {drink === undefined ? (
              <SkeletonBlock height={280} />
            ) : (
              <span className="gw-frame__art gw-frame__art--oval-gilt featured__frame" style={{ '--ar': '1 / 1', '--tint': '#fbf7ec' }}>
                {src ? (
                  <img className="gw-frame__img" src={src} alt={drink?.name || 'Featured drink'} loading="lazy" onError={() => setSrcIdx((i) => i + 1)} />
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
            {drink?.price && <p className="featured__price">${Number(drink.price).toFixed(2)}</p>}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
