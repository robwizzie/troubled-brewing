import { useEffect, useRef, useState } from 'react';
import { getTimelineEvents } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import useInView from '../../lib/useInView.js';
import { SkeletonCards } from '../Skeleton.jsx';
import FramedPhoto from '../PagePhoto.jsx';

/* The TB Timeline as a string of frames: one picture wire down the page, a
   brass year tag where the year turns over, and each milestone hung off it as
   a framed photo with its paper label — alternating sides on a desktop, all
   down one side on a phone.

   Photos: a milestone's own image_url when the owners add one. Otherwise the
   section's `fill_images` (photos of the shop as it is now) take turns, under
   a small "fill_caption" tag ("The shop today") so nobody mistakes an
   atmosphere shot for a photo of that event. No photo at all → a label-only
   card, still on the wire.

   The page's one bit of motion: each frame slides in from its side as it
   reaches the screen. Reduced motion: everything is simply there. */
const FRAMES = ['gilt-grand', 'black-mat', 'bronze-carved', 'gold-botanical', 'black-flat', 'gilt-thin'];

const yearOf = (ev) => {
  const m = String(ev.sort_date || '').match(/^(\d{4})/) || String(ev.date_label || '').match(/\b(19|20)\d{2}\b/);
  return m ? m[0].slice(0, 4) : '';
};

function Milestone({ ev, index, photo, fillCaption, year }) {
  const ref = useRef(null);
  const shown = useInView(ref, { threshold: 0.15 });
  const side = index % 2 === 0 ? 'left' : 'right';
  return (
    <li ref={ref} className={`tl-item tl-item--${side} ${shown ? 'is-in' : ''}`}>
      {year && <span className="tl-year__tag tl-item__year" aria-hidden="true">{year}</span>}
      <span className="tl-item__nail" aria-hidden="true" />
      <article className="tl-card">
        {photo && (
          <div className="tl-card__photo">
            <FramedPhoto
              url={photo.url}
              alt={photo.alt}
              frame={FRAMES[index % FRAMES.length]}
              ratio={4 / 3}
              sizes="(min-width: 900px) 420px, 80vw"
            />
            {photo.fill && fillCaption && <span className="tl-card__tag">{fillCaption}</span>}
          </div>
        )}
        <div className="tl-card__label">
          {ev.date_label && <p className="tl-card__date">{ev.date_label}</p>}
          <h3 className="tl-card__title">{ev.title}</h3>
          {ev.description && <p className="tl-card__text">{ev.description}</p>}
        </div>
      </article>
    </li>
  );
}

export default function TimelineGrid({ data = {} }) {
  const { heading = 'The Trouble Brewing timeline', intro = '', fill_images: fillImages = [], fill_caption: fillCaption = 'The shop today', end_label: endLabel = '…and counting' } = data;
  const [events, setEvents] = useState(null);

  const version = useDataVersion('timeline_events');
  useEffect(() => {
    let alive = true;
    getTimelineEvents().then((e) => alive && setEvents(e));
    return () => { alive = false; };
  }, [version]);

  const fills = (Array.isArray(fillImages) ? fillImages : []).filter((f) => f && f.url);
  let fillIndex = 0;
  let lastYear = null;

  return (
    <section className="section tl">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {intro && <p className="section-sub">{intro}</p>}
        {events === null ? (
          <SkeletonCards count={3} height={140} />
        ) : events.length === 0 ? (
          <p className="tl__empty">The story&rsquo;s just getting started — milestones coming soon.</p>
        ) : (
          <ol className="tl__wire">
            {events.map((ev, i) => {
              const y = yearOf(ev);
              const year = y && y !== lastYear ? y : '';
              if (y) lastYear = y;
              let photo = null;
              if (ev.image_url) photo = { url: ev.image_url, alt: ev.image_alt || ev.title, fill: false };
              else if (fills.length) {
                const f = fills[fillIndex++ % fills.length];
                photo = { url: f.url, alt: f.alt || '', fill: true };
              }
              return <Milestone key={ev.id || i} ev={ev} index={i} photo={photo} fillCaption={fillCaption} year={year} />;
            })}
            {endLabel && (
              <li className="tl-year tl-year--end" aria-hidden="true">
                <span className="tl-year__tag">{endLabel}</span>
              </li>
            )}
          </ol>
        )}
      </div>
    </section>
  );
}
