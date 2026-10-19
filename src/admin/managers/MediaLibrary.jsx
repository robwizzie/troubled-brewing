import { useEffect, useRef, useState } from 'react';
import { listMedia, deleteMedia, uploadImage, formatBytes } from '../lib/uploadImage.js';
import { useToast, Spinner, Empty, ConfirmModal } from '../components/ui.jsx';
import { ScreenHead } from '../lib/publishing.jsx';

/* Browse / upload / delete images in Supabase Storage. */
export default function MediaLibrary() {
  const toast = useToast();
  const fileRef = useRef(null);
  const [media, setMedia] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  async function load() {
    try { setMedia(await listMedia('uploads')); }
    catch (e) { toast(e.message || 'Could not load media', 'error'); setMedia([]); }
  }
  // load-once on mount: `load` is a new identity every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { await uploadImage(file, { preset: 'card', folder: 'uploads' }); toast('Uploaded'); load(); }
    catch (err) { toast(err.message || 'Upload failed', 'error'); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  async function del(path) {
    try { await deleteMedia(path); toast('Deleted'); setConfirmDel(null); load(); }
    catch (e) { toast(e.message || 'Delete failed', 'error'); }
  }

  function copy(url) {
    navigator.clipboard?.writeText(url).then(() => toast('Link copied'));
  }

  if (media === null) return <Spinner />;

  return (
    <div>
      <ScreenHead
        title="Photo library"
        help="Every photo you’ve uploaded. Uploading here doesn’t put a photo on the site — pick it in the editor or a list, then Publish."
      >
        <label className="btn btn--primary">
          {busy ? 'Uploading…' : '+ Upload photo'}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} disabled={busy} />
        </label>
      </ScreenHead>
      <p className="field__hint">Photos are shrunk automatically on upload to keep the site fast.</p>

      {media.length === 0 ? (
        <Empty>No photos yet. Upload your first one with the button above.</Empty>
      ) : (
        <div className="media-grid">
          {media.map((m) => (
            <figure key={m.path} className="media-tile">
              <img src={m.url} alt={m.name} loading="lazy" />
              <figcaption>
                <span className="field__hint">{m.size ? formatBytes(m.size) : ''}</span>
                <div className="media-tile__actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => copy(m.url)}>Copy link</button>
                  <button className="btn btn--danger btn--sm" onClick={() => setConfirmDel(m.path)}>Delete</button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDel)}
        title="Delete this photo for good?"
        body="This happens straight away and can’t be undone. If the photo is used on a page, that spot will show no photo until you replace it."
        confirmLabel="Delete"
        onConfirm={() => del(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
