import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { useToast, Spinner, Hint } from '../components/ui.jsx';

/* Settings for the cached Google Business Profile (reviews + hours/location).
   Store the Place ID + review URL; "Refresh now" invokes the google-profile
   Edge Function on demand (it also runs daily via cron). See docs/INTEGRATIONS.md. */
export default function GoogleProfileSettings() {
  const toast = useToast();
  const [profile, setProfile] = useState(null);
  const [placeId, setPlaceId] = useState('');
  const [mapsUrl, setMapsUrl] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data } = await supabase.from('google_profile').select('*').eq('id', 1).maybeSingle();
    setProfile(data || { id: 1 });
    setPlaceId(data?.place_id || '');
    setMapsUrl(data?.maps_url || '');
  }
  useEffect(() => { load().catch(() => toast('Could not load profile', 'error')); /* eslint-disable-next-line */ }, []);

  async function saveSettings() {
    try {
      const { error } = await supabase.from('google_profile').upsert({ id: 1, place_id: placeId || null, maps_url: mapsUrl || null }, { onConflict: 'id' });
      if (error) throw error;
      toast('Saved');
      load();
    } catch (e) { toast(e.message || 'Save failed', 'error'); }
  }

  async function refreshNow() {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('google-profile', { body: { manual: true } });
      if (error) throw error;
      toast('Refreshed from Google');
      load();
    } catch (e) {
      toast('Refresh needs the google-profile function deployed. See the docs.', 'error');
      // eslint-disable-next-line no-console
      console.warn(e);
    } finally {
      setRefreshing(false);
    }
  }

  if (profile === null) return <Spinner />;

  return (
    <div>
      <h1>Google Profile</h1>
      <p className="admin__lead">Connects your live Google rating, reviews, hours, and location to the site.</p>

      <section className="admin__panel">
        <h2>Connection</h2>
        <div className="field">
          <label>Google Place ID <Hint>Find it via Google’s Place ID finder, or send us your business name + address and we’ll fill it in.</Hint></label>
          <input value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="ChIJ…" />
        </div>
        <div className="field">
          <label>“Leave a review” link <Hint>Your Google Business Profile review URL.</Hint></label>
          <input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://g.page/r/…/review" />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
          <button className="btn btn--primary" onClick={saveSettings}>Save</button>
          <button className="btn btn--accent" onClick={refreshNow} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh now'}</button>
        </div>
      </section>

      <section className="admin__panel">
        <h2>Currently cached</h2>
        <ul className="kv">
          <li><span>Rating</span><strong>{profile.rating ?? '—'}</strong></li>
          <li><span>Review count</span><strong>{profile.review_count ?? '—'}</strong></li>
          <li><span>Reviews cached</span><strong>{(profile.reviews?.length) ?? 0}</strong></li>
          <li><span>Address</span><strong>{profile.formatted_address || '—'}</strong></li>
          <li><span>Last refreshed</span><strong>{profile.fetched_at ? new Date(profile.fetched_at).toLocaleString() : '—'}</strong></li>
        </ul>
        <p className="field__hint">Google returns its 5 most relevant reviews per refresh (an API cap); each refresh adds unseen ones to the site’s library, so it grows over time. Only 4★+ are shown. Hand-picked <a href="/admin/testimonials">Testimonials</a> are optional and appear above the Google feed.</p>
      </section>
    </div>
  );
}
