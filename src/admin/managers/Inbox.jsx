import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useToast, Spinner, Empty, ConfirmModal } from '../components/ui.jsx';

/* Contact + catering submissions. Read/unread, filter by type, delete. */
export default function Inbox() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmDel, setConfirmDel] = useState(null);

  async function load() {
    const { data, error } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    if (error) { toast('Could not load inbox', 'error'); setItems([]); return; }
    setItems(data || []);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const filtered = useMemo(() => {
    if (!items) return [];
    if (filter === 'all') return items;
    if (filter === 'unread') return items.filter((i) => !i.read);
    return items.filter((i) => i.form_type === filter);
  }, [items, filter]);

  async function toggleRead(item) {
    await supabase.from('submissions').update({ read: !item.read }).eq('id', item.id);
    load();
  }
  async function del(id) {
    await supabase.from('submissions').delete().eq('id', id);
    toast('Deleted');
    setConfirmDel(null);
    load();
  }

  if (items === null) return <Spinner />;

  return (
    <div>
      <h1>Inbox</h1>
      <div className="inbox-filters">
        {['all', 'unread', 'contact', 'catering'].map((f) => (
          <button key={f} className={`chip ${filter === f ? 'chip--on' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty>No messages here.</Empty>
      ) : (
        <ul className="admin-list">
          {filtered.map((m) => (
            <li key={m.id} className={`admin-list__row inbox-row ${m.read ? '' : 'is-unread'}`}>
              <div className="admin-list__body">
                <strong>{m.name} <span className="badge badge--live" style={{ marginLeft: 6 }}>{m.form_type}</span></strong>
                <div className="admin-list__meta">
                  <a href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ''} · {new Date(m.created_at).toLocaleString()}
                </div>
                {m.form_type === 'catering' && (
                  <div className="admin-list__meta">
                    {m.event_type ? `${m.event_type} · ` : ''}{m.event_date || ''}{m.headcount ? ` · ${m.headcount} people` : ''}
                  </div>
                )}
                {m.message && <p className="inbox-msg">{m.message}</p>}
              </div>
              <div className="admin-list__actions">
                <button className="btn btn--ghost btn--sm" onClick={() => toggleRead(m)}>{m.read ? 'Mark unread' : 'Mark read'}</button>
                <button className="btn btn--danger btn--sm" onClick={() => setConfirmDel(m.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={Boolean(confirmDel)}
        title="Delete this message?"
        body="This permanently removes it from your inbox."
        confirmLabel="Delete"
        onConfirm={() => del(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
