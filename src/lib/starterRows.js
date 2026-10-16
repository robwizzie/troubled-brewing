/* The rows the CMS was first seeded with, before the owners had real content:
   "(Owner: confirm details…)" businesses, a made-up gallery backstory, a
   barista called "A Troublemaker", a timeline with guessed dates. They were
   written to be replaced, and the live database still carries them — so the
   public site drops them on read and falls back to the bundled real content
   (src/lib/seed.js) when nothing else is left. A row an owner has edited no
   longer matches and is shown as written. The same rows are deleted for good
   by supabase/migrations/2026-10-16-real-content.sql. */

const OWNER_NOTE = /\(Owner:/i;

const STARTER_TITLES = {
  gallery_pieces: new Set(['The Ornate Gold One', 'Tiny Oval Mystery']),
  team_members: new Set(['A Troublemaker']),
  timeline_events: new Set(['Trouble Brewing opens its doors', 'Our first anniversary', 'The Banana Split Coffee is born']),
};

const STARTER_STORIES = [
  'it just showed up during the build-out',
  'A flea-market find from a rainy Saturday',
];

export function isStarterRow(table, row) {
  if (!row) return true;
  const text = [row.blurb, row.description, row.story, row.bio].filter(Boolean).join(' ');
  if (OWNER_NOTE.test(text)) return true;
  if (STARTER_STORIES.some((s) => text.includes(s))) return true;
  const title = row.title || row.name;
  if (table === 'timeline_events') {
    // only the guessed-date originals: an owner who kept a title but fixed the
    // date has made it theirs
    return STARTER_TITLES.timeline_events.has(title) && /^20(21|22|23)-01-01/.test(String(row.sort_date || ''));
  }
  return Boolean(STARTER_TITLES[table]?.has(title));
}

/** Live rows minus the starter ones; the bundled fallback when none are left. */
export function realRows(table, rows, fallback) {
  const kept = (rows || []).filter((r) => !isStarterRow(table, r));
  return kept.length ? kept : fallback;
}
