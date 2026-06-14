import { useRef, useState } from 'react';
import { uploadImage, formatBytes } from '../lib/uploadImage.js';
import { useToast } from './ui.jsx';

/* Image upload control with client-side compression + size before/after.
   Used across the admin (menu items, gallery, team, heroes, etc.). */
export default function ImageField({ label = 'Image', value, onChange, preset = 'card', folder = 'uploads' }) {
  const toast = useToast();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(null);

  async function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStats(null);
    try {
      const res = await uploadImage(file, { preset, folder });
      onChange(res.url);
      setStats({ before: res.before, after: res.after });
      toast('Image uploaded');
    } catch (err) {
      toast(err.message || 'Upload failed', 'error');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      <div className="imagefield">
        <div className="imagefield__preview">
          {value ? <img src={value} alt="" /> : <span className="imagefield__empty" aria-hidden="true">No image</span>}
        </div>
        <div className="imagefield__controls">
          <input ref={inputRef} type="file" accept="image/*" onChange={onFile} disabled={busy} />
          {busy && <span className="field__hint">Compressing & uploading…</span>}
          {stats && (
            <span className="field__hint">Optimized: {formatBytes(stats.before)} → <strong>{formatBytes(stats.after)}</strong></span>
          )}
          {value && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => { onChange(''); setStats(null); }}>
              Remove
            </button>
          )}
          <input
            type="text"
            placeholder="…or paste an image URL"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="imagefield__url"
          />
        </div>
      </div>
    </div>
  );
}
