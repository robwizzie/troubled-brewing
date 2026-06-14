/* Loading skeletons so the public site never shows a blank flash (build plan §4.5). */
export function SkeletonText({ lines = 3, width = '100%' }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === lines - 1 ? '60%' : width }}
        />
      ))}
    </div>
  );
}

export function SkeletonBlock({ height = 200 }) {
  return <div className="skeleton skeleton-block" style={{ height }} aria-hidden="true" />;
}

export function SkeletonCards({ count = 3, height = 220 }) {
  return (
    <div className="grid grid--3" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, borderRadius: 'var(--radius-lg)' }} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="container section" aria-busy="true" aria-label="Loading">
      <div className="skeleton skeleton-text" style={{ height: '2.5em', width: '45%', marginBottom: '1.5rem' }} />
      <SkeletonText lines={3} />
      <div style={{ height: '2rem' }} />
      <SkeletonCards />
    </div>
  );
}
