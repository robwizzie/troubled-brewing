import { orderUrlFor, orderLabelFor } from '../lib/order.js';
import { track } from '../lib/analytics.js';

/* "Goes great with" — the staff's own drink + treat pairings
   (src/lib/pairings.js). Every item name is its order link, to its own SpotOn
   section, exactly like the menu's price list. */

function OrderName({ item, where }) {
  return (
    <a
      className="pairing__link"
      href={orderUrlFor(item)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={orderLabelFor(item)}
      onClick={() => track('order_now_click', { location: where, item: item.name })}
    >
      {item.name}
    </a>
  );
}

const credit = (p) => [p.note && `“${p.note}”`, p.by && `${p.by}’s pick`].filter(Boolean).join(' — ');

/** The small line under a drink: "Goes great with: Muffin". */
export function PairLine({ pairs }) {
  if (!pairs?.length) return null;
  const words = pairs.map(credit).filter(Boolean);
  return (
    <p className="pairline">
      <span className="pairline__lead">Goes great with:</span>{' '}
      {pairs.map((p, i) => (
        <span key={p.with.name}>
          {i > 0 && (i === pairs.length - 1 ? ' or ' : ', ')}
          <OrderName item={p.with} where="menu_pairing" />
        </span>
      ))}
      {words.length > 0 && <span className="pairline__why"> — {words.join(' · ')}</span>}
    </p>
  );
}

/** "Our pairings" — a small strip near the top of the menu (2+ pairings). */
export function PairingsStrip({ pairings }) {
  if (!pairings || pairings.length < 2) return null;
  return (
    <section className="pairstrip" aria-labelledby="pairstrip-title">
      <h3 id="pairstrip-title" className="pairstrip__title">Our pairings</h3>
      <ul className="pairstrip__list">
        {pairings.map((p) => (
          <li key={`${p.drink.name}|${p.with.name}`} className="pairstrip__item">
            <span className="pairstrip__names">
              <OrderName item={p.drink} where="menu_pairings_strip" />
              <span className="pairstrip__amp" aria-hidden="true"> + </span>
              <span className="sr-only"> goes great with </span>
              <OrderName item={p.with} where="menu_pairings_strip" />
            </span>
            {credit(p) && <span className="pairstrip__why">{credit(p)}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
