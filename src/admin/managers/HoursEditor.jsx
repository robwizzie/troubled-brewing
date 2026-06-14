import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useToast, ConfirmModal, Spinner } from '../components/ui.jsx';
import { dayName } from '../../lib/hours.js';

/* Weekly hours grid + holiday overrides. Note: if you use Google as the source
   of truth for hours (recommended), these still serve as the editable fallback
   and the place to add one-off holiday closures. See docs/INTEGRATIONS.md. */
export default function HoursEditor() {
  const toast = useToast();
  const [hours, setHours] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newOverride, setNewOverride] = useState({ override_date: '', label: '', open_time: '', close_time: '', closed: false });
  const [confirmDel, setConfirmDel] = useState(null);

  async function load() {
    const [{ data: h }, { data: o }] = await Promise.all([
      supabase.from('hours').select('*').order('day_of_week'),
      supabase.from('hours_overrides').select('*').order('override_date'),
    ]);
    // Ensure all 7 days exist in the editor even if not seeded.
    const byDay = Object.fromEntries((h || []).map((r) => [r.day_of_week, r]));
    setHours(Array.from({ length: 7 }, (_, d) => byDay[d] || { day_of_week: d, open_time: '', close_time: '' }));
    setOverrides(o || []);
  }
  useEffect(() => { load().catch(() => toast('Could not load hours', 'error')); /* eslint-disable-next-line */ }, []);

  function setDay(d, key, val) {
    setHours((hrs) => hrs.map((r) => (r.day_of_week === d ? { ...r, [key]: val } : r)));
  }

  async function saveWeek() {
    setSaving(true);
    try {
      const rows = hours.map((r) => ({
        day_of_week: r.day_of_week,
        open_time: r.open_time || null,
        close_time: r.close_time || null,
      }));
      const { error } = await supabase.from('hours').upsert(rows, { onConflict: 'day_of_week' });
      if (error) throw error;
      toast('Hours saved');
    } catch (e) {
      toast(e.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function addOverride() {
    if (!newOverride.override_date) { toast('Pick a date for the holiday.', 'error'); return; }
    try {
      const row = {
        override_date: newOverride.override_date,
        label: newOverride.label || null,
        open_time: newOverride.closed ? null : newOverride.open_time || null,
        close_time: newOverride.closed ? null : newOverride.close_time || null,
      };
      const { error } = await supabase.from('hours_overrides').upsert(row, { onConflict: 'override_date' });
      if (error) throw error;
      toast('Holiday added');
      setNewOverride({ override_date: '', label: '', open_time: '', close_time: '', closed: false });
      load();
    } catch (e) {
      toast(e.message || 'Could not add', 'error');
    }
  }

  async function delOverride(date) {
    try {
      await supabase.from('hours_overrides').delete().eq('override_date', date);
      toast('Holiday removed');
      setConfirmDel(null);
      load();
    } catch (e) {
      toast(e.message || 'Could not remove', 'error');
    }
  }

  if (hours === null) return <Spinner />;

  return (
    <div>
      <h1>Hours</h1>
      <section className="admin__panel">
        <h2>Weekly hours</h2>
        <p className="field__hint">Leave both blank for a day you’re closed. Use a consistent format like “7:30 AM”.</p>
        <table className="admin-hours">
          <thead><tr><th>Day</th><th>Opens</th><th>Closes</th></tr></thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const r = hours.find((x) => x.day_of_week === d);
              return (
                <tr key={d}>
                  <th scope="row">{dayName(d)}</th>
                  <td><input value={r.open_time || ''} placeholder="Closed" onChange={(e) => setDay(d, 'open_time', e.target.value)} /></td>
                  <td><input value={r.close_time || ''} placeholder="Closed" onChange={(e) => setDay(d, 'close_time', e.target.value)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="btn btn--primary" onClick={saveWeek} disabled={saving}>{saving ? 'Saving…' : 'Save hours'}</button>
      </section>

      <section className="admin__panel">
        <h2>Holiday closures & special hours</h2>
        {overrides.length === 0 ? (
          <p className="field__hint">None set. Add one below for holidays or special events.</p>
        ) : (
          <ul className="admin-list">
            {overrides.map((o) => (
              <li key={o.override_date} className="admin-list__row">
                <div className="admin-list__body">
                  <strong>{o.override_date}</strong>
                  <div className="admin-list__meta">{o.label || ''} — {o.open_time && o.close_time ? `${o.open_time}–${o.close_time}` : 'Closed all day'}</div>
                </div>
                <div className="admin-list__actions">
                  <button className="btn btn--danger btn--sm" onClick={() => setConfirmDel(o.override_date)}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="admin-override-form">
          <div className="field"><label>Date</label><input type="date" value={newOverride.override_date} onChange={(e) => setNewOverride((s) => ({ ...s, override_date: e.target.value }))} /></div>
          <div className="field"><label>Label</label><input placeholder="Closed for Thanksgiving" value={newOverride.label} onChange={(e) => setNewOverride((s) => ({ ...s, label: e.target.value }))} /></div>
          <label className="checkfield"><input type="checkbox" checked={newOverride.closed} onChange={(e) => setNewOverride((s) => ({ ...s, closed: e.target.checked }))} /><span>Closed all day</span></label>
          {!newOverride.closed && (
            <>
              <div className="field"><label>Opens</label><input placeholder="9:00 AM" value={newOverride.open_time} onChange={(e) => setNewOverride((s) => ({ ...s, open_time: e.target.value }))} /></div>
              <div className="field"><label>Closes</label><input placeholder="2:00 PM" value={newOverride.close_time} onChange={(e) => setNewOverride((s) => ({ ...s, close_time: e.target.value }))} /></div>
            </>
          )}
          <button className="btn btn--accent" onClick={addOverride}>+ Add holiday</button>
        </div>
      </section>

      <ConfirmModal
        open={Boolean(confirmDel)}
        title="Remove this holiday?"
        body="Your normal weekly hours will apply on that date again."
        confirmLabel="Remove"
        onConfirm={() => delOverride(confirmDel)}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
