import { useEffect, useMemo, useRef, useState } from 'react';
import { getMenu, MENU_CATEGORY_ORDER, MENU_CATEGORY_LABELS } from '../../lib/menuService.js';
import { isCutout } from '../../lib/productImage.js';
import { orderUrlFor, orderLabelFor } from '../../lib/order.js';
import { track } from '../../lib/analytics.js';
import { useDataVersion } from '../../lib/dataVersion.js';

/* "The shelf" — a reusable showcase of the menu's photographed items, staged
   like the shop itself: a long wooden shelf on the sage wall, each cutout
   standing on it and gently bobbing, a hand-lettered paper price tag swinging
   from the shelf on a bit of twine beneath it. Tap an item (or its tag) to
   order it on SpotOn (orderUrlFor — the store's order page until SpotOn has
   per-item links), in a new tab, tracked as an order_now_click.

   Everything comes from the LIVE menu (menuService), so a photo added in Menu
   Manager appears here on its own. By default it shows every item with a
   CUTOUT photo (see isCutout); the owner can instead name the items, limit it
   to some categories, or let ordinary photos in too.

   Motion: one orchestrated entrance (the items rise onto the shelf in turn
   the first time the shelf scrolls into view), then a quiet idle bob and tag
   sway. Nothing reacts to the pointer. All of it is CSS and switches off
   under prefers-reduced-motion. On a phone the shelf swipes sideways, with
   the next item peeking in; on a desktop there are arrow buttons too. */
export default function FoodShowcase({ data = {} }) {
  const {
    heading = 'Fresh off the counter',
    subheading = 'Tap anything to order it on SpotOn.',
    items: names,
    categories,
    include_photos: includePhotos = false,
    hide_filters: hideFilters = false,
    hide_prices: hidePrices = false,
  } = data;
  const showFilters = !hideFilters;
  const showPrices = !hidePrices;
  const [all, setAll] = useState(null);
  const [cat, setCat] = useState('all');
  const version = useDataVersion('menu_items');

  useEffect(() => {
    let alive = true;
    getMenu().then((m) => alive && setAll(m));
    return () => { alive = false; };
  }, [version]);

  const shelf = useMemo(() => {
    if (!all) return null;
    const allowed = Array.isArray(categories) && categories.length ? categories : MENU_CATEGORY_ORDER;
    const pictured = (m) => m.image_url && (includePhotos || isCutout(m.image_url));
    if (Array.isArray(names) && names.length) {
      return names.map((n) => all.find((m) => m.name === n)).filter((m) => m && m.image_url);
    }
    // grouped in menu order, so the shelf reads like the menu: coffee, tea, food, bakery
    return allowed.flatMap((c) => all.filter((m) => m.category === c && pictured(m)));
  }, [all, names, categories, includePhotos]);

  const cats = useMemo(() => [...new Set((shelf || []).map((m) => m.category))], [shelf]);
  const shown = cat === 'all' ? shelf : (shelf || []).filter((m) => m.category === cat);

  const [wallRef, seen] = useSeen();
  const rowRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const measure = () => {
    const el = rowRef.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  useEffect(() => {
    measure();
    const el = rowRef.current;
    if (!el) return undefined;
    el.scrollLeft = 0;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [shown?.length, cat]);
  const nudge = (dir) => {
    const el = rowRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  if (shelf && shelf.length === 0) return null;

  return (
    <section className="section showcase" aria-labelledby="showcase-title">
      <div className="container showcase__head">
        <div>
          <h2 className="showcase__title" id="showcase-title">{heading}</h2>
          {subheading && <p className="showcase__sub">{subheading}</p>}
        </div>
        <div className="showcase__tools">
        {showFilters && cats.length > 1 && (
          <div className="showcase__filters" role="group" aria-label="Show on the shelf">
            {['all', ...cats].map((c) => (
              <button
                key={c}
                type="button"
                className={`showcase__filter${cat === c ? ' is-on' : ''}`}
                aria-pressed={cat === c}
                onClick={() => setCat(c)}
              >
                {c === 'all' ? 'Everything' : MENU_CATEGORY_LABELS[c] || c}
              </button>
            ))}
          </div>
        )}
          {!(edges.start && edges.end) && (
          <div className="showcase__nudges">
            <button type="button" className="showcase__nudge" onClick={() => nudge(-1)} disabled={edges.start} aria-label="Scroll the shelf left">‹</button>
            <button type="button" className="showcase__nudge" onClick={() => nudge(1)} disabled={edges.end} aria-label="Scroll the shelf right">›</button>
          </div>
          )}
        </div>
      </div>

      <div ref={wallRef} className={`showcase__wall${seen ? ' is-in' : ''}`}>
        <span className="showcase__ledge" aria-hidden="true" />
        <ul ref={rowRef} key={cat} className="showcase__row" onScroll={measure}>
          {(shown || Array.from({ length: 5 }, () => null)).map((m, i) =>
            m ? (
              <li key={m.id} className={`showcase__item showcase__item--${i % 2 ? 'b' : 'a'}`} style={{ '--i': i }}>
                <a
                  className="showcase__link"
                  href={orderUrlFor(m)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${orderLabelFor(m)}${showPrices && m.price != null ? `, $${Number(m.price).toFixed(2)}` : ''}`}
                  onClick={() => track('order_now_click', { location: 'food_shelf', item: m.name })}
                >
                  <span className="showcase__stage">
                    <img className="showcase__img" src={m.image_url} alt="" loading="lazy" decoding="async" />
                  </span>
                  <span className="showcase__tag" aria-hidden="true">
                    <span className="showcase__tag-name">{m.name}</span>
                    {showPrices && m.price != null && <span className="showcase__tag-price">${Number(m.price).toFixed(2)}</span>}
                  </span>
                </a>
              </li>
            ) : (
              <li key={i} className="showcase__item showcase__item--loading" aria-hidden="true" />
            )
          )}
        </ul>
      </div>
    </section>
  );
}

function useSeen() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const io = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { setSeen(true); io.disconnect(); } },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}
