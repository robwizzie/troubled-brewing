import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../Reveal.jsx';
import ProductCard from '../ProductCard.jsx';
import { getMenu, pickProducts, MENU_CATEGORY_LABELS } from '../../lib/menuService.js';
import { useDataVersion } from '../../lib/dataVersion.js';

/* A teaser of a few products to pull people toward the full menu. Everything
   it shows is the LIVE menu (menuService) — the same rows the Menu page reads
   and the same ProductCard it draws them with, so the landing page and the
   menu can never disagree about a drink's name, price, description or photo.

   The owner picks the drinks by name, or leaves it blank and the section
   features whatever is strongest in a category (Specialty by default). Photos
   resolve through ProductCard's chain: the item's own image, then the drop-in
   file, then a drawn motif — so this looks right today and looks like
   photography the moment SpotOn (or Menu Manager) has pictures. */
export default function SignatureDrinks({ data = {} }) {
  const {
    heading = 'Signature sips',
    subheading = '',
    category = 'specialty',
    count = 3,
    items,
    button_label: buttonLabel = 'See the full menu',
    button_url: buttonUrl = '/menu',
  } = data;
  const howMany = Math.max(1, Math.min(8, Number(count) || 3));
  const [drinks, setDrinks] = useState(null);
  const version = useDataVersion('menu_items');

  useEffect(() => {
    let alive = true;
    getMenu().then((all) => {
      if (!alive) return;
      setDrinks(pickProducts(all, { names: items, category, count: howMany }));
    });
    return () => { alive = false; };
  }, [items, category, howMany, version]);

  if (drinks && drinks.length === 0) return null;

  const isInternal = buttonUrl.startsWith('/');
  // 3-up is the designed row; a bigger count wraps into a tidy auto grid
  const cols = Math.min(howMany, 3);

  return (
    <Reveal as="section" className="section section--alt">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {subheading && <p className="section-sub">{subheading}</p>}
        <div className="products" style={{ '--product-cols': cols }}>
          {(drinks || Array.from({ length: howMany })).map((d, i) =>
            d ? <ProductCard key={d.id || i} item={d} index={i} /> : <div key={i} className="product product--loading" />
          )}
        </div>
        <p className="products__cta">
          {isInternal ? (
            <Link className="btn btn--ghost btn--lg" to={buttonUrl}>{buttonLabel}</Link>
          ) : (
            <a className="btn btn--ghost btn--lg" href={buttonUrl} target="_blank" rel="noopener noreferrer">{buttonLabel}</a>
          )}
        </p>
        <p className="sr-only">Featured from our {MENU_CATEGORY_LABELS[category] || category} menu.</p>
      </div>
    </Reveal>
  );
}
