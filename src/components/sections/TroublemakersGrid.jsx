import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getTeamMembers } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { SkeletonCards } from '../Skeleton.jsx';

/* Human-readable labels for the extensible fun_facts keys. Unknown keys are
   prettified automatically so owners can add new fun-fact fields freely. */
const FACT_LABELS = {
  favorite_local_food: 'Favorite local food spot',
  favorite_movie: 'Favorite movie',
  favorite_book: 'Favorite book',
  favorite_show: 'Favorite TV show',
  favorite_artist: 'Favorite music artist',
};
const prettify = (k) => FACT_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function TroublemakersGrid({ data = {} }) {
  const { heading = 'Meet the team' } = data;
  const [team, setTeam] = useState(null);

  const version = useDataVersion('team_members');
  useEffect(() => {
    let alive = true;
    getTeamMembers().then((t) => alive && setTeam(t));
    return () => { alive = false; };
  }, [version]);

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {team === null ? (
          <SkeletonCards count={3} height={320} />
        ) : (
          <div className="grid grid--3">
            {team.map((m) => {
              const facts = Object.entries(m.fun_facts || {}).filter(([, v]) => v && v !== '—');
              return (
                <article key={m.id} className="card tm-card">
                  <div className="tm-card__photo">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name} loading="lazy" />
                    ) : (
                      <span className="tm-card__initials" aria-hidden="true">{(m.name || '?').slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="card__body">
                    <h3 style={{ marginBottom: 2 }}>{m.name}</h3>
                    {m.role && <p className="eyebrow" style={{ marginBottom: 'var(--space-2)' }}>{m.role}</p>}
                    {m.bio && <p style={{ color: 'var(--color-text-soft)' }}>{m.bio}</p>}
                    {facts.length > 0 && (
                      <dl className="tm-facts">
                        {facts.map(([k, v]) => (
                          <div key={k} className="tm-facts__row">
                            <dt>{prettify(k)}</dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Reveal>
  );
}
