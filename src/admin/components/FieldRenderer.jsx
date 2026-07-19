import ImageField from './ImageField.jsx';
import { Hint } from './ui.jsx';
import { FRAME_STYLE_OPTIONS, normalizeFrameStyle } from '../../lib/frameStyles.js';

/* THE schema-driven field renderer — the union of SectionEditor's old `Input`
   (text/textarea/markdown/number/select/image/images/frames) and
   CollectionManager's `FieldInput` (…/price/date/checkbox/tags/funfacts), so
   the on-page editor panel and the collection managers share one vocabulary.

   <FieldRenderer field value onChange error /> renders the labelled .field
   block; coercion of tags/number/price/checkbox at save time stays the
   caller's job (see coerceFieldValue below). */

export function FramesEditor({ value = [], onChange }) {
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

export function ImagesEditor({ value = [], onChange }) {
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

export function FunFactsEditor({ value, onChange }) {
  const entries = Object.entries(value || {});
  function update(i, key, val) {
    const next = entries.map(([k, v], idx) => (idx === i ? [key, val] : [k, v]));
    onChange(Object.fromEntries(next));
  }
  function add() { onChange({ ...(value || {}), '': '' }); }
  function remove(i) { onChange(Object.fromEntries(entries.filter((_, idx) => idx !== i))); }
  return (
    <div className="funfacts">
      {entries.map(([k, v], i) => (
        <div key={i} className="funfacts__row">
          <input placeholder="Label (e.g. favorite_movie)" value={k} onChange={(e) => update(i, e.target.value, v)} />
          <input placeholder="Answer" value={v} onChange={(e) => update(i, k, e.target.value)} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(i)}>✕</button>
        </div>
      ))}
      <button type="button" className="btn btn--ghost btn--sm" onClick={add}>+ Add a fun fact</button>
    </div>
  );
}

/** Save-time coercion for the loosely-typed inputs (tags stay a raw string
    while typing; numbers arrive as strings). Same rules CollectionManager has
    always applied in buildPayload. */
export function coerceFieldValue(field, v) {
  switch (field.type) {
    case 'tags':
      return (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => s.trim()).filter(Boolean);
    case 'number':
    case 'price':
      return v === '' || v == null ? null : Number(v);
    case 'checkbox':
      return Boolean(v);
    default:
      return v;
  }
}

function Control({ field, value, onChange, folder }) {
  const common = { id: field.name, value: value ?? '', onChange: (e) => onChange(e.target.value) };
  switch (field.type) {
    case 'textarea':
    case 'markdown':
      return <textarea {...common} rows={field.rows || 4} />;
    case 'select':
      return (
        <select {...common}>
          {field.placeholderOption !== false && <option value="">Choose…</option>}
          {field.options.map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
      );
    case 'number':
    case 'price':
      return <input type="number" step={field.type === 'price' ? '0.01' : '1'} min={field.min} {...common} />;
    case 'date':
      return <input type="date" {...common} />;
    case 'checkbox':
      return <input type="checkbox" id={field.name} checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />;
    case 'tags':
      return (
        <input
          type="text"
          id={field.name}
          value={Array.isArray(value) ? value.join(', ') : value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="comma, separated, tags"
        />
      );
    case 'image':
      return <ImageField label="" value={value} preset={field.preset || 'card'} folder={field.folder || folder || 'sections'} onChange={onChange} />;
    case 'images':
      return <ImagesEditor value={value} onChange={onChange} />;
    case 'frames':
      return <FramesEditor value={value} onChange={onChange} />;
    case 'funfacts':
      return <FunFactsEditor value={value} onChange={onChange} />;
    default:
      return <input type="text" {...common} />;
  }
}

export default function FieldRenderer({ field, value, onChange, error, folder }) {
  const isCheckbox = field.type === 'checkbox';
  return (
    <div className={`field ${error ? 'field--error' : ''} ${field.fullWidth ? 'field--full' : ''}`}>
      {isCheckbox ? (
        <label className="checkfield" htmlFor={field.name}>
          <Control field={field} value={value} onChange={onChange} folder={folder} />
          <span>{field.label}{field.hint && <Hint>{field.hint}</Hint>}</span>
        </label>
      ) : (
        <>
          <label htmlFor={field.name}>
            {field.label}
            {field.required && <span style={{ color: 'var(--color-error)' }}> *</span>}
            {field.hint && <Hint>{field.hint}</Hint>}
          </label>
          <Control field={field} value={value} onChange={onChange} folder={folder} />
        </>
      )}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}
