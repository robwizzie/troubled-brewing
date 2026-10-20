import { useEffect, useId, useRef, useState } from 'react';
import { LuCalendarPlus, LuGift, LuInfo, LuMessageSquare, LuMousePointerClick, LuEye, LuSparkles, LuVote } from 'react-icons/lu';
import { Spinner } from '../components/ui.jsx';
import { ScreenHead } from '../lib/publishing.jsx';
import { RANGES, loadStats, summarize } from '../lib/stats.js';
import '../insights.css';

/* "Site stats": the shop's own cookieless counts (src/lib/siteStats.js),
   for owners who don't want to learn Google Analytics. One plain-English
   line, then a few small charts. Read-only: nothing here changes the site.

   `sample` (rows) skips the database: tests and the screenshot script pass
   made-up numbers through it. */

const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const shortDay = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Page views per day: one line, hover/focus a day to read it. */
function DailyChart({ daily }) {
  const id = useId();
  const [hover, setHover] = useState(null);
  const box = useRef(null);
  const [W, setW] = useState(640);
  // draw at the real width, so the text never stretches on a phone
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w > 0) setW(w); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const H = 200;
  const pad = { l: 34, r: 10, t: 12, b: 24 };
  const max = Math.max(4, ...daily.map((d) => d.views));
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const x = (i) => pad.l + (daily.length === 1 ? 0 : (i / (daily.length - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const path = daily.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.views).toFixed(1)}`).join(' ');
  const area = `${path} L${x(daily.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`;
  const ticks = [0, top / 2, top];
  const labelEvery = Math.ceil(daily.length / Math.max(2, Math.floor(W / 110)));
  const h = hover != null ? daily[hover] : null;

  return (
    <figure className="stats-chart" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby={`${id}-t`}
        onMouseLeave={() => setHover(null)}>
        <title id={`${id}-t`}>Pages opened per day</title>
        {ticks.map((t) => (
          <g key={t}>
            <line className="stats-chart__grid" x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} />
            <text className="stats-chart__tick" x={pad.l - 6} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {daily.map((d, i) => (i % labelEvery === 0 || i === daily.length - 1) && (
          <text key={d.day} className="stats-chart__tick" x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === daily.length - 1 ? 'end' : 'middle'}>{shortDay(d.day)}</text>
        ))}
        <path className="stats-chart__area" d={area} />
        <path className="stats-chart__line" d={path} />
        {h && <line className="stats-chart__cross" x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} />}
        {h && <circle className="stats-chart__dot" cx={x(hover)} cy={y(h.views)} r="4.5" />}
        {daily.map((d, i) => (
          <rect key={d.day} className="stats-chart__hit" x={x(i) - (W - pad.l - pad.r) / daily.length / 2} y={pad.t}
            width={(W - pad.l - pad.r) / daily.length} height={H - pad.t - pad.b}
            onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} />
        ))}
      </svg>
      <figcaption className="stats-chart__read" aria-live="polite">
        {h ? <><strong>{fmt(h.views)}</strong> pages opened on {shortDay(h.day)}</> : 'Point at a day to see its number.'}
      </figcaption>
      <table className="sr-only">
        <caption>Pages opened per day</caption>
        <thead><tr><th scope="col">Day</th><th scope="col">Pages opened</th></tr></thead>
        <tbody>{daily.map((d) => <tr key={d.day}><td>{shortDay(d.day)}</td><td>{d.views}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}

/** A labelled list with a thin bar per row (single hue: length carries it). */
function BarList({ items, label, empty }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.some((i) => i.count > 0)) return <p className="stats-empty">{empty}</p>;
  return (
    <ul className="stats-bars" aria-label={label}>
      {items.map((i) => (
        <li key={i.id || i.path || i.label} className={i.count ? '' : 'is-zero'}>
          <span className="stats-bars__label">{i.label}</span>
          <span className="stats-bars__track" aria-hidden="true"><span style={{ width: `${(i.count / max) * 100}%` }} /></span>
          <span className="stats-bars__num">{fmt(i.count)}</span>
        </li>
      ))}
    </ul>
  );
}

function Tile({ icon: Icon, label, value, note }) {
  return (
    <div className="stats-tile">
      <span className="stats-tile__label"><Icon aria-hidden="true" /> {label}</span>
      <span className="stats-tile__num">{fmt(value)}</span>
      {note && <span className="stats-tile__note">{note}</span>}
    </div>
  );
}

export default function SiteStats({ sample, today }) {
  const [days, setDays] = useState(7);
  const [state, setState] = useState(sample ? { rows: sample } : null);

  useEffect(() => {
    if (sample) return undefined;
    let alive = true;
    setState(null);
    loadStats(days, today).then((s) => alive && setState(s));
    return () => { alive = false; };
  }, [days, sample, today]);

  const head = (
    <ScreenHead
      title="Site stats"
      help="How people use the website, counted the private way: just daily totals, no cookies and nothing about who anyone is."
    >
      <div className="stats-range" role="group" aria-label="Date range">
        {RANGES.map((n) => (
          <button key={n} type="button" className="btn btn--ghost btn--sm" aria-pressed={days === n} onClick={() => setDays(n)}>
            {n} days
          </button>
        ))}
      </div>
    </ScreenHead>
  );

  if (!state) return <div className="stats">{head}<Spinner label="Counting…" /></div>;

  if (state.missing) {
    return (
      <div className="stats">
        {head}
        <section className="admin__panel stats-setup">
          <h2><LuInfo aria-hidden="true" /> Not switched on yet</h2>
          <p>
            Site stats need one small database update before they can start counting. Your developer has it ready
            (<code>supabase/migrations/2026-10-19-polls-and-stats.sql</code>); once it’s run, numbers start appearing here
            the same day.
          </p>
        </section>
      </div>
    );
  }
  if (state.error) {
    return (
      <div className="stats">
        {head}
        <section className="admin__panel stats-setup">
          <h2><LuInfo aria-hidden="true" /> Couldn’t load the numbers</h2>
          <p>Check the Wi-Fi and try again in a minute. Nothing on the site is affected.</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setState(null); loadStats(days, today).then(setState); }}>Try again</button>
        </section>
      </div>
    );
  }

  const s = summarize(state.rows, days, today);

  return (
    <div className="stats">
      {head}
      {sample && <p className="admin__note stats-sample">Sample numbers for illustration only, not real visits.</p>}

      <p className="stats-summary" role="status">{s.summary}</p>

      <div className="stats-tiles">
        <Tile icon={LuEye} label="Pages opened" value={s.views} />
        <Tile icon={LuMousePointerClick} label="Order clicks" value={s.orders} note="Taps on an Order button" />
        <Tile icon={LuSparkles} label="Fox chats" value={s.fox.opens} note="Times someone opened the fox" />
        <Tile icon={LuVote} label="Poll votes" value={s.fox.pollVotes} />
      </div>

      <section className="admin__panel">
        <h2>Pages opened per day</h2>
        <p className="panel-help">Every page someone opens counts once. One person reading three pages counts three.</p>
        <DailyChart daily={s.daily} />
      </section>

      <div className="stats-grid">
        <section className="admin__panel">
          <h2>Top pages</h2>
          <BarList items={s.topPages.slice(0, 8)} label="Top pages" empty="No pages opened in this period yet." />
        </section>
        <section className="admin__panel">
          <h2>Where Order clicks came from</h2>
          <BarList items={s.orderBy.filter((o) => o.count > 0 || o.id !== 'other')} label="Order clicks by where they came from" empty="No Order clicks in this period yet." />
        </section>
        <section className="admin__panel">
          <h2>The fox</h2>
          <BarList
            label="Fox usage"
            empty="Nobody has played with the fox in this period yet."
            items={[
              { id: 'opens', label: 'Opened the fox', count: s.fox.opens },
              { id: 'qs', label: 'Started the quiz', count: s.fox.quizStarted },
              { id: 'qf', label: 'Finished the quiz', count: s.fox.quizFinished },
              { id: 'sm', label: 'Surprise me', count: s.fox.surprise },
              { id: 'pv', label: 'Poll votes', count: s.fox.pollVotes },
            ]}
          />
        </section>
        <section className="admin__panel">
          <h2>Gift cards & events</h2>
          <ul className="stats-list">
            <li><LuGift aria-hidden="true" /> <span>Gift card clicks</span> <strong>{fmt(s.extras.giftCards)}</strong></li>
            <li><LuCalendarPlus aria-hidden="true" /> <span>Events added to a calendar</span> <strong>{fmt(s.extras.calendarAdds)}</strong></li>
            <li><LuMessageSquare aria-hidden="true" /> <span>Events texted to a friend</span> <strong>{fmt(s.extras.textFriend)}</strong></li>
          </ul>
        </section>
      </div>

      <p className="stats-foot">
        <LuInfo aria-hidden="true" /> These are simple daily totals the site keeps itself. No cookies, no IP addresses
        and nothing that identifies anyone, so they count everyone, not just people who accept the cookie banner.
        Your Google Analytics (if it’s set up) works as before.
      </p>
    </div>
  );
}
