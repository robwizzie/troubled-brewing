import { Link } from 'react-router-dom';
import OrderButton from '../OrderButton.jsx';
import HoursToday from '../HoursToday.jsx';
import RealWallPhoto from '../RealWallPhoto.jsx';
import { stagePoint } from '../../lib/realWall.js';
import { WALL_ART } from '../../lib/galleryWall.js';

/* "Tagged Wall" landing concept — the shop's REAL photograph of its gallery
   wall, with a kraft-paper luggage tag tied to some of the frames. Each tag
   is a page of the site, so you find your way around by reading the wall, the
   way you would in the room. Nothing is painted over the art: the tags hang
   from a pin just under each frame, on a string, and sway a little.

   The tags are owner-editable as plain lines (`twh_tags`): "spot | label |
   link", where `spot` is a piece id from src/lib/galleryWall.js. An unknown
   spot is skipped, so a typo in the editor never draws a tag in mid-air. */

const DEFAULT_TAGS = [
  'ducks | The Menu | /menu',
  'balloon-fox | What’s On | /events',
  'butterflies | Reviews | /reviews',
  'fox-head | Troublemakers | /troublemakers',
  'bicycle-fox | Local Love | /neighborhood',
  'town-hall | Our Story | /timeline',
  'lady-in-red | The Wall | /gallery-wall',
].join('\n');

/* Where on each piece the pin goes (0–1 across its box), and which way the
   tag leans, so neighbours don't hang in lockstep. Pieces not listed get a pin
   at the bottom centre. */
const PIN = {
  ducks: [0.72, 0.94],
  'balloon-fox': [0.5, 0.93],
  butterflies: [0.5, 0.97],
  'fox-head': [0.52, 0.98],
  'bicycle-fox': [0.22, 0.96],
  'town-hall': [0.58, 0.96],
  'lady-in-red': [0.5, 0.96],
};
const SWAY = [-7, 5, -4, 8, -6, 4, -5, 6];

const BY_ID = new Map(WALL_ART.map((a) => [a.id, a]));

function parseTags(src) {
  return String(src || '')
    .split('\n')
    .map((line) => line.split('|').map((s) => s.trim()))
    .filter(([spot, label, to]) => spot && label && to && BY_ID.has(spot))
    .map(([spot, label, to]) => ({ spot, label, to, art: BY_ID.get(spot) }));
}

function TagLink({ to, className, children, ...rest }) {
  return to.startsWith('/') ? (
    <Link to={to} className={className} {...rest}>{children}</Link>
  ) : (
    <a href={to} className={className} target="_blank" rel="noopener noreferrer" {...rest}>{children}</a>
  );
}

export default function TaggedWallHero({ data = {} }) {
  const {
    twh_eyebrow: eyebrow = 'Haddon Heights, NJ · Coffee House & Bakery',
    twh_title: title = 'Come in. Look around.',
    twh_sub: sub = 'This is our actual wall — rubber ducks at sea, foxes in a balloon, a gold fox in spectacles. Every tag on it goes somewhere.',
    twh_hint: hint = 'Pick a tag, any tag →',
    twh_tags: tagsSrc,
    twh_photo_url: photo,
    order_label: orderLabel = 'Order Now',
    twh_menu_label: menuLabel = 'See the menu',
  } = data;
  const tags = parseTags(tagsSrc || DEFAULT_TAGS);

  return (
    <section className="twh">
      <div className="twh__cornice" aria-hidden="true" />
      <div className="container twh__inner">
        <div className="twh__copy">
          <p className="twh__eyebrow">{eyebrow}</p>
          <h1 className="twh__title">{title}</h1>
          <p className="twh__sub">{sub}</p>
          <div className="twh__cta">
            <OrderButton label={orderLabel} className="btn btn--accent btn--lg" location="hero" />
            <Link className="btn btn--lg twh__ghost" to="/menu">{menuLabel}</Link>
          </div>
          <div className="twh__hours"><HoursToday variant="sign" /></div>
          <p className="twh__hint" aria-hidden="true">{hint}</p>
        </div>

        <div className="twh__wall">
          <RealWallPhoto src={photo} className="twh__photo">
            <nav className="twh__tags" aria-label="Find your way around the wall">
              {tags.map((t, i) => {
                const [fx, fy] = PIN[t.spot] || [0.5, 0.95];
                return (
                  <span key={`${t.spot}-${i}`} className="twh__tag-hang" style={{ ...stagePoint(t.art, fx, fy), '--sway': `${SWAY[i % SWAY.length]}deg`, '--delay': `${i * -0.7}s`, '--drop': `${0.25 + i * 0.12}s` }}>
                    <TagLink to={t.to} className="twh__tag" aria-label={`${t.label} — the tag on ${t.art.title}`}>
                      <span className="twh__tag-hole" aria-hidden="true" />
                      <span className="twh__tag-label">{t.label}</span>
                    </TagLink>
                  </span>
                );
              })}
            </nav>
          </RealWallPhoto>
        </div>
      </div>
    </section>
  );
}
