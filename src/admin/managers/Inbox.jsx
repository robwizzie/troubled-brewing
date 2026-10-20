import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useToast, Spinner, Empty, ConfirmModal } from '../components/ui.jsx';
import { LuInbox } from 'react-icons/lu';
import { ScreenHead } from '../lib/publishing.jsx';

const when = (iso) => new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

/* Contact + catering submissions. Read/unread, filter by type, delete. */
export default function Inbox() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [filter, setFilter] = useState('all');
  const [confirmDel, setConfirmDel] = useState(null);

  async function load() {
    const { data, error } = await supabase.from('submissions').select('*').order('created_at', { ascending: false });
    if (error) { toast('Couldn’t load your messages. Check your internet connection, then refresh the page.', 'error'); setItems([]); return; }
    setItems(data || []);
  }
  // load-once on mount: `load` is a new identity every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

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
    toast('Message deleted');
    setConfirmDel(null);
    load();
  }

  if (items === null) return <Spinner />;

  return (
    <div>
      <ScreenHead
        icon={LuInbox}
        title="Messages"
        help="Messages people sent from the Contact and Catering forms. Nothing here is shown on the site."
      />
      <div className="inbox-filters">
        {['all', 'unread', 'contact', 'catering'].map((f) => (
          <button key={f} className={`chip ${filter === f ? 'chip--on' : ''}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty icon={LuInbox}>{filter === 'all' ? 'No messages yet. When someone uses the Contact or Catering form, it lands here.' : 'No messages match that filter. Tap “all” to see every message.'}</Empty>
      ) : (
        <ul className="admin-list">
          {filtered.map((m) => (
            <li key={m.id} className={`admin-list__row inbox-row ${m.read ? '' : 'is-unread'}`}>
              <div className="admin-list__body">
                <strong>{m.name}</strong> {m.form_type && <span className="badge badge--hidden">{m.form_type === 'catering' ? 'Catering' : 'Contact'}</span>}
                <div className="admin-list__meta">
                  <a href={`mailto:${m.email}`}>{m.email}</a>{m.phone ? ` · ${m.phone}` : ''} · {when(m.created_at)}
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
