import { wallPhotoProps } from '../lib/wallPhoto.js';
import { WALL_FOCUS, WALL_STAGE_RATIO } from '../lib/galleryWall.js';

/* The shop's own photograph of the gallery wall (gallery-wall.jpg — served
   at up to 3000px wide via src/lib/wallPhoto.js),
   cropped to the slice with the art in it (WALL_FOCUS — the counter below is
   cut off). Children are laid over it in % of that slice; the helpers in
   src/lib/realWall.js turn a WALL_ART box (measured over the WHOLE
   photograph) into the same space, so a tag or a highlight lands on the real
   frame at any width.

   Shared by the homepage concepts that hang the real wall rather than a
   painted one (Tagged Wall, Closer Look, Scrapbook). */

export default function RealWallPhoto({ src, className = '', alt, eager = true, sizes = '(min-width: 900px) 60vw, 100vw', children, ...rest }) {
  return (
    <div className={`rwp ${className}`} style={{ aspectRatio: WALL_STAGE_RATIO }} {...rest}>
      {/* the photo is taller than the slice, so it's clipped here — and only
          here, so tags and scribbles laid over it may hang past the edges */}
      <span className="rwp__clip">
      <img
        className="rwp__img"
        {...wallPhotoProps(src, sizes)}
        alt={alt ?? 'The gallery wall at Trouble Brewing: a sage-green wall hung with mismatched vintage frames, a gold fox head in spectacles and a brass hare.'}
        style={{ top: `${(-WALL_FOCUS.y / WALL_FOCUS.h) * 100}%`, height: `${(100 / WALL_FOCUS.h) * 100}%` }}
        loading={eager ? 'eager' : 'lazy'}
        fetchpriority={eager ? 'high' : undefined}
        decoding="async"
      />
      </span>
      {children}
    </div>
  );
}
