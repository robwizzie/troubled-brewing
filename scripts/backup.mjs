#!/usr/bin/env node
/* Exports Supabase content tables to backups/YYYY-MM-DD.json via the REST API
   (no dependencies — uses Node's global fetch). Run by .github/workflows/backup.yml
   with the service_role key. See docs/DEPLOYMENT.md §backups.

   NOTE: `submissions` is intentionally EXCLUDED — it contains customer PII we
   don't want committed to the repo. */

import { writeFile, mkdir } from 'node:fs/promises';

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const TABLES = [
  'pages',
  'sections',
  'menu_items',
  'events',
  'hours',
  'hours_overrides',
  'content_blocks',
  'testimonials',
  'google_profile',
  'gallery_pieces',
  'team_members',
  'local_businesses',
];

async function fetchTable(table) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=*`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const out = { exported_at: new Date().toISOString(), tables: {} };
  for (const t of TABLES) {
    try {
      out.tables[t] = await fetchTable(t);
      console.log(`✓ ${t}: ${out.tables[t].length} rows`);
    } catch (e) {
      console.error(`✗ ${t}: ${e.message}`);
      out.tables[t] = { error: e.message };
    }
  }
  await mkdir('backups', { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  await writeFile(`backups/${date}.json`, JSON.stringify(out, null, 2));
  console.log(`\nWrote backups/${date}.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
