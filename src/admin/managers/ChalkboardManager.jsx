import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { bump } from '../../lib/dataVersion.js';
import { useToast, Spinner } from '../components/ui.jsx';
import { ActionBar, PublishScope, ScreenHead, usePublishUnit } from '../lib/publishing.jsx';
import { uploadImage, deleteMedia, formatBytes } from '../lib/uploadImage.js';
import {
  CHALKBOARD_KEY, DEFAULT_MAX_AGE_DAYS, MAX_AGE_CHOICES,
  isChalkboardLive, maxAgeOf, updatedLabel,
} from '../../lib/chalkboard.js';

/* "Today's chalkboard" — built to be used standing at the counter on a phone:
   snap the real board, check the preview, add a few words if you like,
   Publish. The photo is compressed in the browser (≈1600px, WebP) before it
   goes to the `media` bucket under chalkboard/, and content_blocks
   .chalkboard_photo becomes { url, path, caption, updated_at, enabled: true,
   max_age_days }. The homepage hero then shows the photo in place of the drawn
   board until it's older than max_age_days, when the drawn board (live menu)
   comes back on its own.

   Explicit publishing: picking a photo, changing the words, "keep it up" and
   "take it down" are all staged on this screen; the shared action bar's
   Publish button does the upload + the one content_blocks write. */

const EMPTY = { url: '', path: '', caption: '', updated_at: null, enabled: false, max_age_days: DEFAULT_MAX_AGE_DAYS };

async function loadBlock() {
  const { data, error } = await supabase.from('content_blocks').select('data').eq('key', CHALKBOARD_KEY).maybeSingle();
  if (error) throw error;
  return { ...EMPTY, ...(data?.data || {}) };
}
async function saveBlock(data) {
  const { error } = await supabase.from('content_blocks').upsert({ key: CHALKBOARD_KEY, data, status: 'published' }, { onConflict: 'key' });
  if (error) throw error;
}

function when(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function ChalkboardManager() {
  return (
    <PublishScope id="chalkboard">
      <ChalkboardScreen />
    </PublishScope>
  );
}

function ChalkboardScreen() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [maxAge, setMaxAge] = useState(DEFAULT_MAX_AGE_DAYS);
  const [takeDown, setTakeDown] = useState(false);
  const [keepUp, setKeepUp] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadBlock()
      .then((b) => { setBlock(b); setCaption(b.caption || ''); setMaxAge(maxAgeOf(b)); })
      .catch(() => toast('Could not load the chalkboard — refresh the page to try again.', 'error'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // local preview of the picked photo (nothing is uploaded until Publish)
  useEffect(() => {
    if (!file) { setPreview(''); return undefined; }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  function onPick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast('Please choose a photo.', 'error'); return; }
    setFile(f);
    setTakeDown(false);
    setStats(null);
  }

  const captionChanged = caption.trim() !== (block.caption || '').trim();
  const ageChanged = Number(maxAge) !== maxAgeOf(block);
  const dirty = !loading && Boolean(file || takeDown || keepUp || captionChanged || ageChanged);

  async function publish() {
    let next;
    if (takeDown) {
      next = { ...block, enabled: false };
    } else {
      let { url, path } = block;
      if (file) {
        const res = await uploadImage(file, { preset: 'chalkboard', folder: 'chalkboard' });
        ({ url, path } = res);
        setStats({ before: res.before, after: res.after });
      }
      const goesUp = Boolean(file || keepUp);
      next = {
        url,
        path: path || '',
        caption: caption.trim().slice(0, 120),
        updated_at: goesUp ? new Date().toISOString() : block.updated_at,
        enabled: goesUp ? true : block.enabled,
        max_age_days: Number(maxAge) || DEFAULT_MAX_AGE_DAYS,
      };
    }
    await saveBlock(next);
    // tidy up yesterday's photo (best effort — only our own chalkboard/ files)
    if (file && block.path && block.path !== next.path && block.path.startsWith('chalkboard/')) {
      deleteMedia(block.path).catch(() => {});
    }
    setBlock(next);
    setCaption(next.caption || '');
    setFile(null);
    setTakeDown(false);
    setKeepUp(false);
    bump('content_blocks');
  }

  function discard() {
    setFile(null);
    setTakeDown(false);
    setKeepUp(false);
    setCaption(block.caption || '');
    setMaxAge(maxAgeOf(block));
  }

  usePublishUnit('chalkboard', {
    dirty,
    publish,
    discard,
    note: dirty
      ? takeDown
        ? 'The drawn board comes back when you press Publish'
        : file
          ? 'New photo — not on the homepage until you press Publish'
          : 'Unsaved changes — not on the site yet'
      : undefined,
  });

  if (loading) return <Spinner />;

  const live = isChalkboardLive(block);
  const stale = block.enabled && block.url && !live;
  const shown = takeDown ? '' : preview || block.url;

  return (
    <div className="chalkmgr editscreen">
      <ScreenHead
        title="Today’s chalkboard"
        help={`Snap the chalkboard in the shop and it goes up on the homepage in place of the drawn board. After ${maxAge === 1 ? 'today' : `${maxAge} days`} it comes down by itself, so old specials never linger.`}
      />

      <section className="admin__panel">
        <p className={`chalkmgr__status ${live ? 'is-live' : ''}`} role="status">
          {live && <>Showing on the homepage · {updatedLabel(block.updated_at).toLowerCase()} ({when(block.updated_at)})</>}
          {stale && <>Not showing — the last photo ({when(block.updated_at)}) is too old, so the drawn board is up.</>}
          {!block.enabled && <>Not showing — the drawn board (from your live menu) is up.{block.updated_at ? ` Last photo: ${when(block.updated_at)}.` : ''}</>}
        </p>

        <div className="chalkmgr__preview">
          {shown ? (
            <img src={shown} alt={file ? 'Preview of the new chalkboard photo' : 'The current chalkboard photo'} />
          ) : (
            <span>{takeDown ? 'The drawn board will show' : 'No photo yet'}</span>
          )}
          {file && <span className="chalkmgr__badge">New — not published yet</span>}
          {takeDown && <span className="chalkmgr__badge">Coming down when you publish</span>}
        </div>

        <div className="chalkmgr__pick">
          <label className="btn btn--primary chalkmgr__btn">
            📷 Take a photo
            <input type="file" accept="image/*" capture="environment" onChange={onPick} className="sr-only" />
          </label>
          <label className="btn btn--ghost chalkmgr__btn">
            Choose a photo
            <input type="file" accept="image/*" onChange={onPick} className="sr-only" />
          </label>
        </div>

        <div className="field">
          <label htmlFor="chalk-caption">A few words (optional)</label>
          <input id="chalk-caption" value={caption} maxLength={120} placeholder="e.g. Pumpkin cold foam is back!" onChange={(e) => setCaption(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="chalk-age">Take it down after</label>
          <select id="chalk-age" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))}>
            {MAX_AGE_CHOICES.map((n) => <option key={n} value={n}>{n === 1 ? 'Today only' : `${n} days`}</option>)}
          </select>
          <p className="field__hint">Counted in days, today included. When it runs out the homepage goes back to the drawn board on its own.</p>
        </div>

        <div className="chalkmgr__actions">
          {!file && block.url && !takeDown && (
            <label className="checkfield">
              <input type="checkbox" checked={keepUp} onChange={(e) => setKeepUp(e.target.checked)} />
              <span>The board hasn’t changed — {block.enabled ? 'keep this photo up' : 'put this photo back up'} and restart the countdown</span>
            </label>
          )}
          {block.enabled && !file && (
            takeDown ? (
              <button type="button" className="btn btn--ghost chalkmgr__btn" onClick={() => setTakeDown(false)}>Undo — keep the photo up</button>
            ) : (
              <button type="button" className="btn btn--ghost chalkmgr__btn" onClick={() => { setTakeDown(true); setKeepUp(false); }}>
                Take it down — go back to the drawn board
              </button>
            )
          )}
        </div>
        {stats && <p className="field__hint">Photo shrunk: {formatBytes(stats.before)} → <strong>{formatBytes(stats.after)}</strong></p>}
      </section>
      <ActionBar publishLabel={file ? 'Publish this photo' : 'Publish'} />
    </div>
  );
}
