import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getTimelineEvents } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { SkeletonCards } from '../Skeleton.jsx';

/* The TB Timeline: a vertical, scrollable run of milestones with playful markers
   and vintage frames. Owner-managed via the timeline_events table. */
export default function TimelineGrid({ data = {} }) {
  const { heading = 'The Trouble Brewing timeline' } = data;
  const [events, setEvents] = useState(null);

  const version = useDataVersion('timeline_events');
  useEffect(() => {
    let alive = true;
    getTimelineEvents().then((e) => alive && setEvents(e));
    return () => { alive = false; };
  }, [version]);

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {events === null ? (
          <SkeletonCards count={3} height={140} />
        ) : events.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--color-text-soft)' }}>
            The story's just getting started — milestones coming soon.
          </p>
        ) : (
          <ol className="timeline">
            {events.map((ev, i) => (
              <li key={ev.id} className={`timeline__item ${i % 2 === 0 ? 'is-left' : 'is-right'}`}>
                <span className="timeline__marker" aria-hidden="true" />
                <div className="timeline__card card">
                  {ev.image_url && (
                    <div className="timeline__frame">
                      <img src={ev.image_url} alt={ev.title} loading="lazy" />
                    </div>
                  )}
                  <div className="card__body">
                    <p className="eyebrow timeline__date">{ev.date_label}</p>
                    <h3>{ev.title}</h3>
                    {ev.description && <p style={{ color: 'var(--color-text-soft)', margin: 0 }}>{ev.description}</p>}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Reveal>
  );
}
