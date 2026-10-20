import { createContext, useCallback, useContext, useState } from 'react';
import { LuCircleAlert, LuCircleCheck, LuCircleDot, LuFilePen, LuInfo, LuLoaderCircle, LuX } from 'react-icons/lu';
import { Icon } from './Icon.jsx';

/* ---- Toasts --------------------------------------------------------------- */
const TOAST_ICONS = { success: LuCircleCheck, error: LuCircleAlert, info: LuInfo };
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, type = 'success', { duration } = {}) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), duration || (type === 'error' ? 8000 : 4000));
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toast-wrap" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} role={t.type === 'error' ? 'alert' : undefined}>
            <Icon icon={TOAST_ICONS[t.type] || LuInfo} size={18} className="toast__icon" />
            <span className="toast__msg">{t.message}</span>
            <button type="button" className="toast__close" aria-label="Dismiss" onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}><Icon icon={LuX} size={16} /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
export function useToast() {
  return useContext(ToastContext);
}

/* ---- Confirm modal (destructive guardrail) -------------------------------- */
export function ConfirmModal({ open, title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = true, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {body && <p>{body}</p>}
        <div className="modal__actions">
          <button className="btn btn--ghost" onClick={onCancel}>{cancelLabel}</button>
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
      <Icon icon={LuInfo} size={16} />
      <span className="hint__bubble">{children}</span>
    </span>
  );
}

/* ---- Status chip: where a screen / page stands, in the same words everywhere.
   published   — what's on the site is what you see
   unpublished — you changed something and haven't pressed Publish
   draft       — a previewed draft is saved privately, not on the site yet */
const CHIP = {
  published: { icon: LuCircleCheck, label: 'Published' },
  unpublished: { icon: LuCircleDot, label: 'Unpublished changes' },
  draft: { icon: LuFilePen, label: 'Saved draft' },
  live: { icon: LuCircleCheck, label: 'Live' },
};
export function StatusChip({ state = 'published', children }) {
  const c = CHIP[state] || CHIP.published;
  return (
    <span className={`statuschip statuschip--${state}`}>
      <Icon icon={c.icon} size={14} />
      {children || c.label}
    </span>
  );
}

/* ---- Status badge --------------------------------------------------------- */
export function StatusBadge({ status, hasDraft }) {
  if (hasDraft) return <span className="badge badge--draft">Changed — not live yet</span>;
  if (status === 'draft') return <span className="badge badge--draft">Not on the site</span>;
  return <span className="badge badge--live">Live</span>;
}

/* ---- Misc ----------------------------------------------------------------- */
export function Empty({ children, icon }) {
  return (
    <p className="admin-empty">
      {icon && <Icon icon={icon} size={28} className="admin-empty__icon" />}
      <span>{children}</span>
    </p>
  );
}
export function Spinner({ label = 'Loading…' }) {
  return (
    <p className="admin-empty" aria-busy="true">
      <Icon icon={LuLoaderCircle} size={22} className="admin-spin" />
      <span>{label}</span>
    </p>
  );
}
