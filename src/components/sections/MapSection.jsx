import Reveal from '../Reveal.jsx';

/* Map embed. If no explicit embed_url is provided, fall back to a Google Maps
   search embed built from the address (no API key needed for the basic embed). */
export default function MapSection({ data = {} }) {
  const { address, embed_url } = data;
  const src = embed_url || (address ? `https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed` : null);
  return (
    <Reveal as="section" className="section">
      <div className="container">
        {address && <h2 className="section-heading">Find us</h2>}
        {src && (
          <iframe
            title="Map to Trouble Brewing Coffee House"
            src={src}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            style={{ width: '100%', height: 380, border: 0, borderRadius: 'var(--radius-lg)' }}
          />
        )}
        {address && (
          <p style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
            <a className="btn btn--ghost" href={`https://maps.google.com/maps?q=${encodeURIComponent(address)}`} target="_blank" rel="noopener noreferrer">
              Get directions
            </a>
          </p>
        )}
      </div>
    </Reveal>
  );
}
