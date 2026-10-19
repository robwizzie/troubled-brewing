import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useToast, ConfirmModal, Spinner } from '../components/ui.jsx';
import { ScreenHead, usePublishUnit } from '../lib/publishing.jsx';
import { same } from '../lib/publishHelpers.js';
import { dayName } from '../../lib/hours.js';
import { LuCircleCheck, LuPlus } from 'react-icons/lu';
import { Icon } from '../components/Icon.jsx';

/* Weekly hours grid + holiday overrides. Google Business hours win when they're
   connected (this grid is the fallback); holiday closures always apply. Both
   halves stay on this screen until Publish. */

const toRows = (hours) =>
  hours.map((r) => ({ day_of_week: r.day_of_week, open_time: r.open_time || null, close_time: r.close_time || null }));
/* "2026-12-25" → "Fri, Dec 25, 2026" (no timezone drift: it's a calendar date). */
function prettyDate(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
const BLANK_OVERRIDE = { override_date: '', label: '', open_time: '', close_time: '', closed: false };

export default function HoursEditor() {
  const toast = useToast();
  const [savedHours, setSavedHours] = useState(null);
  const [hours, setHours] = useState(null);
  const [savedOverrides, setSavedOverrides] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [googleLive, setGoogleLive] = useState(false);
  const [newOverride, setNewOverride] = useState(BLANK_OVERRIDE);
  const [confirmDel, setConfirmDel] = useState(null);

  async function load() {
    const [{ data: h }, { data: o }, { data: g }] = await Promise.all([
      supabase.from('hours').select('*').order('day_of_week'),
      supabase.from('hours_overrides').select('*').order('override_date'),
      supabase.from('google_profile').select('weekday_periods').eq('id', 1).maybeSingle(),
    ]);
    const byDay = Object.fromEntries((h || []).map((r) => [r.day_of_week, r]));
    const week = toRows(Array.from({ length: 7 }, (_, d) => byDay[d] || { day_of_week: d }));
    setSavedHours(week);
    setHours(week);
    setSavedOverrides(o || []);
    setOverrides(o || []);
    setGoogleLive(Array.isArray(g?.weekday_periods) && g.weekday_periods.length > 0);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load().catch(() => toast('Could not load hours — refresh the page to try again.', 'error')); }, []);

  /* ---- weekly grid ---- */
  const weekDirty = hours !== null && !same(toRows(hours), savedHours);
  usePublishUnit('hours:week', {
    dirty: weekDirty,
    async publish() {
      const rows = toRows(hours);
      const { error } = await supabase.from('hours').upsert(rows, { onConflict: 'day_of_week' });
      if (error) throw error;
      setSavedHours(rows);
    },
    discard() { setHours(savedHours); },
  });

  /* ---- holidays ---- */
  const dates = (list) => list.map((o) => JSON.stringify([o.override_date, o.label || null, o.open_time || null, o.close_time || null]));
  const added = overrides.filter((o) => !dates(savedOverrides).includes(dates([o])[0]));
  const removed = savedOverrides.filter((o) => !dates(overrides).includes(dates([o])[0]));
  const holidaysDirty = added.length > 0 || removed.length > 0;
  usePublishUnit('hours:holidays', {
    dirty: holidaysDirty,
    async publish() {
      const replacedDates = new Set(added.map((o) => o.override_date));
      const toDelete = removed.filter((o) => !replacedDates.has(o.override_date)).map((o) => o.override_date);
      if (toDelete.length) {
        const { error } = await supabase.from('hours_overrides').delete().in('override_date', toDelete);
        if (error) throw error;
      }
      if (added.length) {
        const rows = added.map(({ override_date, label, open_time, close_time }) => ({ override_date, label: label || null, open_time: open_time || null, close_time: close_time || null }));
        const { error } = await supabase.from('hours_overrides').upsert(rows, { onConflict: 'override_date' });
        if (error) throw error;
      }
      setSavedOverrides(overrides);
    },
    discard() { setOverrides(savedOverrides); setNewOverride(BLANK_OVERRIDE); },
  });

  function setDay(d, key, val) {
    setHours((hrs) => hrs.map((r) => (r.day_of_week === d ? { ...r, [key]: val } : r)));
  }

  function addOverride() {
    if (!newOverride.override_date) { toast('Pick a date for the holiday first.', 'error'); return; }
    const row = {
      override_date: newOverride.override_date,
      label: newOverride.label || null,
      open_time: newOverride.closed ? null : newOverride.open_time || null,
      close_time: newOverride.closed ? null : newOverride.close_time || null,
    };
    setOverrides((list) => [...list.filter((o) => o.override_date !== row.override_date), row].sort((a, b) => a.override_date.localeCompare(b.override_date)));
    setNewOverride(BLANK_OVERRIDE);
  }

  if (hours === null) return <Spinner />;
  const isNew = (o) => added.some((a) => a.override_date === o.override_date);

  return (
    <div>
      <ScreenHead
        title="Hours & holidays"
        help="The opening hours on every page (header, footer, Hours & Location) and one-off holiday closures."
      />
      <section className="admin__panel">
        <h2>Weekly hours {weekDirty && <span className="badge badge--draft panel-badge">Changed — not live yet</span>}</h2>
        {googleLive && (
          <p className="field__hint callout callout--ok">
            <Icon icon={LuCircleCheck} size={18} />
            <span><strong>Your Google Business hours are live on the site.</strong> This grid is only the
            backup if Google is ever unavailable — to change your regular hours, update them on your
            Google Business Profile (they refresh here daily). Holiday closures below always apply.</span>
          </p>
        )}
        <p className="field__hint">Leave both blank for a day you’re closed. Use a consistent format like “7:30 AM”.</p>
        <table className="admin-hours">
          <thead><tr><th>Day</th><th>Opens</th><th>Closes</th></tr></thead>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const r = hours.find((x) => x.day_of_week === d);
              return (
                <tr key={d}>
                  <th scope="row">{dayName(d)}</th>
                  <td><input aria-label={`${dayName(d)} opens`} value={r.open_time || ''} placeholder="Closed" onChange={(e) => setDay(d, 'open_time', e.target.value)} /></td>
                  <td><input aria-label={`${dayName(d)} closes`} value={r.close_time || ''} placeholder="Closed" onChange={(e) => setDay(d, 'close_time', e.target.value)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="admin__panel">
        <h2>Holiday closures & special hours {holidaysDirty && <span className="badge badge--draft panel-badge">Changed — not live yet</span>}</h2>
        {overrides.length === 0 && removed.length === 0 ? (
          <p className="admin-empty admin-empty--left">No holidays or special hours yet. Pick a date below, give it a name like “Thanksgiving”, then press <strong>+ Add holiday</strong>.</p>
        ) : (
          <ul className="admin-list">
            {overrides.map((o) => (
              <li key={o.override_date} className="admin-list__row">
                <div className="admin-list__body">
                  <strong>{prettyDate(o.override_date)}</strong>
                  <div className="admin-list__meta">{o.label || ''} — {o.open_time && o.close_time ? `${o.open_time}–${o.close_time}` : 'Closed all day'}</div>
                </div>
                {isNew(o) && <span className="badge badge--draft">New — not live yet</span>}
                <div className="admin-list__actions">
                  <button className="btn btn--danger btn--sm" onClick={() => setConfirmDel(o.override_date)}>Delete</button>
                </div>
              </li>
            ))}
            {removed.filter((o) => !overrides.some((x) => x.override_date === o.override_date)).map((o) => (
              <li key={`rm-${o.override_date}`} className="admin-list__row is-removed">
                <div className="admin-list__body">
                  <strong>{prettyDate(o.override_date)}</strong>
                  <div className="admin-list__meta">{o.label || ''}</div>
                </div>
                <span className="badge badge--remove">Will be removed</span>
                <div className="admin-list__actions">
                  <button className="btn btn--ghost btn--sm" onClick={() => setOverrides((list) => [...list, o].sort((a, b) => a.override_date.localeCompare(b.override_date)))}>Undo remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="admin-override-form">
          <div className="field"><label htmlFor="ho-date">Date</label><input id="ho-date" type="date" value={newOverride.override_date} onChange={(e) => setNewOverride((s) => ({ ...s, override_date: e.target.value }))} /></div>
          <div className="field"><label htmlFor="ho-label">Label</label><input id="ho-label" placeholder="Closed for Thanksgiving" value={newOverride.label} onChange={(e) => setNewOverride((s) => ({ ...s, label: e.target.value }))} /></div>
          <label className="checkfield"><input type="checkbox" checked={newOverride.closed} onChange={(e) => setNewOverride((s) => ({ ...s, closed: e.target.checked }))} /><span>Closed all day</span></label>
          {!newOverride.closed && (
            <>
              <div className="field"><label htmlFor="ho-open">Opens</label><input id="ho-open" placeholder="9:00 AM" value={newOverride.open_time} onChange={(e) => setNewOverride((s) => ({ ...s, open_time: e.target.value }))} /></div>
              <div className="field"><label htmlFor="ho-close">Closes</label><input id="ho-close" placeholder="2:00 PM" value={newOverride.close_time} onChange={(e) => setNewOverride((s) => ({ ...s, close_time: e.target.value }))} /></div>
            </>
          )}
          <button className="btn btn--primary" onClick={addOverride}><Icon icon={LuPlus} size={16} />Add holiday</button>
        </div>
      </section>

      <ConfirmModal
        open={Boolean(confirmDel)}
        title="Delete this holiday?"
        body="Your normal weekly hours will apply on that date again once you press Publish. Until then you can undo it."
        confirmLabel="Delete"
        onConfirm={() => { setOverrides((list) => list.filter((o) => o.override_date !== confirmDel)); setConfirmDel(null); }}
        onCancel={() => setConfirmDel(null)}
      />
    </div>
  );
}
