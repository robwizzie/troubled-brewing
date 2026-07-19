/* Debounced, per-record-serialized draft write queue for the on-page editor.
   Framework-free on purpose — the debounce/serialization logic is the part
   worth unit-testing if vitest ever lands.

   Contract:
   - enqueue(id, dataObj): remember the latest data for `id`, (re)start its
     debounce timer. Typing repeatedly only ever writes the newest object.
   - Writes for the SAME id are chained (never overlap → no out-of-order
     clobbering); different ids write freely in parallel.
   - The first write for an id in this session runs `snapshotOnce(id)` first,
     so `revisions` gets exactly one "before this editing session" marker
     instead of a row per keystroke.
   - flushAll(): cancel timers and persist everything pending now (page
     switch, publish, unmount).
   - onStatus('pending'|'saving'|'saved'|'error', err?) reports the queue's
     aggregate state for the top-bar pip. */
export function createDraftQueue({ write, snapshotOnce, debounceMs = 700, onStatus }) {
  const timers = new Map(); //   id → debounce timeout
  const latest = new Map(); //   id → newest unwritten data object
  const chains = new Map(); //   id → tail of that id's write chain
  const snapshotted = new Set();
  let inflight = 0;

  const report = (state, err) => onStatus?.(state, err);

  function flushOne(id) {
    clearTimeout(timers.get(id));
    timers.delete(id);
    if (!latest.has(id)) return chains.get(id) || Promise.resolve();
    const dataObj = latest.get(id);
    latest.delete(id);
    inflight += 1;
    report('saving');
    const next = (chains.get(id) || Promise.resolve())
      .then(async () => {
        if (!snapshotted.has(id)) {
          snapshotted.add(id);
          // best-effort session marker; never blocks the draft itself
          await snapshotOnce(id).catch(() => {});
        }
        await write(id, dataObj);
      })
      .then(() => {
        inflight -= 1;
        if (inflight === 0 && latest.size === 0) report('saved');
      })
      .catch((e) => {
        inflight -= 1;
        // keep the newest data so a retry (next keystroke / flush) re-sends it
        if (!latest.has(id)) latest.set(id, dataObj);
        report('error', e);
      });
    chains.set(id, next);
    return next;
  }

  return {
    enqueue(id, dataObj) {
      latest.set(id, dataObj);
      clearTimeout(timers.get(id));
      timers.set(id, setTimeout(() => flushOne(id), debounceMs));
      report('pending');
    },
    async flushAll() {
      const ids = [...new Set([...timers.keys(), ...latest.keys()])];
      await Promise.all(ids.map((id) => flushOne(id)));
      await Promise.all([...chains.values()]);
    },
    hasPending() {
      return latest.size > 0 || inflight > 0;
    },
  };
}
