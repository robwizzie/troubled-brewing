import { useEffect, useId, useMemo, useState } from 'react';
import { Spinner } from '../components/ui.jsx';
import { ScreenHead } from '../lib/publishing.jsx';
import { useBlockDraft } from '../lib/useBlockDraft.js';
import { getMenu } from '../../lib/menuService.js';
import {
  BY_MAX, EMPTY_PAIRINGS, NOTE_MAX, PAIRINGS_KEY,
  addPair, isDrink, isTreat, missingFromMenu, movePair, pairingIdeas, removePair, spotonCategoryOf,
} from '../../lib/pairings.js';

/* "Pair a drink with a treat" — the staff's own "goes great with" picks.

   Pick a drink (left) and a bakery / breakfast / lunch item (right) from the
   LIVE menu, optionally add a one-line reason and who picked it, and add it to
   the list. Nothing is on the site until Publish, which writes the one
   content_blocks.pairings row (created by the first Publish).

   "Need ideas?" offers combos built from the menu's sections, labelled as
   ideas to taste first: tapping one only fills the pickers. */

const norm = (s) => String(s || '').trim().toLowerCase();
const money = (p) => (p != null && p !== '' ? `$${Number(p).toFixed(2)}` : '');

const normalize = (v) => ({
  enabled: v?.enabled === true,
  pairs: Array.isArray(v?.pairs) ? v.pairs.filter((p) => p && p.drink && p.with) : [],
});

/** A search box over a list of menu items; picks one. Big tap targets. */
function ItemPicker({ label, hint, items, value, onChange, placeholder }) {
  const id = useId();
  const [q, setQ] = useState('');
  const chosen = items.find((m) => norm(m.name) === norm(value));
  const matches = useMemo(() => {
    const terms = norm(q).split(/\s+/).filter(Boolean);
    return items.filter((m) => {
      const hay = `${norm(m.name)} ${norm(spotonCategoryOf(m))}`;
      return terms.every((t) => hay.includes(t));
    });
  }, [items, q]);

  return (
    <div className="pairpick">
      <label className="pairpick__label" htmlFor={id}>{label}</label>
      {chosen ? (
        <div className="pairpick__chosen">
          <span>
            <strong>{chosen.name}</strong>
            <small>{[spotonCategoryOf(chosen), money(chosen.price)].filter(Boolean).join(' · ')}</small>
          </span>
          <button type="button" className="btn btn--ghost btn--sm" id={id} onClick={() => { onChange(''); setQ(''); }}>
            Change<span className="sr-only"> {label.toLowerCase()}</span>
          </button>
        </div>
      ) : (
        <>
          <input
            id={id}
            type="search"
            className="pairpick__search"
            value={q}
            placeholder={placeholder}
            autoComplete="off"
            enterKeyHint="search"
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (matches.length === 1) onChange(matches[0].name);
              }
            }}
          />
          {hint && <p className="field__hint">{hint}</p>}
          <ul className="pairpick__list" aria-label={`${label}: ${matches.length} on the menu`}>
            {matches.map((m) => (
              <li key={m.id ?? m.name}>
                <button type="button" onClick={() => onChange(m.name)}>
                  <span>{m.name}</span>
                  <small>{[spotonCategoryOf(m), money(m.price)].filter(Boolean).join(' · ')}</small>
                </button>
              </li>
            ))}
            {matches.length === 0 && <li className="pairpick__none">Nothing on the menu matches “{q.trim()}”.</li>}
          </ul>
        </>
      )}
    </div>
  );
}

export default function PairingsManager() {
  const block = useBlockDraft(PAIRINGS_KEY, EMPTY_PAIRINGS, { normalize, label: 'the pairings' });
  const [menu, setMenu] = useState(null);
  const [drink, setDrink] = useState('');
  const [treat, setTreat] = useState('');
  const [note, setNote] = useState('');
  const [by, setBy] = useState('');
  const [msg, setMsg] = useState('');
  const [turn, setTurn] = useState(0);
  const noteId = useId();
  const byId = useId();

  useEffect(() => {
    let alive = true;
    getMenu().then((m) => alive && setMenu(m), () => alive && setMenu([]));
    return () => { alive = false; };
  }, []);

  const drinks = useMemo(() => (menu || []).filter(isDrink), [menu]);
  const treats = useMemo(() => (menu || []).filter(isTreat), [menu]);

  if (!block.loaded || menu === null) return <Spinner />;

  const pairs = block.value.pairs;
  const setPairs = (next) => block.set((v) => ({ ...v, pairs: next }));
  const gone = new Set(missingFromMenu(pairs, menu));
  const ideas = pairingIdeas(menu, pairs, { count: 4, turn });

  function add() {
    const next = addPair(pairs, { drink, with: treat, note, by });
    if (next === pairs) {
      setMsg(drink && treat ? 'That pairing is already on the list.' : 'Pick a drink and a treat first.');
      return;
    }
    // the first pairing switches the "Goes great with" lines on
    block.set((v) => ({ ...v, pairs: next, enabled: v.pairs.length === 0 ? true : v.enabled }));
    setMsg(`Added ${drink} + ${treat}. Press Publish to put it on the menu.`);
    setDrink('');
    setTreat('');
    setNote('');
  }

  return (
    <div className="pairings-admin">
      <ScreenHead
        title="Pair a drink with a treat"
        help="Your staff’s favourite combos. On the Menu page each paired drink gets a small “Goes great with …” line, with both items linking to order. Nothing changes on the site until you press Publish."
      />

      <section className="admin__panel">
        <h2>New pairing</h2>
        <div className="pairpick-row">
          <ItemPicker
            label="Drink"
            items={drinks}
            value={drink}
            onChange={(n) => { setDrink(n); setMsg(''); }}
            placeholder="Search drinks — e.g. chai"
          />
          <span className="pairpick-row__plus" aria-hidden="true">+</span>
          <ItemPicker
            label="Goes great with"
            items={treats}
            value={treat}
            onChange={(n) => { setTreat(n); setMsg(''); }}
            placeholder="Search bakery, breakfast, lunch"
          />
        </div>
        <div className="field">
          <label htmlFor={noteId}>Why it works <span className="field__opt">(optional)</span></label>
          <input id={noteId} value={note} maxLength={NOTE_MAX} placeholder="The lemon cuts the sweetness" onChange={(e) => setNote(e.target.value)} />
          <p className="field__hint">One short line, in your own words. {note.length > NOTE_MAX - 20 ? `${NOTE_MAX - note.length} letters left.` : ''}</p>
        </div>
        <div className="field">
          <label htmlFor={byId}>Picked by <span className="field__opt">(optional)</span></label>
          <input id={byId} value={by} maxLength={BY_MAX} placeholder="First name, e.g. Cat" autoComplete="given-name" onChange={(e) => setBy(e.target.value)} />
        </div>
        <button type="button" className="btn btn--primary pairings-admin__add" onClick={add} disabled={!drink || !treat}>
          + Add this pairing
        </button>
        <p className="field__hint" role="status" aria-live="polite">{msg}</p>
      </section>

      <section className="admin__panel">
        <h2>
          Your pairings {block.dirty && <span className="badge badge--draft panel-badge">Changed — not live yet</span>}
        </h2>
        {pairs.length === 0 ? (
          <p className="field__hint">No pairings yet. Add one above — the menu shows nothing until you publish your first.</p>
        ) : (
          <>
            <label className="checkfield">
              <input type="checkbox" checked={block.value.enabled} onChange={(e) => block.set((v) => ({ ...v, enabled: e.target.checked }))} />
              <span>Show pairings on the menu</span>
            </label>
            <ol className="admin-list pairings-admin__list" aria-label="Your pairings">
              {pairs.map((p, i) => (
                <li key={`${p.drink}|${p.with}`} className={`admin-list__row${gone.has(p) || !block.value.enabled ? ' is-hidden' : ''}`}>
                  <span className="admin-list__reorder">
                    <button type="button" className="iconbtn" aria-label={`Move ${p.drink} + ${p.with} up`} disabled={i === 0} onClick={() => setPairs(movePair(pairs, i, -1))}>↑</button>
                    <button type="button" className="iconbtn" aria-label={`Move ${p.drink} + ${p.with} down`} disabled={i === pairs.length - 1} onClick={() => setPairs(movePair(pairs, i, 1))}>↓</button>
                  </span>
                  <span className="admin-list__body">
                    <strong>{p.drink}</strong> <span aria-hidden="true">+</span><span className="sr-only">goes great with</span> <strong>{p.with}</strong>
                    {(p.note || p.by) && (
                      <span className="admin-list__meta pairings-admin__meta">
                        {p.note && `“${p.note}”`}{p.note && p.by && ' · '}{p.by && `${p.by}’s pick`}
                      </span>
                    )}
                    {gone.has(p) && <span className="admin-list__meta">Not on the menu right now — hidden until it’s back.</span>}
                  </span>
                  <span className="admin-list__actions">
                    <button type="button" className="btn btn--ghost btn--sm" aria-label={`Remove ${p.drink} + ${p.with}`} onClick={() => setPairs(removePair(pairs, i))}>Remove</button>
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      {ideas.length > 0 && (
        <details className="admin__panel pairings-admin__ideas">
          <summary>Need ideas? Combos to try</summary>
          <p className="panel-help">
            Suggestions only, made from the menu’s sections — <strong>taste them first</strong>. Tapping one just fills in
            the pickers above; nothing goes on the site unless you add it and press Publish.
          </p>
          <ul className="pairings-admin__idealist">
            {ideas.map((x) => (
              <li key={`${x.drink}|${x.with}`}>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => {
                    setDrink(x.drink);
                    setTreat(x.with);
                    setMsg(`Filled in ${x.drink} + ${x.with}. Try it, then press “Add this pairing” if it’s a keeper.`);
                  }}
                >
                  Try {x.drink} + {x.with}
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setTurn((t) => t + 1)}>Show me others</button>
        </details>
      )}
    </div>
  );
}
