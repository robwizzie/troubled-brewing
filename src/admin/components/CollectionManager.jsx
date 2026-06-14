import { useEffect, useMemo, useState } from 'react';
import {
  listAll, createRecord, updateRecord, saveDraft, publishRecord, deleteRecord, reorder,
} from '../lib/adminData.js';
import { ConfirmModal, useToast, StatusBadge, Hint, Empty, Spinner } from './ui.jsx';
import ImageField from './ImageField.jsx';
import RevisionHistory from './RevisionHistory.jsx';

/* Schema-driven manager for a structured table (build plan §4.4, §5.7).
   Handles list + add/edit/delete + reorder + draft/publish + revisions + autosave.
   Specific managers (Menu, Events, …) just provide a `fields` schema. */

const AUTOSAVE_PREFIX = 'tbch-draft-';

function FieldInput({ field, value, onChange }) {
  const common = { id: field.name, value: value ?? '', onChange: (e) => onChange(e.target.value) };
  switch (field.type) {
    case 'textarea':
      return <textarea {...common} rows={field.rows || 4} />;
    case 'select':
      return (
        <select {...common}>
          <option value="">Choose…</option>
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
    default:
      return <input type="text" {...common} />;
  }
}

function FunFactsEditor({ value, onChange }) {
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

export default function CollectionManager({
  table, title, singular, fields, defaultItem = {}, labelKey = 'name', orderable = true,
  summary,
}) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // item being edited (or {} for new)
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const autosaveKey = editing ? `${AUTOSAVE_PREFIX}${table}-${editing.id || 'new'}` : null;

  async function refresh() {
    try {
      const data = await listAll(table, orderable ? {} : { orderBy: 'created_at', ascending: false });
      setItems(data);
    } catch (e) {
      toast(e.message || 'Could not load items', 'error');
      setItems([]);
    }
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [table]);

  function openEditor(item) {
    const base = item ? { ...item, ...(item.draft_data || {}) } : { ...defaultItem };
    // crash-safety: restore autosaved draft if present
    try {
      const saved = localStorage.getItem(`${AUTOSAVE_PREFIX}${table}-${item?.id || 'new'}`);
      if (saved) Object.assign(base, JSON.parse(saved));
    } catch { /* ignore */ }
    setForm(base);
    setErrors({});
    setEditing(item || {});
  }
  function closeEditor() {
    if (autosaveKey) { try { localStorage.removeItem(autosaveKey); } catch { /* ignore */ } }
    setEditing(null);
    setForm({});
  }

  function setField(name, val) {
    setForm((f) => {
      const next = { ...f, [name]: val };
      if (autosaveKey) { try { localStorage.setItem(autosaveKey, JSON.stringify(next)); } catch { /* ignore */ } }
      return next;
    });
  }

  function buildPayload() {
    const out = {};
    for (const f of fields) {
      let v = form[f.name];
      if (f.type === 'tags') v = (Array.isArray(v) ? v : String(v || '').split(',')).map((s) => s.trim()).filter(Boolean);
      else if (f.type === 'number') v = v === '' || v == null ? null : Number(v);
      else if (f.type === 'price') v = v === '' || v == null ? null : Number(v);
      else if (f.type === 'checkbox') v = Boolean(v);
      out[f.name] = v;
    }
    return out;
  }

  function validate(payload) {
    const errs = {};
    for (const f of fields) {
      if (f.required && (payload[f.name] === '' || payload[f.name] == null)) {
        errs[f.name] = `${f.label} is required.`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save({ publish }) {
    const payload = buildPayload();
    if (!validate(payload)) {
      toast('Please fix the highlighted fields.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (!editing.id) {
        await createRecord(table, payload, { publish });
        toast(publish ? `${singular} published` : `${singular} saved as draft`);
      } else if (publish) {
        await updateRecord(table, editing.id, { ...payload, draft_data: null, status: 'published' });
        toast('Changes published');
      } else {
        await saveDraft(table, editing.id, payload);
        toast('Saved as draft (not yet public)');
      }
      closeEditor();
      refresh();
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function publishExisting(item) {
    try {
      await publishRecord(table, item.id);
      toast('Published');
      refresh();
    } catch (e) {
      toast(e.message || 'Publish failed', 'error');
    }
  }

  async function doDelete(item) {
    try {
      await deleteRecord(table, item.id);
      toast(`${singular} deleted`);
      setConfirmDelete(null);
      refresh();
    } catch (e) {
      toast(e.message || 'Delete failed', 'error');
    }
  }

  async function move(index, dir) {
    if (!items) return;
    const next = [...items];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    setItems(next);
    try {
      await reorder(table, next.map((i) => i.id));
    } catch (e) {
      toast(e.message || 'Reorder failed', 'error');
      refresh();
    }
  }

  const orderedFields = useMemo(() => fields, [fields]);

  return (
    <div>
      <div className="admin__pagehead">
        <h1>{title}</h1>
        <button className="btn btn--primary" onClick={() => openEditor(null)}>+ Add {singular}</button>
      </div>

      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Empty>No {title.toLowerCase()} yet. Click “Add {singular}” to create your first one.</Empty>
      ) : (
        <ul className="admin-list">
          {items.map((item, i) => (
            <li key={item.id} className="admin-list__row">
              {orderable && (
                <div className="admin-list__reorder">
                  <button className="iconbtn" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>▲</button>
                  <button className="iconbtn" aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}>▼</button>
                </div>
              )}
              {item.image_url || item.photo_url ? (
                <img className="admin-list__thumb" src={item.image_url || item.photo_url} alt="" />
              ) : null}
              <div className="admin-list__body">
                <strong>{item[labelKey] || '(untitled)'}</strong>
                <div className="admin-list__meta">{summary ? summary(item) : null}</div>
              </div>
              <div className="admin-list__status">
                <StatusBadge status={item.status} hasDraft={Boolean(item.draft_data)} />
              </div>
              <div className="admin-list__actions">
                {(item.status === 'draft' || item.draft_data) && (
                  <button className="btn btn--accent btn--sm" onClick={() => publishExisting(item)}>Publish</button>
                )}
                <button className="btn btn--ghost btn--sm" onClick={() => openEditor(item)}>Edit</button>
                <button className="btn btn--danger btn--sm" onClick={() => setConfirmDelete(item)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="admin-drawer-backdrop" onClick={closeEditor}>
          <aside className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer__head">
              <h2>{editing.id ? `Edit ${singular}` : `Add ${singular}`}</h2>
              <button className="iconbtn" aria-label="Close" onClick={closeEditor}>✕</button>
            </div>

            <div className="admin-drawer__body">
              {orderedFields.map((f) => (
                <div key={f.name} className={`field ${errors[f.name] ? 'field--error' : ''} ${f.fullWidth ? 'field--full' : ''}`}>
                  {f.type !== 'checkbox' && (
                    <label htmlFor={f.name}>
                      {f.label} {f.required && <span style={{ color: 'var(--color-error)' }}>*</span>}
                      {f.hint && <Hint>{f.hint}</Hint>}
                    </label>
                  )}
                  {f.type === 'image' ? (
                    <ImageField label="" value={form[f.name]} preset={f.preset || 'card'} folder={table} onChange={(url) => setField(f.name, url)} />
                  ) : f.type === 'funfacts' ? (
                    <FunFactsEditor value={form[f.name]} onChange={(v) => setField(f.name, v)} />
                  ) : f.type === 'checkbox' ? (
                    <label className="checkfield">
                      <FieldInput field={f} value={form[f.name]} onChange={(v) => setField(f.name, v)} />
                      <span>{f.label}{f.hint && <Hint>{f.hint}</Hint>}</span>
                    </label>
                  ) : (
                    <FieldInput field={f} value={form[f.name]} onChange={(v) => setField(f.name, v)} />
                  )}
                  {errors[f.name] && <p className="field__error">{errors[f.name]}</p>}
                </div>
              ))}

              {editing.id && (
                <details className="admin-history">
                  <summary>History & restore</summary>
                  <RevisionHistory table={table} recordId={editing.id} labelKey={labelKey} onRestored={() => { closeEditor(); refresh(); }} />
                </details>
              )}
            </div>

            <div className="admin-drawer__foot">
              <button className="btn btn--ghost" onClick={() => save({ publish: false })} disabled={saving}>Save as draft</button>
              <button className="btn btn--primary" onClick={() => save({ publish: true })} disabled={saving}>
                {saving ? 'Saving…' : editing.id ? 'Save & publish' : 'Publish'}
              </button>
            </div>
          </aside>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmDelete)}
        title={`Delete this ${singular.toLowerCase()}?`}
        body="This removes it from your site. You can restore it later from this record's history if needed."
        confirmLabel="Delete"
        onConfirm={() => doDelete(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
