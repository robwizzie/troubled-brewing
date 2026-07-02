import { useState } from 'react';
import { schemaFor } from './schemas.js';
import { updateData, saveDataDraft } from '../lib/adminData.js';
import { useToast, Hint } from '../components/ui.jsx';
import ImageField from '../components/ImageField.jsx';
import RevisionHistory from '../components/RevisionHistory.jsx';
import { FRAME_STYLE_OPTIONS, normalizeFrameStyle } from '../../lib/frameStyles.js';

function FramesEditor({ value = [], onChange }) {
  const frames = Array.isArray(value) ? value : [];
  const update = (i, key, val) => onChange(frames.map((f, idx) => (idx === i ? { ...f, [key]: val } : f)));
  const add = () => onChange([...frames, { label: '', link: '/menu', frame_style: 'gilt-thin', image_url: '' }]);
  const remove = (i) => onChange(frames.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= frames.length) return;
    const next = [...frames];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="frames-editor">
      {frames.map((f, i) => (
        <div key={i} className="frames-editor__row card">
          <div className="card__body">
            <div className="frames-editor__head">
              <strong>Frame {i + 1}</strong>
              <div>
                <button type="button" className="iconbtn" onClick={() => move(i, -1)} disabled={i === 0}>▲</button>
                <button type="button" className="iconbtn" onClick={() => move(i, 1)} disabled={i === frames.length - 1}>▼</button>
                <button type="button" className="iconbtn" onClick={() => remove(i)}>✕</button>
              </div>
            </div>
            <ImageField label="Image" value={f.image_url} preset="card" folder="frames" onChange={(url) => update(i, 'image_url', url)} />
            <div className="field"><label>Label</label><input value={f.label || ''} onChange={(e) => update(i, 'label', e.target.value)} /></div>
            <div className="field"><label>Links to</label><input value={f.link || ''} placeholder="/menu" onChange={(e) => update(i, 'link', e.target.value)} /></div>
            <div className="field"><label>Frame style</label>
              {/* normalize so a legacy saved value (e.g. "pink") shows as the
                  vintage style it now renders as, instead of a blank select */}
              <select value={normalizeFrameStyle(f.frame_style)} onChange={(e) => update(i, 'frame_style', e.target.value)}>
                {FRAME_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={add}>+ Add frame</button>
    </div>
  );
}

function ImagesEditor({ value = [], onChange }) {
  const images = Array.isArray(value) ? value : [];
  const update = (i, key, val) => onChange(images.map((m, idx) => (idx === i ? { ...m, [key]: val } : m)));
  const add = () => onChange([...images, { url: '', alt: '' }]);
  const remove = (i) => onChange(images.filter((_, idx) => idx !== i));
  return (
    <div>
      {images.map((m, i) => (
        <div key={i} className="card" style={{ marginBottom: 'var(--space-3)' }}>
          <div className="card__body">
            <ImageField label={`Image ${i + 1}`} value={m.url} preset="card" folder="gallery" onChange={(url) => update(i, 'url', url)} />
            <div className="field"><label>Alt text</label><input value={m.alt || ''} onChange={(e) => update(i, 'alt', e.target.value)} /></div>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(i)}>Remove image</button>
          </div>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={add}>+ Add image</button>
    </div>
  );
}

function Input({ field, value, onChange }) {
  switch (field.type) {
    case 'textarea':
    case 'markdown':
      return <textarea rows={field.rows || 4} value={value || ''} onChange={(e) => onChange(e.target.value)} />;
    case 'number':
      return <input type="number" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
    case 'select':
      return (
        <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    default:
      return <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

export default function SectionEditor({ section, onClose, onSaved }) {
  const toast = useToast();
  const schema = schemaFor(section.type);
  const [form, setForm] = useState({ ...(section.data || {}), ...(section.draft_data || {}) });
  const [saving, setSaving] = useState(false);

  const setField = (name, val) => setForm((f) => ({ ...f, [name]: val }));

  async function save({ publish }) {
    setSaving(true);
    try {
      if (publish) {
        await updateData('sections', section.id, form);
        toast('Section published');
      } else {
        await saveDataDraft('sections', section.id, form);
        toast('Saved as draft (not yet public)');
      }
      onSaved?.();
      onClose();
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-drawer-backdrop" onClick={onClose}>
      <aside className="admin-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="admin-drawer__head">
          <h2>Edit section</h2>
          <button className="iconbtn" aria-label="Close" onClick={onClose}>✕</button>
        </div>
        <div className="admin-drawer__body">
          {schema.note && <p className="admin-note">{schema.note}</p>}
          {schema.fields.map((f) => (
            <div key={f.name} className="field">
              <label>{f.label}{f.hint && <Hint>{f.hint}</Hint>}</label>
              {f.type === 'image' ? (
                <ImageField label="" value={form[f.name]} preset={f.preset || 'card'} folder="sections" onChange={(url) => setField(f.name, url)} />
              ) : f.type === 'frames' ? (
                <FramesEditor value={form[f.name]} onChange={(v) => setField(f.name, v)} />
              ) : f.type === 'images' ? (
                <ImagesEditor value={form[f.name]} onChange={(v) => setField(f.name, v)} />
              ) : (
                <Input field={f} value={form[f.name]} onChange={(v) => setField(f.name, v)} />
              )}
            </div>
          ))}

          <details className="admin-history">
            <summary>History & restore</summary>
            <RevisionHistory table="sections" recordId={section.id} labelKey="type" onRestored={() => { onSaved?.(); onClose(); }} />
          </details>
        </div>
        <div className="admin-drawer__foot">
          <button className="btn btn--ghost" onClick={() => save({ publish: false })} disabled={saving}>Save as draft</button>
          <button className="btn btn--primary" onClick={() => save({ publish: true })} disabled={saving}>{saving ? 'Saving…' : 'Save & publish'}</button>
        </div>
      </aside>
    </div>
  );
}
