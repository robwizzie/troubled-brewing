import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/* A plain full-screen photo viewer: the image fit to the screen (object-fit:
   contain), a close button, Esc / backdrop click to close, focus moved in and
   handed back. No custom gestures — on phones the browser's own pinch-zoom
   works on the overlay (the site never disables zoom), which is the most
   reliable way to read small chalk lettering. Rendered into <body> so the
   hero's transforms and overflow can't clip it. */
export default function PhotoLightbox({ src, alt, caption, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      // one focusable control: keep Tab inside the dialog
      if (e.key === 'Tab') { e.preventDefault(); closeRef.current?.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={alt} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <button ref={closeRef} type="button" className="lightbox__close" onClick={onClose} aria-label="Close photo">
        <span aria-hidden="true">✕</span>
      </button>
      <img className="lightbox__img" src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
      {caption && <p className="lightbox__caption">{caption}</p>}
    </div>,
    document.body,
  );
}
