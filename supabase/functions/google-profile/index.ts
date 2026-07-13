// Supabase Edge Function: fetch the shop's Google Business Profile via the
// Places API and cache it into the `google_profile` table (build plan §5.5).
// Feeds the live rating/count, reviews, address, geo, and hours.
//
// Places returns AT MOST 5 "most relevant" reviews per call (hard API cap —
// the full set needs owner OAuth via the Business Profile API). Because that
// top-5 rotates, each refresh MERGES new reviews into the cached list instead
// of overwriting it, so the library grows over time (newest fetch first).
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

    const fresh = (p.reviews || []).slice(0, 5).map((r: Record<string, any>) => ({
      author: r.authorAttribution?.displayName || 'Google user',
      rating: r.rating,
      text: r.text?.text || r.originalText?.text || '',
      time: r.relativePublishTimeDescription || '',
      profile_photo: r.authorAttribution?.photoUri || '',
    }));
    // merge into the cached library — key on author+text ("2 weeks ago" keeps
    // shifting, so `time` can't identify a review). Fresh fetch leads; cap 48.
    const key = (r: Record<string, any>) => `${r.author}|${String(r.text || '').slice(0, 40)}`;
    const seen = new Set(fresh.map(key));
    const reviews = [...fresh, ...prev.filter((r) => !seen.has(key(r)))].slice(0, 48);

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
