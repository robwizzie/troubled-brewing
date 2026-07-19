import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getContentBlock } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';

/* The community board: owner-edited "staff picks" / what's flying off the menu,
   from content_blocks.staff_picks. */
export default function CommunityBoard({ data = {} }) {
  const { heading = 'On the Community Board' } = data;
  const [block, setBlock] = useState(null);
  const version = useDataVersion('content_blocks');

  useEffect(() => {
    let alive = true;
    getContentBlock('staff_picks').then((b) => alive && setBlock(b));
    return () => { alive = false; };
  }, [version]);

  const items = block?.items || [];

  return (
    <Reveal as="section" className="section section--alt">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        <div className="grid grid--2">
          {items.map((it, i) => (
            <div key={i} className="card board-card">
              <div className="card__body">
                <p className="eyebrow">{it.label}</p>
                <p className="board-card__value">{it.value}</p>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p style={{ color: 'var(--color-text-soft)' }}>The board's empty right now — check back soon.</p>
          )}
        </div>
      </div>
    </Reveal>
  );
}
