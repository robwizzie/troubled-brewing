import { photoSources } from '../lib/pagePhotos.js';
import { normalizeFrameStyle } from '../lib/frameStyles.js';

/* One photograph, responsive: a WebP srcset for the shop photos we ship
   (src/lib/pagePhotos.js) and a plain <img> for anything an owner uploads.
   `sizes` should describe the rendered width so phones fetch the 800px file. */
export function Photo({ url, alt = '', sizes = '100vw', className = '', eager = false, style }) {
  const p = photoSources(url);
  if (!p) return null;
  const img = (
    <img
      className={className}
      src={p.src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      fetchpriority={eager ? 'high' : undefined}
      style={style}
    />
  );
  if (!p.srcSet) return img;
  return (
    <picture>
      <source type="image/webp" srcSet={p.srcSet} sizes={sizes} />
      {img}
    </picture>
  );
}

/* A photograph hung in one of the gallery wall's frame moldings
   (.gw-frame__art--<style> in sections.css), with an optional brass plate
   underneath — the same vocabulary as the homepage wall. `ratio` is the
   window's aspect ratio (w / h); the photo is cropped to fill it. */
export default function FramedPhoto({
  url,
  alt = '',
  caption = '',
  frame = 'gilt-thin',
  ratio = 4 / 5,
  sizes = '(min-width: 900px) 40vw, 90vw',
  eager = false,
  className = '',
  position,
}) {
  if (!photoSources(url)) return null;
  const style = normalizeFrameStyle(frame);
  return (
    <figure className={`pg-frame ${className}`}>
      <span className={`gw-frame__art gw-frame__art--${style} pg-frame__art`} style={{ '--ar': ratio }}>
        <Photo url={url} alt={alt} sizes={sizes} eager={eager} className="gw-frame__img" style={position ? { objectPosition: position } : undefined} />
      </span>
      {caption && (
        <figcaption className="pg-frame__cap">
          <span className="brass-plate">{caption}</span>
        </figcaption>
      )}
    </figure>
  );
}
