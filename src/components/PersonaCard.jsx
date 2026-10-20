import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaDownload, FaLink, FaRotateRight, FaShareFromSquare, FaXmark } from 'react-icons/fa6';
import { track } from '../lib/analytics.js';
import { asset } from '../lib/config.js';
import { FOX_H, FOX_PATH, FOX_W } from '../lib/foxArt.js';
import { PERSONA_LINK, SHOP_HANDLE, SHOP_SITE, personaFor, personaPhoto, storyFileName } from '../lib/drinkPersona.js';
import { isCutout } from '../lib/productImage.js';
import { canShareFiles, copyText, downloadBlob, shareStoryImage } from '../lib/storyShare.js';
import '../styles/persona.css';

/* "Get my drink personality": after the fox's quiz, a card that says who
   you are by what you drink ("You're a Matcha Mischief-Maker"), made to be
   shared to an Instagram Story.

   PersonaLauncher is the one thing the quiz result renders (FoxPlay.jsx):
   a button, and — once pressed — a dialog laid over the fox's card (a
   portal into .fox-help, so a tap on it still counts as "inside" the fox's
   card). The card flips in; the Story image (src/lib/storyImage.js) is
   drawn in the background meanwhile, so Share is instant when tapped (the
   share sheet needs the tap's own user activation). Esc, the close button
   or "Back to my match" close it and focus returns to the button.

   Real photos only. A persona card is only ever made for a match whose
   menu item has a photo (its image_url) — never the drawn cup. The photo is
   preloaded and the button only appears once it has really loaded, so a
   drink without one (or with a broken link) leaves the quiz result exactly
   as it was. The Story PNG is drawn from that same photo (storyImage.js
   loads it robustly: fetch → Blob first, then a CORS Image, each retried).
   Only if every way in fails do Share / Download step aside, with a
   friendly "try again" and Copy link; if even the card's <img> fails, the
   card closes and the button goes away. */

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Preload a photo: 'loading' → 'ok' once it has really loaded, or 'failed'. */
function usePhoto(src) {
  const [state, setState] = useState({ src, status: src ? 'loading' : 'failed' });
  useEffect(() => {
    if (!src) { setState({ src, status: 'failed' }); return undefined; }
    let live = true;
    setState({ src, status: 'loading' });
    const img = new Image();
    img.onload = () => { if (live) setState({ src, status: 'ok' }); };
    img.onerror = () => { if (live) setState({ src, status: 'failed' }); };
    img.src = src;
    return () => { live = false; img.onload = null; img.onerror = null; };
  }, [src]);
  return state.src === src ? state.status : 'loading';
}

/** The drink's real photo in its little gilt frame (DrinkPhoto's look). */
function PersonaPhoto({ src, alt, onError }) {
  return (
    <span className={`fox-photo fox-photo--md has-photo persona-card__photo${isCutout(src) ? ' is-cutout' : ''}`} data-photo="photo">
      <img className="fox-photo__img" src={src} alt={alt} decoding="async" onError={onError} />
    </span>
  );
}

/** The brand's own fox (logo drawing, traced vector), in currentColor. */
function Fox({ className }) {
  return (
    <svg className={className} viewBox={`0 0 ${FOX_W} ${FOX_H}`} aria-hidden="true" focusable="false">
      <path d={FOX_PATH} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

function Spark() {
  return <svg className="persona-spark" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0 L6.2 3.8 L10 5 L6.2 6.2 L5 10 L3.8 6.2 L0 5 L3.8 3.8 Z" /></svg>;
}

const themeVars = (t) => ({
  '--p-bg': t.bg, '--p-bg2': t.bg2, '--p-fg': t.fg, '--p-soft': t.soft,
  '--p-accent': t.accent, '--p-chip': t.chip, '--p-chip-fg': t.chipFg,
});

/** The card itself (the same design as the Story image, sized for the panel). */
export function PersonaCardFace({ persona, photo, titleId, onPhotoError }) {
  return (
    <article className={`persona-card${persona.theme.dark ? ' is-dark' : ''}`} style={themeVars(persona.theme)} data-persona={persona.id}>
      <p className="persona-card__eyebrow" aria-hidden="true">The fox says you’re {persona.article}…</p>
      <h3 className="persona-card__name" id={titleId}>
        <span className="sr-only">You’re {persona.article} </span>{persona.name}
      </h3>
      <p className="persona-card__line">{persona.line}</p>
      <ul className="persona-card__traits" aria-label="Traits">
        {persona.traits.map((t) => <li key={t}>{t}</li>)}
      </ul>
      <div className="persona-card__match">
        <div className="persona-card__matchtext">
          <p className="persona-card__label">Your match</p>
          <p className="persona-card__drink">{persona.drink}</p>
        </div>
        <div className="persona-card__art">
          <Fox className="persona-card__fox" />
          <PersonaPhoto src={photo} alt={persona.drink} onError={onPhotoError} />
        </div>
      </div>
      <footer className="persona-card__foot">
        <img className="persona-card__logo" src={asset('images/brand/logo-primary.png')} alt="Trouble Brewing" width="504" height="360" />
        <p className="persona-card__handle">
          <span>{SHOP_HANDLE}</span><span className="persona-card__dot" aria-hidden="true"> · </span><span>{SHOP_SITE}</span>
        </p>
      </footer>
    </article>
  );
}

function PersonaDialog({ persona, item, photo, onClose, onPhotoError }) {
  const titleId = `persona-${useId().replace(/:/g, '')}`;
  const box = useRef(null);
  const [story, setStory] = useState({ state: 'making', blob: null });
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const shareable = useMemo(() => canShareFiles(), []);
  const instant = reduced();

  // focus moves into the dialog (its title is read out first)
  useEffect(() => { box.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { track('persona_view', { persona: persona.id }); }, [persona.id]);

  // draw the Story image as soon as the card opens, so Share is ready when tapped
  useEffect(() => {
    let live = true;
    setStory({ state: 'making', blob: null });
    (async () => {
      try {
        const { storyBlob } = await import('../lib/storyImage.js');
        const blob = await storyBlob({ persona, item });
        if (live) setStory({ state: 'ready', blob });
      } catch {
        if (live) setStory({ state: 'failed', blob: null });
      }
    })();
    return () => { live = false; };
  }, [persona, item, attempt]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const els = [...box.current.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
    if (!els.length) return;
    const first = els[0];
    const last = els[els.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === box.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const share = async () => {
    if (!story.blob || busy) return;
    setBusy(true);
    try {
      const how = await shareStoryImage(story.blob, persona);
      if (how === 'share') { track('persona_share', { method: 'share' }); setStatus('Shared! Tag @troublebrewingcoffee so we can see it.'); }
      if (how === 'download') { track('persona_download'); setStatus('Saved to your downloads. Add it to your Story from there.'); }
    } finally { setBusy(false); }
  };
  const download = () => {
    if (!story.blob) return;
    downloadBlob(story.blob, storyFileName(persona));
    track('persona_download');
    setStatus('Saved to your downloads. Add it to your Story from there.');
  };
  const copy = async () => {
    const ok = await copyText(PERSONA_LINK);
    track('persona_share', { method: 'copy_link' });
    setStatus(ok ? 'Link copied!' : `Copy this link: ${PERSONA_LINK}`);
  };

  const making = story.state === 'making';
  return (
    <div className={`persona-layer${instant ? ' is-instant' : ''}`} data-testid="persona-layer">
      <section ref={box} className="persona-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} onKeyDown={onKeyDown}>
        <div className="persona-dialog__top">
          <p className="persona-dialog__kicker">Your drink personality</p>
          <button type="button" className="persona-dialog__close" onClick={onClose} aria-label="Close drink personality">
            <FaXmark aria-hidden="true" />
          </button>
        </div>
        <div className="persona-flip">
          <div className="persona-flip__inner">
            <div className="persona-flip__back" aria-hidden="true">
              <Fox className="persona-flip__fox" />
              <span>The fox is thinking…</span>
            </div>
            <PersonaCardFace persona={persona} photo={photo} titleId={titleId} onPhotoError={onPhotoError} />
          </div>
          {!instant && <span className="persona-burst" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>}
        </div>
        <div className="persona-actions" aria-busy={making}>
          {story.state === 'failed' ? (
            <div className="persona-actions__oops" role="alert">
              <p>Couldn’t grab the photo for your card. Try again?</p>
              <button type="button" className="persona-btn persona-btn--main" onClick={() => { setStatus(''); setAttempt((n) => n + 1); }}>
                <FaRotateRight aria-hidden="true" /> Try again
              </button>
            </div>
          ) : (
            <>
              <button type="button" className="persona-btn persona-btn--main" onClick={shareable ? share : download} disabled={making || busy}>
                {making ? <span className="persona-btn__spin" aria-hidden="true" /> : shareable ? <FaShareFromSquare aria-hidden="true" /> : <FaDownload aria-hidden="true" />}
                {making ? 'Getting your card ready…' : shareable ? 'Share image' : 'Download image'}
              </button>
              {shareable && !making && (
                <button type="button" className="persona-btn" onClick={download}>
                  <FaDownload aria-hidden="true" /> Download image
                </button>
              )}
            </>
          )}
          <button type="button" className="persona-btn" onClick={copy}>
            <FaLink aria-hidden="true" /> Copy link
          </button>
        </div>
        <p className="persona-help">
          {story.state === 'failed' ? 'Share the link and tag ' : 'Share to your Story and tag '}<strong>{SHOP_HANDLE}</strong>
        </p>
        <p className="persona-status" role="status">{status}</p>
        <p className="persona-back">
          <button type="button" className="persona-back__btn" onClick={onClose}>Back to my match</button>
        </p>
      </section>
    </div>
  );
}

/** The quiz result's "Get my drink personality" button, and the card it
    opens — only for a match whose real photo has loaded. */
export function PersonaLauncher({ answers, item }) {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState(null);
  const [broken, setBroken] = useState('');
  const btn = useRef(null);
  const persona = useMemo(() => personaFor({ answers, item }), [answers, item]);
  const photo = personaPhoto(item);
  const status = usePhoto(photo);

  const show = () => {
    setHost(btn.current?.closest('.fox-help') || null);
    setOpen(true);
  };
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => btn.current?.focus({ preventScroll: true }));
  }, []);
  // the card's own <img> failed after all: close it and take the button away
  const photoFailed = useCallback(() => {
    setBroken(photo);
    setOpen(false);
    requestAnimationFrame(() => host?.focus?.({ preventScroll: true }));
  }, [photo, host]);

  if (!item || !photo || status !== 'ok' || broken === photo) return null;
  const dialog = open ? <PersonaDialog persona={persona} item={item} photo={photo} onClose={close} onPhotoError={photoFailed} /> : null;
  return (
    <>
      <p className="persona-launch">
        <button ref={btn} type="button" className="persona-launch__btn" onClick={show} aria-haspopup="dialog" aria-expanded={open}>
          <Spark /> Get my drink personality <Spark />
        </button>
      </p>
      {dialog && (host ? createPortal(dialog, host) : dialog)}
    </>
  );
}
