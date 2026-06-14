import { createContext, useCallback, useContext, useState } from 'react';

/* ---- Toasts --------------------------------------------------------------- */
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() {
  return useContext(ToastContext);
}

/* ---- Confirm modal (destructive guardrail) -------------------------------- */
export function ConfirmModal({ open, title, body, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {body && <p>{body}</p>}
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onCancel}>Cancel</button>
          <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ---- Contextual hint ("?" tooltip) ---------------------------------------- */
export function Hint({ children }) {
  return (
    <span className="hint" tabIndex={0} role="note">
      ?
      <span className="hint__bubble">{children}</span>
    </span>
  );
}

/* ---- Status badge --------------------------------------------------------- */
export function StatusBadge({ status, hasDraft }) {
  if (hasDraft) return <span className="badge badge--draft">Unpublished changes</span>;
  if (status === 'draft') return <span className="badge badge--draft">Draft</span>;
  return <span className="badge badge--live">Published</span>;
}

/* ---- Misc ----------------------------------------------------------------- */
export function Empty({ children }) {
  return <p className="admin-empty">{children}</p>;
}
export function Spinner({ label = 'Loading…' }) {
  return <p className="admin-empty" aria-busy="true">{label}</p>;
}
