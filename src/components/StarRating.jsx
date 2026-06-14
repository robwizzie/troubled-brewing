/* Accessible star rating. Renders full/half/empty stars and an sr-only label. */
export default function StarRating({ value = 0, size = 18, label }) {
  const rounded = Math.round((value || 0) * 2) / 2;
  const stars = [1, 2, 3, 4, 5].map((n) => {
    if (rounded >= n) return 'full';
    if (rounded >= n - 0.5) return 'half';
    return 'empty';
  });
  return (
    <span className="stars" role="img" aria-label={label || `${value} out of 5 stars`} style={{ display: 'inline-flex', gap: 2 }}>
      {stars.map((type, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
          <defs>
            <linearGradient id={`half-${i}`}>
              <stop offset="50%" stopColor="var(--color-accent)" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            d="M12 2.5l2.9 6 6.6.6-5 4.3 1.5 6.4L12 16.9 6 19.8l1.5-6.4-5-4.3 6.6-.6z"
            fill={type === 'full' ? 'var(--color-accent)' : type === 'half' ? `url(#half-${i})` : 'transparent'}
            stroke="var(--color-accent)"
            strokeWidth="1.2"
          />
        </svg>
      ))}
    </span>
  );
}
