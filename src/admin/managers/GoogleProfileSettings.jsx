import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase.js';
import { useToast, Spinner, Hint } from '../components/ui.jsx';
import { ScreenHead, usePublishUnit } from '../lib/publishing.jsx';

/* Settings for the cached Google Business Profile (reviews + hours/location).
   Store the Place ID + review URL; "Refresh now" invokes the google-profile
   Edge Function on demand (it also runs daily — .github/workflows/google-reviews-refresh.yml). See docs/INTEGRATIONS.md.
   The two connection fields follow the explicit-publish rule (written on
   Publish); "Fetch from Google now" is its own deliberate, labelled action. */
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
  // load-once on mount: `load` and `toast` are new identities every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load().catch(() => toast('Could not load profile', 'error')); }, []);

  const dirty = profile !== null && ((placeId || '') !== (profile.place_id || '') || (mapsUrl || '') !== (profile.maps_url || ''));
  usePublishUnit('google:connection', {
    dirty,
    async publish() {
      const { error } = await supabase.from('google_profile').upsert({ id: 1, place_id: placeId || null, maps_url: mapsUrl || null }, { onConflict: 'id' });
      if (error) throw error;
      setProfile((p) => ({ ...p, place_id: placeId || null, maps_url: mapsUrl || null }));
    },
    discard() {
      setPlaceId(profile.place_id || '');
      setMapsUrl(profile.maps_url || '');
    },
  });

  async function refreshNow() {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke('google-profile', { body: { manual: true } });
      if (error) throw error;
      // the function answers 200 with { ok: false, error } when Google or the
      // config fails — that's a failed refresh, not a success
      if (!data?.ok) throw new Error(data?.error || 'Google returned nothing');
      toast(`Refreshed from Google — ${data.reviews ?? 0} reviews cached`);
      load();
    } catch (e) {
      toast(`Refresh failed: ${e.message || 'the google-profile function may not be deployed — see the docs'}`, 'error');
      // eslint-disable-next-line no-console
      console.warn(e);
    } finally {
      setRefreshing(false);
    }
  }

  if (profile === null) return <Spinner />;

  return (
    <div>
      <ScreenHead
        title="Google connection"
        help="Connects your Google rating, reviews, hours and address to the site. The “Leave a review” buttons use the link below."
      />

      <section className="admin__panel">
        <h2>Connection</h2>
        <div className="field">
          <label htmlFor="gp-place">Google Place ID <Hint>Find it via Google’s Place ID finder, or send us your business name + address and we’ll fill it in.</Hint></label>
          <input id="gp-place" value={placeId} onChange={(e) => setPlaceId(e.target.value)} placeholder="ChIJ…" />
        </div>
        <div className="field">
          <label htmlFor="gp-review">“Leave a review” link <Hint>Your Google Business Profile review URL.</Hint></label>
          <input id="gp-review" value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://g.page/r/…/review" />
        </div>
        {dirty && <p className="field__hint">Press <strong>Publish</strong> at the bottom to save the connection.</p>}
      </section>

      <section className="admin__panel">
        <h2>Fetch the latest from Google</h2>
        <p className="panel-help">
          This happens by itself every day. Press it to pull new reviews, your rating and hours right
          now — they update on the site straight away, because they come from Google, not from here.
        </p>
        <button className="btn btn--accent" onClick={refreshNow} disabled={refreshing || dirty} title={dirty ? 'Publish your connection changes first' : undefined}>
          {refreshing ? 'Fetching…' : 'Fetch from Google now'}
        </button>
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
        <p className="field__hint">
          Google returns its 5 most relevant reviews per refresh (an API cap); each refresh adds
          unseen ones to the site’s library, so it grows over time. Choose which of them show —
          the star minimum, hiding one, featuring one, attaching its photo — in{' '}
          <Link to="/admin/reviews">Reviews</Link>. Hand-picked{' '}
          <Link to="/admin/testimonials">quotes</Link> are optional and appear above the Google feed.
        </p>
      </section>
    </div>
  );
}
