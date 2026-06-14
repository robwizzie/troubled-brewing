// Supabase Edge Function: fetch the shop's Google Business Profile via the
// Places API and cache it into the `google_profile` table (build plan §5.5).
// Feeds the live rating/count, up to 5 reviews, address, geo, and hours.
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
    const cfgRes = await fetch(`${SUPABASE_URL}/rest/v1/google_profile?id=eq.1&select=place_id`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    });
    const cfg = await cfgRes.json();
    const placeId = cfg?.[0]?.place_id || Deno.env.get('GOOGLE_PLACE_ID');

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
      'location',
      'googleMapsUri',
    ].join(',');

    const g = await fetch(`https://places.googleapis.com/v1/places/${placeId}?fields=${fields}`, {
      headers: { 'X-Goog-Api-Key': PLACES_KEY },
    });
    if (!g.ok) throw new Error(`Places ${g.status}: ${await g.text()}`);
    const p = await g.json();

    const reviews = (p.reviews || []).slice(0, 5).map((r: Record<string, any>) => ({
      author: r.authorAttribution?.displayName || 'Google user',
      rating: r.rating,
      text: r.text?.text || r.originalText?.text || '',
      time: r.relativePublishTimeDescription || '',
      profile_photo: r.authorAttribution?.photoUri || '',
    }));

    const row = {
      id: 1,
      rating: p.rating ?? null,
      review_count: p.userRatingCount ?? null,
      reviews,
      formatted_address: p.formattedAddress ?? null,
      formatted_phone: p.internationalPhoneNumber ?? null,
      weekday_hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
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
