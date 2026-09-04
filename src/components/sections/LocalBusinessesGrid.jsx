import { Fragment, useEffect, useMemo, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getLocalBusinesses } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { SkeletonCards } from '../Skeleton.jsx';
import { track } from '../../lib/analytics.js';
import { SITE } from '../../lib/seed.js';

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
   still works if all they filled in was a name. */

const CATEGORY_LABELS = {
  restaurant: 'Restaurant',
  cafe: 'Café',
  retail: 'Shop',
  service: 'Service',
  bakery: 'Bakery',
  bar: 'Bar',
  other: 'Local spot',
};

/* Leading street number, for the walk-the-block ordering. Anything without one
   sorts after the numbered places, keeping its manual display_order. */
function streetNumber(address) {
  const m = /^\s*(\d{1,5})/.exec(String(address || ''));
  return m ? Number(m[1]) : null;
}

const initials = (name) =>
  String(name || '?')
    .replace(/^(the|a)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

function Card({ b }) {
  const number = streetNumber(b.address);
  const mapsUrl = b.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.name} ${b.address}`)}`
    : null;
  return (
    <article className="neighbor">
      <div className="neighbor__head">
        {b.logo_url ? (
          <img className="neighbor__logo" src={b.logo_url} alt={`${b.name} logo`} loading="lazy" />
        ) : (
          /* a drawn monogram beats an empty logo box, and beats hotlinking a
             logo nobody gave us permission to use */
          <span className="neighbor__monogram" aria-hidden="true">{initials(b.name)}</span>
        )}
        <div className="neighbor__title">
          <h3>{b.name}</h3>
          <p className="neighbor__meta">
            {b.category && <span className="neighbor__cat">{CATEGORY_LABELS[b.category] || b.category}</span>}
            {number != null && <span className="neighbor__num">{number} Station Ave</span>}
          </p>
        </div>
      </div>

      {b.photo_url && <img className="neighbor__photo" src={b.photo_url} alt="" loading="lazy" />}

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
  } = data;
  const [list, setList] = useState(null);

  const version = useDataVersion('local_businesses');
  useEffect(() => {
    let alive = true;
    getLocalBusinesses().then((l) => alive && setList(l));
    return () => { alive = false; };
  }, [version]);

  const ordered = useMemo(() => {
    const rows = list || [];
    if (orderBy !== 'street') return rows;
    return [...rows].sort((a, b) => {
      const na = streetNumber(a.address);
      const nb = streetNumber(b.address);
      if (na == null && nb == null) return (a.display_order ?? 0) - (b.display_order ?? 0);
      if (na == null) return 1;
      if (nb == null) return -1;
      return na - nb;
    });
  }, [list, orderBy]);

  // where the shop's own door falls in the walk, so it can be marked in place
  const ourNumber = streetNumber(SITE.address);
  const usAfter =
    showUs && orderBy === 'street' && ourNumber != null
      ? ordered.filter((b) => (streetNumber(b.address) ?? Infinity) < ourNumber).length
      : -1;

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {intro && <p className="section-sub">{intro}</p>}
        {list === null ? (
          <SkeletonCards count={3} height={220} />
        ) : (
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
