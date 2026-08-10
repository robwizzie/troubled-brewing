#!/usr/bin/env node
/* Sets the LIVE site's homepage look by upserting content_blocks.homepage_concept
   — the same write admin → Quick Blocks makes, runnable from CI so the look can
   be flipped without logging into the admin. Run by
   .github/workflows/set-homepage-concept.yml (Actions → "Set homepage look").

   Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (Action secrets), CONCEPT. */

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const CONCEPT = (process.env.CONCEPT || '').trim();

// mirror src/lib/concepts.js (kept inline: this runs in CI without the app bundle)
const CONCEPTS = ['immersive_gallery', 'gallery_wall', 'warm_storefront', 'cozy_editorial', 'modern_coffee'];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!CONCEPTS.includes(CONCEPT)) {
  console.error(`CONCEPT must be one of: ${CONCEPTS.join(', ')} (got "${CONCEPT}")`);
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  authorization: `Bearer ${SERVICE_KEY}`,
  'content-type': 'application/json',
};

async function main() {
  const beforeRes = await fetch(`${SUPABASE_URL}/rest/v1/content_blocks?key=eq.homepage_concept&select=data,status`, { headers });
  if (!beforeRes.ok) throw new Error(`read failed: ${beforeRes.status} ${await beforeRes.text()}`);
  const [before] = await beforeRes.json();
  console.log(`before: ${before ? JSON.stringify(before.data) : '(no row)'}`);

  const upsert = await fetch(`${SUPABASE_URL}/rest/v1/content_blocks?on_conflict=key`, {
    method: 'POST',
    headers: { ...headers, prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify([{ key: 'homepage_concept', data: { concept: CONCEPT }, status: 'published' }]),
  });
  if (!upsert.ok) throw new Error(`upsert failed: ${upsert.status} ${await upsert.text()}`);
  const [after] = await upsert.json();
  console.log(`after:  ${JSON.stringify(after.data)} (status: ${after.status})`);
  console.log(`\nHomepage look is now "${CONCEPT}" — live immediately, no redeploy needed.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
