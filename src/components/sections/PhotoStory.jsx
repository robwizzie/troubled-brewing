import { useRef } from 'react';
import Markdown from '../Markdown.jsx';
import FramedPhoto from '../PagePhoto.jsx';
import ActionLink from '../ActionLink.jsx';
import useInView from '../../lib/useInView.js';
import { photoSources } from '../../lib/pagePhotos.js';

/* the frame follows the photo's own shape, within portrait 4:5 … landscape 4:3 */
const frameRatio = (url) => Math.min(4 / 3, Math.max(4 / 5, photoSources(url)?.ratio || 4 / 5));

/* One chapter of a story: a short block of text beside a framed photograph,
   with an optional small second photo tucked over the frame's corner. Stack a
   few on a page and alternate `image_side` and they read as a walk along the
   wall — text, picture, text, picture — instead of one long column.

   The one bit of motion: when a chapter scrolls in, its frame swings gently
   into the slight tilt it hangs at, like a picture settling on its nail.
   Reduced motion: it is simply already hanging there. */
export default function PhotoStory({ data = {} }) {
  const {
    eyebrow = '',
    heading = '',
    body_markdown: body = '',
    image_url: imageUrl = '',
    image_alt: imageAlt = '',
    caption = '',
    frame_style: frame = 'gilt-thin',
    image_side: side = 'right',
    inset_url: insetUrl = '',
    inset_alt: insetAlt = '',
    inset_frame: insetFrame = 'oval-gilt',
    link_label: linkLabel = '',
    link_url: linkUrl = '',
    tone = 'paper',
  } = data;
  const ref = useRef(null);
  const shown = useInView(ref);
  const hasPhoto = Boolean(imageUrl);

  return (
    <section
      ref={ref}
      className={`section pg-story pg-story--${side === 'left' ? 'left' : 'right'} pg-tone--${tone} ${hasPhoto ? '' : 'pg-story--text-only'} ${shown ? 'is-in' : ''}`}
    >
      <div className="container pg-story__grid">
        <div className="pg-story__text">
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          {heading && <h2 className="pg-story__title">{heading}</h2>}
          <Markdown>{body}</Markdown>
          {linkLabel && (
            <p className="pg-story__link">
              <ActionLink label={linkLabel} url={linkUrl} className="btn btn--ghost" location="photo_story" />
            </p>
          )}
        </div>
        {hasPhoto && (
          <div className="pg-story__media">
            <FramedPhoto url={imageUrl} alt={imageAlt} caption={caption} frame={frame} ratio={frameRatio(imageUrl)} className="pg-story__frame pg-swing" />
            {insetUrl && (
              <FramedPhoto
                url={insetUrl}
                alt={insetAlt}
                frame={insetFrame}
                ratio={1}
                sizes="(min-width: 900px) 200px, 38vw"
                className="pg-story__inset pg-swing pg-swing--late"
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
