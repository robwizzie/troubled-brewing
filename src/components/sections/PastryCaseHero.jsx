import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import HoursToday from '../HoursToday.jsx';
import { asset } from '../../lib/config.js';
import { getMenu, pickProducts } from '../../lib/menuService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { MIN_PAST_BOARDS, isWide, photoSize, useChalkboard, useChalkboardHistory, updatedLabel } from '../../lib/chalkboard.js';
import PhotoLightbox from '../PhotoLightbox.jsx';
import PastBoards from '../PastBoards.jsx';

/* "Pastry Case" landing concept — the shop's real photograph of the counter
   (the pastry case, the hand-lettered bakery board, the TB letters) as the
   whole hero, with a chalkboard propped up beside it listing what's actually
   on: a few specialty drinks and bakes pulled from the LIVE menu (the same
   SpotOn-synced rows the Menu page reads), with their real prices. Nothing on
   the board is typed in by hand, so it's never out of date. */

/* The house favorites lead the board when they're on the menu; the rest of
   the category tops it up. Owners can name their own picks (pch_drinks). */
// real, available menu names only (getMenu() drops switched-off items, so a
// name SpotOn turns off simply falls out of the list)
const HOUSE_SIPS = ['Iced Matcha Latte', 'Hot Chai Latte', 'Hot Matcha Latte', 'Frozen Coffee'];
const HOUSE_BAKES = ['Scone', 'Muffin', 'Croissant', 'Caramel Apple Crumbcake'];

function board(all, names, category) {
  const named = names.map((n) => all.find((m) => m.name === n)).filter(Boolean);
  const rest = pickProducts(all.filter((m) => !named.includes(m)), { category, count: 4 });
  return [...named, ...rest.filter((m) => m.category === category)].slice(0, 4);
}

const money = (p) => (p == null || p === '' ? '' : `$${Number(p).toFixed(2)}`);

/* The photographed board's image. When the block carries the photo's size the
   slot is reserved at that exact shape and the photo fades in over the slate;
   an older row without a size is measured on load instead (the board stays
   invisible until then, so it never pops from one shape to another). */
function ChalkImage({ chalk, alt, onSize, onError }) {
  const known = photoSize(chalk);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef(null);
  const done = useCallback((img) => {
    if (!img) return;
    setLoaded(true);
    onSize(photoSize(img));
  }, [onSize]);
  // a cached image can finish before React attaches onLoad
  useEffect(() => {
    setLoaded(false);
    const img = ref.current;
    if (img?.complete && img.naturalWidth) done(img);
  }, [chalk.url, done]);
  return (
    <img
      ref={ref}
      className={loaded ? 'is-loaded' : undefined}
      src={chalk.url}
      alt={alt}
      width={known?.width}
      height={known?.height}
      decoding="async"
      fetchpriority="high"
      onLoad={(e) => done(e.currentTarget)}
      onError={onError}
    />
  );
}

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
    pch_chalk_max_days: chalkMaxDays,
  } = data;
  const [menuBoard, setBoard] = useState(null);
  const version = useDataVersion('menu_items');
  const { ready: chalkReady, photo: chalk } = useChalkboard({ maxAgeDays: Number(chalkMaxDays) > 0 ? Number(chalkMaxDays) : undefined });
  const [failedUrl, setFailedUrl] = useState(null);
  const [zoomed, setZoomed] = useState(false);
  const closeZoom = useCallback(() => setZoomed(false), []);
  const showPhoto = chalk && chalk.url !== failedUrl;
  // the photo's shape: from the block when it was recorded, else measured on load
  const [measured, setMeasured] = useState(null);
  const onSize = useCallback((size) => size && setMeasured({ ...size, url: chalk?.url }), [chalk?.url]);
  const size = showPhoto ? photoSize(chalk) || (measured?.url === chalk.url ? measured : null) : null;
  const wide = isWide(size);
  // "See past boards": the staff's old chalkboard photos, once there are a few
  const past = useChalkboardHistory();
  const [pastOpen, setPastOpen] = useState(false);
  const closePast = useCallback(() => setPastOpen(false), []);
  const hasPast = (past?.length || 0) >= MIN_PAST_BOARDS;
  const pastLink = hasPast && (
    <p className="pch__past-wrap">
      <button type="button" className="pch__past" onClick={() => setPastOpen(true)} aria-haspopup="dialog">See past boards</button>
    </p>
  );

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
    <section className={`pch${wide ? ' pch--wide-board' : ''}`}>
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

        {!chalkReady ? (
          // still asking whether there's a photo: hold the board's place
          // quietly instead of flashing the drawn board and then swapping
          <div className="pch__board pch__board--pending" aria-hidden="true" />
        ) : showPhoto ? (
          <aside className={`pch__board pch__board--photo${size ? ' is-ready' : ''}`} aria-label={boardTitle}>
            <button type="button" className="pch__chalk" onClick={() => setZoomed(true)} aria-label={`${boardTitle}: open the photo of our chalkboard full-size`}>
              <ChalkImage
                chalk={chalk}
                alt={chalk.caption ? `Our chalkboard today: ${chalk.caption}` : 'A photo of the chalkboard in the shop, with today\u2019s specials'}
                onSize={onSize}
                onError={() => { setFailedUrl(chalk.url); setZoomed(false); }}
              />
              <span className="pch__chalk-zoom" aria-hidden="true">Tap to read</span>
            </button>
            <div className="pch__chalk-meta">
              {chalk.caption && <p className="pch__chalk-caption">{chalk.caption}</p>}
              <p className="pch__chalk-when">{updatedLabel(chalk.updated_at)}</p>
            </div>
            <div className="pch__board-foot"><HoursToday /></div>
            {pastLink}
          </aside>
        ) : (
          <aside className="pch__board pch__board--drawn" aria-label={boardTitle}>
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
            {pastLink}
          </aside>
        )}
      </div>
      {showPhoto && zoomed && (
        <PhotoLightbox
          src={chalk.url}
          alt={chalk.caption ? `Our chalkboard today: ${chalk.caption}` : 'Our chalkboard today'}
          caption={[chalk.caption, updatedLabel(chalk.updated_at)].filter(Boolean).join(' · ')}
          onClose={closeZoom}
        />
      )}
      {hasPast && pastOpen && <PastBoards boards={past} onClose={closePast} />}
    </section>
  );
}
