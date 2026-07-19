import { useEffect, useState } from 'react';
import { getGoogleProfile } from '../../lib/dataService.js';
import { useDataVersion } from '../../lib/dataVersion.js';
import StarRating from '../StarRating.jsx';

/* Live Google rating + review count from the cached google_profile row
   (refreshed daily by the Edge Function). See docs/INTEGRATIONS.md §Google Places. */
export default function ReviewsHero({ data = {} }) {
  const { heading = 'What the neighborhood says' } = data;
  const [profile, setProfile] = useState(null);

  const version = useDataVersion('google_profile');
  useEffect(() => {
    let alive = true;
    getGoogleProfile().then((p) => alive && setProfile(p));
    return () => { alive = false; };
  }, [version]);

  return (
    <section className="hero">
      <div className="container">
        <h1>{heading}</h1>
        {profile && (
          <div className="reviews-hero__stat">
            <StarRating value={profile.rating || 0} size={28} />
            <span className="reviews-hero__num">{profile.rating ? Number(profile.rating).toFixed(1) : '—'}</span>
            {profile.review_count > 0 && (
              <span className="reviews-hero__count">from {profile.review_count} Google reviews</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
