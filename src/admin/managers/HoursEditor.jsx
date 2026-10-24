import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useToast, ConfirmModal, Spinner } from '../components/ui.jsx';
import { ScreenHead, usePublishUnit } from '../lib/publishing.jsx';
import { same } from '../lib/publishHelpers.js';
import { dayName, googleWeekly, toMinutes } from '../../lib/hours.js';
import { LuCircleCheck, LuPlus, LuRefreshCw } from 'react-icons/lu';
import { Icon } from '../components/Icon.jsx';

/* Weekly hours grid + holiday overrides. Both halves stay on this screen
   until Publish.

   With the Business Profile connected (the google-hours Edge Function has its
   GBP_* secrets), this screen is where hours are changed: Publish saves them
   AND sends them to Google, so the site, Google Search and Maps all agree.
   The grid then starts from the hours Google has now, so publishing never
   pushes stale fallback hours over the real ones.

   Without that connection, Google's hours (when cached) still win on the site
   and this grid is only the fallback — change regular hours on Google then.
   Holiday closures always apply on the site either way. */

const toRows = (hours) =>
  hours.map((r) => ({ day_of_week: r.day_of_week, open_time: r.open_time || null, close_time: r.close_time || null }));
/* "2026-12-25" → "Fri, Dec 25, 2026" (no timezone drift: it's a calendar date). */
function prettyDate(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}
/* Why a day's times won't work, or '' when they're fine (both blank = closed). */
function badTimes(open, close) {
  const o = String(open || '').trim();
  const c = String(close || '').trim();
  if (!o && !c) return '';
  if (!o || !c) return 'needs both an opening and a closing time.';
  if (toMinutes(o) == null || toMinutes(c) == null) return 'write times like “7:30 AM” or “3 PM”.';
  return '';
}

/* Is the Business Profile connected, so hours can be sent to Google? */
async function googleStatus() {
  try {
    const { data, error } = await supabase.functions.invoke('google-hours', { body: { action: 'status' } });
    return !error && Boolean(data?.connected);
  } catch {
    return false;
  }
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
  const [canPush, setCanPush] = useState(false); // Business Profile connected
  const [pushing, setPushing] = useState(false);
  const pushTimer = useRef(null);

  async function load() {
    const [{ data: h }, { data: o }, { data: g }, connected] = await Promise.all([
      supabase.from('hours').select('*').order('day_of_week'),
      supabase.from('hours_overrides').select('*').order('override_date'),
      supabase.from('google_profile').select('weekday_periods').eq('id', 1).maybeSingle(),
      googleStatus(),
    ]);
    const fromGoogle = connected ? googleWeekly(g) : [];
    const byDay = Object.fromEntries((fromGoogle.length ? fromGoogle : h || []).map((r) => [r.day_of_week, r]));
    const week = toRows(Array.from({ length: 7 }, (_, d) => byDay[d] || { day_of_week: d }));
    setSavedHours(week);
    setHours(week);
    setSavedOverrides(o || []);
    setOverrides(o || []);
    setGoogleLive(Array.isArray(g?.weekday_periods) && g.weekday_periods.length > 0);
    setCanPush(connected);
  }

  /* Send what's saved to Google. Both halves publish in one press, so the
     push waits a beat and goes once. */
  async function pushToGoogle({ quiet = false } = {}) {
    setPushing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-hours', { body: { action: 'push' } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.detail || data?.error || 'Google said no');
      toast('Hours sent to Google — Search and Maps usually update within minutes.', 'success');
    } catch (e) {
      const why = e?.message && /needs both/.test(e.message) ? ` (${e.message})` : '';
      toast(`Saved on the site, but Google didn’t take the new hours just now${why}. Press “Send to Google” to try again.`, 'error', { duration: 9000 });
      if (!quiet) console.warn(e); // eslint-disable-line no-console
    } finally {
      setPushing(false);
    }
  }
  function queuePush() {
    if (!canPush) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => pushToGoogle(), 400);
  }
  useEffect(() => () => clearTimeout(pushTimer.current), []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load().catch(() => toast('Could not load hours — refresh the page to try again.', 'error')); }, []);

  /* ---- weekly grid ---- */
  const weekDirty = hours !== null && !same(toRows(hours), savedHours);
  usePublishUnit('hours:week', {
    dirty: weekDirty,
    async publish() {
      const rows = toRows(hours);
      const bad = rows.find((r) => badTimes(r.open_time, r.close_time));
      if (bad) throw new Error(`${dayName(bad.day_of_week)}: ${badTimes(bad.open_time, bad.close_time)}`);
      const { error } = await supabase.from('hours').upsert(rows, { onConflict: 'day_of_week' });
      if (error) throw error;
      setSavedHours(rows);
      queuePush();
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
      queuePush();
    },
    discard() { setOverrides(savedOverrides); setNewOverride(BLANK_OVERRIDE); },
  });

  function setDay(d, key, val) {
    setHours((hrs) => hrs.map((r) => (r.day_of_week === d ? { ...r, [key]: val } : r)));
  }

  function addOverride() {
    if (!newOverride.override_date) { toast('Pick a date for the holiday first.', 'error'); return; }
    const problem = !newOverride.closed && badTimes(newOverride.open_time, newOverride.close_time);
    if (problem) { toast(`${problem} Or tick “Closed all day”.`, 'error'); return; }
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
        {canPush ? (
          <div className="field__hint callout callout--ok">
            <Icon icon={LuCircleCheck} size={18} />
            <span>
              <strong>Connected to Google.</strong> Change your hours here and press <strong>Publish</strong>: they go
              on the site and to your Google Business Profile (Search and Maps) together, holidays included.
              {googleLive && ' The grid below shows the hours Google has right now.'}
              {' '}
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => pushToGoogle()} disabled={pushing || weekDirty || holidaysDirty} title={weekDirty || holidaysDirty ? 'Publish your changes first' : undefined}>
                <Icon icon={LuRefreshCw} size={14} />
                {pushing ? 'Sending…' : 'Send to Google'}
              </button>
            </span>
          </div>
        ) : googleLive ? (
          <p className="field__hint callout callout--ok">
            <Icon icon={LuCircleCheck} size={18} />
            <span><strong>Your Google Business hours are live on the site.</strong> This grid is only the
            backup if Google is ever unavailable — to change your regular hours, update them on your
            Google Business Profile (they refresh here daily), or ask your developer to connect Google so
            hours can be changed right here. Holiday closures below always apply.</span>
          </p>
        ) : null}
        <p className="field__hint">Leave both blank for a day you’re closed. Write times like “7:30 AM” or “3 PM”.</p>
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
