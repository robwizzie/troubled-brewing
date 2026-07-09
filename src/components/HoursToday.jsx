import { useEffect, useState } from 'react';
import { getHours, getHoursOverrides, getGoogleProfile } from '../lib/dataService.js';
import { computeStatus, dayName, shopNow, googleWeekly } from '../lib/hours.js';

/* Today's open/closed status pill, plus an optional full weekly table.
   Source of truth for hours: the shop's GOOGLE BUSINESS PROFILE once its
   structured hours are cached (client asked), with the admin-editable manual
   table as the fallback. Owner holiday overrides ALWAYS apply on top of
   either source. See docs/INTEGRATIONS.md §Google Places.
   Status is derived at render (not stored) and a minute-tick re-renders, so a
   tab left open flips Open → Closed on time. */
export default function HoursToday({ showWeek = false }) {
  const [hours, setHours] = useState(null);
  const [overrides, setOverrides] = useState([]);
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([getHours(), getHoursOverrides(), getGoogleProfile()]).then(([h, o, g]) => {
      if (!alive) return;
      const google = googleWeekly(g);
      setHours(google.length ? google : h);
      setOverrides(o);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const status = hours ? computeStatus(hours, overrides) : null;

  if (!status) {
    return <div className="skeleton" style={{ height: 44, width: 220, borderRadius: 'var(--radius-pill)' }} aria-label="Loading hours" />;
  }

  const todayDow = shopNow().dow;

  return (
    <div>
      <div className="hours-today">
        <span className={`hours-today__dot ${status.open ? 'is-open' : 'is-closed'}`} aria-hidden="true" />
        <span><strong>{status.open ? 'Open now' : 'Closed'}</strong> · {status.label}</span>
      </div>

      {status.override && status.overrideLabel && (
        <p className="hours-override" style={{ marginTop: 'var(--space-2)' }}>Heads up: {status.overrideLabel}</p>
      )}

      {showWeek && hours && (
        <table className="hours-table" style={{ marginTop: 'var(--space-4)' }}>
          <tbody>
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
              const row = hours.find((h) => h.day_of_week === dow) || {};
              const closed = !row.open_time || !row.close_time;
              return (
                <tr key={dow} className={dow === todayDow ? 'today' : ''}>
                  <th scope="row">{dayName(dow)}</th>
                  <td>{closed ? 'Closed' : `${row.open_time} – ${row.close_time}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
