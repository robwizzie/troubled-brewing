import { supabase } from '../../lib/supabase.js';

/* =============================================================================
   Admin CRUD + content governance (build plan §5.7).

   Governance model (v1 — see docs/CMS.md):
   - `status` ('draft'|'published') gates PUBLIC visibility (RLS). New records can
     be saved as Draft (hidden) and Published when ready.
   - `draft_data` holds pending edits to an ALREADY-published record without
     touching what the public sees. Publishing applies draft_data to the live
     columns and clears it. Admin preview reads draft_data.
   - Every save/delete/restore snapshots the PRIOR state into `revisions`
     (one-click restore, retention capped per record).
   ============================================================================= */

const REVISION_CAP = 20;

export async function currentUserEmail() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.email || 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function listAll(table, { orderBy = 'display_order', ascending = true } = {}) {
  const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending });
  if (error) throw error;
  return data || [];
}

export async function getOne(table, id, idCol = 'id') {
  const { data, error } = await supabase.from(table).select('*').eq(idCol, id).maybeSingle();
  if (error) throw error;
  return data;
}

/** Snapshot the current row into revisions (best-effort; never blocks the edit). */
async function snapshot(table, id, idCol = 'id') {
  try {
    const current = await getOne(table, id, idCol);
    if (!current) return;
    const editor = await currentUserEmail();
    await supabase.from('revisions').insert({
      table_name: table,
      record_id: typeof id === 'string' ? id : String(id),
      snapshot: current,
      edited_by: editor,
    });
    await trimRevisions(table, id);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[adminData] snapshot failed (continuing):', e.message);
  }
}

async function trimRevisions(table, id) {
  try {
    const { data } = await supabase
      .from('revisions')
      .select('id')
      .eq('table_name', table)
      .eq('record_id', String(id))
      .order('created_at', { ascending: false });
    if (data && data.length > REVISION_CAP) {
      const toDelete = data.slice(REVISION_CAP).map((r) => r.id);
      await supabase.from('revisions').delete().in('id', toDelete);
    }
  } catch {
    /* non-fatal */
  }
}

/** Create a new record. `publish=false` saves it hidden (status='draft'). */
export async function createRecord(table, fields, { publish = true } = {}) {
  const row = { ...fields, status: publish ? 'published' : 'draft' };
  const { data, error } = await supabase.from(table).insert(row).select().maybeSingle();
  if (error) throw error;
  return data;
}

/** Update a record's live values immediately (snapshots prior state first). */
export async function updateRecord(table, id, changes, { idCol = 'id' } = {}) {
  await snapshot(table, id, idCol);
  const { data, error } = await supabase.from(table).update(changes).eq(idCol, id).select().maybeSingle();
  if (error) throw error;
  return data;
}

/** Stage edits to a published record as a draft (public keeps seeing live values).
    Status is intentionally left unchanged so a published item stays visible while
    you work; the admin surfaces an "unpublished changes" badge from draft_data. */
export async function saveDraft(table, id, changes, { idCol = 'id' } = {}) {
  await snapshot(table, id, idCol);
  const { data, error } = await supabase
    .from(table)
    .update({ draft_data: changes })
    .eq(idCol, id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Publish: apply draft_data (if any) to live columns, clear it, mark published. */
export async function publishRecord(table, id, { idCol = 'id' } = {}) {
  const current = await getOne(table, id, idCol);
  if (!current) return null;
  await snapshot(table, id, idCol);
  const apply = current.draft_data && typeof current.draft_data === 'object' ? current.draft_data : {};
  const { data, error } = await supabase
    .from(table)
    .update({ ...apply, draft_data: null, status: 'published' })
    .eq(idCol, id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setStatus(table, id, status, { idCol = 'id' } = {}) {
  const { data, error } = await supabase.from(table).update({ status }).eq(idCol, id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteRecord(table, id, { idCol = 'id' } = {}) {
  await snapshot(table, id, idCol);
  const { error } = await supabase.from(table).delete().eq(idCol, id);
  if (error) throw error;
}

/** Persist a new ordering by writing display_order on each id. */
export async function reorder(table, orderedIds, { idCol = 'id' } = {}) {
  const updates = orderedIds.map((id, i) =>
    supabase.from(table).update({ display_order: i }).eq(idCol, id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/* ---------------------------------------------------------------------------
   JSON-content governance for `sections` (and any table whose editable content
   lives in a `data` jsonb). Here `draft_data` holds the pending `data` object
   itself, and publishing copies draft_data → data. This differs from the
   column-based collection tables above. See docs/CMS.md.
   --------------------------------------------------------------------------- */

/** Stage a new `data` object as a draft (public keeps seeing published `data`). */
export async function saveDataDraft(table, id, dataObj) {
  await snapshot(table, id);
  const { data, error } = await supabase.from(table).update({ draft_data: dataObj }).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

/** Write `data` live and publish immediately (clears any draft). */
export async function updateData(table, id, dataObj) {
  await snapshot(table, id);
  const { data, error } = await supabase
    .from(table)
    .update({ data: dataObj, draft_data: null, status: 'published' })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Publish a staged draft: data ← draft_data, clear draft, mark published. */
export async function publishData(table, id) {
  const current = await getOne(table, id);
  if (!current) return null;
  await snapshot(table, id);
  const nextData = current.draft_data ?? current.data;
  const { data, error } = await supabase
    .from(table)
    .update({ data: nextData, draft_data: null, status: 'published' })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setSectionVisible(id, visible) {
  const { error } = await supabase.from('sections').update({ visible }).eq('id', id);
  if (error) throw error;
}

export async function addSection(pageSlug, type, displayOrder) {
  const { data, error } = await supabase
    .from('sections')
    .insert({ page_slug: pageSlug, type, display_order: displayOrder, data: {}, status: 'published', visible: true })
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listRevisions(table, id) {
  const { data, error } = await supabase
    .from('revisions')
    .select('*')
    .eq('table_name', table)
    .eq('record_id', String(id))
    .order('created_at', { ascending: false })
    .limit(REVISION_CAP);
  if (error) throw error;
  return data || [];
}

/** Restore a prior snapshot (snapshots the current state first, so restore is undoable). */
export async function restoreRevision(table, id, snapshotData, { idCol = 'id' } = {}) {
  await snapshot(table, id, idCol);
  // Strip immutable/identity fields before writing back.
  const { id: _omit, created_at: _c, updated_at: _u, ...rest } = snapshotData;
  const { data, error } = await supabase.from(table).update(rest).eq(idCol, id).select().maybeSingle();
  if (error) throw error;
  return data;
}
