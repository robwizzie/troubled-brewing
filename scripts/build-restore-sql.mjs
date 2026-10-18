#!/usr/bin/env node
/* Builds ONE SQL file that brings a Supabase project back from nothing:
   schema → the content in a backup → the real-content migrations → a
   PostgREST schema reload. Paste the output into Dashboard → SQL → New query
   → Run. See docs/DEPLOYMENT.md §restore.

     node scripts/build-restore-sql.mjs [backups/YYYY-MM-DD.json] > restore.sql

   Defaults to the newest backup. Everything is safe to run twice and on a
   project that still has its data:
     - schema.sql's `create trigger` / `create policy` (which fail when they
       already exist) become `create or replace trigger` / drop-then-create;
     - backup rows are inserted `on conflict do nothing`, so a row that is
       already there — including one the owners edited since — is left alone;
     - the migrations are already guarded. */

import { readFile, readdir } from 'node:fs/promises';

const root = new URL('..', import.meta.url);
const read = (p) => readFile(new URL(p, root), 'utf8');

// parents before children (sections → pages)
const ORDER = [
  'pages', 'sections', 'menu_items', 'events', 'hours', 'hours_overrides',
  'content_blocks', 'testimonials', 'google_profile', 'gallery_pieces',
  'team_members', 'local_businesses', 'timeline_events', 'instagram_feed',
];

export function idempotentSchema(sql) {
  return sql
    .replace(/\bcreate trigger\b/gi, 'create or replace trigger')
    .replace(/\bcreate policy\s+("[^"]+")\s+on\s+([\w.]+)/gi,
      (_, name, table) => `drop policy if exists ${name} on ${table};\ncreate policy ${name}\n  on ${table}`);
}

// a dollar-quote tag that cannot occur inside the data
function tagFor(text) {
  let tag = 'rows';
  while (text.includes(`$${tag}$`)) tag += '_';
  return `$${tag}$`;
}

export function dataSql(backup) {
  const out = [];
  for (const table of ORDER) {
    const rows = backup.tables?.[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    // only the columns the backup actually has, so newer columns keep their defaults
    const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    const list = cols.map((c) => `"${c}"`).join(', ');
    const json = JSON.stringify(rows);
    const q = tagFor(json);
    out.push(
      `-- ${table}: ${rows.length} row${rows.length === 1 ? '' : 's'}`,
      `insert into ${table} (${list})`,
      `select ${list} from jsonb_populate_recordset(null::${table}, ${q}${json}${q}::jsonb)`,
      'on conflict do nothing;',
      '',
    );
  }
  return out.join('\n');
}

async function newestBackup() {
  const files = (await readdir(new URL('backups/', root))).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) throw new Error('No backups/YYYY-MM-DD.json found.');
  return `backups/${files.at(-1)}`;
}

async function main() {
  const backupPath = process.argv[2] || await newestBackup();
  const backup = JSON.parse(await read(backupPath));
  const migrations = (await readdir(new URL('supabase/migrations/', root))).filter((f) => f.endsWith('.sql')).sort();

  const parts = [
    '-- =============================================================================',
    `-- Trouble Brewing · full restore (built by scripts/build-restore-sql.mjs)`,
    `-- content from ${backupPath} (exported ${backup.exported_at})`,
    '-- Safe to run twice; rows that already exist are left alone.',
    '-- =============================================================================',
    '',
    '-- 1 · Schema ------------------------------------------------------------------',
    idempotentSchema(await read('supabase/schema.sql')),
    '',
    '-- 2 · Content from the backup --------------------------------------------------',
    'begin;',
    dataSql(backup),
    'commit;',
    '',
  ];
  for (const m of migrations) {
    parts.push(`-- 3 · Migration ${m} ${'-'.repeat(Math.max(0, 60 - m.length))}`, await read(`supabase/migrations/${m}`), '');
  }
  parts.push(
    '-- 4 · Tell the API about the tables (clears PGRST205 "not in the schema cache")',
    "notify pgrst, 'reload schema';",
    '',
  );
  process.stdout.write(parts.join('\n'));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
