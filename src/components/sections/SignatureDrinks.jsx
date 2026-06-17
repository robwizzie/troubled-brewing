import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../Reveal.jsx';
import { CoffeeCup } from '../Motifs.jsx';
import { getMenu } from '../../lib/menuService.js';

/* A teaser of a few signature drinks to pull people toward the full menu.
   Pulls live from the menu (menuService). `data.items` can name specific drinks;
   otherwise it features the first few "specialty" drinks. Each shows its photo
   when one exists, else an on-brand coffee-cup motif. */
export default function SignatureDrinks({ data = {} }) {
  const { heading = 'Signature sips', items, button_label = 'See the full menu' } = data;
  const [drinks, setDrinks] = useState(null);

  useEffect(() => {
    let alive = true;
    getMenu().then((all) => {
      if (!alive) return;
      let picks;
      if (Array.isArray(items) && items.length) {
        picks = items.map((name) => all.find((m) => m.name === name)).filter(Boolean);
      } else {
        picks = all.filter((m) => m.category === 'specialty');
      }
      setDrinks(picks.slice(0, 3));
    });
    return () => { alive = false; };
  }, [items]);

  if (drinks && drinks.length === 0) return null;

  return (
    <Reveal as="section" className="section section--alt">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        <div className="sigdrinks">
          {(drinks || Array.from({ length: 3 })).map((d, i) => (
            <article key={d?.id || i} className={`sigdrink ${d ? '' : 'sigdrink--loading'}`}>
              <div className="sigdrink__media">
                {d?.image_url ? (
                  <img src={d.image_url} alt={d.name} loading="lazy" />
                ) : (
                  <CoffeeCup size={58} color="var(--color-yellow-deep)" steam={false} />
                )}
              </div>
              {d && (
                <div className="sigdrink__body">
                  <h3 className="sigdrink__name">{d.name}</h3>
                  <p className="sigdrink__desc">{d.description}</p>
                  <p className="sigdrink__price">${Number(d.price).toFixed(2)}</p>
                </div>
              )}
            </article>
          ))}
        </div>
        <p className="sigdrinks__cta">
          <Link className="btn btn--ghost btn--lg" to="/menu">{button_label}</Link>
        </p>
      </div>
    </Reveal>
  );
}
