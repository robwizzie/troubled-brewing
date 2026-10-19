import { useRef, useState } from 'react';
import { uploadImage, formatBytes } from '../lib/uploadImage.js';
import { useToast } from './ui.jsx';
import { mediaUrl } from '../../lib/config.js';

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
      toast('Photo uploaded — it goes on the site when you press Publish');
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
          {value ? <img src={mediaUrl(value)} alt="" /> : <span className="imagefield__empty" aria-hidden="true">No image</span>}
        </div>
        <div className="imagefield__controls">
          <div className="imagefield__buttons">
            <label className={`btn btn--ghost btn--sm imagefield__pick ${busy ? 'is-busy' : ''}`}>
              {busy ? 'Shrinking & uploading…' : value ? '📷 Change photo' : '📷 Choose a photo'}
              <input ref={inputRef} type="file" accept="image/*" onChange={onFile} disabled={busy} className="sr-only" />
            </label>
            {value && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => { onChange(''); setStats(null); }}>
                Remove photo
              </button>
            )}
          </div>
          {stats && (
            <span className="field__hint">Shrunk to keep the site fast: {formatBytes(stats.before)} → <strong>{formatBytes(stats.after)}</strong></span>
          )}
          <details className="advanced imagefield__advanced">
            <summary>Advanced: use a link instead</summary>
            <input
              type="text"
              aria-label={`${label}: link to a photo`}
              placeholder="Paste a link to a photo"
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              className="imagefield__url"
            />
          </details>
        </div>
      </div>
    </div>
  );
}
