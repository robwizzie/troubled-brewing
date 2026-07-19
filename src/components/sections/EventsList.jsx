import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getEvents } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { SkeletonCards } from '../Skeleton.jsx';

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
}

export default function EventsList({ data = {} }) {
  const { heading = 'Upcoming Events' } = data;
  const [events, setEvents] = useState(null);

  const version = useDataVersion('events');
  useEffect(() => {
    let alive = true;
    getEvents({ upcomingOnly: true }).then((e) => alive && setEvents(e));
    return () => { alive = false; };
  }, [version]);

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {events === null ? (
          <SkeletonCards count={3} height={160} />
        ) : events.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-soft)' }}>
            No events on the calendar right now — but there's always something brewing. Check back soon!
          </p>
        ) : (
          <div className="grid grid--3">
            {events.map((ev) => (
              <article key={ev.id} className="card event-card">
                {ev.image_url && <img className="event-card__img" src={ev.image_url} alt="" loading="lazy" />}
                <div className="card__body">
                  <p className="eyebrow">{fmtDate(ev.event_date)}{ev.event_time ? ` · ${ev.event_time}` : ''}</p>
                  <h3 style={{ marginBottom: 'var(--space-2)' }}>{ev.title}</h3>
                  {ev.description && <p style={{ color: 'var(--color-text-soft)', margin: 0 }}>{ev.description}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}
