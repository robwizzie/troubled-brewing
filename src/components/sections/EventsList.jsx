import { lazy, Suspense, useEffect, useState } from 'react';
import { getEvents } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { shopNow } from '../../lib/hours.js';
import { mediaUrl, BRAND, SITE_URL } from '../../lib/config.js';
import { absoluteUrl } from '../../lib/seo.js';
import { eventLastDay, isMultiDay, isUpcoming } from '../../lib/eventDates.js';

/* The calendar / share buttons (and the .ics builder behind them) load on
   their own, only once there's an upcoming event to put them on. */
const EventActions = lazy(() => import('../EventActions.jsx'));

/** A stable in-page anchor for a poster ("event-<id>") — the link people share. */
function eventAnchor(ev) {
  const raw = ev.id ? String(ev.id) : `${ev.title || 'event'}-${ev.event_date || ''}`;
  return `event-${raw.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')}`;
}
import { SkeletonCards } from '../Skeleton.jsx';
import FramedPhoto from '../PagePhoto.jsx';

/* Events as a row of posters stuck to the wall: a date block (month / day /
   weekday) torn off a calendar, the event's own picture if it has one (a
   printed poster with the fox if not), then the title, time and blurb.

   A multi-day event (an `end_date` after its `event_date`) gets a span on
   its date block ("OCT 24–26 / SAT – MON") and stays up until its last day.

   Whatever shape the owner's picture is, it fits the poster: a photo close
   to the poster's 4:3 fills it, anything else (a wide banner, a tall flyer,
   a square logo) is shown whole over a soft, blurred copy of itself — never
   cropped mid-word.

   Past events with a photo can be shown underneath as a photo wall
   (`show_past`), newest first — nothing to tidy: an event moves from the
   posters to the wall by itself once its (last) date has passed.

   Each upcoming poster with a real date carries "Add to calendar" and "Text
   a friend" (EventActions.jsx); the link they share is this poster's own
   anchor on /events. Past events never get them.

   Nothing coming up → a friendly empty state with a photo of the room and a
   nudge to follow along on Instagram, instead of a lone grey sentence. */
const POSTER_TONES = ['sage', 'pink', 'gold'];

function parts(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day: d.getDate(),
    weekday: d.toLocaleDateString('en-US', { weekday: 'long' }),
    monthYear: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    long: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  };
}

/** The date block's three lines; a span for multi-day events. */
function dateBlock(ev) {
  const a = parts(ev.event_date);
  if (!a) return null;
  if (!isMultiDay(ev)) return { ...a, span: false };
  const b = parts(eventLastDay(ev));
  const short = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' });
  const sameMonth = a.month === b.month;
  return {
    month: sameMonth ? a.month : `${a.month}–${b.month}`,
    day: `${a.day}–${b.day}`,
    weekday: `${short(ev.event_date)} – ${short(eventLastDay(ev))}`,
    long: `${a.long} to ${b.long}`,
    span: true,
  };
}

/* The poster is 4:3. Pictures within this much of that shape fill it (a
   sliver trimmed off is fine on a photo); anything further off is shown
   whole instead. */
const POSTER_RATIO = 4 / 3;
const COVER_TOLERANCE = 0.12;

/** An event picture that always fits its poster — see the note at the top. */
function PosterArt({ src }) {
  const [fit, setFit] = useState('contain');
  const onLoad = (e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    if (!w || !h) return;
    setFit(Math.abs(w / h - POSTER_RATIO) / POSTER_RATIO <= COVER_TOLERANCE ? 'cover' : 'contain');
  };
  return (
    <>
      {fit === 'contain' && <img className="ev-poster__backdrop" src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />}
      <img className={`ev-poster__img ev-poster__img--${fit}`} src={src} alt="" loading="lazy" decoding="async" onLoad={onLoad} />
    </>
  );
}

function Poster({ ev, index }) {
  const p = dateBlock(ev);
  const img = mediaUrl(ev.image_url);
  const anchor = eventAnchor(ev);
  const canAdd = /^\d{4}-\d{2}-\d{2}$/.test(String(ev.event_date || ''));
  return (
    <li id={anchor} className={`ev-poster ev-poster--${POSTER_TONES[index % POSTER_TONES.length]} ev-poster--tilt-${index % 3}`}>
      <article className="ev-poster__card">
        <span className="ev-poster__pin" aria-hidden="true" />
        {p && (
          <p className={`ev-poster__date${p.span ? ' ev-poster__date--span' : ''}`} aria-label={p.long}>
            <span className="ev-poster__month" aria-hidden="true">{p.month}</span>
            <span className="ev-poster__day" aria-hidden="true">{p.day}</span>
            <span className="ev-poster__weekday" aria-hidden="true">{p.weekday}</span>
          </p>
        )}
        <div className="ev-poster__art">
          {img ? (
            <PosterArt key={img} src={img} />
          ) : (
            <img className="ev-poster__mark" src={BRAND.logoFox} alt="" aria-hidden="true" loading="lazy" />
          )}
        </div>
        <div className="ev-poster__body">
          <h3 className="ev-poster__title">{ev.title}</h3>
          {ev.event_time && <p className="ev-poster__time">{ev.event_time}</p>}
          {ev.description && <p className="ev-poster__text">{ev.description}</p>}
          {canAdd && (
            <Suspense fallback={<div className="ev-actions ev-actions--loading" aria-hidden="true" />}>
              <EventActions ev={ev} url={`${absoluteUrl(SITE_URL, '/events')}#${anchor}`} />
            </Suspense>
          )}
        </div>
      </article>
    </li>
  );
}

export default function EventsList({ data = {} }) {
  const {
    heading = 'Upcoming Events',
    intro = '',
    empty_heading: emptyHeading = 'Nothing on the calendar just yet',
    empty_message: emptyMessage = "Nothing on the calendar right now — but there's always something brewing. Check back soon!",
    empty_image_url: emptyImage = '',
    empty_image_alt: emptyAlt = '',
    instagram_handle: handle = 'troublebrewingcoffee',
    show_past: showPast = false,
    past_heading: pastHeading = 'Lately at Trouble',
  } = data;
  const [events, setEvents] = useState(null);

  const version = useDataVersion('events');
  useEffect(() => {
    let alive = true;
    getEvents({ upcomingOnly: !showPast }).then((e) => alive && setEvents(e || []));
    return () => { alive = false; };
  }, [version, showPast]);

  const today = shopNow().isoDate;
  const upcoming = (events || []).filter((e) => isUpcoming(e, today));
  const past = showPast
    ? (events || []).filter((e) => e.event_date && !isUpcoming(e, today) && e.image_url).sort((a, b) => (a.event_date < b.event_date ? 1 : -1)).slice(0, 8)
    : [];

  return (
    <section className="section ev">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {intro && <p className="section-sub">{intro}</p>}
        {events === null ? (
          <SkeletonCards count={3} height={220} />
        ) : upcoming.length === 0 ? (
          <div className={`ev-empty ${emptyImage ? '' : 'ev-empty--no-photo'}`}>
            {emptyImage && (
              <FramedPhoto url={emptyImage} alt={emptyAlt} frame="oval-black" ratio={4 / 5} sizes="(min-width: 900px) 300px, 60vw" className="ev-empty__photo" />
            )}
            <div className="ev-empty__note">
              <h3 className="ev-empty__title">{emptyHeading}</h3>
              <p>{emptyMessage}</p>
              {handle && (
                <p>
                  <a className="btn btn--ghost" href={`https://instagram.com/${handle}`} target="_blank" rel="noopener noreferrer">
                    Follow @{handle} for the latest
                  </a>
                </p>
              )}
            </div>
          </div>
        ) : (
          <ul className="ev-posters" data-count={upcoming.length}>
            {upcoming.map((ev, i) => <Poster key={ev.id || i} ev={ev} index={i} />)}
          </ul>
        )}

        {past.length > 0 && (
          <div className="ev-past">
            <h3 className="ev-past__heading">{pastHeading}</h3>
            <ul className="ev-past__wall">
              {past.map((ev, i) => (
                <li key={ev.id || i}>
                  <FramedPhoto
                    url={ev.image_url}
                    alt={ev.title}
                    caption={`${ev.title} · ${parts(ev.event_date)?.monthYear || ''}`}
                    frame={['black-mat', 'gilt-thin', 'bronze-carved', 'black-flat'][i % 4]}
                    ratio={1}
                    sizes="(min-width: 900px) 260px, 45vw"
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
