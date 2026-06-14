import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getGalleryPieces } from '../../lib/dataService.js';
import { SkeletonCards } from '../Skeleton.jsx';

/* The real framed art on the wall, each with its fun backstory. Owner-managed
   via gallery_pieces. A charming, shareable, SEO-friendly page. */
export default function GalleryPiecesGrid({ data = {} }) {
  const { heading = 'The collection' } = data;
  const [pieces, setPieces] = useState(null);

  useEffect(() => {
    let alive = true;
    getGalleryPieces().then((p) => alive && setPieces(p));
    return () => { alive = false; };
  }, []);

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {pieces === null ? (
          <SkeletonCards count={4} height={260} />
        ) : (
          <div className="pieces">
            {pieces.map((p, i) => (
              <article key={p.id} className="piece" style={{ '--tilt': `${[-2, 1.5, -1, 2][i % 4]}deg` }}>
                <div className="piece__frame">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} loading="lazy" />
                  ) : (
                    <span className="piece__placeholder" aria-hidden="true">🖼️</span>
                  )}
                </div>
                <h3 className="piece__title">{p.title}</h3>
                {p.story && <p className="piece__story">{p.story}</p>}
              </article>
            ))}
          </div>
        )}
      </div>
    </Reveal>
  );
}
