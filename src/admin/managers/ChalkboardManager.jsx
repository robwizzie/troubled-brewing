import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bump } from '../../lib/dataVersion.js';
import { publicUrl } from '../../lib/config.js';
import { Spinner } from '../components/ui.jsx';
import { PublishScope, ScreenHead, usePublishUnit } from '../lib/publishing.jsx';
import { uploadImage, deleteMedia } from '../lib/uploadImage.js';
import { IMAGE_MESSAGES, canDisplay, checkPickedImage, isHeic } from '../lib/imageFile.js';
import { friendlyError } from '../lib/publishHelpers.js';
import { recordPublish } from '../lib/nav.js';
import { chalkStatus, comesDownOn, dayWords, loadChalkboard, saveChalkboard, untilWords, EMPTY_CHALKBOARD } from '../lib/chalkStatus.js';
import { DEFAULT_MAX_AGE_DAYS, MAX_AGE_CHOICES, isChalkboardLive, maxAgeOf, updatedLabel } from '../../lib/chalkboard.js';

/* "Today's chalkboard" — the job staff do most, usually one-handed at the
   counter. Three taps:

     1. "Take a photo of the board" (opens the phone camera)
     2. look at the preview — exactly the homepage's framed, tilted board
     3. "Put it on the website"

   Nothing leaves the phone before step 3: the preview is a local copy. Step 3
   compresses + uploads the photo (media bucket, chalkboard/) and makes the one
   content_blocks.chalkboard_photo write:
     { url, path, caption, updated_at, enabled: true, max_age_days }
   The homepage then shows it until it's `max_age_days` old, when the drawn
   menu board comes back by itself.

   The words under the photo and how long it stays up are optional and folded
   away. "Keep it up" and "Take it down" are staged the same way and go live
   with the same one big button. */

const MAX_CAPTION = 120;

function chalkError(e) {
  const raw = String(e?.message || e || '');
  if (Object.values(IMAGE_MESSAGES).includes(raw) || /^That photo is too big/.test(raw)) return raw;
  const msg = raw.toLowerCase();
  if (/payload too large|413|exceeded the maximum|too large/.test(msg)) {
    return 'That photo is too big to send. Take it again with the “Take a photo of the board” button — those always fit.';
  }
  if (/failed to fetch|network|load failed|offline|timed? ?out/.test(msg)) {
    return 'No connection — we couldn’t reach the website. Check the shop Wi-Fi or your phone signal, then press “Put it on the website” again. Your photo is still here.';
  }
  if (/jwt|expired|not authenticated|401|unauthor|session/.test(msg)) {
    return 'You’ve been signed out. Sign in again (the link opens a new tab — keep this one open), then come back and press “Put it on the website”. Your photo is still here.';
  }
  return friendlyError(e).replace(/press Publish/g, 'press “Put it on the website”').replace(/try Publish/g, 'try “Put it on the website”');
}

/** The homepage's real chalkboard markup (src/styles/real-wall.css), so the
    preview is the homepage, not an approximation of it. */
function HomepageBoard({ url, caption, when, drawn, onError }) {
  return (
    <div className="chalkprev__stage">
      {drawn ? (
        <aside className="pch__board chalkprev__drawn">
          <p className="pch__board-title">Today’s board</p>
          <p className="chalkprev__drawn-text">Your menu, written out in chalk — it updates by itself.</p>
        </aside>
      ) : (
        <aside className="pch__board pch__board--photo">
          <div className="pch__chalk chalkprev__chalk">
            <img src={url} alt={caption ? `Preview: ${caption}` : 'Preview of the chalkboard photo on the homepage'} onError={onError} />
            <span className="pch__chalk-zoom" aria-hidden="true">Tap to read</span>
          </div>
          <div className="pch__chalk-meta">
            {caption && <p className="pch__chalk-caption">{caption}</p>}
            <p className="pch__chalk-when">{when}</p>
          </div>
        </aside>
      )}
    </div>
  );
}

function CameraButton({ big, label, onPick, capture = true }) {
  return (
    <label className={`btn ${big ? 'btn--primary chalk__camera' : 'btn--ghost chalk__btn'}`}>
      {label}
      <input
        type="file"
        accept="image/*"
        {...(capture ? { capture: 'environment' } : {})}
        onChange={onPick}
        className="sr-only"
      />
    </label>
  );
}

export default function ChalkboardManager() {
  return (
    <PublishScope id="chalkboard">
      <ChalkboardScreen />
    </PublishScope>
  );
}

function ChalkboardScreen() {
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [block, setBlock] = useState(EMPTY_CHALKBOARD);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [maxAge, setMaxAge] = useState(DEFAULT_MAX_AGE_DAYS);
  const [takeDown, setTakeDown] = useState(false);
  const [keepUp, setKeepUp] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // 'up' | 'down' | 'kept' | 'edited'

  const load = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    loadChalkboard()
      .then((b) => { setBlock(b); setCaption(b.caption || ''); setMaxAge(maxAgeOf(b)); })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // a local preview of the picked photo — nothing is uploaded until "Put it on the website"
  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function onPick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const problem = checkPickedImage(f);
    if (problem) { setError(problem); return; }
    if (isHeic(f)) {
      const probe = URL.createObjectURL(f);
      const ok = await canDisplay(probe);
      URL.revokeObjectURL(probe);
      if (!ok) { setError(IMAGE_MESSAGES.heic); return; }
    }
    setError('');
    setDone(null);
    setFile(f);
    setTakeDown(false);
    setKeepUp(false);
  }

  const captionChanged = caption.trim() !== (block.caption || '').trim();
  const ageChanged = Number(maxAge) !== maxAgeOf(block);
  const staged = file ? 'up' : takeDown ? 'down' : keepUp ? 'kept' : captionChanged || ageChanged ? 'edited' : null;
  const dirty = !loading && Boolean(staged);

  async function publish() {
    let next;
    if (takeDown) {
      next = { ...block, enabled: false };
    } else {
      let { url, path } = block;
      if (file) ({ url, path } = await uploadImage(file, { preset: 'chalkboard', folder: 'chalkboard' }));
      const goesUp = Boolean(file || keepUp);
      next = {
        url,
        path: path || '',
        caption: caption.trim().slice(0, MAX_CAPTION),
        updated_at: goesUp ? new Date().toISOString() : block.updated_at,
        enabled: goesUp ? true : block.enabled,
        max_age_days: Number(maxAge) || DEFAULT_MAX_AGE_DAYS,
      };
    }
    await saveChalkboard(next);
    // tidy up the old photo (best effort — only our own chalkboard/ files)
    if (file && block.path && block.path !== next.path && block.path.startsWith('chalkboard/')) {
      deleteMedia(block.path).catch(() => {});
    }
    setBlock(next);
    setCaption(next.caption || '');
    setFile(null);
    setTakeDown(false);
    setKeepUp(false);
    bump('content_blocks');
    recordPublish('/admin/chalkboard');
  }

  function discard() {
    setFile(null);
    setTakeDown(false);
    setKeepUp(false);
    setCaption(block.caption || '');
    setMaxAge(maxAgeOf(block));
    setError('');
  }

  usePublishUnit('chalkboard', { dirty, publish, discard });

  async function putLive() {
    if (busy || !staged) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setError(chalkError(new Error('offline')));
      return;
    }
    const kind = staged;
    setBusy(true);
    setError('');
    try {
      await publish();
      setDone(kind);
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { /* jsdom / old browsers */ }
    } catch (e) {
      setError(chalkError(e));
      // eslint-disable-next-line no-console
      console.warn('[chalkboard]', e);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner label="Checking the chalkboard…" />;

  const status = chalkStatus(block);
  const live = isChalkboardLive(block);
  const signedOut = /signed out/.test(error);
  const publishLabel = {
    up: 'Put it on the website',
    down: 'Take it off the website',
    kept: 'Keep it on the website',
    edited: 'Put the changes on the website',
  }[staged];

  return (
    <div className="chalk editscreen">
      <ScreenHead
        title="Today’s chalkboard"
        help="Snap the real chalkboard and it goes on the homepage in place of the drawn menu board. It comes down by itself after a few days, so old specials never linger."
      />

      <p className={`chalk__status ${status.live ? 'is-live' : ''}`} role="status">
        <span aria-hidden="true">{status.live ? '✅' : '🖍️'}</span> {status.text}
      </p>

      {loadFailed && (
        <div className="chalk__error" role="alert">
          <p>We couldn’t check what’s on the website — the connection may have dropped.</p>
          <button type="button" className="btn btn--ghost chalk__btn" onClick={load}>Try again</button>
        </div>
      )}

      {error && (
        <div className="chalk__error" role="alert">
          <p>{error}</p>
          {signedOut && <a className="btn btn--ghost chalk__btn" href={`${import.meta.env.BASE_URL}admin/login`} target="_blank" rel="noreferrer">Sign in again ↗</a>}
        </div>
      )}

      {done ? (
        <section className="chalk__done" aria-labelledby="chalk-done-title">
          <p className="chalk__done-icon" aria-hidden="true">{done === 'down' ? '🖍️' : '🎉'}</p>
          <h2 id="chalk-done-title">
            {done === 'up' && 'It’s on the website!'}
            {done === 'kept' && 'Done — the photo stays up.'}
            {done === 'edited' && 'Done — your changes are on the website.'}
            {done === 'down' && 'Done — the drawn menu board is back.'}
          </h2>
          <p>
            {done === 'down'
              ? 'The homepage shows your live menu in chalk again.'
              : live
                ? (() => {
                  const d = comesDownOn(block.updated_at, maxAgeOf(block));
                  return `It’s on the homepage now and comes down by itself ${dayWords(d.date, d.daysAway)}.`;
                })()
                : 'Saved.'}
          </p>
          <div className="chalk__done-actions">
            <a className="btn btn--primary chalk__big" href={publicUrl()} target="_blank" rel="noreferrer">See it on the website ↗</a>
            <Link className="btn btn--ghost chalk__btn" to="/admin">Back to admin home</Link>
            <button type="button" className="btn btn--ghost chalk__btn" onClick={() => setDone(null)}>Take another photo</button>
          </div>
        </section>
      ) : (
        <>
          {file ? (
            <section className="chalk__step" aria-label="Check the photo">
              <p className="chalk__steplabel"><span className="chalk__pill">Not on the website yet</span> This is how the homepage will look:</p>
              <HomepageBoard
                url={preview}
                caption={caption.trim()}
                when="Updated today"
                onError={() => { setFile(null); setError(isHeic(file) ? IMAGE_MESSAGES.heic : IMAGE_MESSAGES.unreadable); }}
              />
              <button type="button" className="btn btn--primary chalk__big chalk__publish" onClick={putLive} disabled={busy}>
                {busy ? 'Putting it up…' : `✅ ${publishLabel}`}
              </button>
              <div className="chalk__row">
                <CameraButton label="🔄 Retake" onPick={onPick} />
                <button type="button" className="btn btn--ghost chalk__btn" onClick={discard} disabled={busy}>Cancel</button>
              </div>
            </section>
          ) : (
            <section className="chalk__step" aria-label="Take a photo">
              <CameraButton big label="📷 Take a photo of the board" onPick={onPick} />
              <CameraButton label="or choose a photo you already took" onPick={onPick} capture={false} />

              {staged && (
                <>
                  <p className="chalk__steplabel"><span className="chalk__pill">Not on the website yet</span> This is how the homepage will look:</p>
                  <HomepageBoard
                    url={block.url}
                    caption={caption.trim()}
                    when={staged === 'kept' ? 'Updated today' : updatedLabel(block.updated_at)}
                    drawn={staged === 'down' || !block.url}
                  />
                  <button type="button" className="btn btn--primary chalk__big chalk__publish" onClick={putLive} disabled={busy}>
                    {busy ? 'Saving…' : publishLabel}
                  </button>
                  <div className="chalk__row">
                    <button type="button" className="btn btn--ghost chalk__btn" onClick={discard} disabled={busy}>Cancel</button>
                  </div>
                </>
              )}

              {!staged && live && (
                <>
                  <p className="chalk__steplabel">On the homepage now:</p>
                  <HomepageBoard url={block.url} caption={(block.caption || '').trim()} when={updatedLabel(block.updated_at)} />
                </>
              )}
            </section>
          )}

          {(file || (block.url && !takeDown)) && (
            <details className="chalk__opt">
              <summary>✏️ Add a few words under the photo <small>(optional)</small></summary>
              <div className="field">
                <label htmlFor="chalk-caption">A few words</label>
                <input
                  id="chalk-caption"
                  value={caption}
                  maxLength={MAX_CAPTION}
                  placeholder="e.g. Pumpkin cold foam is back!"
                  onChange={(e) => setCaption(e.target.value)}
                />
              </div>
            </details>
          )}

          <details className="chalk__opt">
            <summary>More options</summary>
            <div className="field">
              <label htmlFor="chalk-age">Take the photo down after</label>
              <select id="chalk-age" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))}>
                {MAX_AGE_CHOICES.map((n) => (
                  <option key={n} value={n}>
                    {n === 1 ? 'Today only' : `${n} days`}{n === DEFAULT_MAX_AGE_DAYS ? ' (usual)' : ''}
                  </option>
                ))}
              </select>
              <p className="field__hint">
                A photo taken now stays up {untilWords(Number(maxAge))}, then the drawn menu board comes back by itself.
              </p>
            </div>
            {!file && block.url && (
              <div className="chalk__row">
                {!takeDown && !keepUp && (
                  <button type="button" className="btn btn--ghost chalk__btn" onClick={() => { setKeepUp(true); setDone(null); }}>
                    The board hasn’t changed — {block.enabled && live ? 'keep this photo up longer' : 'put the last photo back up'}
                  </button>
                )}
                {block.enabled && live && !takeDown && (
                  <button type="button" className="btn btn--ghost chalk__btn" onClick={() => { setTakeDown(true); setKeepUp(false); setDone(null); }}>
                    Take the photo down — show the drawn menu board
                  </button>
                )}
              </div>
            )}
          </details>
        </>
      )}
    </div>
  );
}
