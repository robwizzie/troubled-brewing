import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuLayers } from 'react-icons/lu';
import SEO from '../components/SEO.jsx';
import PastBoards from '../components/PastBoards.jsx';
import { MIN_PAST_BOARDS, boardAlt, boardDate, useChalkboardHistory } from '../lib/chalkboard.js';
import { SHOP_TZ } from '../lib/hours.js';

/* /chalkboard — every chalkboard the staff have photographed (admin → Today's
   chalkboard), grouped by month, newest first. Tap one to flip through the
   stack from there. Hidden boards never reach this page (publicBoards). Like
   the homepage link, it only shows the boards once there are two or more. */

const monthOf = (iso) => {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return 'Earlier';
  return new Intl.DateTimeFormat('en-US', { timeZone: SHOP_TZ, month: 'long', year: 'numeric' }).format(d);
};

export default function ChalkboardPage() {
  const boards = useChalkboardHistory();
  const [openAt, setOpenAt] = useState(null);
  const close = useCallback(() => setOpenAt(null), []);
  const enough = (boards?.length || 0) >= MIN_PAST_BOARDS;

  const months = useMemo(() => {
    const out = [];
    (boards || []).forEach((b, i) => {
      const m = monthOf(b.published_at);
      if (!out.length || out[out.length - 1].month !== m) out.push({ month: m, items: [] });
      out[out.length - 1].items.push({ b, i });
    });
    return out;
  }, [boards]);

  return (
    <>
      <SEO path="/chalkboard" />
      <section className="pastpage">
        <div className="container">
          <header className="pastpage__head">
            <p className="eyebrow">Behind the counter</p>
            <h1>Past boards</h1>
            <p className="pastpage__lede">
              The chalkboard by the espresso machine changes with the seasons. Here’s what’s been on it, photographed by the
              crew whenever it gets a fresh coat of chalk.
            </p>
            {enough && (
              <button type="button" className="btn btn--lg pastpage__flip" onClick={() => setOpenAt(0)} aria-haspopup="dialog">
                <LuLayers aria-hidden="true" /> Flip through them
              </button>
            )}
          </header>

          {boards === null ? null : enough ? (
            months.map(({ month, items }) => (
              <section key={month} aria-label={month}>
                <h2 className="pastpage__month">{month}</h2>
                <ul className="pastpage__grid">
                  {items.map(({ b, i }) => (
                    <li key={b.id}>
                      <button type="button" className="pastpage__tile" onClick={() => setOpenAt(i)} aria-haspopup="dialog">
                        <span className="pastpage__frame">
                          <img src={b.url} alt={boardAlt(b)} loading="lazy" decoding="async" />
                        </span>
                        <span className="pastpage__date">{boardDate(b.published_at)}</span>
                        {b.caption && <span className="pastpage__caption">{b.caption}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <p className="pastpage__empty">
              Our board archive fills up as the crew posts photos of the chalkboard. For today’s board, see the{' '}
              <Link to="/">homepage</Link>.
            </p>
          )}
        </div>
      </section>
      {enough && openAt !== null && <PastBoards boards={boards} start={openAt} onClose={close} />}
    </>
  );
}
