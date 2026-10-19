import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LuChevronLeft, LuChevronRight, LuX } from 'react-icons/lu';
import { boardAlt, boardDate } from '../lib/chalkboard.js';
import '../styles/past-boards.css';

/* "Past boards": a flip-through of the shop's old chalkboard photos, shown as
   a little stack of framed boards. Newest first; "Older" goes back in time.

     phones   swipe left (older) / right (newer)
     desktop  the arrow buttons, ← / → keys, Home / End
     close    Esc, the ✕ button, or a click on the backdrop

   Only the board on top is in the DOM as an <img> (the ones behind it are
   empty frames), so a long history costs one photo at a time. Rendered into
   <body> like PhotoLightbox so the hero's transforms can't clip it. Callers
   decide when to offer it (MIN_PAST_BOARDS). */

const SWIPE_PX = 45;

export default function PastBoards({ boards, start = 0, onClose }) {
  const count = boards.length;
  const [index, setIndex] = useState(() => Math.min(Math.max(start, 0), Math.max(count - 1, 0)));
  const [dir, setDir] = useState(0); // 1 = went older, -1 = went newer (for the slide-in)
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const swipe = useRef(null);

  const go = useCallback((to) => {
    const next = Math.min(Math.max(to, 0), count - 1);
    if (next === index) return;
    setDir(next > index ? 1 : -1);
    setIndex(next);
  }, [count, index]);

  // focus in, scroll lock, focus handed back on close
  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); return; }
      if (e.key === 'Home') { e.preventDefault(); go(0); return; }
      if (e.key === 'End') { e.preventDefault(); go(count - 1); return; }
      if (e.key === 'Tab') {
        // keep focus inside the dialog
        const els = [...(dialogRef.current?.querySelectorAll('button:not([disabled])') || [])];
        if (!els.length) return;
        const at = els.indexOf(document.activeElement);
        const nextEl = e.shiftKey ? els[(at <= 0 ? els.length : at) - 1] : els[(at + 1) % els.length];
        e.preventDefault();
        nextEl.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [go, index, count, onClose]);

  if (!count) return null;
  const board = boards[index];
  const when = boardDate(board.published_at);
  const behind = [2, 1].filter((k) => index + k < count);

  const onPointerDown = (e) => { swipe.current = { x: e.clientX, y: e.clientY }; };
  const onPointerUp = (e) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return;
    go(dx < 0 ? index + 1 : index - 1);
  };

  return createPortal(
    <div
      className="pastb"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pastb-title"
      ref={dialogRef}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pastb__panel">
        <header className="pastb__head">
          <h2 id="pastb-title" className="pastb__title">Past boards</h2>
          <p className="pastb__count" aria-live="polite">
            {index + 1} of {count}
          </p>
          <button ref={closeRef} type="button" className="pastb__close" onClick={onClose} aria-label="Close past boards">
            <LuX aria-hidden="true" />
          </button>
        </header>

        <div className="pastb__stage">
          <button
            type="button"
            className="pastb__nav pastb__nav--newer"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Newer board"
          >
            <LuChevronLeft aria-hidden="true" />
          </button>

          <div
            className="pastb__stack"
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerCancel={() => { swipe.current = null; }}
          >
            {behind.map((k) => <div key={k} className={`pastb__card pastb__card--behind pastb__card--b${k}`} aria-hidden="true" />)}
            <figure
              key={board.id}
              className={`pastb__card pastb__card--front ${dir > 0 ? 'is-older' : dir < 0 ? 'is-newer' : ''}`}
            >
              <div className="pastb__slate">
                <img src={board.url} alt={boardAlt(board)} loading="lazy" decoding="async" draggable="false" />
              </div>
              <figcaption className="pastb__meta">
                {when && <time className="pastb__date" dateTime={board.published_at}>{when}</time>}
                {board.caption && <span className="pastb__caption">{board.caption}</span>}
              </figcaption>
            </figure>
          </div>

          <button
            type="button"
            className="pastb__nav pastb__nav--older"
            onClick={() => go(index + 1)}
            disabled={index === count - 1}
            aria-label="Older board"
          >
            <LuChevronRight aria-hidden="true" />
          </button>
        </div>

        <p className="pastb__hint">
          <span className="pastb__hint--touch">Swipe for older boards</span>
          <span className="pastb__hint--keys">Use ← → to flip, Esc to close</span>
        </p>
      </div>
    </div>,
    document.body,
  );
}
