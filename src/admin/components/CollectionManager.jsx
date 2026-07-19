import { useEffect, useRef, useState } from 'react';
import {
  listAll, createRecord, updateRecord, saveDraft, publishRecord, deleteRecord, reorder,
} from '../lib/adminData.js';
import { ConfirmModal, useToast, StatusBadge, Empty, Spinner } from './ui.jsx';
import { coerceFieldValue } from './FieldRenderer.jsx';
import ItemEditorForm from './ItemEditorForm.jsx';

/* Schema-driven manager for a structured table (build plan §4.4, §5.7).
   Handles list + add/edit/delete + reorder + draft/publish + revisions.
   Specific managers (Menu, Events, …) just provide a `fields` schema.

   Two render modes:
   - default: full page with heading + fullscreen right drawer for editing.
   - embedded: compact variant for the on-page editor's docked panel — no
     page heading, and editing swaps the list for an inline form instead of
     overlaying a fixed drawer.
   `onChanged(table)` fires after any successful mutation so the editor can
   tell the canvas to refetch. (The old localStorage autosave is gone — it
   silently resurrected stale drafts; server-side draft_data is the real
   crash safety.) */
export default function CollectionManager({
  table, title, singular, fields, defaultItem = {}, labelKey = 'name', orderable = true,
  summary, embedded = false, onChanged, autoOpenLabel,
}) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null); // item being edited (or {} for new)
  const [form, setForm] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const notifyChanged = () => onChanged?.(table);

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

  /* One-shot deep link from the on-page editor: the owner clicked a SPECIFIC
     item on the canvas (a menu item, a team member…) — open that record. */
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!autoOpenLabel || autoOpenedRef.current || !items || editing) return;
    autoOpenedRef.current = true;
    const n = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    const target = n(autoOpenLabel);
    const found = items.find((it) => {
      const l = n(it[labelKey]);
      return l && (l === target || target.includes(l) || l.includes(target));
    });
    if (found) openEditor(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, autoOpenLabel]);

  function openEditor(item) {
    // Collection tables use column-based governance: draft_data holds PARTIAL
    // changes, so merging over the live row is correct here (unlike sections).
    setForm(item ? { ...item, ...(item.draft_data || {}) } : { ...defaultItem });
    setErrors({});
    setEditing(item || {});
  }
  function closeEditor() {
    setEditing(null);
    setForm({});
  }
  function setField(name, val) {
    setForm((f) => ({ ...f, [name]: val }));
  }

  function buildPayload() {
    const out = {};
    for (const f of fields) out[f.name] = coerceFieldValue(f, form[f.name]);
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
      notifyChanged();
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
      notifyChanged();
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
      notifyChanged();
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
      notifyChanged();
    } catch (e) {
      toast(e.message || 'Reorder failed', 'error');
      refresh();
    }
  }

  const list =
    items === null ? (
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
    );

  const editorForm = editing && (
    <ItemEditorForm
      fields={fields}
      form={form}
      errors={errors}
      onField={setField}
      table={table}
      labelKey={labelKey}
      recordId={editing.id}
      onRestored={() => { closeEditor(); refresh(); notifyChanged(); }}
    />
  );

  const saveButtons = editing && (
    <>
      <button className="btn btn--ghost" onClick={() => save({ publish: false })} disabled={saving}>Save as draft</button>
      <button className="btn btn--primary" onClick={() => save({ publish: true })} disabled={saving}>
        {saving ? 'Saving…' : editing.id ? 'Save & publish' : 'Publish'}
      </button>
    </>
  );

  const confirm = (
    <ConfirmModal
      open={Boolean(confirmDelete)}
      title={`Delete this ${singular.toLowerCase()}?`}
      body="This removes it from your site. You can restore it later from this record's history if needed."
      confirmLabel="Delete"
      onConfirm={() => doDelete(confirmDelete)}
      onCancel={() => setConfirmDelete(null)}
    />
  );

  if (embedded) {
    return (
      <div className="cm-embedded">
        {editing ? (
          <div>
            <div className="cm-embedded__head">
              <button className="btn btn--ghost btn--sm" onClick={closeEditor}>← All {title.toLowerCase()}</button>
              <strong>{editing.id ? `Edit ${singular}` : `Add ${singular}`}</strong>
            </div>
            {editorForm}
            <div className="cm-embedded__foot">{saveButtons}</div>
          </div>
        ) : (
          <div>
            <div className="cm-embedded__head">
              <strong>{title}</strong>
              <button className="btn btn--primary btn--sm" onClick={() => openEditor(null)}>+ Add {singular}</button>
            </div>
            {list}
          </div>
        )}
        {confirm}
      </div>
    );
  }

  return (
    <div>
      <div className="admin__pagehead">
        <h1>{title}</h1>
        <button className="btn btn--primary" onClick={() => openEditor(null)}>+ Add {singular}</button>
      </div>

      {list}

      {editing && (
        <div className="admin-drawer-backdrop" onClick={closeEditor}>
          <aside className="admin-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="admin-drawer__head">
              <h2>{editing.id ? `Edit ${singular}` : `Add ${singular}`}</h2>
              <button className="iconbtn" aria-label="Close" onClick={closeEditor}>✕</button>
            </div>
            <div className="admin-drawer__body">{editorForm}</div>
            <div className="admin-drawer__foot">{saveButtons}</div>
          </aside>
        </div>
      )}

      {confirm}
    </div>
  );
}
