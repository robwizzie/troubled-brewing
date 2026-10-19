// Supabase Edge Function: fetch the shop's Google Business Profile via the
// Places API and cache it into the `google_profile` table (build plan §5.5).
// Feeds the live rating/count, reviews, address, geo, and hours.
//
// Places returns AT MOST 5 "most relevant" reviews per call (hard API cap).
// Because that top-5 rotates, each refresh MERGES new reviews into the cached
// list instead of overwriting it, so the library grows over time.
//
// EVERY review: when the owner has authorised the Business Profile API (the
// GBP_* secrets below), the function also pages through the location's full
// review list — all of them, not five — and merges those in too. That's the
// only Google API that returns a business's complete reviews, and it needs
// the owner's own OAuth consent, which is why it's optional.
//
// The cache is the site's review library, so it keeps everything a card might
// want to show: the stable Places review id, the absolute publish time (the
// site sorts newest-first on it — "2 weeks ago" drifts and can't be sorted),
// the reviewer's avatar, and a link to the review on Maps. Note Places does
// NOT return photos ON a review, but the place's photos name who took them, so
// a photo whose author also reviewed the shop is attached to that review
// (`photos` below). Owners can attach more by hand in admin → Reviews
// (stored in the review_settings content block).
//
// The Places key is BILLABLE and must stay server-side — it lives here as a
// function secret and never reaches the browser.
//
// Deploy:   supabase functions deploy google-profile
// Secrets:  supabase secrets set GOOGLE_PLACES_API_KEY=...
//   all reviews (optional, see docs/INTEGRATIONS.md §All reviews):
//           GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN,
//           GBP_ACCOUNT_ID, GBP_LOCATION_ID
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
    const cfgRes = await fetch(`${SUPABASE_URL}/rest/v1/google_profile?id=eq.1&select=place_id,reviews,photos,maps_url`, {
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
      'photos', // up to 10 place photos, each with who took it → matched to reviews below
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

    // Every review, via the Business Profile API, when the owner has set it up.
    const everyReview = await fetchAllBusinessReviews().catch((e) => {
      console.error('Business Profile reviews:', e);
      return [];
    });
    // Places' copy of a review wins when both have it (it carries the Maps
    // link); the Business Profile copy fills in everything Places never shows.
    const freshKeys = new Set(fresh.map((r: Record<string, any>) => `${r.author}|${String(r.text || '').slice(0, 40)}`));
    everyReview.forEach((r) => {
      if (!freshKeys.has(`${r.author}|${String(r.text || '').slice(0, 40)}`)) fresh.push(r);
    });

    // Review objects carry no pictures, but the place's photos do say who
    // took them. A photo whose author is also a reviewer is that reviewer's
    // photo, so it rides along on their review — that's how a review becomes a
    // "with photo" review without the owners attaching one by hand. The media
    // endpoint is asked for the final image URL (skipHttpRedirect) so the site
    // never needs the API key to show it.
    const placePhotos: { url: string; author: string; author_url: string }[] = [];
    for (const ph of (p.photos || []).slice(0, 10)) {
      try {
        const m = await fetch(
          `https://places.googleapis.com/v1/${ph.name}/media?maxWidthPx=1000&skipHttpRedirect=true`,
          { headers: { 'X-Goog-Api-Key': PLACES_KEY } },
        );
        if (!m.ok) continue;
        const { photoUri } = await m.json();
        const by = ph.authorAttributions?.[0] || {};
        if (photoUri) placePhotos.push({ url: photoUri, author: by.displayName || '', author_url: by.uri || '' });
      } catch { /* one bad photo never sinks the refresh */ }
    }
    const photosFor = (r: Record<string, any>) =>
      placePhotos
        .filter((ph) => (ph.author_url && ph.author_url === r.author_url) || (ph.author && ph.author === r.author))
        .map((ph) => ph.url);
    fresh.forEach((r: Record<string, any>) => { r.photos = photosFor(r); });

    // Merge into the cached library. Identity is the Places review id when we
    // have one; older cached rows predate it, so fall back to author+text
    // ("2 weeks ago" keeps shifting, so `time` can never identify a review).
    // A re-fetched review REPLACES its cached copy — the text is the same but
    // the relative time and the reviewer's avatar URL both go stale.
    const key = (r: Record<string, any>) =>
      r.review_id || `${r.author}|${String(r.text || '').slice(0, 40)}`;
    const seen = new Set(fresh.map(key));
    // A refreshed review keeps photos found on an earlier run — Google rotates
    // which 10 place photos it returns, so a later call may simply not list it.
    const prevByKey = new Map(prev.map((r) => [key(r), r]));
    fresh.forEach((r: Record<string, any>) => {
      const old = prevByKey.get(key(r));
      if (old?.photos?.length) r.photos = [...new Set([...r.photos, ...old.photos])];
    });
    // Older cached reviews pick up any photo of theirs that turns up today.
    const older = prev.filter((r) => !seen.has(key(r))).map((r) => {
      const found = photosFor(r);
      return found.length ? { ...r, photos: [...new Set([...(r.photos || []), ...found])] } : r;
    });
    const merged = [...fresh, ...older];
    // Newest first, undated (pre-publish_time) rows last, keeping their order.
    merged.sort((a, b) => String(b.published_at || '').localeCompare(String(a.published_at || '')));
    // Big enough that the site never drops a real review (the shop has ~300),
    // small enough for one jsonb row.
    const reviews = merged.slice(0, 1500);

    const row = {
      id: 1,
      rating: p.rating ?? null,
      review_count: p.userRatingCount ?? null,
      reviews,
      // every customer photo seen so far (newest first, capped), whether or not
      // its author left a written review — the reviews page hangs these too
      photos: dedupePhotos([...placePhotos, ...(Array.isArray(cfg?.[0]?.photos) ? cfg[0].photos : [])]).slice(0, 60),
      formatted_address: p.formattedAddress ?? null,
      formatted_phone: p.internationalPhoneNumber ?? null,
      weekday_hours: p.regularOpeningHours?.weekdayDescriptions ?? [],
      weekday_periods: p.regularOpeningHours?.periods ?? [],
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      // the "Leave a review" link is the OWNER's setting (admin → Google
      // Profile) — never overwrite it. Only when none is set, default to
      // Google's own write-a-review page for this place (not the Maps page).
      // (A stored link equal to the place's plain Maps page is what older
      // versions of this function wrote over the owner's — replace that too.)
      maps_url: cfg?.[0]?.maps_url && cfg[0].maps_url !== p.googleMapsUri && !/[?&]cid=/.test(cfg[0].maps_url)
        ? cfg[0].maps_url
        : `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
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

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

/* All of the location's reviews from the Business Profile API (v4 reviews
   endpoint), newest first. Empty when the GBP_* secrets aren't set. The refresh
   token comes from the owner signing in once with the Google account that
   manages the listing (scope business.manage) — see docs/INTEGRATIONS.md. */
async function fetchAllBusinessReviews(): Promise<Record<string, any>[]> {
  const id = Deno.env.get('GBP_CLIENT_ID');
  const secret = Deno.env.get('GBP_CLIENT_SECRET');
  const refresh = Deno.env.get('GBP_REFRESH_TOKEN');
  const account = Deno.env.get('GBP_ACCOUNT_ID');
  const location = Deno.env.get('GBP_LOCATION_ID');
  if (!id || !secret || !refresh || !account || !location) return [];

  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: 'refresh_token' }),
  });
  if (!tok.ok) throw new Error(`token ${tok.status}: ${await tok.text()}`);
  const { access_token } = await tok.json();

  const out: Record<string, any>[] = [];
  let pageToken = '';
  for (let page = 0; page < 40; page++) { // 40 × 50 = 2000 reviews, far past this shop
    const url = new URL(`https://mybusiness.googleapis.com/v4/accounts/${account}/locations/${location}/reviews`);
    url.searchParams.set('pageSize', '50');
    url.searchParams.set('orderBy', 'updateTime desc');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
    if (!res.ok) throw new Error(`reviews ${res.status}: ${await res.text()}`);
    const body = await res.json();
    for (const r of body.reviews || []) {
      // star-only reviews have no comment; the site skips wordless ones itself
      out.push({
        review_id: r.name || r.reviewId || '',
        author: r.reviewer?.displayName || 'Google user',
        author_url: '',
        rating: STARS[r.starRating] ?? null,
        // Google appends its own translation after a marker — keep the original
        text: String(r.comment || '').split('(Translated by Google)')[0].replace(/\(Original\)\s*/, '').trim(),
        time: '',
        published_at: r.createTime || '',
        review_url: '',
        profile_photo: r.reviewer?.profilePhotoUrl || '',
        photos: [],
      });
    }
    pageToken = body.nextPageToken || '';
    if (!pageToken) break;
  }
  return out;
}

function dedupePhotos(list: { url: string }[]) {
  const seen = new Set<string>();
  return list.filter((p) => p?.url && !seen.has(p.url) && seen.add(p.url));
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
