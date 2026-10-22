import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../../lib/supabase.js';
import { getGoogleProfile, reviewKey } from '../../lib/dataService.js';
import { getReviewSettings, REVIEW_SETTINGS_KEY } from '../../lib/reviews.js';
import { createRecord, listAll } from '../lib/adminData.js';
import { bump } from '../../lib/dataVersion.js';
import ImageField from '../components/ImageField.jsx';
import { useToast, Spinner, Hint, Empty } from '../components/ui.jsx';
import { ScreenHead, usePublishUnit } from '../lib/publishing.jsx';
import { same } from '../lib/publishHelpers.js';
import { LuCamera, LuEye, LuEyeOff, LuPlus, LuStar } from 'react-icons/lu';
import { Icon } from '../components/Icon.jsx';

/* Reviews control room.

   Every real Google review the site has cached, in one list, with the four
   things an owner actually wants to do to a review:
     · keep it off the site           (Hide)
     · put it first, everywhere       (Feature)
     · give it the photo it had on Google — Google's APIs return review TEXT
       but never review PHOTOS, so this is the only way a review becomes a
       "with photos" one on the site                                (Add photo)
     · promote it to a hand-picked testimonial with its own wall  (+ Favorite)

   Choices are stored in the `review_settings` content block, keyed by
   author+text (reviewKey) rather than by position, so they stick even as
   Google shuffles which five reviews it hands back each refresh.

   Explicit publishing: every choice here (stars, hide, feature, photo,
   + Favorite) is staged locally; the screen's Publish writes the settings
   block once and creates any new favourites. */

const RATING_OPTIONS = [
  { value: 5, label: '5 stars only — the perfect ones' },
  { value: 4, label: '4 stars and up — recommended' },
  { value: 3, label: '3 stars and up' },
  { value: 1, label: 'Show every review' },
];

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'shown', label: 'On the site' },
  { key: 'hidden', label: 'Hidden' },
  { key: 'featured', label: 'Featured' },
  { key: 'photos', label: 'With photos' },
];

const starCount = (n) => Math.max(0, Math.min(5, Math.round(n || 0)));
function Stars({ n }) {
  const k = starCount(n);
  return (
    <span className="stars" role="img" aria-label={`${k} star${k === 1 ? '' : 's'}`}>
      {Array.from({ length: k }, (_, i) => <Icon key={i} icon={LuStar} size={14} className="stars__on" />)}
    </span>
  );
}

export default function ReviewsManager({ embedded = false }) {
  const toast = useToast();
  const [reviews, setReviews] = useState(null);
  const [settings, setSettings] = useState(null);
  const [savedSettings, setSavedSettings] = useState(null);
  const [imported, setImported] = useState(() => new Set());
  const [newFavorites, setNewFavorites] = useState([]); // staged testimonials
  const [filter, setFilter] = useState('all');
  const [openPhoto, setOpenPhoto] = useState(null); // reviewKey whose photo slot is open

  useEffect(() => {
    let alive = true;
    Promise.all([
      getGoogleProfile(),
      getReviewSettings(),
      listAll('testimonials').catch(() => []),
    ]).then(([profile, s, t]) => {
      if (!alive) return;
      setReviews(
        (profile?.reviews || []).map((r, i) => ({
          ...r,
          text: String(r.text || '').replace(/\s+/g, ' ').trim(),
          key: reviewKey(r.author, r.text),
          idx: i,
        })),
      );
      setSettings(s);
      setSavedSettings(s);
      setImported(new Set((t || []).map((x) => reviewKey(x.author, x.quote))));
    });
    return () => { alive = false; };
  }, []);

  const settingsDirty = settings !== null && !same(settings, savedSettings);
  const dirty = settingsDirty || newFavorites.length > 0;

  usePublishUnit('reviews', {
    dirty,
    note: dirty ? 'Unsaved review changes — not on the site yet' : undefined,
    async publish() {
      if (!isSupabaseConfigured) return;
      if (settingsDirty) {
        const { error } = await supabase
          .from('content_blocks')
          .upsert({ key: REVIEW_SETTINGS_KEY, data: settings, status: 'published' }, { onConflict: 'key' });
        if (error) throw error;
        setSavedSettings(settings);
        bump('content_blocks');
      }
      let remaining = [...newFavorites];
      try {
        for (const fav of newFavorites) {
          await createRecord('testimonials', fav.row);
          remaining = remaining.filter((f) => f.key !== fav.key);
        }
      } finally {
        setNewFavorites(remaining);
        if (remaining.length !== newFavorites.length) bump('testimonials');
      }
    },
    discard() {
      setSettings(savedSettings);
      setImported((s) => {
        const next = new Set(s);
        newFavorites.forEach((f) => next.delete(f.key));
        return next;
      });
      setNewFavorites([]);
    },
  });

  const update = (next) => setSettings(next);

  const toggleMap = (map, key) => {
    const next = { ...settings, [map]: { ...settings[map] } };
    if (next[map][key]) delete next[map][key];
    else next[map][key] = true;
    return next;
  };

  function addToFavorites(r) {
    setNewFavorites((list) => [
      ...list,
      {
        key: r.key,
        row: {
          author: r.author,
          source: 'Google',
          rating: Math.min(5, Math.round(r.rating || 5)),
          quote: r.text,
          image_url: settings.photos[r.key] || '',
          featured: false,
        },
      },
    ]);
    setImported((s) => new Set(s).add(r.key));
    toast('Added to your hand-picked quotes — press Publish to put it on the site');
  }

  const counts = useMemo(() => {
    if (!reviews || !settings) return null;
    const shown = reviews.filter((r) => !settings.hidden[r.key] && (r.rating ?? 5) >= settings.min_rating);
    return { total: reviews.length, shown: shown.length, hidden: reviews.length - shown.length };
  }, [reviews, settings]);

  if (reviews === null || settings === null) return <Spinner />;

  const visible = reviews.filter((r) => {
    const belowFloor = (r.rating ?? 5) < settings.min_rating;
    const isHidden = Boolean(settings.hidden[r.key]) || belowFloor;
    if (filter === 'shown') return !isHidden;
    if (filter === 'hidden') return isHidden;
    if (filter === 'featured') return Boolean(settings.pinned[r.key]);
    if (filter === 'photos') return Boolean(settings.photos[r.key]);
    return true;
  });

  return (
    <div>
      {!embedded && (
        <ScreenHead
          title="Google reviews"
          help="Choose which Google reviews appear on the homepage strip and the Reviews page, which lead, and add their photos."
        />
      )}

      <section className="admin__panel">
        <h2>Which reviews show</h2>
        <div className="field">
          <label htmlFor="rv-floor">
            Minimum stars
            <Hint>Anything below this never appears anywhere on the site — the quickest way to show only your good reviews.</Hint>
          </label>
          <select
            id="rv-floor"
            value={settings.min_rating}
            onChange={(e) => update({ ...settings, min_rating: Number(e.target.value) })}
          >
            {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {counts && (
          <p className="field__hint">
            <strong>{counts.shown}</strong> of {counts.total} cached reviews are on the site
            {counts.hidden > 0 ? ` · ${counts.hidden} held back` : ''}. New reviews arrive with the
            daily refresh — see <Link to="/admin/google">Google Profile</Link>.
          </p>
        )}
        <p className="field__hint">Nothing here changes the site until you press <strong>Publish</strong>.</p>
      </section>

      <section className="admin__panel">
        <h2>The reviews</h2>
        {reviews.length === 0 ? (
          <Empty>
            No Google reviews here yet. Open{' '}
            <Link to="/admin/google">Google connection</Link> and press “Fetch from Google now” — they’ll show up here to choose from.
          </Empty>
        ) : (
          <>
            <div className="rv-filters" role="group" aria-label="Filter reviews">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`chip ${filter === f.key ? 'chip--on' : ''}`}
                  aria-pressed={filter === f.key}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <ul className="rv-list">
              {visible.map((r) => {
                const belowFloor = (r.rating ?? 5) < settings.min_rating;
                const hidden = Boolean(settings.hidden[r.key]);
                const off = hidden || belowFloor;
                const pinned = Boolean(settings.pinned[r.key]);
                const photo = settings.photos[r.key] || '';
                return (
                  <li key={r.key} className={`rv-row ${off ? 'is-off' : ''}`}>
                    <div className="rv-row__head">
                      {r.profile_photo && (
                        <img className="rv-row__avatar" src={r.profile_photo} alt="" loading="lazy" referrerPolicy="no-referrer" />
                      )}
                      <div className="rv-row__who">
                        <strong>{r.author}</strong>
                        <span className="rv-row__meta">
                          <span className="rv-row__stars"><Stars n={r.rating} /></span>
                          {r.time ? ` · ${r.time}` : ''}
                          {pinned ? ' · featured' : ''}
                          {belowFloor ? ' · below your star minimum' : ''}
                        </span>
                      </div>
                    </div>

                    <p className="rv-row__text">{r.text || <em>(rating only — no words to show)</em>}</p>
                    {photo && <img className="rv-row__photo" src={photo} alt="" loading="lazy" />}

                    <div className="rv-row__actions">
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => update(toggleMap('hidden', r.key))}
                        disabled={belowFloor}
                        title={belowFloor ? 'Already below your star minimum' : undefined}
                      >
                        <Icon icon={hidden ? LuEye : LuEyeOff} size={16} />
                        {hidden ? 'Show on site' : 'Hide'}
                      </button>
                      <button
                        type="button"
                        className={`btn btn--sm ${pinned ? 'btn--accent' : 'btn--ghost'}`}
                        onClick={() => update(toggleMap('pinned', r.key))}
                      >
                        <Icon icon={LuStar} size={16} className={pinned ? 'stars__on' : ''} />
                        {pinned ? 'Featured' : 'Feature'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        aria-expanded={openPhoto === r.key}
                        onClick={() => setOpenPhoto(openPhoto === r.key ? null : r.key)}
                      >
                        <Icon icon={LuCamera} size={16} />
                        {photo ? 'Change photo' : 'Add photo'}
                      </button>
                      {!imported.has(r.key) && r.text && (
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => addToFavorites(r)}>
                          <Icon icon={LuPlus} size={16} />
                          Favorite
                        </button>
                      )}
                    </div>

                    {openPhoto === r.key && (
                      <div className="rv-row__photofield">
                        <ImageField
                          label="Review photo"
                          value={photo}
                          preset="card"
                          folder="reviews"
                          onChange={(url) => {
                            const next = { ...settings, photos: { ...settings.photos } };
                            if (url) next.photos[r.key] = url;
                            else delete next.photos[r.key];
                            update(next);
                          }}
                        />
                        <p className="field__hint">
                          Google doesn’t hand out review photos, so save the picture from the review
                          on Google and upload it here. Reviews with a photo lead the homepage strip
                          and get their own filter on the Reviews page.
                        </p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            {visible.length === 0 && <Empty>No reviews match that filter. Tap “All” above to see every review.</Empty>}
          </>
        )}
        {!embedded && (
          <p className="field__hint rv-quotes-link">
            <strong>+ Favorite</strong> turns a review into a hand-picked quote on the Reviews page.
            To re-word or remove quotes you already picked, open <Link to="/admin/testimonials">your hand-picked quotes</Link>.
          </p>
        )}
      </section>
    </div>
  );
}
