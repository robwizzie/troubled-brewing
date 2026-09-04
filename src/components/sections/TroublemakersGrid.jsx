import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getTeamMembers } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { SkeletonCards } from '../Skeleton.jsx';

/* The people behind the counter. A photo, what they do, their go-to drink, and
   whatever fun facts they felt like sharing.

   The drink is its own thing on the card rather than another fun fact: "what
   should I order?" is the question these people get asked all day, and a
   regular reading this page is really asking the same one.

   Every field is optional. No photo draws their initial in the house palette
   instead of a grey box, and a member with nothing but a name still renders a
   finished card. */

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
  const { heading = 'Meet the team', intro = '' } = data;
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
        {intro && <p className="section-sub">{intro}</p>}
        {team === null ? (
          <SkeletonCards count={3} height={340} />
        ) : (
          <div className="tm-grid">
            {team.map((m) => {
              const facts = Object.entries(m.fun_facts || {}).filter(([, v]) => v && v !== '—');
              return (
                <article key={m.id} className="tm-card">
                  <div className="tm-card__photo">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.name} loading="lazy" decoding="async" />
                    ) : (
                      <span className="tm-card__initials" aria-hidden="true">{(m.name || '?').slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="tm-card__body">
                    <h3 className="tm-card__name">{m.name}</h3>
                    <p className="tm-card__meta">
                      {m.role && <span className="tm-card__role">{m.role}</span>}
                      {m.pronouns && <span className="tm-card__pronouns">{m.pronouns}</span>}
                    </p>
                    {m.started_label && <p className="tm-card__since">{m.started_label}</p>}

                    {m.drink && (
                      <p className="tm-card__drink">
                        <span className="tm-card__drink-label">Drink of choice</span>
                        {m.drink}
                      </p>
                    )}

                    {m.bio && <p className="tm-card__bio">{m.bio}</p>}

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
