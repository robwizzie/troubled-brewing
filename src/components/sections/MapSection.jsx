import Reveal from '../Reveal.jsx';

/* Map embed. If no explicit embed_url is provided, fall back to a Google Maps
   search embed built from the address (no API key needed for the basic embed).
   The heading used to be the hardcoded string "Find us", which meant the one
   word on the page a visitor scans for could not be edited. */
export default function MapSection({ data = {} }) {
  const { heading = 'Find us', address, embed_url, note, button_label = 'Get directions' } = data;
  const src = embed_url || (address ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null);
  return (
    <Reveal as="section" className="section">
      <div className="container">
        {heading && <h2 className="section-heading">{heading}</h2>}
        {src && (
          <iframe
            title="Map to Trouble Brewing Coffee House"
            src={src}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ width: '100%', height: 380, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', background: 'var(--color-sage-soft)', boxShadow: 'var(--shadow-sm)' }}
          />
        )}
        {address && (
          <p style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
            <a className="btn btn--ghost" href={`https://maps.google.com/maps?q=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer">
              {button_label}
            </a>
          </p>
        )}
        {note && <p className="map__note">{note}</p>}
      </div>
    </Reveal>
  );
}
