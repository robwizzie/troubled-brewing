import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FaDownload, FaLink, FaShareFromSquare, FaXmark } from 'react-icons/fa6';
import { track } from '../lib/analytics.js';
import { asset } from '../lib/config.js';
import { FOX_H, FOX_PATH, FOX_W } from '../lib/foxArt.js';
import { PERSONA_LINK, SHOP_HANDLE, SHOP_SITE, personaFor, storyFileName } from '../lib/drinkPersona.js';
import { canShareFiles, copyText, downloadBlob, shareStoryImage } from '../lib/storyShare.js';
import { DrinkPhoto } from './FoxPlay.jsx';
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
   or "Back to my match" close it and focus returns to the button. */

const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** The drink's drawn cup, as standalone SVG markup (the story's fallback). */
function cupMarkup(root) {
  const svg = root?.querySelector('.fox-photo__art svg');
  if (!svg || typeof XMLSerializer === 'undefined') return '';
  const c = svg.cloneNode(true);
  c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  c.setAttribute('width', '600');
  c.setAttribute('height', '600');
  c.removeAttribute('style');
  c.querySelectorAll('.fox-pour__steam').forEach((g) => g.setAttribute('opacity', '0.35'));
  return new XMLSerializer().serializeToString(c);
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
export function PersonaCardFace({ persona, item, titleId }) {
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
          <DrinkPhoto item={item} size="md" className="persona-card__photo" />
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

function PersonaDialog({ persona, item, onClose }) {
  const titleId = `persona-${useId().replace(/:/g, '')}`;
  const box = useRef(null);
  const [story, setStory] = useState({ state: 'making', blob: null });
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const shareable = useMemo(() => canShareFiles(), []);
  const instant = reduced();

  // focus moves into the dialog (its title is read out first)
  useEffect(() => { box.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { track('persona_view', { persona: persona.id }); }, [persona.id]);

  // draw the Story image in the background, so Share is ready when tapped
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { storyBlob } = await import('../lib/storyImage.js');
        const blob = await storyBlob({ persona, item, cupSvg: cupMarkup(box.current) });
        if (live) setStory({ state: 'ready', blob });
      } catch {
        if (live) setStory({ state: 'failed', blob: null });
      }
    })();
    return () => { live = false; };
  }, [persona, item]);

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
            <PersonaCardFace persona={persona} item={item} titleId={titleId} />
          </div>
          {!instant && <span className="persona-burst" aria-hidden="true"><i /><i /><i /><i /><i /><i /></span>}
        </div>
        <div className="persona-actions">
          {story.state === 'failed' ? (
            <p className="persona-actions__note">Hmm, I couldn’t draw the image just now. You can still copy the link.</p>
          ) : (
            <>
              <button type="button" className="persona-btn persona-btn--main" onClick={shareable ? share : download} disabled={making || busy}>
                {shareable ? <FaShareFromSquare aria-hidden="true" /> : <FaDownload aria-hidden="true" />}
                {making ? 'Getting your image ready…' : shareable ? 'Share image' : 'Download image'}
              </button>
              {shareable && (
                <button type="button" className="persona-btn" onClick={download} disabled={making}>
                  <FaDownload aria-hidden="true" /> Download image
                </button>
              )}
            </>
          )}
          <button type="button" className="persona-btn" onClick={copy}>
            <FaLink aria-hidden="true" /> Copy link
          </button>
        </div>
        <p className="persona-help">Share to your Story and tag <strong>{SHOP_HANDLE}</strong></p>
        <p className="persona-status" role="status">{status}</p>
        <p className="persona-back">
          <button type="button" className="persona-back__btn" onClick={onClose}>Back to my match</button>
        </p>
      </section>
    </div>
  );
}

/** The quiz result's "Get my drink personality" button, and the card it opens. */
export function PersonaLauncher({ answers, item }) {
  const [open, setOpen] = useState(false);
  const [host, setHost] = useState(null);
  const btn = useRef(null);
  const persona = useMemo(() => personaFor({ answers, item }), [answers, item]);

  const show = () => {
    setHost(btn.current?.closest('.fox-help') || null);
    setOpen(true);
  };
  const close = useCallback(() => {
    setOpen(false);
    requestAnimationFrame(() => btn.current?.focus({ preventScroll: true }));
  }, []);

  if (!item) return null;
  const dialog = open ? <PersonaDialog persona={persona} item={item} onClose={close} /> : null;
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
