import { supabase, isSupabaseConfigured } from './supabase.js';
import * as seed from './seed.js';

/* =============================================================================
   Public data layer. Pages read through THESE functions, never Supabase directly,
   so every read has a guaranteed seed fallback (site never looks broken).

   `preview` (admin only): when true, sections/records resolve their `draft_data`
   over `data` so an authenticated admin can preview unpublished edits via
   ?preview=1. The public site always passes preview=false (the default).
   ============================================================================= */

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** Resolve a governed row's content, honoring preview/draft. */
function resolve(row, preview) {
  if (preview && row.draft_data) return { ...row, ...row.draft_data, data: row.draft_data };
  return row;
}

export async function getPage(slug) {
  const fallback = seed.PAGES[slug] || null;
  if (!isSupabaseConfigured) return fallback;
  try {
    const { data, error } = await supabase.from('pages').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data || fallback;
  } catch {
    return fallback;
  }
}

export async function getSections(slug, { preview = false } = {}) {
  const fallback = (seed.SECTIONS[slug] || []).map((s, i) => ({
    id: `seed-${slug}-${i}`,
    page_slug: slug,
    display_order: i,
    visible: true,
    status: 'published',
    ...s,
  }));
  if (!isSupabaseConfigured) return fallback;
  try {
    const { data, error } = await supabase
      .from('sections')
      .select('*')
      .eq('page_slug', slug)
      .order('display_order', { ascending: true });
    if (error) throw error;
    if (!data || data.length === 0) return fallback;
    return data
      .filter((s) => s.visible !== false && (preview || s.status === 'published'))
      .map((s) => {
        const r = resolve(s, preview);
        return { ...s, data: r.data || s.data };
      });
  } catch {
    return fallback;
  }
}

export async function getHours() {
  if (!isSupabaseConfigured) return seed.HOURS;
  try {
    const { data, error } = await supabase.from('hours').select('*').order('day_of_week');
    if (error) throw error;
    return data && data.length ? data : seed.HOURS;
  } catch {
    return seed.HOURS;
  }
}

export async function getHoursOverrides() {
  if (!isSupabaseConfigured) return seed.HOURS_OVERRIDES;
  try {
    const { data, error } = await supabase
      .from('hours_overrides')
      .select('*')
      .gte('override_date', todayISO())
      .order('override_date');
    if (error) throw error;
    return data || [];
  } catch {
    return seed.HOURS_OVERRIDES;
  }
}

export async function getContentBlock(key) {
  const fallback = seed.CONTENT_BLOCKS[key] || {};
  if (!isSupabaseConfigured) return fallback;
  try {
    const { data, error } = await supabase.from('content_blocks').select('*').eq('key', key).maybeSingle();
    if (error) throw error;
    return data?.data || fallback;
  } catch {
    return fallback;
  }
}

export async function getEvents({ upcomingOnly = true } = {}) {
  if (!isSupabaseConfigured) return seed.EVENTS;
  try {
    let q = supabase.from('events').select('*').order('event_date', { ascending: true });
    if (upcomingOnly) q = q.gte('event_date', todayISO());
    const { data, error } = await q;
    if (error) throw error;
    return data || [];
  } catch {
    return seed.EVENTS;
  }
}

export async function getTestimonials() {
  if (!isSupabaseConfigured) return seed.TESTIMONIALS;
  try {
    const { data, error } = await supabase
      .from('testimonials')
      .select('*')
      .order('featured', { ascending: false })
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data && data.length ? data : seed.TESTIMONIALS;
  } catch {
    return seed.TESTIMONIALS;
  }
}

export async function getGoogleProfile() {
  if (!isSupabaseConfigured) return seed.GOOGLE_PROFILE;
  try {
    const { data, error } = await supabase.from('google_profile').select('*').eq('id', 1).maybeSingle();
    if (error) throw error;
    return data || seed.GOOGLE_PROFILE;
  } catch {
    return seed.GOOGLE_PROFILE;
  }
}

export async function getGalleryPieces() {
  if (!isSupabaseConfigured) return seed.GALLERY_PIECES;
  try {
    const { data, error } = await supabase
      .from('gallery_pieces')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data && data.length ? data : seed.GALLERY_PIECES;
  } catch {
    return seed.GALLERY_PIECES;
  }
}

export async function getTeamMembers() {
  if (!isSupabaseConfigured) return seed.TEAM_MEMBERS;
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data && data.length ? data : seed.TEAM_MEMBERS;
  } catch {
    return seed.TEAM_MEMBERS;
  }
}

export async function getLocalBusinesses() {
  if (!isSupabaseConfigured) return seed.LOCAL_BUSINESSES;
  try {
    const { data, error } = await supabase
      .from('local_businesses')
      .select('*')
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data && data.length ? data : seed.LOCAL_BUSINESSES;
  } catch {
    return seed.LOCAL_BUSINESSES;
  }
}

export async function getTimelineEvents() {
  if (!isSupabaseConfigured) return seed.TIMELINE_EVENTS;
  try {
    const { data, error } = await supabase
      .from('timeline_events')
      .select('*')
      .order('sort_date', { ascending: true, nullsFirst: false })
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data && data.length ? data : seed.TIMELINE_EVENTS;
  } catch {
    return seed.TIMELINE_EVENTS;
  }
}

/** Public form insert (RLS allows anon INSERT on submissions only). */
export async function submitForm(payload) {
  if (!isSupabaseConfigured) {
    // No backend in this environment — pretend-succeed so the demo UX works,
    // and log so a developer notices during local dev.
    if (import.meta.env.DEV) console.info('[submitForm] (no Supabase) would submit:', payload);
    return { ok: true, demo: true };
  }
  const { error } = await supabase.from('submissions').insert(payload);
  if (error) return { ok: false, error: error.message };

  // Best-effort owner email via the `notify` Edge Function. The submission is
  // already saved (and visible in the admin Inbox), so we never block on this.
  try {
    await supabase.functions.invoke('notify', { body: payload });
  } catch {
    /* notify not deployed / offline — ignore, Inbox still has it */
  }
  return { ok: true };
}
