import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { bump } from '../../lib/dataVersion.js';
import { useToast, Spinner } from '../components/ui.jsx';
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
   comes back on its own. "Remove" switches it off right away. */

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
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [block, setBlock] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [caption, setCaption] = useState('');
  const [maxAge, setMaxAge] = useState(DEFAULT_MAX_AGE_DAYS);
  const [busy, setBusy] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadBlock()
      .then((b) => { setBlock(b); setCaption(b.caption || ''); setMaxAge(maxAgeOf(b)); })
      .catch(() => toast('Could not load the chalkboard', 'error'))
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
    setStats(null);
  }

  async function publish() {
    if (!file && !block.url) return;
    setBusy('publish');
    try {
      let { url, path } = block;
      if (file) {
        const res = await uploadImage(file, { preset: 'chalkboard', folder: 'chalkboard' });
        ({ url, path } = res);
        setStats({ before: res.before, after: res.after });
      }
      const next = {
        url,
        path: path || '',
        caption: caption.trim().slice(0, 120),
        updated_at: new Date().toISOString(),
        enabled: true,
        max_age_days: Number(maxAge) || DEFAULT_MAX_AGE_DAYS,
      };
      await saveBlock(next);
      // tidy up yesterday's photo (best effort — only our own chalkboard/ files)
      if (file && block.path && block.path !== next.path && block.path.startsWith('chalkboard/')) {
        deleteMedia(block.path).catch(() => {});
      }
      setBlock(next);
      setFile(null);
      bump('content_blocks');
      toast('Chalkboard published — it’s on the homepage now');
    } catch (e) {
      toast(e.message || 'Publish failed', 'error');
    } finally {
      setBusy('');
    }
  }

  async function remove() {
    setBusy('remove');
    try {
      const next = { ...block, enabled: false };
      await saveBlock(next);
      setBlock(next);
      setFile(null);
      bump('content_blocks');
      toast('Back to the drawn board');
    } catch (e) {
      toast(e.message || 'Could not switch it off', 'error');
    } finally {
      setBusy('');
    }
  }

  if (loading) return <Spinner />;

  const live = isChalkboardLive(block);
  const stale = block.enabled && block.url && !live;
  const shown = preview || block.url;

  return (
    <div className="chalkmgr">
      <h1>Today’s chalkboard</h1>
      <p className="admin__lead">
        Snap the chalkboard in the shop and it goes up on the homepage in place of the drawn board.
        After {maxAge === 1 ? 'today' : `${maxAge} days`} it comes down by itself, so old specials never linger.
      </p>

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
            <span>No photo yet</span>
          )}
          {file && <span className="chalkmgr__badge">New — not published yet</span>}
        </div>

        <div className="chalkmgr__pick">
          <label className="btn btn--primary chalkmgr__btn">
            📷 Take a photo
            <input type="file" accept="image/*" capture="environment" onChange={onPick} disabled={!!busy} className="sr-only" />
          </label>
          <label className="btn btn--ghost chalkmgr__btn">
            Choose a photo
            <input type="file" accept="image/*" onChange={onPick} disabled={!!busy} className="sr-only" />
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
          <button type="button" className="btn btn--primary chalkmgr__btn" onClick={publish} disabled={!!busy || (!file && !block.url)}>
            {busy === 'publish' ? (file ? 'Shrinking & uploading…' : 'Publishing…') : file ? 'Publish this photo' : 'Re-publish (board hasn’t changed)'}
          </button>
          {block.enabled && (
            <button type="button" className="btn btn--ghost chalkmgr__btn" onClick={remove} disabled={!!busy}>
              {busy === 'remove' ? 'Switching…' : 'Remove — go back to the drawn board'}
            </button>
          )}
        </div>
        {stats && <p className="field__hint">Photo shrunk: {formatBytes(stats.before)} → <strong>{formatBytes(stats.after)}</strong></p>}
      </section>
    </div>
  );
}
