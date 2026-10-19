import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTeamMembers } from '../../lib/dataService.js';
import { getMenu } from '../../lib/menuService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { slugifyDrink } from '../../lib/productImage.js';
import { mediaUrl, BRAND } from '../../lib/config.js';
import useInView from '../../lib/useInView.js';
import { SkeletonCards } from '../Skeleton.jsx';

/* The people behind the counter, as a pinboard of polaroids: photo, name in
   marker, their role stamped on, and the back-of-the-card stats — the drink
   they'd tell you to order (linked to it on the menu when it's a real menu
   item) and whatever fun facts they felt like sharing.

   Every field is optional. No photo → an "undeveloped" polaroid with their
   initial and a little "photo coming soon" note, so a brand-new hire still
   gets a finished card. Fun facts of "—" (the old placeholder) are skipped.

   The page's one bit of motion: the polaroids are pinned up one after another
   when the board scrolls into view. Reduced motion: already pinned. */

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
const realValue = (v) => typeof v === 'string' ? v.trim() && v.trim() !== '—' && v.trim() !== '-' : Boolean(v);

function Polaroid({ m, index, menuNames }) {
  const facts = Object.entries(m.fun_facts || {}).filter(([, v]) => realValue(v));
  const drink = (m.drink || '').trim();
  const onMenu = drink && menuNames.get(drink.toLowerCase());
  const photo = mediaUrl(m.photo_url);
  return (
    <li className={`tm-pol tm-pol--${index % 4}`} style={{ '--i': index }}>
      <article className="tm-pol__card">
        <span className="tm-pol__tape" aria-hidden="true" />
        <div className={`tm-pol__photo ${photo ? '' : 'tm-pol__photo--blank'}`}>
          {photo ? (
            <img src={photo} alt={`${m.name}${m.role ? `, ${m.role}` : ''}`} loading="lazy" decoding="async" />
          ) : (
            <>
              <img className="tm-pol__fox" src={BRAND.foxHead} alt="" aria-hidden="true" loading="lazy" />
              <span className="tm-pol__initial" aria-hidden="true">{(m.name || '?').slice(0, 1)}</span>
              <span className="tm-pol__soon">photo coming soon</span>
            </>
          )}
        </div>
        <div className="tm-pol__caption">
          <h3 className="tm-pol__name">{m.name}</h3>
          {(m.role || m.pronouns) && (
            <p className="tm-pol__meta">
              {m.role && <span className="tm-pol__role">{m.role}</span>}
              {m.pronouns && <span className="tm-pol__pronouns">{m.pronouns}</span>}
            </p>
          )}
        </div>
        {(m.started_label || drink || m.bio || facts.length > 0) && (
          <div className="tm-pol__back">
            {m.started_label && <p className="tm-pol__since">{m.started_label}</p>}
            {drink && (
              <p className="tm-pol__drink">
                <span className="tm-pol__drink-label">Drink of choice</span>
                {onMenu ? <Link to={`/menu#item-${slugifyDrink(onMenu)}`}>{drink}</Link> : <span>{drink}</span>}
              </p>
            )}
            {m.bio && <p className="tm-pol__bio">{m.bio}</p>}
            {facts.length > 0 && (
              <dl className="tm-pol__facts">
                {facts.map(([k, v]) => (
                  <div key={k} className="tm-pol__fact">
                    <dt>{prettify(k)}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </article>
    </li>
  );
}

export default function TroublemakersGrid({ data = {} }) {
  const { heading = 'Meet the team', intro = '', empty_message: emptyMessage = 'The crew’s photos are on their way — come say hi in the meantime.' } = data;
  const [team, setTeam] = useState(null);
  const [menu, setMenu] = useState([]);
  const boardRef = useRef(null);
  const shown = useInView(boardRef, { threshold: 0.1 });

  const version = useDataVersion('team_members');
  useEffect(() => {
    let alive = true;
    getTeamMembers().then((t) => alive && setTeam(t));
    return () => { alive = false; };
  }, [version]);
  useEffect(() => {
    let alive = true;
    getMenu().then((items) => alive && setMenu(items || [])).catch(() => {});
    return () => { alive = false; };
  }, []);

  const menuNames = useMemo(() => new Map(menu.filter((i) => i.name).map((i) => [i.name.trim().toLowerCase(), i.name])), [menu]);

  return (
    <section ref={boardRef} className="section tm-board-section">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {intro && <p className="section-sub">{intro}</p>}
        {team === null ? (
          <SkeletonCards count={3} height={340} />
        ) : team.length === 0 ? (
          <p className="tm-board__empty">{emptyMessage}</p>
        ) : (
          <ul className={`tm-board ${shown ? 'is-in' : ''}`} data-count={team.length}>
            {team.map((m, i) => <Polaroid key={m.id || i} m={m} index={i} menuNames={menuNames} />)}
          </ul>
        )}
      </div>
    </section>
  );
}
