import { useEffect, useRef, useState } from 'react';
import { listMedia, deleteMedia, uploadImage, formatBytes } from '../lib/uploadImage.js';
import { useToast, Spinner, Empty, ConfirmModal } from '../components/ui.jsx';

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
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

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
      <div className="admin__pagehead">
        <h1>Media Library</h1>
        <label className="btn btn--primary">
          {busy ? 'Uploading…' : '+ Upload image'}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} disabled={busy} />
        </label>
      </div>
      <p className="field__hint">Images are automatically compressed on upload to keep your site fast and within free limits.</p>

      {media.length === 0 ? (
        <Empty>No images yet. Upload your first photo above.</Empty>
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
        title="Delete this image?"
        body="If it's used on a page, that spot will show no image until you replace it."
        confirmLabel="Delete"
        onConfirm={() => del(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
