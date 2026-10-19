import { useEffect, useId, useMemo, useState } from 'react';
import { LuArchive, LuArchiveRestore, LuCircleStop, LuInfo, LuLightbulb, LuPencil, LuPlus, LuTrash2, LuVote } from 'react-icons/lu';
import { supabase } from '../../lib/supabase.js';
import { shopNow } from '../../lib/hours.js';
import {
  OPTION_MAX, POLL_ICONS, QUESTION_MAX, SUGGESTED_POLLS,
  getPollResults, iconOrNull, percents, pickActivePoll, pollPhase,
} from '../../lib/polls.js';
import PollIcon from '../../components/PollIcon.jsx';
import { Spinner } from '../components/ui.jsx';
import { ScreenHead, usePublishUnit } from '../lib/publishing.jsx';
import { same } from '../lib/publishHelpers.js';
import '../insights.css';

/* "This or that polls": the one-tap question in the fox's card.

   The owner writes a question and two answers (each can wear an icon from a
   small set), and picks when it runs: not yet, now until ended, or between two
   dates. Everything here is local until Publish (the explicit Publish model,
   lib/publishing.jsx): Publish inserts new polls and updates changed ones in
   one go. Results come from poll_results() (totals only).

   The six suggestions are made from the real menu and only fill the form;
   nothing is ever published by itself. */

const FIELDS = ['question', 'option_a', 'option_b', 'icon_a', 'icon_b', 'starts_on', 'ends_on', 'status'];
const pick = (p) => Object.fromEntries(FIELDS.map((k) => [k, p[k] ?? null]));
const EMPTY_FORM = { question: '', option_a: '', option_b: '', icon_a: null, icon_b: null };
const niceDate = (iso) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '');

const isMissing = (error) => /42P01|PGRST205|does not exist|schema cache/i.test(`${error?.code || ''} ${error?.message || ''}`);

/** How a poll runs, as the owner chooses it. */
function runMode(p) {
  if (p.status !== 'published') return 'off';
  return p.ends_on || (p.starts_on && p.starts_on > shopNow().isoDate) ? 'dates' : 'now';
}

function IconPicker({ label, value, onChange }) {
  return (
    <div className="pollicons" role="radiogroup" aria-label={label}>
      <button type="button" role="radio" aria-checked={!value} className="pollicons__btn pollicons__btn--none" onClick={() => onChange(null)}>None</button>
      {POLL_ICONS.map((i) => (
        <button key={i.id} type="button" role="radio" aria-checked={value === i.id} className="pollicons__btn" title={i.label} onClick={() => onChange(i.id)}>
          <PollIcon id={i.id} />
          <span className="sr-only">{i.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Question + two options + icons. */
function PollFields({ value, onChange, idPrefix }) {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="pollform">
      <div className="field field--full">
        <label htmlFor={`${idPrefix}-q`}>Question</label>
        <input id={`${idPrefix}-q`} value={value.question} maxLength={QUESTION_MAX} placeholder="Iced or hot today?" onChange={set('question')} />
      </div>
      {['a', 'b'].map((c) => (
        <div className="field pollform__opt" key={c}>
          <label htmlFor={`${idPrefix}-${c}`}>{c === 'a' ? 'First answer' : 'Second answer'}</label>
          <input id={`${idPrefix}-${c}`} value={value[`option_${c}`]} maxLength={OPTION_MAX} placeholder={c === 'a' ? 'Iced' : 'Hot'} onChange={set(`option_${c}`)} />
          <IconPicker label={`Icon for the ${c === 'a' ? 'first' : 'second'} answer`} value={value[`icon_${c}`]} onChange={(v) => onChange({ ...value, [`icon_${c}`]: v })} />
        </div>
      ))}
    </div>
  );
}

/** When it runs: not yet / now until ended / between dates. */
function Schedule({ poll, onChange, idPrefix }) {
  const mode = runMode(poll);
  const today = shopNow().isoDate;
  const setMode = (m) => {
    if (m === 'off') onChange({ status: 'draft' });
    else if (m === 'now') onChange({ status: 'published', starts_on: today, ends_on: null }, { only: true });
    else onChange({ status: 'published', starts_on: poll.starts_on && poll.starts_on >= today ? poll.starts_on : today, ends_on: poll.ends_on || today });
  };
  return (
    <fieldset className="pollsched">
      <legend>When should it show in the fox?</legend>
      {[
        ['off', 'Not yet (keep it here)'],
        ['now', 'Now, until I end it'],
        ['dates', 'Between two dates'],
      ].map(([m, label]) => (
        <label key={m} className="checkfield">
          <input type="radio" name={`${idPrefix}-mode`} checked={mode === m} onChange={() => setMode(m)} />
          <span>{label}</span>
        </label>
      ))}
      {mode === 'dates' && (
        <div className="pollsched__dates">
          <div className="field">
            <label htmlFor={`${idPrefix}-from`}>First day</label>
            <input id={`${idPrefix}-from`} type="date" value={poll.starts_on || ''} onChange={(e) => onChange({ starts_on: e.target.value || null })} />
          </div>
          <div className="field">
            <label htmlFor={`${idPrefix}-to`}>Last day</label>
            <input id={`${idPrefix}-to`} type="date" value={poll.ends_on || ''} min={poll.starts_on || undefined} onChange={(e) => onChange({ ends_on: e.target.value || null })} />
          </div>
        </div>
      )}
    </fieldset>
  );
}

function Results({ res, poll }) {
  if (!res) return <p className="pollrow__meta">No results to show yet.</p>;
  const pc = percents(res.a, res.b);
  if (!pc.total) return <p className="pollrow__meta">No votes yet.</p>;
  return (
    <div className="pollres" aria-label="Results">
      {['a', 'b'].map((c) => (
        <div key={c} className="pollres__row">
          <span className="pollres__label"><PollIcon id={poll[`icon_${c}`]} /> {poll[`option_${c}`]}</span>
          <span className="pollres__track" aria-hidden="true"><span style={{ width: `${pc[c]}%` }} /></span>
          <span className="pollres__num">{pc[c]}% <small>({res[c].toLocaleString('en-US')})</small></span>
        </div>
      ))}
      <p className="pollrow__meta">{pc.total.toLocaleString('en-US')} {pc.total === 1 ? 'vote' : 'votes'} in all</p>
    </div>
  );
}

function PhaseBadge({ poll, live, saved }) {
  const phase = pollPhase(poll);
  if (!saved) return <span className="badge badge--draft">New, not published yet</span>;
  if (phase === 'running') {
    return live ? <span className="badge badge--live">In the fox now</span> : <span className="badge badge--hidden">Running, behind a newer poll</span>;
  }
  if (phase === 'scheduled') return <span className="badge badge--draft">Scheduled · starts {niceDate(poll.starts_on)}</span>;
  if (phase === 'finished') return <span className="badge badge--hidden">Finished {niceDate(poll.ends_on)}</span>;
  if (phase === 'ended') return <span className="badge badge--hidden">Ended</span>;
  if (phase === 'archived') return <span className="badge badge--hidden">Archived</span>;
  return <span className="badge badge--draft">Not on the site</span>;
}

export default function PollsManager() {
  const formId = useId().replace(/:/g, '');
  const [saved, setSaved] = useState(null); // rows as they are in the database
  const [draft, setDraft] = useState(null); // what the owner is editing
  const [missing, setMissing] = useState(false);
  const [results, setResults] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [seq, setSeq] = useState(0);

  async function load() {
    const { data, error } = await supabase.from('polls').select('*').order('created_at', { ascending: false });
    if (error) {
      if (isMissing(error)) setMissing(true);
      setSaved([]);
      setDraft([]);
      return;
    }
    const rows = data || [];
    setSaved(rows);
    setDraft(rows);
    const pairs = await Promise.all(rows.filter((r) => r.status !== 'draft').map(async (r) => [r.id, await getPollResults(r.id)]));
    setResults(Object.fromEntries(pairs));
  }
  // load once on mount
  useEffect(() => { load(); }, []);

  const savedById = useMemo(() => new Map((saved || []).map((r) => [r.id, r])), [saved]);
  const changed = (p) => !savedById.has(p.id) || !same(pick(p), pick(savedById.get(p.id)));
  const dirtyCount = (draft || []).filter(changed).length;
  const dirty = saved !== null && dirtyCount > 0;

  usePublishUnit('polls', {
    dirty,
    note: dirty ? `Unsaved changes to ${dirtyCount === 1 ? '1 poll' : `${dirtyCount} polls`} — not on the site yet` : undefined,
    async publish() {
      for (const p of draft.filter(changed)) {
        const row = pick(p);
        row.question = String(row.question || '').trim();
        row.option_a = String(row.option_a || '').trim();
        row.option_b = String(row.option_b || '').trim();
        row.icon_a = iconOrNull(row.icon_a);
        row.icon_b = iconOrNull(row.icon_b);
        if (!row.question || !row.option_a || !row.option_b) throw new Error('Every poll needs a question and two answers');
        if (row.starts_on && row.ends_on && row.ends_on < row.starts_on) throw new Error(`“${row.question}” ends before it starts`);
        const q = savedById.has(p.id)
          ? supabase.from('polls').update(row).eq('id', p.id)
          : supabase.from('polls').insert(row);
        const { error } = await q;
        if (error) throw error;
      }
      setEditing(null);
      await load();
    },
    discard() {
      setDraft(saved);
      setEditing(null);
      setMsg('');
    },
  });

  if (saved === null) return <Spinner />;

  const head = (
    <ScreenHead
      title="This or that polls"
      help="A one-tap question in the fox’s card, like “Iced or hot today?”. Visitors tap an answer and see how everyone voted. Nothing changes on the site until you press Publish."
    />
  );

  if (missing) {
    return (
      <div className="polls-admin">
        {head}
        <section className="admin__panel stats-setup">
          <h2><LuInfo aria-hidden="true" /> Not switched on yet</h2>
          <p>
            Polls need one small database update first. Your developer has it ready
            (<code>supabase/migrations/2026-10-19-polls-and-stats.sql</code>). Until then the fox simply doesn’t ask
            anything, and nothing on the site is affected.
          </p>
        </section>
      </div>
    );
  }

  const update = (id, patch, { only = false } = {}) => {
    setDraft((list) => list.map((p) => {
      if (p.id === id) return { ...p, ...patch };
      // "Now, until I end it": one poll runs at a time, so others running now end
      if (only && pollPhase(p) === 'running') return { ...p, status: 'ended' };
      return p;
    }));
  };

  const add = () => {
    if (!form.question.trim() || !form.option_a.trim() || !form.option_b.trim()) {
      setMsg('Write a question and both answers first.');
      return;
    }
    const id = `new-${seq}`;
    setSeq((n) => n + 1);
    setDraft((list) => [{ id, ...form, starts_on: null, ends_on: null, status: 'draft', created_at: new Date().toISOString() }, ...list]);
    setForm(EMPTY_FORM);
    setEditing(id);
    setMsg(`Added “${form.question.trim()}”. Choose when it shows below, then press Publish.`);
  };

  const remove = (id) => setDraft((list) => list.filter((p) => p.id !== id));

  // what the fox would show after Publish, and what it shows now
  const liveNow = pickActivePoll(saved);
  const afterPublish = pickActivePoll(draft);
  const current = draft.filter((p) => p.status !== 'archived');
  const archived = draft.filter((p) => p.status === 'archived');
  const used = new Set(draft.map((p) => p.question.trim().toLowerCase()));
  const ideas = SUGGESTED_POLLS.filter((s) => !used.has(s.question.toLowerCase()));

  const row = (p) => {
    const isSaved = savedById.has(p.id);
    const open = editing === p.id;
    const phase = pollPhase(p);
    return (
      <li key={p.id} className={`admin-list__row pollrow${phase === 'archived' || phase === 'ended' ? ' is-hidden' : ''}`}>
        <div className="admin-list__body">
          <p className="pollrow__head">
            <strong>{p.question || 'Untitled poll'}</strong>
            <PhaseBadge poll={p} live={liveNow?.id === p.id} saved={isSaved} />
            {isSaved && changed(p) && <span className="badge badge--draft">Changed — not live yet</span>}
          </p>
          <p className="pollrow__opts">
            <span><PollIcon id={p.icon_a} /> {p.option_a}</span>
            <span className="pollrow__or">or</span>
            <span><PollIcon id={p.icon_b} /> {p.option_b}</span>
            {p.status === 'published' && (p.starts_on || p.ends_on) && (
              <span className="pollrow__meta">
                {p.ends_on ? `${niceDate(p.starts_on) || 'Now'} to ${niceDate(p.ends_on)}` : `From ${niceDate(p.starts_on)}`}
              </span>
            )}
          </p>
          {isSaved && p.status !== 'draft' && <Results res={results[p.id]} poll={p} />}
          {open && (
            <div className="pollrow__edit">
              <PollFields value={p} idPrefix={`${formId}-${p.id}`} onChange={(v) => update(p.id, v)} />
              {p.status !== 'archived' && p.status !== 'ended' && (
                <Schedule poll={p} idPrefix={`${formId}-${p.id}`} onChange={(patch, opts) => update(p.id, patch, opts)} />
              )}
            </div>
          )}
        </div>
        <div className="admin-list__actions pollrow__actions">
          <button type="button" className="btn btn--ghost btn--sm" aria-expanded={open} onClick={() => setEditing(open ? null : p.id)}>
            <LuPencil aria-hidden="true" /> {open ? 'Done' : 'Edit'}<span className="sr-only"> {p.question}</span>
          </button>
          {phase === 'running' && isSaved && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => update(p.id, { status: 'ended' })}>
              <LuCircleStop aria-hidden="true" /> End now<span className="sr-only"> {p.question}</span>
            </button>
          )}
          {(phase === 'ended' || phase === 'archived') && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => update(p.id, { status: 'draft' })}>
              <LuArchiveRestore aria-hidden="true" /> Reuse<span className="sr-only"> {p.question}</span>
            </button>
          )}
          {isSaved && phase !== 'archived' && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => update(p.id, { status: 'archived' })}>
              <LuArchive aria-hidden="true" /> Archive<span className="sr-only"> {p.question}</span>
            </button>
          )}
          {!isSaved && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(p.id)}>
              <LuTrash2 aria-hidden="true" /> Remove<span className="sr-only"> {p.question}</span>
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="polls-admin">
      {head}

      <p className="admin__note polls-admin__now">
        <LuVote aria-hidden="true" />{' '}
        {liveNow ? <>In the fox now: <strong>{liveNow.question}</strong></> : 'No poll in the fox right now.'}
        {dirty && (afterPublish?.id !== liveNow?.id) && (
          <> After you publish: {afterPublish ? <strong>{afterPublish.question || 'your new poll'}</strong> : 'no poll'}.</>
        )}
      </p>

      <section className="admin__panel">
        <h2><LuPlus aria-hidden="true" /> New poll</h2>
        <PollFields value={form} idPrefix={`${formId}-new`} onChange={(v) => { setForm(v); setMsg(''); }} />
        <button type="button" className="btn btn--primary" onClick={add}>Add this poll</button>
        <p className="field__hint" role="status" aria-live="polite">{msg}</p>

        {ideas.length > 0 && (
          <details className="polls-admin__ideas">
            <summary><LuLightbulb aria-hidden="true" /> Need ideas? Polls from your menu</summary>
            <p className="panel-help">Suggestions only. Tapping one fills in the form above; nothing goes on the site unless you add it and press Publish.</p>
            <ul className="polls-admin__idealist">
              {ideas.map((s) => (
                <li key={s.question}>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setForm({ ...s }); setMsg(`Filled in “${s.question}”. Change anything you like, then “Add this poll”.`); }}>
                    <PollIcon id={s.icon_a} /> {s.question} <PollIcon id={s.icon_b} />
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      <section className="admin__panel">
        <h2>Your polls</h2>
        <p className="panel-help">Only one poll shows at a time: the one that started most recently. Choose “Now, until I end it” and any other running poll ends.</p>
        {current.length === 0 ? (
          <p className="field__hint">No polls yet. Write one above, or try one of the ideas.</p>
        ) : (
          <ul className="admin-list" aria-label="Your polls">{current.map(row)}</ul>
        )}
      </section>

      {archived.length > 0 && (
        <details className="admin__panel">
          <summary>Archived ({archived.length})</summary>
          <ul className="admin-list" aria-label="Archived polls">{archived.map(row)}</ul>
        </details>
      )}
    </div>
  );
}
