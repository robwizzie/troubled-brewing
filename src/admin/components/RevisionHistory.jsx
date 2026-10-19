import { useEffect, useState } from 'react';
import { listRevisions } from '../lib/adminData.js';

/* Per-record history. Picking a version only LOADS it into what you're
   editing — like any other edit it goes live when you press Publish (and the
   version it replaces is saved to history at that moment). */
export default function RevisionHistory({ table, recordId, labelKey = 'name', onLoad }) {
  const [revisions, setRevisions] = useState(null);

  useEffect(() => {
    let alive = true;
    listRevisions(table, recordId)
      .then((r) => alive && setRevisions(r))
      .catch(() => alive && setRevisions([]));
    return () => { alive = false; };
  }, [table, recordId]);

  if (revisions === null) return <p className="field__hint">Loading history…</p>;
  if (revisions.length === 0) {
    return <p className="field__hint">No earlier versions yet. Each time you publish, the version it replaces is kept here.</p>;
  }

  return (
    <div className="revisions">
      <p className="field__hint">Using a version puts it back in the editor. Nothing changes on the site until you press Publish.</p>
      <ul className="revisions__list">
        {revisions.map((rev) => (
          <li key={rev.id}>
            <span>
              <strong>{new Date(rev.created_at).toLocaleString()}</strong>
              <span className="field__hint"> — {rev.snapshot?.[labelKey] || 'this item'}{rev.edited_by && rev.edited_by !== 'unknown' ? ` · ${rev.edited_by}` : ''}</span>
            </span>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => onLoad?.(rev.snapshot || {})}>
              Use this version
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
