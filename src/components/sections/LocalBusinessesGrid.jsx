import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getLocalBusinesses } from '../../lib/dataService.js';
import { SkeletonCards } from '../Skeleton.jsx';
import { track } from '../../lib/analytics.js';

/* Local businesses they support. Community love + local SEO (outbound links to
   other Haddon Heights businesses). Owner-managed via local_businesses. */
export default function LocalBusinessesGrid({ data = {} }) {
  const { heading = 'Our neighbors' } = data;
  const [list, setList] = useState(null);

  useEffect(() => {
    let alive = true;
    getLocalBusinesses().then((l) => alive && setList(l));
    return () => { alive = false; };
  }, []);

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {list === null ? (
          <SkeletonCards count={3} height={200} />
        ) : (
          <div className="grid grid--3">
            {list.map((b) => (
              <article key={b.id} className="card local-card">
                {b.photo_url && <img className="local-card__img" src={b.photo_url} alt="" loading="lazy" />}
                <div className="card__body">
                  {b.category && <p className="eyebrow">{b.category}</p>}
                  <h3 style={{ marginBottom: 'var(--space-2)' }}>{b.name}</h3>
                  {b.blurb && <p style={{ color: 'var(--color-text-soft)' }}>{b.blurb}</p>}
                  {b.url && (
                    <a
                      className="btn btn--ghost"
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => track('outbound_click', { dest: 'local_business', name: b.name })}
                    >
                      Visit →
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}
