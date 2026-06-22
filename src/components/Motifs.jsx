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
export function Flourish({ width = 240, className = '', color = 'currentColor' }) {
  return (
    <svg className={className} width={width} height="24" viewBox="0 0 240 24" fill="none" aria-hidden="true" role="presentation">
      <g stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none">
        {/* left swash: a graceful hump that resolves into a small upturned curl */}
        <path d="M120 12 C104 12 96 4.5 78 4.5 C62 4.5 56 12 44 12 C36.5 12 36.5 6.8 43 7.4" opacity="0.92" />
        {/* right swash — mirror of the left about x=120 */}
        <path d="M120 12 C136 12 144 4.5 162 4.5 C178 4.5 184 12 196 12 C203.5 12 203.5 6.8 197 7.4" opacity="0.92" />
        {/* fine hairline trailing each swash inward for a layered, etched feel */}
        <path d="M120 12 C108 12.4 100 15 86 15" opacity="0.4" />
        <path d="M120 12 C132 12.4 140 15 154 15" opacity="0.4" />
      </g>
      {/* faceted center diamond */}
      <path d="M120 5.6 L124.6 12 L120 18.4 L115.4 12 Z" fill={color} />
      <path d="M120 8.4 L122.4 12 L120 15.6 L117.6 12 Z" fill="var(--color-paper, #fffdf7)" opacity="0.55" />
      {/* tiny terminal dots */}
      <circle cx="40.5" cy="9" r="1.5" fill={color} />
      <circle cx="199.5" cy="9" r="1.5" fill={color} />
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

/* A clean line-art coffee cup + saucer with rising steam — the plainest possible
   "this is a coffee shop" cue, drawn in the same vintage line style as the fox. */
export function CoffeeCup({ size = 72, className = '', color = 'currentColor', steam = true }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true" role="presentation">
      {steam && (
        <g stroke={color} strokeWidth="2.6" strokeLinecap="round" opacity="0.7">
          <path className="steam-wisp" d="M40 30 C34 24 46 18 40 10" />
          <path className="steam-wisp" style={{ animationDelay: '0.5s' }} d="M55 30 C49 24 61 18 55 10" />
        </g>
      )}
      {/* saucer */}
      <ellipse cx="50" cy="84" rx="33" ry="6" stroke={color} strokeWidth="3" />
      {/* cup body */}
      <path d="M27 41 H73 L68 71 C67 77 60 81 50 81 C40 81 33 77 32 71 Z" stroke={color} strokeWidth="3" strokeLinejoin="round" />
      {/* handle */}
      <path d="M73 47 C86 47 86 66 69 66" stroke={color} strokeWidth="3" />
      {/* coffee line */}
      <path d="M33 48 H67" stroke={color} strokeWidth="2" opacity="0.5" />
    </svg>
  );
}

/* A little cluster of coffee beans — a divider / accent flourish. */
export function Beans({ size = 64, className = '', color = 'currentColor' }) {
  const bean = (cx, cy, rot, s = 1) => (
    <g transform={`translate(${cx} ${cy}) rotate(${rot}) scale(${s})`}>
      <ellipse cx="0" cy="0" rx="12" ry="8" fill="none" stroke={color} strokeWidth="2.4" />
      <path d="M-9 -3 C-3 0 3 0 9 3" fill="none" stroke={color} strokeWidth="2.4" />
    </g>
  );
  return (
    <svg className={className} width={size} height={(size * 40) / 64} viewBox="0 0 64 40" fill="none" aria-hidden="true" role="presentation">
      {bean(16, 20, -28)}
      {bean(40, 16, 22, 0.92)}
      {bean(48, 30, -12, 0.74)}
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
