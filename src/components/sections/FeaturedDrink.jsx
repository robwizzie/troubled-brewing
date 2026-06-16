import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getContentBlock } from '../../lib/dataService.js';
import { SkeletonBlock } from '../Skeleton.jsx';
import { Steam } from '../Motifs.jsx';

/* "This Week's Trouble" featured drink, edited in admin Quick Blocks. */
export default function FeaturedDrink({ data = {} }) {
  const { heading = "This Week's Trouble" } = data;
  const [drink, setDrink] = useState(undefined);

  useEffect(() => {
    let alive = true;
    getContentBlock('featured_drink').then((d) => alive && setDrink(d));
    return () => { alive = false; };
  }, []);

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <div className="featured">
          <div className="featured__media">
            {drink === undefined ? (
              <SkeletonBlock height={280} />
            ) : drink?.image_url ? (
              <img src={drink.image_url} alt={drink.name || 'Featured drink'} loading="lazy" />
            ) : (
              <div className="featured__placeholder" aria-hidden="true">☕</div>
            )}
          </div>
          <div className="featured__body">
            <span style={{ color: 'var(--color-yellow-deep)', display: 'inline-block' }}><Steam /></span>
            <p className="eyebrow">{heading}</p>
            <h2>{drink?.name || 'Banana Split Coffee'}</h2>
            <p style={{ color: 'var(--color-text-soft)' }}>{drink?.description}</p>
            {drink?.price && <p className="featured__price">${Number(drink.price).toFixed(2)}</p>}
          </div>
        </div>
      </div>
    </Reveal>
  );
}
