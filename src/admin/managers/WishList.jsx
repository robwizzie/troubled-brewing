import { useEffect, useMemo, useRef, useState } from 'react';
import { LuCheck, LuDownload, LuEyeOff, LuSearch, LuStickyNote, LuWandSparkles, LuX } from 'react-icons/lu';
import { supabase } from '../../lib/supabase.js';
import { useToast, Spinner, StatusChip } from '../components/ui.jsx';
import { ScreenHead } from '../lib/publishing.jsx';
import { useUnread } from '../lib/unread.jsx';
import {
  CATEGORIES, STATUSES, categoryLabel, countByCategory, groupWishes, relativeDate, statusLabel, wishTokens, wishesToCsv,
} from '../../lib/wishes.js';
import '../wish-list.css';

/* Wish list — the menu wishes visitors drop into the fox's top hat
   (src/components/FoxWish.jsx). Similar wishes are grouped ("Lavender
   latte ×7") so the most-wished ideas rise to the top; each wish can be
   triaged (New → Considering → Added to menu / Not now / Hidden), given a
   private note, bulk-marked, and exported as CSV.

   Unlike the rest of the admin there is no Publish here: a wish's status is
   the owners' own to-do data, never shown on the site, so every change saves
   straight away (with a "Saved" toast). Data: the `wishes` table
   (supabase/migrations/2026-10-19-wishes.sql); admins read and update it. */

const STATUS_FILTERS = [
  { id: 'active', label: 'Everything but hidden' },
  ...STATUSES.map((s) => ({ id: s.id, label: s.label })),
  { id: 'all', label: 'All, including hidden' },
];

const isMissingTable = (error) => /42P01|PGRST205|does not exist|Could not find the table/i.test(`${error?.code} ${error?.message}`);

function CategoryChip({ id }) {
  return <span className={`wl-cat wl-cat--${id}`}>{categoryLabel(id)}</span>;
}

function StatusPill({ id }) {
  return <span className={`wl-status wl-status--${id}`}>{statusLabel(id)}</span>;
}

/** Wishes per category over the last 30 days, as plain horizontal bars. */
function CategoryBars({ counts }) {
  const max = Math.max(1, ...Object.values(counts));
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return (
    <section className="admin__panel wl-panel" aria-labelledby="wl-bars-h">
      <h2 id="wl-bars-h" className="wl-panel__title">Last 30 days</h2>
      <p className="wl-panel__sub">{total === 1 ? '1 wish' : `${total} wishes`} by kind</p>
      <ul className="wl-bars">
        {CATEGORIES.map((c) => (
          <li key={c.id} className="wl-bars__row" title={`${c.label}: ${counts[c.id]}`}>
            <span className="wl-bars__label">{c.label}</span>
            <span className="wl-bars__track" aria-hidden="true">
              <span className="wl-bars__bar" style={{ width: `${(counts[c.id] / max) * 100}%` }} />
            </span>
            <span className="wl-bars__n">{counts[c.id]}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopWishes({ groups, onPick, picked }) {
  const top = groups.slice(0, 6);
  return (
    <section className="admin__panel wl-panel wl-top" aria-labelledby="wl-top-h">
      <h2 id="wl-top-h" className="wl-panel__title">Top wishes</h2>
      <p className="wl-panel__sub">Similar wishes counted together. Tap one to see them.</p>
      {top.length === 0 ? (
        <p className="wl-panel__sub">Nothing yet.</p>
      ) : (
        <ol className="wl-top__list">
          {top.map((g, i) => (
            <li key={g.key}>
              <button type="button" className={`wl-top__item${picked === g.key ? ' is-on' : ''}`} aria-pressed={picked === g.key} onClick={() => onPick(g)}>
                <span className="wl-top__rank">{i + 1}</span>
                <span className="wl-top__label">{g.label}</span>
                <CategoryChip id={g.category} />
                <span className="wl-top__count">×{g.count}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function NoteEditor({ wish, onSave }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(wish.admin_note || '');
  const ref = useRef(null);
  useEffect(() => { if (open) ref.current?.focus(); }, [open]);
  if (!open) {
    return (
      <div className="wl-note">
        {wish.admin_note && <p className="wl-note__text"><LuStickyNote aria-hidden="true" /> {wish.admin_note}</p>}
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setDraft(wish.admin_note || ''); setOpen(true); }}>
          {wish.admin_note ? 'Edit note' : 'Add a private note'}
        </button>
      </div>
    );
  }
  const id = `wl-note-${wish.id}`;
  return (
    <div className="wl-note wl-note--open">
      <label className="wl-note__label" htmlFor={id}>Private note (only admins see this)</label>
      <textarea id={id} ref={ref} rows={2} maxLength={1000} value={draft} onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }} />
      <div className="wl-note__actions">
        <button type="button" className="btn btn--primary btn--sm" onClick={async () => { if (await onSave(draft.trim() || null)) setOpen(false); }}>Save note</button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

export default function WishList() {
  const toast = useToast();
  const { refresh: refreshUnread } = useUnread();
  const [rows, setRows] = useState(null);
  const [missing, setMissing] = useState(false);
  const [status, setStatus] = useState('active');
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [group, setGroup] = useState(null); // { key, label, ids }
  const [selected, setSelected] = useState(() => new Set());
  const now = new Date();

  useEffect(() => {
    let alive = true;
    supabase.from('wishes').select('*').order('created_at', { ascending: false }).limit(2000).then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        if (isMissingTable(error)) setMissing(true);
        else toast('Could not load the wish list', 'error');
        setRows([]);
        return;
      }
      // newest first (the query asks for that too; this keeps it true after any merge)
      setRows([...(data || [])].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  const groups = useMemo(() => groupWishes(rows || []), [rows]);
  const groupOf = useMemo(() => {
    const m = new Map();
    groups.forEach((g) => g.ids.forEach((id) => m.set(id, g)));
    return m;
  }, [groups]);
  const counts = useMemo(() => countByCategory(rows || [], { now }), [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    if (!rows) return [];
    const terms = wishTokens(q);
    const plain = q.trim().toLowerCase();
    return rows.filter((w) => {
      if (group && !group.ids.includes(w.id)) return false;
      if (status === 'active' && w.status === 'hidden') return false;
      if (!['active', 'all'].includes(status) && w.status !== status) return false;
      if (category !== 'all' && w.category !== category) return false;
      if (plain) {
        const hay = `${w.text} ${w.why || ''} ${w.first_name || ''} ${w.admin_note || ''}`.toLowerCase();
        if (!hay.includes(plain) && !(terms.length && terms.every((t) => wishTokens(hay).includes(t)))) return false;
      }
      return true;
    });
  }, [rows, status, category, q, group]);

  async function save(ids, patch, message = 'Saved') {
    const before = rows;
    setRows((list) => list.map((w) => (ids.includes(w.id) ? { ...w, ...patch } : w)));
    const { error } = await supabase.from('wishes').update(patch).in('id', ids);
    if (error) {
      setRows(before);
      toast('That didn’t save. Check your connection and try again.', 'error');
      return false;
    }
    refreshUnread(); // the "new wishes" badge clears as soon as one is marked
    toast(message);
    return true;
  }

  const toggle = (id) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const allShownSelected = shown.length > 0 && shown.every((w) => selected.has(w.id));
  const selectAll = () => setSelected(allShownSelected ? new Set() : new Set(shown.map((w) => w.id)));

  async function bulk(next) {
    const ids = [...selected];
    if (!ids.length) return;
    if (await save(ids, { status: next }, `Saved: ${ids.length} marked “${statusLabel(next)}”`)) setSelected(new Set());
  }

  function exportCsv() {
    const csv = wishesToCsv(shown);
    const blob = new Blob([String.fromCharCode(0xfeff), csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wish-list-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const head = (
    <ScreenHead
      icon={LuWandSparkles}
      title="Wish list"
      chip={<StatusChip state="private">Only you can see this · saves as you go</StatusChip>}
      help="Menu wishes from the fox on the website: a drink, a pastry, anything people would love to see. Changes here save straight away; there’s nothing to Publish, because none of this is shown on the site."
    />
  );

  if (rows === null) return <div className="wl">{head}<Spinner /></div>;

  if (missing) {
    return (
      <div className="wl">
        {head}
        <section className="admin__panel wl-empty">
          <LuWandSparkles aria-hidden="true" className="wl-empty__icon" />
          <h2>The wish list isn’t switched on yet</h2>
          <p>Run <code>supabase/migrations/2026-10-19-wishes.sql</code> once in the Supabase SQL editor and wishes will start landing here. Until then, visitors can still make a wish; the fox thanks them, it just isn’t saved.</p>
        </section>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="wl">
        {head}
        <section className="admin__panel wl-empty">
          <svg className="wl-empty__art" viewBox="0 0 120 90" aria-hidden="true">
            <path d="M30 30 H90 L86 78 H34 Z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
            <path d="M14 30 C30 22 90 22 106 30" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            <path d="M33 64 H87" stroke="#d4ad57" strokeWidth="6" />
            <path d="M58 6 V16 M53 11 H63" stroke="#b0436e" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <h2>No wishes yet</h2>
          <p>Share the menu page and they’ll roll in. Visitors find “Make a wish” in the fox’s card, on the /wish page, and in “Don’t see your favorite?” at the bottom of the Menu page.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="wl">
      {head}

      <div className="wl-summary">
        <TopWishes groups={groups} picked={group?.key} onPick={(g) => { setGroup(group?.key === g.key ? null : g); setSelected(new Set()); }} />
        <CategoryBars counts={counts} />
      </div>

      <div className="wl-toolbar" role="search">
        <label className="wl-search">
          <LuSearch aria-hidden="true" />
          <span className="sr-only">Search wishes</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search wishes, reasons, names, notes" />
        </label>
        <label className="wl-select">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_FILTERS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </label>
        <label className="wl-select">
          <span>Kind</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All kinds</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </label>
        <button type="button" className="btn btn--ghost btn--sm wl-export" onClick={exportCsv} disabled={!shown.length}>
          <LuDownload aria-hidden="true" /> Export CSV
        </button>
      </div>

      {group && (
        <p className="wl-groupfilter">
          Showing <strong>{group.label} ×{group.count}</strong>
          <button type="button" className="wl-groupfilter__x" onClick={() => setGroup(null)}><LuX aria-hidden="true" /> Show every wish</button>
        </p>
      )}

      <div className={`wl-bulk${selected.size ? ' is-on' : ''}`} aria-live="polite">
        <label className="wl-bulk__all">
          <input type="checkbox" checked={allShownSelected} onChange={selectAll} disabled={!shown.length} />
          <span>{selected.size ? `${selected.size} selected` : `Select all ${shown.length}`}</span>
        </label>
        {selected.size > 0 && (
          <div className="wl-bulk__actions">
            <span className="wl-bulk__lead">Mark as</span>
            {STATUSES.filter((s) => s.id !== 'new' && s.id !== 'hidden').map((s) => (
              <button key={s.id} type="button" className="btn btn--ghost btn--sm" onClick={() => bulk(s.id)}>{s.label}</button>
            ))}
            <button type="button" className="btn btn--ghost btn--sm wl-bulk__hide" onClick={() => bulk('hidden')}><LuEyeOff aria-hidden="true" /> Hide as spam</button>
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="admin-empty">No wishes match. Try clearing the search or the filters.</p>
      ) : (
        <ul className="wl-list">
          {shown.map((w) => {
            const g = groupOf.get(w.id);
            const sid = `wl-status-${w.id}`;
            return (
              <li key={w.id} className={`wl-card wl-card--${w.status}${selected.has(w.id) ? ' is-selected' : ''}`}>
                <input type="checkbox" className="wl-card__check" checked={selected.has(w.id)} onChange={() => toggle(w.id)} aria-label={`Select “${w.text}”`} />
                <div className="wl-card__body">
                  <div className="wl-card__meta">
                    <CategoryChip id={w.category} />
                    <time dateTime={w.created_at} title={new Date(w.created_at).toLocaleString()}>{relativeDate(w.created_at, now)}</time>
                    {g && g.count > 1 && !group && (
                      <button type="button" className="wl-similar" onClick={() => setGroup(g)}>×{g.count} similar</button>
                    )}
                  </div>
                  <p className="wl-card__text">{w.text}</p>
                  {w.why && <p className="wl-card__why">“{w.why}”</p>}
                  {w.first_name && <p className="wl-card__name">from {w.first_name}</p>}
                  <NoteEditor wish={w} onSave={(note) => save([w.id], { admin_note: note }, 'Saved: note updated')} />
                </div>
                <div className="wl-card__side">
                  <StatusPill id={w.status} />
                  <label className="sr-only" htmlFor={sid}>Status of “{w.text}”</label>
                  <select id={sid} className="wl-card__status" value={w.status} onChange={(e) => save([w.id], { status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  {w.status === 'new' && (
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => save([w.id], { status: 'considering' })}>
                      <LuCheck aria-hidden="true" /> Considering
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
