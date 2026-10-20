/* The admin's one icon set: Lucide (react-icons/lu), one size and stroke.
   Always decorative — the text or aria-label next to it carries the meaning —
   so it is hidden from screen readers. Pass the component itself:
   <Icon icon={LuCamera} />. A missing icon renders nothing rather than
   breaking a screen (e.g. a new nav entry added without one). */
export function Icon({ icon: Glyph, size = 18, className = '', ...rest }) {
  if (!Glyph || typeof Glyph === 'string') return null;
  return <Glyph size={size} className={`adm-icon ${className}`.trim()} aria-hidden="true" focusable="false" {...rest} />;
}

export default Icon;
