import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Reveal from '../Reveal.jsx';
import OrderButton from '../OrderButton.jsx';
import { SkeletonCards } from '../Skeleton.jsx';
import { getMenu, groupByCategory, MENU_CATEGORY_LABELS, MENU_CATEGORY_ORDER } from '../../lib/menuService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { track } from '../../lib/analytics.js';

const DIETARY_LABELS = { 'gluten-free': 'GF', vegan: 'VG', vegetarian: 'V', 'dairy-free': 'DF' };

/* URL-hash → category tab: /menu#specials lands on the Specialty tab (the
   homepage "Current Drink Specials" link), and any exact category key works
   too (/menu#seasonal, /menu#pastry, …). */
const HASH_TO_CAT = { specials: 'specialty' };
function catFromHash(hash, allowed) {
  const key = (hash || '').replace(/^#/, '').toLowerCase();
  if (!key) return null;
  const cat = HASH_TO_CAT[key] || key;
  return allowed.includes(cat) ? cat : null;
}

/* Category-tabbed menu with dietary filters. Reads through menuService.getMenu()
   (single swap-point for a future SpotOn sync). */
export default function MenuBlock({ data = {} }) {
  const { heading = 'The Menu', categories } = data;
  const allowedCats = useMemo(() => (categories?.length ? categories : MENU_CATEGORY_ORDER), [categories]);
  const [items, setItems] = useState(null);
  const [activeCat, setActiveCat] = useState(() => catFromHash(window.location.hash, categories?.length ? categories : MENU_CATEGORY_ORDER) ?? 'all');
  const [diet, setDiet] = useState(new Set());
  const location = useLocation();
  const containerRef = useRef(null);

  const version = useDataVersion('menu_items');
  useEffect(() => {
    let alive = true;
    getMenu().then((m) => {
      if (!alive) return;
      setItems(m);
      track('menu_view');
    });
    return () => { alive = false; };
  }, [version]);

  /* Follow the hash on every navigation (arriving from the hero link, a shared
     deep link, or re-clicking while already here), then bring the menu into
     view once items exist. Double-rAF runs after ScrollToTop's own forced
     top-jump + rAF re-scroll, so this scroll wins even when the seed resolves
     instantly. */
  useEffect(() => {
    const cat = catFromHash(location.hash, allowedCats);
    if (!cat) return;
    setActiveCat(cat);
    if (items === null) return; // re-runs when items land
    let raf2;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => containerRef.current?.scrollIntoView({ block: 'start' }));
    });
    return () => { cancelAnimationFrame(raf1); if (raf2) cancelAnimationFrame(raf2); };
  }, [location.key, location.hash, items, allowedCats]);

  const dietaryOptions = useMemo(() => {
    const set = new Set();
    (items || []).forEach((i) => (i.dietary_flags || []).forEach((f) => set.add(f)));
    return [...set];
  }, [items]);

  const filtered = useMemo(() => {
    if (!items) return [];
    return items.filter((i) => {
      if (diet.size && !(i.dietary_flags || []).some((f) => diet.has(f))) return false;
      return true;
    });
  }, [items, diet]);

  const groups = groupByCategory(filtered, allowedCats);
  const visibleCats = activeCat === 'all' ? Object.keys(groups) : [activeCat].filter((c) => groups[c]);

  function toggleDiet(flag) {
    setDiet((prev) => {
      const next = new Set(prev);
      if (next.has(flag)) next.delete(flag); else next.add(flag);
      return next;
    });
  }

  return (
    <Reveal as="section" className="section">
      {/* id + scroll-margin let #specials land here below the sticky nav */}
      <div className="container" id="specials" ref={containerRef} style={{ scrollMarginTop: 'calc(var(--header-h) + 8px)' }}>
        <h2 className="section-heading">{heading}</h2>

        {/* Category tabs */}
        <div className="menu-tabs" role="tablist" aria-label="Menu categories">
          <button role="tab" aria-selected={activeCat === 'all'} className={`menu-tab ${activeCat === 'all' ? 'active' : ''}`} onClick={() => setActiveCat('all')}>
            All
          </button>
          {allowedCats.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCat === cat}
              className={`menu-tab ${activeCat === cat ? 'active' : ''}`}
              onClick={() => setActiveCat(cat)}
            >
              {MENU_CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>

        {/* Dietary filters */}
        {dietaryOptions.length > 0 && (
          <div className="menu-diet">
            <span className="menu-diet__label">Dietary:</span>
            {dietaryOptions.map((flag) => (
              <button key={flag} className={`chip ${diet.has(flag) ? 'chip--on' : ''}`} onClick={() => toggleDiet(flag)} aria-pressed={diet.has(flag)}>
                {flag}
              </button>
            ))}
          </div>
        )}

        {/* Items */}
        {items === null ? (
          <SkeletonCards count={6} height={120} />
        ) : visibleCats.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-soft)' }}>Nothing matches that filter right now.</p>
        ) : (
          visibleCats.map((cat) => (
            <div key={cat} className="menu-category">
              <h3 className="menu-category__title">{MENU_CATEGORY_LABELS[cat] || cat}</h3>
              <ul className="menu-list">
                {groups[cat].map((item) => (
                  <li key={item.id} className="menu-item">
                    {item.image_url && <img className="menu-item__img" src={item.image_url} alt="" loading="lazy" />}
                    <div className="menu-item__main">
                      <div className="menu-item__head">
                        <span className="menu-item__name">
                          {item.name}
                          {(item.dietary_flags || []).map((f) => (
                            <span key={f} className="menu-item__flag" title={f}>{DIETARY_LABELS[f] || f}</span>
                          ))}
                        </span>
                        <span className="menu-item__dots" aria-hidden="true" />
                        {item.price != null && <span className="menu-item__price">${Number(item.price).toFixed(2)}</span>}
                      </div>
                      {item.description && <p className="menu-item__desc">{item.description}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
          <OrderButton label="Order on SpotOn" className="btn btn--accent btn--lg" location="menu_block" />
        </div>
      </div>
    </Reveal>
  );
}
