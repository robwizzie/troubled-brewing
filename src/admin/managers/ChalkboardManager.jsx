import { useCallback, useEffect, useMemo, useState } from 'react';
import { LuEye, LuEyeOff, LuInfinity, LuSearch } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { bump } from '../../lib/dataVersion.js';
import { publicUrl } from '../../lib/config.js';
import { LuCamera, LuCircleCheck, LuExternalLink, LuPartyPopper, LuPencilLine, LuRefreshCw } from 'react-icons/lu';
import { Spinner } from '../components/ui.jsx';
import { Icon } from '../components/Icon.jsx';
import { PublishScope, ScreenHead, usePublishUnit } from '../lib/publishing.jsx';
import { uploadImage, listMedia } from '../lib/uploadImage.js';
import { IMAGE_MESSAGES, canDisplay, checkPickedImage, isHeic } from '../lib/imageFile.js';
import { friendlyError } from '../lib/publishHelpers.js';
import { recordPublish } from '../lib/nav.js';
import {
  chalkStatus, comesDownOn, dayWords, loadChalkboard, loadChalkboardHistory, saveChalkboard, saveChalkboardHistory, untilWords,
  EMPTY_CHALKBOARD,
} from '../lib/chalkStatus.js';
import {
  DEFAULT_MAX_AGE_DAYS, KEEP, MAX_AGE_CHOICES, MIN_PAST_BOARDS, addToHistory, boardDate, durationOf, entryFor, historyBoards,
  isChalkboardLive, keepsUntilReplaced, updatedLabel,
} from '../../lib/chalkboard.js';
import './ChalkboardManager.css';

/* "Today's chalkboard" — the job staff do most, usually one-handed at the
   counter. Three taps:

     1. "Take a photo of the board" (opens the phone camera)
     2. look at the preview — exactly the homepage's framed, tilted board
     3. "Put it on the website"

   Nothing leaves the phone before step 3: the preview is a local copy. Step 3
   compresses + uploads the photo (media bucket, chalkboard/<timestamp>-…, a
   new file every time) and makes the content_blocks.chalkboard_photo write:
     { url, path, caption, updated_at, enabled: true, max_age_days, keep_until_replaced }
   The homepage then shows it until it's `max_age_days` old, when the drawn
   menu board comes back by itself — or, with "Until I replace it", until the
   next photo goes up.

   Old photos are never deleted: each publish is added to
   content_blocks.chalkboard_history, which the public "Past boards"
   flip-through reads. Staff can hide a past board (a blurry one) from the
   public history; like everything else here, that waits for the big button.

   The words under the photo are optional and folded away. "Keep it up" and
   "Take it down" are staged the same way and go live with the same one big
   button. */

const MAX_CAPTION = 120;
const DURATION_CHOICES = [...MAX_AGE_CHOICES, KEEP];
const HISTORY_PAGE = 8;

function durationLabel(d) {
  if (d === KEEP) return 'Until I replace it';
  return `${d === 1 ? 'Today only' : `${d} days`}${d === DEFAULT_MAX_AGE_DAYS ? ' (usual)' : ''}`;
}

/** The upload time baked into our own storage names: chalkboard/<ms>-name.webp */
function publishedFromPath(path) {
  const m = /(?:^|\/)(\d{12,14})-[^/]*$/.exec(path || '');
  return m ? new Date(Number(m[1])).toISOString() : null;
}

/** The history the screen shows and Publish writes: the stored list, plus the
    current photo if it predates the history (so it's never lost), plus any
    staged imports, with the staged hide/show choices applied. */
function mergeHistory(stored, { current, imported = [], hidden = {} }) {
  let list = historyBoards(stored);
  if (current?.url && current.updated_at && !list.some((b) => b.id === String(current.path || current.url))) {
    list = addToHistory(list, entryFor(current));
  }
  for (const e of imported) if (!list.some((b) => b.id === e.id)) list = addToHistory(list, e);
  return list.map((b) => (b.id in hidden ? { ...b, hidden: hidden[b.id] } : b));
}

const sameHistory = (a, b) => JSON.stringify(historyBoards(a)) === JSON.stringify(historyBoards(b));

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
  const [duration, setDuration] = useState(DEFAULT_MAX_AGE_DAYS); // KEEP or a number of days
  const [history, setHistory] = useState([]); // as stored (hidden ones included)
  const [hiddenDraft, setHiddenDraft] = useState({}); // id → hidden, only where it differs from stored
  const [imported, setImported] = useState([]); // older photos found in storage, not yet published
  const [importState, setImportState] = useState(''); // '' | 'looking' | 'none' | 'error'
  const [histSaved, setHistSaved] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [takeDown, setTakeDown] = useState(false);
  const [keepUp, setKeepUp] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // 'up' | 'down' | 'kept' | 'edited'

  const load = useCallback(() => {
    setLoading(true);
    setLoadFailed(false);
    Promise.all([loadChalkboard(), loadChalkboardHistory().catch(() => [])])
      .then(([b, h]) => { setBlock(b); setCaption(b.caption || ''); setDuration(durationOf(b)); setHistory(h); })
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

  const keep = duration === KEEP;
  const captionChanged = caption.trim() !== (block.caption || '').trim();
  const ageChanged = duration !== durationOf(block);
  const histDirty = Object.keys(hiddenDraft).length > 0 || imported.length > 0;
  const staged = file ? 'up' : takeDown ? 'down' : keepUp ? 'kept' : captionChanged || ageChanged ? 'edited' : histDirty ? 'history' : null;
  const dirty = !loading && Boolean(staged);

  const pastBoards = useMemo(
    () => mergeHistory(history, { current: block, imported, hidden: hiddenDraft }),
    [history, block, imported, hiddenDraft]
  );

  async function publish() {
    let next;
    if (takeDown) {
      next = { ...block, enabled: false };
    } else if (staged === 'history') {
      next = block;
    } else {
      let { url, path } = block;
      // a new, uniquely named file every time — the old one stays for the history
      if (file) ({ url, path } = await uploadImage(file, { preset: 'chalkboard', folder: 'chalkboard' }));
      const goesUp = Boolean(file || keepUp);
      next = {
        url,
        path: path || '',
        caption: caption.trim().slice(0, MAX_CAPTION),
        updated_at: goesUp ? new Date().toISOString() : block.updated_at,
        enabled: goesUp ? true : block.enabled,
        max_age_days: keep ? null : Number(duration) || DEFAULT_MAX_AGE_DAYS,
        keep_until_replaced: keep,
      };
    }
    if (next !== block) await saveChalkboard(next);

    // The history: re-read what's stored right before writing (another phone
    // may have published since this screen loaded), then add this publish.
    let nextHistory = null;
    try {
      const stored = await loadChalkboardHistory();
      let list = mergeHistory(stored, { current: block, imported, hidden: hiddenDraft });
      if (next.url && next.updated_at && next.enabled && staged !== 'history') list = addToHistory(list, entryFor(next));
      if (!sameHistory(list, stored)) await saveChalkboardHistory(list);
      nextHistory = list;
    } catch (e) {
      // only the history was being changed: that's a real failure
      if (next === block) throw e;
      // the photo itself is up; the history catches up on the next publish
      // eslint-disable-next-line no-console
      console.warn('[chalkboard history]', e);
    }

    setBlock(next);
    setCaption(next.caption || '');
    setDuration(durationOf(next));
    if (nextHistory) setHistory(nextHistory);
    setHiddenDraft({});
    setImported([]);
    setImportState('');
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
    setDuration(durationOf(block));
    setHiddenDraft({});
    setImported([]);
    setImportState('');
    setError('');
  }

  function toggleHidden(b) {
    const stored = mergeHistory(history, { current: block, imported }).find((x) => x.id === b.id);
    const want = !b.hidden;
    setHistSaved(false);
    setHiddenDraft((d) => {
      const nextDraft = { ...d };
      if (want === Boolean(stored?.hidden)) delete nextDraft[b.id];
      else nextDraft[b.id] = want;
      return nextDraft;
    });
  }

  async function findOlderPhotos() {
    setImportState('looking');
    setHistSaved(false);
    try {
      const files = await listMedia('chalkboard');
      const known = new Set(pastBoards.map((b) => b.id));
      const found = files
        .filter((f) => f.path && !known.has(f.path))
        .map((f) => ({ id: f.path, url: f.url, path: f.path, caption: '', published_at: publishedFromPath(f.path), hidden: false }));
      setImported((prev) => [...prev, ...found]);
      setImportState(found.length ? '' : 'none');
    } catch {
      setImportState('error');
    }
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
      if (kind === 'history') { setHistSaved(true); return; }
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
    history: 'Update past boards on the website',
  }[staged];
  const importedIds = new Set(imported.map((b) => b.id));
  const visibleBoards = showAll ? pastBoards : pastBoards.slice(0, HISTORY_PAGE);
  const publicCount = pastBoards.filter((b) => !b.hidden).length;

  return (
    <div className="chalk editscreen">
      <ScreenHead
        title="Today’s chalkboard"
        help="Snap the real chalkboard and it goes on the homepage in place of the drawn menu board. It comes down by itself after a few days (or stays until you post a new one, if you choose), and every board you put up is kept in Past boards."
      />

      <p className={`chalk__status ${status.live ? 'is-live' : ''}`} role="status">
        <Icon icon={status.live ? LuCircleCheck : LuPencilLine} size={20} /> {status.text}
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
          {signedOut && <a className="btn btn--ghost chalk__btn" href={`${import.meta.env.BASE_URL}admin/login`} target="_blank" rel="noreferrer"><Icon icon={LuExternalLink} size={16} />Sign in again</a>}
        </div>
      )}

      {done ? (
        <section className="chalk__done" aria-labelledby="chalk-done-title">
          <p className="chalk__done-icon" aria-hidden="true"><Icon icon={done === 'down' ? LuPencilLine : LuPartyPopper} size={44} /></p>
          <h2 id="chalk-done-title">
            {done === 'up' && 'It’s on the website!'}
            {done === 'kept' && 'Done — the photo stays up.'}
            {done === 'edited' && 'Done — your changes are on the website.'}
            {done === 'down' && 'Done — the drawn menu board is back.'}
          </h2>
          <p>
            {done === 'down'
              ? 'The homepage shows your live menu in chalk again.'
              : live && keepsUntilReplaced(block)
                ? 'It’s on the homepage now and stays up until you post a new one.'
                : live
                  ? (() => {
                    const d = comesDownOn(block.updated_at, durationOf(block));
                    return `It’s on the homepage now and comes down by itself ${dayWords(d.date, d.daysAway)}.`;
                  })()
                  : 'Saved.'}
          </p>
          <div className="chalk__done-actions">
            <a className="btn btn--primary chalk__big" href={publicUrl()} target="_blank" rel="noreferrer"><Icon icon={LuExternalLink} size={20} />See it on the website</a>
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
                {!busy && <Icon icon={LuCircleCheck} size={22} />}{busy ? 'Putting it up…' : publishLabel}
              </button>
              <div className="chalk__row">
                <CameraButton label={<><Icon icon={LuRefreshCw} size={18} />Retake</>} onPick={onPick} />
                <button type="button" className="btn btn--ghost chalk__btn" onClick={discard} disabled={busy}>Cancel</button>
              </div>
            </section>
          ) : (
            <section className="chalk__step" aria-label="Take a photo">
              <CameraButton big label={<><Icon icon={LuCamera} size={26} />Take a photo of the board</>} onPick={onPick} />
              <CameraButton label="or choose a photo you already took" onPick={onPick} capture={false} />

              {staged && staged !== 'history' && (
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

              {(!staged || staged === 'history') && live && (
                <>
                  <p className="chalk__steplabel">On the homepage now:</p>
                  <HomepageBoard url={block.url} caption={(block.caption || '').trim()} when={updatedLabel(block.updated_at)} />
                </>
              )}
            </section>
          )}

          {(file || (block.url && !takeDown)) && (
            <fieldset className="chalkdur">
              <legend className="chalkdur__legend">How long should it stay up?</legend>
              <div className="chalkdur__choices">
                {DURATION_CHOICES.map((d) => (
                  <label key={d} className={`chalkdur__choice ${duration === d ? 'is-on' : ''} ${d === KEEP ? 'chalkdur__choice--keep' : ''}`}>
                    <input
                      type="radio"
                      name="chalk-duration"
                      value={String(d)}
                      checked={duration === d}
                      onChange={() => { setDuration(d); setDone(null); }}
                    />
                    {d === KEEP && <LuInfinity aria-hidden="true" />}
                    {durationLabel(d)}
                  </label>
                ))}
              </div>
              <p className="field__hint chalkdur__hint" aria-live="polite">
                {keep
                  ? 'Stays up until you post a new one — no expiry date.'
                  : `A photo taken now stays up ${untilWords(Number(duration))}, then the drawn menu board comes back by itself.`}
              </p>
            </fieldset>
          )}

          {(file || (block.url && !takeDown)) && (
            <details className="chalk__opt">
              <summary><Icon icon={LuPencilLine} size={16} /> Add a few words under the photo <small>(optional)</small></summary>
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

          {!file && block.url && (
            <details className="chalk__opt">
              <summary>More options</summary>
              <div className="chalk__row">
                {!takeDown && !keepUp && !(live && keepsUntilReplaced(block)) && (
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
            </details>
          )}

          <details className="chalk__opt chalkhist">
            <summary>
              Past boards <small>({pastBoards.length})</small>
            </summary>
            <p className="field__hint chalkhist__intro">
              Every photo you put up is kept here. Visitors can flip through them from the homepage
              {pastBoards.length < MIN_PAST_BOARDS ? ' once there are two or more' : ` (${publicCount} showing)`}.
              Hide a blurry one and it stays saved, it just won’t show.
            </p>

            {pastBoards.length > 0 && (
              <ul className="chalkhist__list">
                {visibleBoards.map((b) => {
                  const isCurrent = live && b.id === String(block.path || block.url);
                  const pending = b.id in hiddenDraft;
                  return (
                    <li key={b.id} className={`chalkhist__item ${b.hidden ? 'is-hidden' : ''}`}>
                      <img className="chalkhist__thumb" src={b.url} alt="" loading="lazy" decoding="async" width="88" height="66" />
                      <div className="chalkhist__text">
                        <p className="chalkhist__date">{boardDate(b.published_at) || 'Date unknown'}</p>
                        {b.caption && <p className="chalkhist__caption">{b.caption}</p>}
                        <p className="chalkhist__tags">
                          {isCurrent && <span className="badge badge--live">On the homepage now</span>}
                          {importedIds.has(b.id) && <span className="badge badge--draft">Found — added when you publish</span>}
                          {b.hidden && <span className="badge badge--hidden">{pending ? 'Hidden once you publish' : 'Hidden from the website'}</span>}
                          {!b.hidden && pending && <span className="badge badge--draft">Shown again once you publish</span>}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm chalkhist__toggle"
                        onClick={() => toggleHidden(b)}
                        aria-label={`${b.hidden ? 'Show' : 'Hide'} the board from ${boardDate(b.published_at) || 'an unknown date'}${b.hidden ? ' on the website again' : ' from the website'}`}
                      >
                        {b.hidden ? <LuEye aria-hidden="true" /> : <LuEyeOff aria-hidden="true" />}
                        {b.hidden ? 'Show it' : 'Hide'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {pastBoards.length > HISTORY_PAGE && !showAll && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowAll(true)}>
                Show all {pastBoards.length}
              </button>
            )}

            <div className="chalkhist__import">
              <button type="button" className="btn btn--ghost btn--sm" onClick={findOlderPhotos} disabled={importState === 'looking' || busy}>
                <LuSearch aria-hidden="true" /> {importState === 'looking' ? 'Looking…' : 'Find older board photos'}
              </button>
              {importState === 'none' && <span className="field__hint">No other board photos were found. Photos replaced before this list existed were deleted at the time.</span>}
              {importState === 'error' && <span className="field__hint">Couldn’t look just now. Check the connection and try again.</span>}
            </div>

            {staged === 'history' && (
              <div className="chalkhist__publish">
                <p className="chalk__steplabel"><span className="chalk__pill">Not on the website yet</span></p>
                <button type="button" className="btn btn--primary chalk__big chalk__publish" onClick={putLive} disabled={busy}>
                  {busy ? 'Saving…' : publishLabel}
                </button>
                <button type="button" className="btn btn--ghost chalk__btn" onClick={discard} disabled={busy}>Cancel</button>
              </div>
            )}
            {histSaved && !staged && <p className="chalkhist__saved" role="status">Saved — the website’s past boards are up to date.</p>}
          </details>
        </>
      )}
    </div>
  );
}
