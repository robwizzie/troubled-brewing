import { useId } from 'react';

/* Hand-built brand motifs — the vintage character that keeps the site from
   feeling templated. Brass/gold to echo the shop's gold fox heads, hares, and
   the letterpress scrollwork in the TROUBLE BREWING logo. All decorative
   (aria-hidden); they carry no information. */

function brass(id) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#e9c35e" />
      <stop offset="0.5" stopColor="#c9962f" />
      <stop offset="1" stopColor="#9c6f22" />
    </linearGradient>
  );
}

/* A dapper geometric fox medallion (the shop mascot, in brass). */
export function FoxEmblem({ size = 64, className = '' }) {
  const g = useId();
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" role="presentation">
      <defs>{brass(g)}</defs>
      <circle cx="50" cy="50" r="48" fill={`url(#${g})`} />
      <circle cx="50" cy="50" r="48" fill="none" stroke="#7c561a" strokeWidth="2" opacity="0.5" />
      {/* ears */}
      <path d="M26 24 L44 40 L22 46 Z" fill="#3a2a12" />
      <path d="M74 24 L56 40 L78 46 Z" fill="#3a2a12" />
      {/* head */}
      <path d="M24 44 L50 34 L76 44 L66 66 L50 80 L34 66 Z" fill="#fbeccb" />
      {/* cheeks */}
      <path d="M24 44 L34 66 L41 58 L34 47 Z" fill="#e9c35e" />
      <path d="M76 44 L66 66 L59 58 L66 47 Z" fill="#e9c35e" />
      {/* snout */}
      <path d="M40 60 L60 60 L50 78 Z" fill="#fff7e6" />
      {/* eyes + nose */}
      <path d="M38 50 l7 3 -7 3 Z" fill="#2a1d0c" />
      <path d="M62 50 l-7 3 7 3 Z" fill="#2a1d0c" />
      <path d="M46 64 L54 64 L50 71 Z" fill="#2a1d0c" />
      {/* top hat tip — a nod to the logo */}
      <rect x="42" y="12" width="16" height="9" rx="1" fill="#2a1d0c" />
      <rect x="38" y="20" width="24" height="3" rx="1.5" fill="#2a1d0c" />
    </svg>
  );
}

/* A sitting hare silhouette (the brass hare on the wall). */
export function Hare({ size = 56, className = '' }) {
  const g = useId();
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" role="presentation">
      <defs>{brass(g)}</defs>
      <path
        d="M44 16 C41 26 42 34 46 40 C40 42 34 49 33 60 C32 72 38 82 50 84 C66 86 74 76 72 62 C71 53 66 46 59 42 C64 35 64 26 60 16 C57 24 57 31 56 36 C53 35 50 35 47 36 C46 30 46 23 44 16 Z"
        fill={`url(#${g})`}
        stroke="#7c561a"
        strokeWidth="1.5"
        opacity="0.95"
      />
      <circle cx="60" cy="56" r="2.4" fill="#2a1d0c" />
    </svg>
  );
}

/* Symmetric scroll flourish — straight from the logo's letterpress swashes. */
export function Flourish({ width = 220, className = '', color = 'currentColor' }) {
  return (
    <svg className={className} width={width} height="22" viewBox="0 0 220 22" fill="none" aria-hidden="true" role="presentation">
      <path
        d="M110 11 C150 11 150 3 178 3 C198 3 206 17 196 17 C188 17 190 7 178 7 C156 7 150 11 110 11 C70 11 64 7 42 7 C30 7 32 17 24 17 C14 17 22 3 42 3 C70 3 70 11 110 11 Z"
        fill={color}
        opacity="0.85"
      />
      <circle cx="110" cy="11" r="3" fill={color} />
    </svg>
  );
}

/* Three rising steam wisps (used on the featured drink / coffee cues). */
export function Steam({ className = '' }) {
  return (
    <svg className={className} width="40" height="44" viewBox="0 0 40 44" fill="none" aria-hidden="true" role="presentation">
      {[10, 20, 30].map((x, i) => (
        <path
          key={x}
          className="steam-wisp"
          style={{ animationDelay: `${i * 0.4}s` }}
          d={`M${x} 40 C${x - 6} 32 ${x + 6} 26 ${x} 18 C${x - 6} 10 ${x + 5} 6 ${x} 0`}
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.5"
        />
      ))}
    </svg>
  );
}

/* Ornate TB monogram badge for the nav/footer brand lockup. */
export function Monogram({ size = 40, className = '' }) {
  const g = useId();
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" role="presentation">
      <defs>{brass(g)}</defs>
      <circle cx="50" cy="50" r="46" fill="#1b1712" />
      <circle cx="50" cy="50" r="46" fill="none" stroke={`url(#${g})`} strokeWidth="3" />
      <circle cx="50" cy="50" r="38" fill="none" stroke={`url(#${g})`} strokeWidth="1.2" opacity="0.6" />
      <text x="50" y="62" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontWeight="900" fontSize="40" fill={`url(#${g})`}>TB</text>
    </svg>
  );
}
