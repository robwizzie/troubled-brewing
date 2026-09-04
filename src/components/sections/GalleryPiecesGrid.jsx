import { useEffect, useState } from 'react';
import Reveal from '../Reveal.jsx';
import { getGalleryPieces } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import { normalizeFrameStyle } from '../../lib/frameStyles.js';
import { SkeletonCards } from '../Skeleton.jsx';
import { track } from '../../lib/analytics.js';

/* The real artwork on the shop's wall, hung the way it hangs in the room —
   each piece in a vintage molding from the shared vocabulary, on a brass
   nameplate, with its story underneath.

   REAL PEOPLE MADE THESE PIECES, so the credit is part of the design rather
   than a line of small print: the artist's name sits directly under the title,
   and links to wherever they want people sent. A piece with no artist recorded
   just doesn't show the line — but the field is the second thing an owner sees
   in the editor, because the point of this page is the work and the people who
   made it.

   Masonry columns, so tall portraits and wide landscapes nest the way they do
   on the actual wall instead of being cropped into a uniform grid. */

const TILTS = [-1.6, 1.2, -0.8, 1.7, -1.3, 0.9];
/* used only when a piece has no molding chosen — cycled so a fresh wall still
   looks collected rather than uniform */
const FALLBACK_FRAMES = ['gilt-grand', 'black-mat', 'gold-tapestry', 'bronze-carved', 'oval-gilt', 'black-stacked', 'gold-botanical', 'gilt-thin'];

export default function GalleryPiecesGrid({ data = {} }) {
  const { heading = 'The collection', intro = '' } = data;
  const [pieces, setPieces] = useState(null);

  const version = useDataVersion('gallery_pieces');
  useEffect(() => {
    let alive = true;
    getGalleryPieces().then((p) => alive && setPieces(p));
    return () => { alive = false; };
  }, [version]);

  return (
    <Reveal as="section" className="section">
      <div className="container">
        <h2 className="section-heading">{heading}</h2>
        {intro && <p className="section-sub">{intro}</p>}
        {pieces === null ? (
          <SkeletonCards count={4} height={300} />
        ) : (
          <div className="pieces">
            {pieces.map((p, i) => {
              const frame = normalizeFrameStyle(p.frame_style || FALLBACK_FRAMES[i % FALLBACK_FRAMES.length]);
              const credits = [p.medium, p.year_label].filter(Boolean).join(' · ');
              return (
                <figure key={p.id} className="piece" style={{ '--tilt': `${TILTS[i % TILTS.length]}deg` }}>
                  <span className={`gw-frame__art gw-frame__art--${frame} piece__frame`} style={{ '--ar': '4 / 5', '--tint': 'var(--color-paper)' }}>
                    {p.image_url ? (
                      <img className="gw-frame__img" src={p.image_url} alt={p.title} loading="lazy" decoding="async" />
                    ) : (
                      /* a warm blank in the molding rather than an empty
                         rectangle, so an unphotographed piece still reads as
                         hung. The name is on the label below, where a gallery
                         puts it — repeating it inside the frame as well made
                         every piece say its own title three times. */
                      <span className="piece__awaiting" aria-hidden="true">✻</span>
                    )}
                  </span>

                  <figcaption className="piece__label">
                    <h3 className="piece__title">{p.title}</h3>
                    {p.artist && (
                      <p className="piece__artist">
                        {p.artist_url ? (
                          <a
                            href={p.artist_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => track('outbound_click', { dest: 'gallery_artist', name: p.artist })}
                          >
                            {p.artist}
                          </a>
                        ) : (
                          p.artist
                        )}
                      </p>
                    )}
                    {credits && <p className="piece__credits">{credits}</p>}
                    {p.for_sale && <p className="piece__sale">Ask us — this one&rsquo;s for sale</p>}
                    {p.story && <p className="piece__story">{p.story}</p>}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        )}
      </div>
    </Reveal>
  );
}
