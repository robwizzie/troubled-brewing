import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import HoursToday from '../HoursToday.jsx';
import RealWallPhoto from '../RealWallPhoto.jsx';
import { asset } from '../../lib/config.js';
import { WALL_ART } from '../../lib/galleryWall.js';
import { stageXY } from '../../lib/realWall.js';

/* "Scrapbook" landing concept — the homepage as a page torn out of the shop's
   own scrapbook. The REAL photograph of the gallery wall is the big snapshot,
   washi-taped down and scribbled on: hand-written notes with drawn arrows
   point at things that are really in the photo (the rubber ducks, the gold
   fox's spectacles, the hare). Smaller snapshots of the shop — every one a
   real photo from public/images/wall/ — are taped around it, and each is a
   link. Hours go on a sticky note.

   The scribbles only ever describe what's visibly in the frame (same rule as
   the blurbs in galleryWall.js) — no invented backstory. */

const ART = new Map(WALL_ART.map((a) => [a.id, a]));

/* note: where the scribble sits (in % of the photo stage; can sit outside it),
   target: the piece and the spot on it the arrow points to, bend: how far the
   arrow bows (+/- flips the curve). */
const NOTES = [
  { id: 'ducks', text: 'yes, those are rubber ducks', note: { x: 6, y: -8 }, at: [0.3, 0.25], bend: -8, cls: 'is-top' },
  { id: 'hare', text: 'the hare is watching you', note: { x: 56, y: -8 }, at: [0.6, 0.15], bend: 8, cls: 'is-top' },
  { id: 'fox-head', text: 'the gold fox wears glasses', note: { x: 3, y: 50 }, at: [0.1, 0.5], bend: 10, cls: 'is-left' },
  { id: 'bicycle-fox', text: 'a fox. on a bike.', note: { x: 3, y: 88 }, at: [0.3, 0.6], bend: -6, cls: 'is-left' },
];

const SNAPS = [
  { img: 'images/wall/troublemakers.jpg', label: 'Meet the Troublemakers', to: '/troublemakers', tilt: 4 },
  { img: 'images/wall/our-story-so-far.jpg', label: 'The bakery case', to: '/menu', tilt: -3 },
  { img: 'images/wall/whats-on.jpg', label: 'What’s on', to: '/events', tilt: 2.5 },
  { img: 'images/wall/our-story.jpg', label: 'Our story', to: '/about', tilt: -4 },
  { img: 'images/wall/local-love.jpg', label: 'Local love', to: '/neighborhood', tilt: 3 },
];

function Scribble({ note }) {
  const piece = ART.get(note.id);
  if (!piece) return null;
  const to = stageXY(piece, note.at[0], note.at[1]);
  // start the arrow at the edge of the note nearest the target
  // (left-hand notes hang off to the LEFT of their x, top notes above their y)
  const from = note.cls === 'is-left' ? { x: note.note.x + 1, y: note.note.y } : { x: note.note.x + 12, y: note.note.y + 1 };
  const mx = (from.x + to.x) / 2 + note.bend;
  const my = (from.y + to.y) / 2 - note.bend;
  // little arrowhead: two short strokes back along the last leg
  const ang = Math.atan2(to.y - my, to.x - mx);
  const head = (d) => `${to.x - 3 * Math.cos(ang + d)},${to.y - 3 * Math.sin(ang + d)}`;
  return (
    <path
      d={`M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y} M${head(0.5)} L${to.x},${to.y} L${head(-0.5)}`}
      className="sbh__arrow"
      vectorEffect="non-scaling-stroke"
    />
  );
}

export default function ScrapbookHero({ data = {} }) {
  const {
    sbh_eyebrow: eyebrow = 'Haddon Heights, NJ',
    sbh_title: title = 'Coffee, kitchen & a wall full of trouble',
    sbh_sub: sub = 'An independent coffee house on Station Ave with scratch-made food, a pastry case worth the trip, and the strangest, friendliest wall in town.',
    sbh_hours_label: hoursLabel = 'Open today',
    sbh_photo_url: photo,
    order_label: orderLabel = 'Order Now',
    sbh_menu_label: menuLabel = 'See the menu',
  } = data;

  return (
    <section className="sbh">
      <div className="container sbh__inner">
        <div className="sbh__copy">
          <p className="sbh__eyebrow">{eyebrow}</p>
          <h1 className="sbh__title">{title}</h1>
          <p className="sbh__sub">{sub}</p>
          <div className="sbh__cta">
            <OrderButton label={orderLabel} className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--ghost btn--lg" to="/menu">{menuLabel}</Link>
          </div>
          <div className="sbh__sticky">
            <span className="sbh__sticky-label">{hoursLabel}</span>
            <HoursToday variant="sign" />
          </div>
        </div>

        <div className="sbh__collage">
          <figure className="sbh__polaroid">
            <span className="sbh__tape sbh__tape--a" aria-hidden="true" />
            <span className="sbh__tape sbh__tape--b" aria-hidden="true" />
            <RealWallPhoto src={photo} className="sbh__photo">
              <svg className="sbh__scribbles" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {NOTES.map((n) => <Scribble key={n.id} note={n} />)}
              </svg>
              {NOTES.map((n) => (
                <span key={n.id} className={`sbh__note sbh__note--${n.id} ${n.cls}`} style={{ left: `${n.note.x}%`, top: `${n.note.y}%` }} aria-hidden="true">
                  {n.text}
                </span>
              ))}
            </RealWallPhoto>
            <figcaption className="sbh__caption">
              <Link to="/gallery-wall">the real wall — come see the rest →</Link>
            </figcaption>
          </figure>

          <ul className="sbh__snaps">
            {SNAPS.map((s, i) => (
              <li key={s.to + i} className={`sbh__snap sbh__snap--${i + 1}`} style={{ '--tilt': `${s.tilt}deg` }}>
                <Link to={s.to} className="sbh__snap-link">
                  <span className="sbh__snap-pin" aria-hidden="true" />
                  <img src={asset(s.img)} alt="" loading="lazy" decoding="async" />
                  <span className="sbh__snap-label">{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
