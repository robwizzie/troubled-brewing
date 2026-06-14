import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useToast, Spinner, Hint } from '../components/ui.jsx';
import ImageField from '../components/ImageField.jsx';

/* One-off editable bits: featured drink, staff picks, announcement banner, and
   the swappable homepage concept (content_blocks). */
const CONCEPTS = [
  { value: 'gallery_wall', label: 'Gallery Wall', desc: 'Interactive wall of framed products (lead concept).' },
  { value: 'warm_storefront', label: 'Warm Storefront', desc: 'Big photo of the space + hours + Order.' },
  { value: 'cozy_editorial', label: 'Cozy Editorial', desc: 'Magazine-style story layout.' },
];

async function loadBlock(key, fallback) {
  const { data } = await supabase.from('content_blocks').select('data').eq('key', key).maybeSingle();
  return data?.data || fallback;
}
async function saveBlock(key, data) {
  const { error } = await supabase.from('content_blocks').upsert({ key, data, status: 'published' }, { onConflict: 'key' });
  if (error) throw error;
}

export default function QuickBlocks() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState({ name: '', description: '', price: '', image_url: '' });
  const [picks, setPicks] = useState({ items: [] });
  const [announce, setAnnounce] = useState({ enabled: false, message: '' });
  const [concept, setConcept] = useState({ concept: 'gallery_wall' });

  useEffect(() => {
    Promise.all([
      loadBlock('featured_drink', { name: '', description: '', price: '', image_url: '' }),
      loadBlock('staff_picks', { items: [] }),
      loadBlock('announcement_banner', { enabled: false, message: '' }),
      loadBlock('homepage_concept', { concept: 'gallery_wall' }),
    ]).then(([f, p, a, c]) => {
      setFeatured(f); setPicks(p); setAnnounce(a); setConcept(c); setLoading(false);
    }).catch(() => { toast('Could not load blocks', 'error'); setLoading(false); });
    // eslint-disable-next-line
  }, []);

  async function save(key, data, msg) {
    try { await saveBlock(key, data); toast(msg || 'Saved'); }
    catch (e) { toast(e.message || 'Save failed', 'error'); }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <h1>Quick Blocks</h1>

      <section className="admin__panel">
        <h2>Homepage look <Hint>Swap the style of your homepage hero. Great for a seasonal refresh.</Hint></h2>
        <div className="concept-picker">
          {CONCEPTS.map((c) => (
            <label key={c.value} className={`concept-option ${concept.concept === c.value ? 'is-active' : ''}`}>
              <input type="radio" name="concept" value={c.value} checked={concept.concept === c.value} onChange={() => setConcept({ concept: c.value })} />
              <strong>{c.label}</strong>
              <span>{c.desc}</span>
            </label>
          ))}
        </div>
        <button className="btn btn--primary" onClick={() => save('homepage_concept', concept, 'Homepage look updated')}>Save look</button>
      </section>

      <section className="admin__panel">
        <h2>Announcement banner <Hint>Shows a message bar on top of every page until you turn it off.</Hint></h2>
        <label className="checkfield"><input type="checkbox" checked={announce.enabled} onChange={(e) => setAnnounce((a) => ({ ...a, enabled: e.target.checked }))} /><span>Show the banner</span></label>
        <div className="field"><label>Message</label><input value={announce.message} placeholder="Closed early Sat for a private event 💛" onChange={(e) => setAnnounce((a) => ({ ...a, message: e.target.value }))} /></div>
        <button className="btn btn--primary" onClick={() => save('announcement_banner', announce, 'Banner updated')}>Save banner</button>
      </section>

      <section className="admin__panel">
        <h2>Featured drink <Hint>“This Week’s Trouble” on the homepage.</Hint></h2>
        <div className="field"><label>Name</label><input value={featured.name} onChange={(e) => setFeatured((f) => ({ ...f, name: e.target.value }))} /></div>
        <div className="field"><label>Description</label><textarea rows={2} value={featured.description} onChange={(e) => setFeatured((f) => ({ ...f, description: e.target.value }))} /></div>
        <div className="field"><label>Price</label><input type="number" step="0.01" value={featured.price} onChange={(e) => setFeatured((f) => ({ ...f, price: e.target.value }))} /></div>
        <ImageField label="Photo" value={featured.image_url} preset="card" folder="featured" onChange={(url) => setFeatured((f) => ({ ...f, image_url: url }))} />
        <button className="btn btn--primary" onClick={() => save('featured_drink', featured, 'Featured drink updated')}>Save featured drink</button>
      </section>

      <section className="admin__panel">
        <h2>Community board picks <Hint>Short “staff picks / flying off the menu” call-outs.</Hint></h2>
        {(picks.items || []).map((it, i) => (
          <div key={i} className="picks-row">
            <input placeholder="Label (e.g. Barista's pick)" value={it.label} onChange={(e) => setPicks((p) => ({ items: p.items.map((x, idx) => idx === i ? { ...x, label: e.target.value } : x) }))} />
            <input placeholder="Value (e.g. Banana Split Coffee)" value={it.value} onChange={(e) => setPicks((p) => ({ items: p.items.map((x, idx) => idx === i ? { ...x, value: e.target.value } : x) }))} />
            <button className="btn btn--ghost btn--sm" onClick={() => setPicks((p) => ({ items: p.items.filter((_, idx) => idx !== i) }))}>✕</button>
          </div>
        ))}
        <button className="btn btn--ghost btn--sm" onClick={() => setPicks((p) => ({ items: [...(p.items || []), { label: '', value: '' }] }))}>+ Add a pick</button>
        <div><button className="btn btn--primary" style={{ marginTop: 'var(--space-3)' }} onClick={() => save('staff_picks', picks, 'Picks updated')}>Save picks</button></div>
      </section>
    </div>
  );
}
