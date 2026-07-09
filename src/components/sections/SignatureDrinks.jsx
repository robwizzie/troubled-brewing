import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Reveal from '../Reveal.jsx';
import { CoffeeCup, Beans, Hare } from '../Motifs.jsx';
import { asset } from '../../lib/config.js';
import { getMenu } from '../../lib/menuService.js';

/* A teaser of a few signature drinks to pull people toward the full menu.
   Pulls live from the menu (menuService). `data.items` can name specific drinks;
   otherwise it features the first few "specialty" drinks. Each drink hangs in
   its own little vintage frame (no two alike, like the wall) with the name on a
   brass plate. Photo resolution order: the menu item's image_url, then the
   drop-in file public/images/drinks/<name-slug>.jpg, then a varied motif. */

const FRAME_STYLES = ['gilt-thin', 'black-flat', 'bronze-carved'];
const MOTIFS = [
  (props) => <CoffeeCup {...props} />,
  (props) => <Beans {...props} />,
  (props) => <Hare {...props} />,
];

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function DrinkArt({ drink, index }) {
  const [srcIdx, setSrcIdx] = useState(0);
  const sources = [drink.image_url, asset(`images/drinks/${slugify(drink.name)}.jpg`)].filter(Boolean);
  const src = sources[srcIdx];
  if (!src) {
    const Motif = MOTIFS[index % MOTIFS.length];
    return <Motif size={54} color="var(--color-yellow-deep)" />;
  }
  return <img className="gw-frame__img" src={src} alt={drink.name} loading="lazy" onError={() => setSrcIdx((i) => i + 1)} />;
}

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
              {d && (
                <span className={`gw-frame__art gw-frame__art--${FRAME_STYLES[i % FRAME_STYLES.length]} sigdrink__frame`} style={{ '--ar': '16 / 10', '--tint': 'var(--color-paper)' }}>
                  <DrinkArt drink={d} index={i} />
                  <h3 className="brass-plate brass-plate--pin">{d.name}</h3>
                </span>
              )}
              {d && (
                <div className="sigdrink__body">
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
