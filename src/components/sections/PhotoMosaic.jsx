import Markdown from '../Markdown.jsx';
import FramedPhoto from '../PagePhoto.jsx';

/* A handful of photographs hung together.

   layout "salon": a little salon hang like the shop's own wall — mixed
   moldings, one big piece anchoring the rest (4–6 photos suit it best).
   layout "strip": a straight row of tall frames with brass name plates —
   right for "here is what we pour" (each image's caption is its plate).

   `badges` are short brass labels under the intro (e.g. the roaster and the
   tea house we pour). Photos with no url are skipped; no photos and no text
   means no section. */
const SALON_FRAMES = ['gilt-grand', 'black-mat', 'gold-botanical', 'bronze-carved', 'black-flat', 'gilt-thin', 'oval-gilt', 'black-stacked'];
const STRIP_FRAMES = ['gilt-thin', 'black-flat', 'gold-botanical', 'bronze-carved', 'black-mat'];

const toList = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => String(s).trim()).filter(Boolean);

export default function PhotoMosaic({ data = {} }) {
  const { eyebrow = '', heading = '', intro = '', badges, images = [], layout = 'salon', tone = 'paper' } = data;
  const photos = (Array.isArray(images) ? images : []).filter((p) => p && p.url);
  const plates = toList(badges);
  if (!photos.length && !heading && !intro) return null;
  const strip = layout === 'strip';

  return (
    <section className={`section pg-mosaic pg-mosaic--${strip ? 'strip' : 'salon'} pg-tone--${tone}`}>
      <div className="container">
        {(eyebrow || heading || intro || plates.length > 0) && (
          <header className="pg-mosaic__head">
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {heading && <h2 className="section-heading">{heading}</h2>}
            {intro && <div className="pg-mosaic__intro"><Markdown>{intro}</Markdown></div>}
            {plates.length > 0 && (
              <ul className="pg-mosaic__badges" aria-label="What we pour">
                {plates.map((b) => <li key={b} className="brass-plate">{b}</li>)}
              </ul>
            )}
          </header>
        )}
        {photos.length > 0 && (
          <ul className="pg-mosaic__grid" data-count={photos.length}>
            {photos.map((p, i) => {
              const frames = strip ? STRIP_FRAMES : SALON_FRAMES;
              const style = p.frame_style || frames[i % frames.length];
              const ratio = strip ? 3 / 4 : style.startsWith('oval') ? 4 / 5 : i === 0 ? 4 / 5 : i % 3 === 1 ? 4 / 3 : 1;
              return (
                <li key={`${p.url}-${i}`} className={`pg-mosaic__item pg-mosaic__item--${i}`}>
                  <FramedPhoto
                    url={p.url}
                    alt={p.alt || ''}
                    caption={p.caption || ''}
                    frame={style}
                    ratio={ratio}
                    sizes={strip ? '(min-width: 900px) 260px, 45vw' : i === 0 ? '(min-width: 900px) 440px, 90vw' : '(min-width: 900px) 300px, 45vw'}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
