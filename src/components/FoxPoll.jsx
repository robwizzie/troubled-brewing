import { useEffect, useId, useState } from 'react';
import { track } from '../lib/analytics.js';
import { castVote, foxPollLine, getActivePoll, getPollResults, myVote, percents } from '../lib/polls.js';
import PollIcon from './PollIcon.jsx';

/* "This or that": today's one-tap poll in the fox's card (src/lib/polls.js).

   Two big buttons; tap one and the card turns into the running result: two
   bars with percentages, the vote count and a line from the fox. One vote per
   browser per poll. Renders nothing at all when there's no poll running, no
   Supabase, or the polls table doesn't exist yet. The bars grow in once
   (CSS, stilled under prefers-reduced-motion); no hover lift. */

export function PollCard({ poll, results, mine, busy = false, failed = false, onVote }) {
  const id = useId();
  const qId = `poll-q-${id.replace(/:/g, '')}`;
  const voted = Boolean(mine);
  const pc = results ? percents(results.a, results.b) : null;

  return (
    <section className={`fox-poll${voted ? ' is-voted' : ''}`} aria-labelledby={qId}>
      <p className="fox-poll__kicker">This or that?</p>
      <h3 className="fox-poll__q" id={qId}>{poll.question}</h3>
      {!voted ? (
        <>
          <div className="fox-poll__opts">
            {['a', 'b'].map((c) => (
              <button key={c} type="button" className="fox-poll__opt" disabled={busy} onClick={() => onVote(c)}>
                <PollIcon id={c === 'a' ? poll.icon_a : poll.icon_b} className="fox-poll__ico" />
                <span>{c === 'a' ? poll.option_a : poll.option_b}</span>
              </button>
            ))}
          </div>
          {failed && <p className="fox-poll__note" role="status">That didn’t go through. Try again in a sec?</p>}
        </>
      ) : (
        <div className="fox-poll__result" role="status">
          {pc ? (
            <>
              <ul className="fox-poll__bars" aria-label="Results so far">
                {['a', 'b'].map((c) => (
                  <li key={c} className={`fox-poll__bar${mine === c ? ' is-mine' : ''}`}>
                    <span className="fox-poll__fill" style={{ '--pct': `${pc[c]}%` }} aria-hidden="true" />
                    <span className="fox-poll__label">
                      <PollIcon id={c === 'a' ? poll.icon_a : poll.icon_b} className="fox-poll__ico" />
                      {c === 'a' ? poll.option_a : poll.option_b}
                      {mine === c && <span className="fox-poll__you"> · your pick</span>}
                    </span>
                    <span className="fox-poll__pct">{pc[c]}%</span>
                  </li>
                ))}
              </ul>
              <p className="fox-poll__count">{pc.total === 1 ? '1 vote' : `${pc.total.toLocaleString('en-US')} votes`} so far</p>
              <p className="fox-poll__line">{foxPollLine(poll, results, mine)}</p>
            </>
          ) : (
            <p className="fox-poll__line">Thanks for voting! The tally’s on its way.</p>
          )}
        </div>
      )}
    </section>
  );
}

export default function FoxPoll() {
  const [poll, setPoll] = useState(null);
  const [mine, setMine] = useState(null);
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    getActivePoll().then(async (p) => {
      if (!alive || !p) return;
      const already = myVote(p.id);
      setPoll(p);
      setMine(already);
      if (already) {
        const r = await getPollResults(p.id);
        if (alive) setResults(r);
      }
    });
    return () => { alive = false; };
  }, []);

  if (!poll) return null;

  const vote = async (choice) => {
    if (busy || mine) return;
    setBusy(true);
    setFailed(false);
    const ok = await castVote(poll.id, choice);
    if (!ok) {
      setBusy(false);
      setFailed(true);
      return;
    }
    track('poll_vote', { poll: poll.question, choice: choice === 'a' ? poll.option_a : poll.option_b });
    const r = await getPollResults(poll.id);
    setResults(r);
    setMine(choice);
    setBusy(false);
  };

  return <PollCard poll={poll} results={results} mine={mine} busy={busy} failed={failed} onVote={vote} />;
}
