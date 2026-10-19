import { useCallback, useState } from 'react';
import { useChalkboardPhoto, updatedLabel } from '../lib/chalkboard.js';
import PhotoLightbox from './PhotoLightbox.jsx';

/* "Today's chalkboard" on the Menu page: a small framed thumbnail of the
   shop's real board (content_blocks.chalkboard_photo) that opens full-size.
   Renders nothing unless the photo is live and fresh (src/lib/chalkboard.js),
   so the menu looks exactly as before on days nobody has snapped the board. */
export default function ChalkboardStrip() {
  const chalk = useChalkboardPhoto();
  const [failedUrl, setFailedUrl] = useState(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (!chalk || chalk.url === failedUrl) return null;
  const when = updatedLabel(chalk.updated_at);
  return (
    <>
      <button type="button" className="chalk-strip" onClick={() => setOpen(true)}>
        <img src={chalk.url} alt="" decoding="async" loading="lazy" onError={() => setFailedUrl(chalk.url)} />
        <span className="chalk-strip__text">
          <strong>Today&rsquo;s chalkboard</strong>
          <span>{[chalk.caption, when].filter(Boolean).join(' · ')}</span>
          <span className="chalk-strip__cta">See the specials board →</span>
        </span>
      </button>
      {open && (
        <PhotoLightbox
          src={chalk.url}
          alt={chalk.caption ? `Our chalkboard today: ${chalk.caption}` : 'Our chalkboard today'}
          caption={[chalk.caption, when].filter(Boolean).join(' · ')}
          onClose={close}
        />
      )}
    </>
  );
}
