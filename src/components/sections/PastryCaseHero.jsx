import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import HoursToday from '../HoursToday.jsx';
import { asset } from '../../lib/config.js';
import { getMenu, pickProducts } from '../../lib/menuService.js';
import { useDataVersion } from '../../lib/dataVersion.js';

/* "Pastry Case" landing concept — the shop's real photograph of the counter
   (the pastry case, the hand-lettered bakery board, the TB letters) as the
   whole hero, with a chalkboard propped up beside it listing what's actually
   on: a few specialty drinks and bakes pulled from the LIVE menu (the same
   SpotOn-synced rows the Menu page reads), with their real prices. Nothing on
   the board is typed in by hand, so it's never out of date. */

/* The house favorites lead the board when they're on the menu; the rest of
   the category tops it up. Owners can name their own picks (pch_drinks). */
const HOUSE_SIPS = ['Banana Split Coffee', 'Hot Chai Latte', 'Hot Matcha Latte', 'Frozen Coffee'];
const HOUSE_BAKES = ['Scone', 'Muffin', 'Croissant', 'Caramel Apple Crumbcake'];

function board(all, names, category) {
  const named = names.map((n) => all.find((m) => m.name === n)).filter(Boolean);
  const rest = pickProducts(all.filter((m) => !named.includes(m)), { category, count: 4 });
  return [...named, ...rest.filter((m) => m.category === category)].slice(0, 4);
}

const money = (p) => (p == null || p === '' ? '' : `$${Number(p).toFixed(2)}`);

export default function PastryCaseHero({ data = {} }) {
  const {
    pch_eyebrow: eyebrow = 'Haddon Heights, NJ',
    pch_title: title = 'Fresh out of the case',
    pch_sub: sub = 'La Colombe coffee, Metolius teas, breakfast all day, and a pastry case that empties fast. Come early for the scones.',
    pch_board_title: boardTitle = 'On the board today',
    pch_photo_url: photo,
    pch_drinks: drinkNames,
    order_label: orderLabel = 'Order Now',
    pch_menu_label: menuLabel = 'Full menu',
  } = data;
  const [menuBoard, setBoard] = useState(null);
  const version = useDataVersion('menu_items');

  useEffect(() => {
    let alive = true;
    getMenu().then((all) => {
      if (!alive) return;
      const picks = Array.isArray(drinkNames) && drinkNames.length ? drinkNames : HOUSE_SIPS;
      setBoard({ drinks: board(all, picks, 'specialty'), bakes: board(all, HOUSE_BAKES, 'pastry') });
    });
    return () => { alive = false; };
  }, [version, drinkNames]);

  return (
    <section className="pch">
      <div className="pch__photo" aria-hidden="true">
        <img src={photo || asset('images/wall/our-story-so-far.jpg')} alt="" fetchpriority="high" decoding="async" />
      </div>
      <div className="container pch__inner">
        <div className="pch__copy">
          <p className="pch__eyebrow">{eyebrow}</p>
          <h1 className="pch__title">{title}</h1>
          <p className="pch__sub">{sub}</p>
          <div className="pch__cta">
            <OrderButton label={orderLabel} className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--lg pch__ghost" to="/menu">{menuLabel}</Link>
          </div>
        </div>

        <aside className="pch__board" aria-label={boardTitle}>
          <p className="pch__board-title">{boardTitle}</p>
          {menuBoard && (
            <>
              <p className="pch__board-head">Sips</p>
              <ul>
                {menuBoard.drinks.map((d) => (
                  <li key={d.id || d.name}><span>{d.name}</span><span className="pch__dots" aria-hidden="true" /><span>{money(d.price)}</span></li>
                ))}
              </ul>
              <p className="pch__board-head">From the case</p>
              <ul>
                {menuBoard.bakes.map((d) => (
                  <li key={d.id || d.name}><span>{d.name}</span><span className="pch__dots" aria-hidden="true" /><span>{money(d.price)}</span></li>
                ))}
              </ul>
            </>
          )}
          <div className="pch__board-foot"><HoursToday /></div>
        </aside>
      </div>
    </section>
  );
}
