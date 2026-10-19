import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase.js';
import { bump } from '../../lib/dataVersion.js';
import { usePublishUnit } from './publishing.jsx';
import { same } from './publishHelpers.js';

/* One content_blocks row (banner, social links, featured drink…) edited the
   explicit-publish way: `value` is local, `publish()` upserts it — once — when
   the screen's Publish button is pressed, and discard() puts the live value
   back. `normalize` lets a caller fill defaults so "nothing changed" compares
   equal to what was loaded. */
export function useBlockDraft(key, fallback, { normalize = (v) => v, label } = {}) {
  const [saved, setSaved] = useState(null);
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    supabase
      .from('content_blocks')
      .select('data')
      .eq('key', key)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (!alive) return;
        if (err) setError(err);
        const v = normalize({ ...fallback, ...(data?.data || {}) });
        setSaved(v);
        setValue(v);
      });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const dirty = saved !== null && !same(value, saved);

  usePublishUnit(`block:${key}`, {
    dirty,
    note: dirty && label ? `Unsaved changes to ${label} — not on the site yet` : undefined,
    async publish() {
      const { error: err } = await supabase
        .from('content_blocks')
        .upsert({ key, data: value, status: 'published' }, { onConflict: 'key' });
      if (err) throw err;
      setSaved(value);
      bump('content_blocks');
    },
    discard() {
      setValue(saved);
    },
  });

  return { value, set: setValue, loaded: saved !== null, dirty, error };
}
