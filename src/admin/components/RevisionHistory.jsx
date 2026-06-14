import { useEffect, useState } from 'react';
import { listRevisions, restoreRevision } from '../lib/adminData.js';
import { ConfirmModal, useToast } from './ui.jsx';

/* Per-record history with one-click restore (build plan §5.7). */
export default function RevisionHistory({ table, recordId, labelKey = 'name', onRestored }) {
  const toast = useToast();
  const [revisions, setRevisions] = useState(null);
  const [confirm, setConfirm] = useState(null);

  useEffect(() => {
    let alive = true;
    listRevisions(table, recordId)
      .then((r) => alive && setRevisions(r))
      .catch(() => alive && setRevisions([]));
    return () => { alive = false; };
  }, [table, recordId]);

  async function doRestore(rev) {
    try {
      await restoreRevision(table, recordId, rev.snapshot);
      toast('Restored earlier version');
      onRestored?.();
    } catch (e) {
      toast(e.message || 'Restore failed', 'error');
    } finally {
      setConfirm(null);
    }
  }

  if (revisions === null) return <p className="field__hint">Loading history…</p>;
  if (revisions.length === 0) return <p className="field__hint">No earlier versions yet. Edits you make from now on will appear here.</p>;

  return (
    <div className="revisions">
      <h4>History</h4>
      <ul className="revisions__list">
        {revisions.map((rev) => (
          <li key={rev.id}>
            <span>
              <strong>{new Date(rev.created_at).toLocaleString()}</strong>
              <span className="field__hint"> — {rev.snapshot?.[labelKey] || 'record'} · {rev.edited_by}</span>
            </span>
            <button className="btn btn--ghost btn--sm" onClick={() => setConfirm(rev)}>Restore</button>
          </li>
        ))}
      </ul>
      <ConfirmModal
        open={Boolean(confirm)}
        title="Restore this version?"
        body="This will replace the current content with the selected earlier version. (This is itself undoable — your current version gets saved to history first.)"
        confirmLabel="Restore"
        danger={false}
        onConfirm={() => doRestore(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
