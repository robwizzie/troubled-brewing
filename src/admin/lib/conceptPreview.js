import { asset, publicUrl } from '../../lib/config.js';

/* Where the homepage-look picker's thumbnails and previews live.
   Thumbnails are real screenshots of each look's homepage hero (taken with
   Playwright at 1280x800 from /?concept=<value>, saved as ~640px WebP under
   public/images/admin/concepts/). Re-take them when a look changes a lot or
   a new one is added; a missing one just shows the card's blank frame. */
export const conceptThumb = (value) => asset(`images/admin/concepts/${value}.webp`);

/** The homepage in a given look, for this browser only — never saved. */
export const conceptPreviewUrl = (value) => `${publicUrl()}?previewConcept=${encodeURIComponent(value)}`;
