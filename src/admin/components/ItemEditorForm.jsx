import FieldRenderer from './FieldRenderer.jsx';
import RevisionHistory from './RevisionHistory.jsx';

/* The schema-driven body of a collection item editor — just fields + history,
   no chrome — so CollectionManager can render it in its fullscreen drawer AND
   the on-page editor can render it inline in the docked panel. */
export default function ItemEditorForm({ fields, form, errors = {}, onField, table, labelKey, recordId, onRestored }) {
  return (
    <>
      {fields.map((f) => (
        <FieldRenderer
          key={f.name}
          field={f}
          value={form[f.name]}
          onChange={(v) => onField(f.name, v)}
          error={errors[f.name]}
          folder={table}
        />
      ))}
      {recordId && (
        <details className="admin-history">
          <summary>History & restore</summary>
          <RevisionHistory table={table} recordId={recordId} labelKey={labelKey} onRestored={onRestored} />
        </details>
      )}
    </>
  );
}
