import { useState } from 'react';

/* Renders a brand image when the file exists, and a graceful fallback (an SVG
   motif, a text lockup, or nothing) until it's uploaded — so missing assets
   never show a broken image. Used for logos and the fox easter eggs. */
export default function BrandImg({ src, alt = '', className, fallback = null, ...rest }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return fallback;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} {...rest} />;
}
