import { Fragment, useEffect, useMemo, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getLocalBusinesses } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { SkeletonCards } from '../Skeleton.jsx';
import { track } from '../../lib/analytics.js';
import { SITE } from '../../lib/seed.js';
import { categoryLabel, directionsUrl, initials, logoFor, mediaUrl, orderBusinesses, streetNumber, usIndex } from '../../lib/localBusinesses.js';
import StationAveStrip from './StationAveStrip.jsx';

/* Local Love — the neighbors, laid out as a walk down the street.

   These are real businesses a few doors either side of the shop, so the page
   is organised the way you'd actually meet them: by street number, with
   Trouble Brewing's own number marked in place. That turns a grid of cards
   into "here's our block", which is the point of the page — and it's the
   ordering an owner never has to maintain, because it falls out of the
   address they typed.

   Everything on a card is optional and degrades gracefully: no logo shows a
   drawn monogram tile in the house palette rather than a grey box, no address
   simply drops the number badge and the directions link, and the whole thing
   still works if all they filled in was a name.

   Two layouts share the same data and helpers: 'street' (the default) draws
   the block as an illustrated, sideways-scrolling Station Ave strip
   (StationAveStrip.jsx); 'grid' is the original card grid. */

function Card({ b }) {
  // the images are hotlinked from each business's own site — if one moves,
  // fall back to the monogram / no photo instead of a broken-image icon
  const [logoOk, setLogoOk] = useState(true);
  const [photoOk, setPhotoOk] = useState(true);
  const number = streetNumber(b.address);
  const mapsUrl = directionsUrl(b);
  const logo = logoOk ? logoFor(b.logo_url) : null;
  const photo = photoOk ? mediaUrl(b.photo_url) : '';
  return (
    <article className="neighbor">
      <div className="neighbor__head">
        {logo ? (
          <img className="neighbor__logo" src={logo.src} alt={`${b.name} logo`} loading="lazy" referrerPolicy="no-referrer" style={logo.bg ? { background: logo.bg } : undefined} onError={() => setLogoOk(false)} />
        ) : (
          /* a drawn monogram beats an empty logo box, and beats hotlinking a
             logo nobody gave us permission to use */
          <span className="neighbor__monogram" aria-hidden="true">{initials(b.name)}</span>
        )}
        <div className="neighbor__title">
          <h3>{b.name}</h3>
          <p className="neighbor__meta">
            {b.category && <span className="neighbor__cat">{categoryLabel(b.category)}</span>}
            {number != null && <span className="neighbor__num">{b.address.replace(/,.*$/, '')}</span>}
          </p>
        </div>
      </div>

      {photo && <img className="neighbor__photo" src={photo} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setPhotoOk(false)} />}

      {b.blurb && <p className="neighbor__blurb">{b.blurb}</p>}

      {b.we_love && (
        <p className="neighbor__love">
          <span className="neighbor__love-label">We send people for</span>
          {b.we_love}
        </p>
      )}

      <p className="neighbor__links">
        {b.url && (
          <a
            className="btn btn--ghost btn--sm"
            href={b.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('outbound_click', { dest: 'local_business', name: b.name })}
          >
            Visit their site →
          </a>
        )}
        {mapsUrl && (
          <a className="neighbor__map" href={mapsUrl} target="_blank" rel="noopener noreferrer">
            Directions
          </a>
        )}
      </p>
    </article>
  );
}

export default function LocalBusinessesGrid({ data = {} }) {
  const {
    heading = 'Our neighbors',
    intro = '',
    order_by: orderBy = 'street',
    show_us: showUs = true,
    layout = 'street',
  } = data;
  const [list, setList] = useState(null);

  const version = useDataVersion('local_businesses');
  useEffect(() => {
    let alive = true;
    getLocalBusinesses().then((l) => alive && setList(l));
    return () => { alive = false; };
  }, [version]);

  const ordered = useMemo(() => orderBusinesses(list, orderBy), [list, orderBy]);

  // where the shop's own door falls in the walk, so it can be marked in place
  const usAfter = showUs && orderBy === 'street' ? usIndex(ordered, streetNumber(SITE.address)) : -1;

  return (
    <Reveal as="section" className={layout === 'street' ? 'section section--ave' : 'section'}>
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {intro && <p className="section-sub">{intro}</p>}
        {list === null ? (
          <SkeletonCards count={3} height={220} />
        ) : layout === 'street' ? null : (
          <div className="neighbors">
            {ordered.map((b, i) => (
              <Fragment key={b.id}>
                {i === usAfter && <YouAreHere />}
                <Card b={b} />
              </Fragment>
            ))}
            {/* the shop's door is past every neighbor on the list */}
            {usAfter === ordered.length && <YouAreHere />}
          </div>
        )}
      </div>
      {list !== null && layout === 'street' && (
        <StationAveStrip ordered={ordered} showUs={showUs && orderBy === 'street'} />
      )}
    </Reveal>
  );
}

/* The shop's own door, dropped into the walk at its street number — so the
   page reads as "our block" rather than a list of other people's businesses. */
function YouAreHere() {
  return (
    <article className="neighbor neighbor--us" aria-label="Trouble Brewing Coffee House">
      <p className="neighbor__uslabel">You are here</p>
      <p className="neighbor__usname">Trouble Brewing</p>
      <p className="neighbor__meta"><span className="neighbor__num">{SITE.address.replace(/,.*$/, '')}</span></p>
    </article>
  );
}
