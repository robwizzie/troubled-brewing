import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import HoursToday from '../HoursToday.jsx';
import { asset } from '../../lib/config.js';
import { WALL_ART, WALL_IMAGE, WALL_STAGE_RATIO, REST_VIEW, viewFor } from '../../lib/galleryWall.js';

/* "Wall Tour" landing concept — the gallery after hours. The shop's REAL
   photograph of its wall hangs in a heavy gilt frame under a spotlight, and
   the view glides from piece to piece on its own, like a slow museum tour,
   while a brass plaque underneath names what you're looking at. It opens on
   the whole wall, then starts walking.

   The pan is the same single `translate() scale()` the /gallery-wall page uses
   (viewFor() in src/lib/galleryWall.js), so it is pure percentages and lands
   on the right frame at every screen size. Reduced motion: the wall simply
   rests, whole, and the plaque reads "The Gallery Wall". */

const STOPS = ['ducks', 'balloon-fox', 'fox-head', 'butterflies', 'bicycle-fox', 'hare', 'town-hall', 'pumpkin'];
const STEP_MS = 4600;
const FIT = { cx: 0.5, cy: 0.5, w: 0.62, h: 0.62 };
const BY_ID = new Map(WALL_ART.map((a) => [a.id, a]));

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function WallTourHero({ data = {} }) {
  const {
    wth_eyebrow: eyebrow = 'Haddon Heights, NJ · Since Friday the 13th, 2017',
    wth_title: title = 'Coffee with a view',
    wth_sub: sub = 'The wall is real, the ducks are real, and so is the coffee. Come see the rest in person.',
    wth_photo_url: photo,
    order_label: orderLabel = 'Order Now',
    wth_menu_label: menuLabel = 'See the menu',
  } = data;
  // -1 = the whole wall (the opening shot), then the stops in order
  const [stop, setStop] = useState(-1);

  useEffect(() => {
    if (reducedMotion()) return undefined;
    const id = setInterval(() => {
      if (document.hidden) return;
      setStop((s) => (s + 1) % STOPS.length);
    }, STEP_MS);
    return () => clearInterval(id);
  }, []);

  const piece = stop >= 0 ? BY_ID.get(STOPS[stop]) : null;
  const view = piece ? viewFor(piece, FIT) : REST_VIEW;

  return (
    <section className="wth">
      <div className="wth__spot" aria-hidden="true" />
      <div className="container wth__inner">
        <div className="wth__copy">
          <p className="wth__eyebrow">{eyebrow}</p>
          <h1 className="wth__title">{title}</h1>
          <p className="wth__sub">{sub}</p>
          <div className="wth__cta">
            <OrderButton label={orderLabel} className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--lg wth__ghost" to="/menu">{menuLabel}</Link>
          </div>
          <div className="wth__hours"><HoursToday /></div>
        </div>

        <figure className="wth__exhibit">
          <div className="wth__frame">
            <div className="wth__stage" style={{ aspectRatio: WALL_STAGE_RATIO }}>
              <div className="wth__art" style={{ transform: `translate(${view.x}%, ${view.y}%) scale(${view.scale})` }}>
                <img
                  src={photo || asset('images/wall/gallery-wall.jpg')}
                  alt="The gallery wall at Trouble Brewing: dozens of mismatched vintage frames on a sage-green wall"
                  width={WALL_IMAGE.w}
                  height={WALL_IMAGE.h}
                  fetchpriority="high"
                  decoding="async"
                />
              </div>
            </div>
          </div>
          <figcaption className="wth__plaque" aria-live="off">
            <span className="wth__plaque-title" key={piece ? piece.id : 'all'}>{piece ? piece.title : 'The Gallery Wall'}</span>
            <Link to="/gallery-wall" className="wth__plaque-link">Explore every frame →</Link>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
