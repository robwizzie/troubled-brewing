// Supabase Edge Function: fetch the shop's last 4 Instagram posts ("Instagram
// API with Instagram Login" — the shop account must be Business/Creator) and
// cache them into `instagram_feed` for the homepage polaroid strip.
//
// The long-lived access token lives in the `private_secrets` table (RLS with
// no policies — service-role only; the owner pastes the initial token via
// Dashboard → Table Editor, key `instagram_token`). After each successful
// fetch, if the token is >7 days old this function refreshes it and persists
// the NEW token — so it never expires while the cron keeps running (refresh
// requires the token to be ≥24h old; a token only dies after ~53+ days of
// cron outage, a password change, or a Meta security checkpoint — paste a
// fresh one to recover; the site falls back to its static strip meanwhile).
//
// NOTE: Instagram media_url CDN links EXPIRE (hours–days). The 12h cron is
// what keeps the images alive, not just what picks up new posts.
//
// Deploy:   supabase functions deploy instagram-feed
// Secrets:  none beyond the injected SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
// Schedule: cron every 12h (Dashboard → Database → Cron → net.http_post to the
//           function URL with an `Authorization: Bearer <anon key>` header).
//           See docs/INTEGRATIONS.md §Instagram.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` };

  try {
    // The token lives server-side only (see header comment).
    const tokRes = await fetch(`${SUPABASE_URL}/rest/v1/private_secrets?key=eq.instagram_token&select=value,updated_at`, {
      headers: H,
    });
    const tok = (await tokRes.json())?.[0];
    if (!tok?.value) {
      return json({ ok: false, error: 'No instagram_token row in private_secrets' }, 200);
    }

    const fields = 'id,caption,media_url,thumbnail_url,permalink,media_type,timestamp';
    const g = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&limit=4&access_token=${tok.value}`);
    if (!g.ok) throw new Error(`Instagram ${g.status}: ${await g.text()}`);
    const media = (await g.json()).data ?? [];

    // The live username, so the strip's "@handle" self-corrects on a rename.
    const u = await fetch(`https://graph.instagram.com/me?fields=username&access_token=${tok.value}`);
    const username = u.ok ? (await u.json()).username : null;

    const posts = media.slice(0, 4).map((m: Record<string, any>) => ({
      id: m.id,
      // VIDEO exposes its cover via thumbnail_url; carousels return the cover image
      image: m.media_type === 'VIDEO' ? (m.thumbnail_url || m.media_url) : m.media_url,
      caption: String(m.caption || '').replace(/\s+/g, ' ').trim().slice(0, 80),
      permalink: m.permalink,
      media_type: m.media_type,
      timestamp: m.timestamp,
    })).filter((p: Record<string, any>) => p.image && p.permalink);

    const up = await fetch(`${SUPABASE_URL}/rest/v1/instagram_feed?id=eq.1`, {
      method: 'PATCH',
      headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        id: 1,
        posts,
        ...(username ? { handle: username } : {}),
        fetched_at: new Date().toISOString(),
      }),
    });
    if (!up.ok) throw new Error(`Upsert ${up.status}: ${await up.text()}`);

    // Self-rotate AFTER a successful fetch; never clobber a working token on failure.
    let refreshed = false;
    const ageDays = (Date.now() - new Date(tok.updated_at).getTime()) / 86400000;
    if (ageDays > 7) {
      const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${tok.value}`);
      if (r.ok) {
        const j = await r.json();
        if (j?.access_token) {
          const save = await fetch(`${SUPABASE_URL}/rest/v1/private_secrets?key=eq.instagram_token`, {
            method: 'PATCH',
            headers: { ...H, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ value: j.access_token, updated_at: new Date().toISOString() }),
          });
          refreshed = save.ok;
        }
      }
    }

    return json({ ok: true, posts: posts.length, refreshed }, 200);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 200);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
