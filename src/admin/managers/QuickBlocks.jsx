import { Spinner, Hint } from '../components/ui.jsx';
import ImageField from '../components/ImageField.jsx';
import { ScreenHead } from '../lib/publishing.jsx';
import { useBlockDraft } from '../lib/useBlockDraft.js';
import { CONCEPTS, DEFAULT_CONCEPT } from '../../lib/concepts.js';

/* One-off editable bits (content_blocks rows): announcement banner, social
   links, featured drink, community-board picks and the homepage look. Every
   change stays on this screen until Publish; only the blocks you actually
   changed are written. */

const SOCIAL_KEYS = ['instagram', 'facebook', 'tiktok', 'x', 'youtube'];
const changed = (dirty) => (dirty ? <span className="badge badge--draft panel-badge">Changed — not live yet</span> : null);

export default function QuickBlocks() {
  const announce = useBlockDraft('announcement_banner', { enabled: false, message: '' }, { label: 'the banner' });
  const social = useBlockDraft('social_links', { instagram: '', facebook: '', tiktok: '', x: '', youtube: '' }, { label: 'social links' });
  const featured = useBlockDraft('featured_drink', { item: '', name: '', description: '', price: '', image_url: '' }, { label: 'the featured drink' });
  const picks = useBlockDraft('staff_picks', { items: [] }, { label: 'board picks' });
  const concept = useBlockDraft('homepage_concept', { concept: DEFAULT_CONCEPT }, { label: 'the homepage look' });

  if (![announce, social, featured, picks, concept].every((b) => b.loaded)) return <Spinner />;

  const setA = (k, v) => announce.set((a) => ({ ...a, [k]: v }));
  const setF = (k, v) => featured.set((f) => ({ ...f, [k]: v }));
  const items = picks.value.items || [];
  const setItems = (next) => picks.set((p) => ({ ...p, items: next }));

  return (
    <div>
      <ScreenHead
        title="Banner, links & featured drink"
        help="Small bits that show up across the site: the message bar on top of every page, your social links in the footer, the featured drink on the homepage, and the homepage look."
      />

      <section className="admin__panel">
        <h2>Announcement banner {changed(announce.dirty)}</h2>
        <p className="panel-help">A message bar across the top of every page — for closures, events or news.</p>
        <label className="checkfield">
          <input type="checkbox" checked={Boolean(announce.value.enabled)} onChange={(e) => setA('enabled', e.target.checked)} />
          <span>Show the banner</span>
        </label>
        <div className="field">
          <label htmlFor="qb-banner">Message</label>
          <input id="qb-banner" value={announce.value.message || ''} placeholder="Closed early Sat for a private event 💛" onChange={(e) => setA('message', e.target.value)} />
        </div>
      </section>

      <section className="admin__panel">
        <h2>Social links {changed(social.dirty)}</h2>
        <p className="panel-help">Paste the full link to each profile. Blank ones are hidden. Shown in the footer and on the Contact page.</p>
        {SOCIAL_KEYS.map((key) => (
          <div className="field" key={key}>
            <label htmlFor={`qb-social-${key}`} style={{ textTransform: 'capitalize' }}>{key === 'x' ? 'X (Twitter)' : key}</label>
            <input
              id={`qb-social-${key}`}
              value={social.value[key] || ''}
              placeholder="https://…"
              onChange={(e) => social.set((s) => ({ ...s, [key]: e.target.value }))}
            />
          </div>
        ))}
      </section>

      <section className="admin__panel">
        <h2>Featured drink {changed(featured.dirty)}</h2>
        <p className="panel-help">“This Week’s Trouble” on the homepage (and the hero’s “Today’s Special” note).</p>
        <div className="field">
          <label htmlFor="qb-feat-item">Menu item to feature</label>
          <input id="qb-feat-item" value={featured.value.item || ''} placeholder="e.g. Iced Matcha Latte" onChange={(e) => setF('item', e.target.value)} />
          <p className="field__hint">The exact name as it appears on the menu. Its name, price and photo come live from the menu. If it’s ever switched off in SpotOn, we feature another drink that is on.</p>
        </div>
        <div className="field">
          <label htmlFor="qb-feat-desc">Description</label>
          <textarea id="qb-feat-desc" rows={2} value={featured.value.description || ''} placeholder="Blank uses the menu’s description" onChange={(e) => setF('description', e.target.value)} />
        </div>
        <details className="admin-history">
          <summary>Not on the menu? Type it in by hand</summary>
          <p className="field__hint">Only used when no menu item is chosen above.</p>
          <div className="field"><label htmlFor="qb-feat-name">Name</label><input id="qb-feat-name" value={featured.value.name || ''} onChange={(e) => setF('name', e.target.value)} /></div>
          <div className="field"><label htmlFor="qb-feat-price">Price</label><input id="qb-feat-price" type="number" step="0.01" value={featured.value.price || ''} onChange={(e) => setF('price', e.target.value)} /></div>
          <ImageField label="Photo" value={featured.value.image_url} preset="card" folder="featured" onChange={(url) => setF('image_url', url)} />
        </details>
      </section>

      <section className="admin__panel">
        <h2>Community board picks {changed(picks.dirty)}</h2>
        <p className="panel-help">Short “staff picks / flying off the menu” call-outs on the homepage board.</p>
        {items.length === 0 && <p className="field__hint">No picks yet — add one below.</p>}
        {items.map((it, i) => (
          <div key={i} className="picks-row">
            <input aria-label={`Pick ${i + 1} label`} placeholder="Label (e.g. Barista's pick)" value={it.label || ''} onChange={(e) => setItems(items.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))} />
            <input aria-label={`Pick ${i + 1} value`} placeholder="Value (e.g. Iced Chai Latte)" value={it.value || ''} onChange={(e) => setItems(items.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))} />
            <button className="btn btn--ghost btn--sm" aria-label={`Remove pick ${i + 1}`} onClick={() => setItems(items.filter((_, idx) => idx !== i))}>✕</button>
          </div>
        ))}
        <button className="btn btn--ghost btn--sm" onClick={() => setItems([...items, { label: '', value: '' }])}>+ Add a pick</button>
      </section>

      <section className="admin__panel">
        <h2>Homepage look {changed(concept.dirty)} <Hint>Swap the style of your homepage hero. Great for a seasonal refresh. You can also do this in the editor by clicking the top of the homepage.</Hint></h2>
        <div className="concept-picker">
          {CONCEPTS.map((c) => (
            <label key={c.value} className={`concept-option ${concept.value.concept === c.value ? 'is-active' : ''}`}>
              <input type="radio" name="concept" value={c.value} checked={concept.value.concept === c.value} onChange={() => concept.set({ concept: c.value })} />
              <strong>{c.label}</strong>
              <span>{c.desc}</span>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
