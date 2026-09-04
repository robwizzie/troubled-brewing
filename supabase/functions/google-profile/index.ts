// Supabase Edge Function: fetch the shop's Google Business Profile via the
// Places API and cache it into the `google_profile` table (build plan §5.5).
// Feeds the live rating/count, reviews, address, geo, and hours.
//
// Places returns AT MOST 5 "most relevant" reviews per call (hard API cap —
// the full set needs owner OAuth via the Business Profile API). Because that
// top-5 rotates, each refresh MERGES new reviews into the cached list instead
// of overwriting it, so the library grows over time toward the full set.
//
// The cache is the site's review library, so it keeps everything a card might
// want to show: the stable Places review id, the absolute publish time (the
// site sorts newest-first on it — "2 weeks ago" drifts and can't be sorted),
// the reviewer's avatar, and a link to the review on Maps. Note Places does
// NOT return review PHOTOS at any tier; owners attach those by hand in
// admin → Reviews (stored in the review_settings content block).
//
// The Places key is BILLABLE and must stay server-side — it lives here as a
// function secret and never reaches the browser.
//
// Deploy:   supabase functions deploy google-profile
// Secrets:  supabase secrets set GOOGLE_PLACES_API_KEY=...
// Schedule: add a daily cron (Supabase Dashboard → Database → Cron, or
//           pg_cron calling net.http_post) to invoke this once a day.
// Manual:   the admin "Refresh now" button invokes it with { manual: true }.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const PLACES_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

  try {
    // Read the configured place_id from the single google_profile row.
    const cfgRes = await fetch(`${SUPABASE_URL}/rest/v1/google_profile?id=eq.1&select=place_id,reviews`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const cfg = await cfgRes.json();
    const placeId = cfg?.[0]?.place_id || Deno.env.get('GOOGLE_PLACE_ID');
    const prev: Record<string, any>[] = Array.isArray(cfg?.[0]?.reviews) ? cfg[0].reviews : [];

    if (!PLACES_KEY || !placeId) {
      return json({ ok: false, error: 'Missing GOOGLE_PLACES_API_KEY or place_id' }, 200);
    }

    // Places Details (v1). Field mask keeps the call cheap.
    const fields = [
      'rating',
      'userRatingCount',
      'reviews',
      'formattedAddress',
      'internationalPhoneNumber',
      'regularOpeningHours.weekdayDescriptions',
      'regularOpeningHours.periods', // structured hours → weekday_periods (drives the live site hours)
      'location',
      'googleMapsUri',
    ].join(',');

    const g = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=${fields}`, {
      headers: { 'X-Goog-Api-Key': PLACES_KEY },
    });
    if (!g.ok) throw new Error(`Places ${g.status}: ${await g.text()}`);
    const p = await g.json();

    const fresh = (p.reviews || []).map((r: Record<string, any>) => ({
      review_id: r.name || '',                       // stable across refreshes
      author: r.authorAttribution?.displayName || 'Google user',
      author_url: r.authorAttribution?.uri || '',
      rating: r.rating,
      text: r.text?.text || r.originalText?.text || '',
      time: r.relativePublishTimeDescription || '',  // display only
      published_at: r.publishTime || '',             // absolute — what we sort on
      review_url: r.googleMapsUri || '',
      profile_photo: r.authorAttribution?.photoUri || '',
    }));

    // Merge into the cached library. Identity is the Places review id when we
    // have one; older cached rows predate it, so fall back to author+text
    // ("2 weeks ago" keeps shifting, so `time` can never identify a review).
    // A re-fetched review REPLACES its cached copy — the text is the same but
    // the relative time and the reviewer's avatar URL both go stale.
    const key = (r: Record<string, any>) =>
      r.review_id || `${r.author}|${String(r.text || '').slice(0, 40)}`;
    const seen = new Set(fresh.map(key));
    const merged = [...fresh, ...prev.filter((r) => !seen.has(key(r)))];
    // Newest first, undated (pre-publish_time) rows last, keeping their order.
    merged.sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
    // 5 new reviews a day at most, so 500 is years of library — big enough
    // that the site never drops a real review, small enough for one jsonb row.
    const reviews = merged.slice(0, 500);

    const row = {
      id: 1,
      rating: p.rating ?? null,
      review_count: p.userRatingCount ?? null,
      reviews,
      formatted_address: p.formattedAddress ?? null,
      formatted_phone: p.internationalPhoneNumber ?? null,
      weekday_hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
      weekday_periods: p.regularOpeningHours?.periods ?? [],
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      maps_url: p.googleMapsUri ?? null,
      fetched_at: new Date().toISOString(),
    };

    const up = await fetch(`${SUPABASE_URL}/rest/v1/google_profile?id=eq.1`, {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!up.ok) throw new Error(`Upsert ${up.status}: ${await up.text()}`);

    return json({ ok: true, rating: row.rating, reviews: reviews.length }, 200);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
