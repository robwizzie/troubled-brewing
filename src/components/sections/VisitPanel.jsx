import HoursToday from '../HoursToday.jsx';

/* What someone standing on a corner needs first, side by side: the map (with
   a directions button and the phone number) and this week's hours on the
   letterboard with today picked out. Hours are live (Google profile → manual
   table, holiday overrides on top) via <HoursToday>.

   Parking deliberately stays its own "Parking" rich_text block (shown as a
   taped note right under this): the fox's "Where do I park?" answer quotes
   that block by type and heading. */
export default function VisitPanel({ data = {} }) {
  const {
    heading = 'Find us',
    address = '514 Station Ave, Haddon Heights, NJ 08035',
    embed_url: embedUrl = '',
    directions_label: directionsLabel = 'Get directions',
    phone_label: phoneLabel = '',
    phone_url: phoneUrl = '',
    hours_heading: hoursHeading = 'This week',
  } = data;
  const q = encodeURIComponent(address || '');
  const src = embedUrl || (address ? `https://maps.google.com/maps?q=${q}&output=embed` : '');

  return (
    <section className="section pg-visit">
      <div className="container">
        {heading && <h2 className="section-heading">{heading}</h2>}
        <div className="pg-visit__grid">
          <div className="pg-visit__map">
            {src && (
              <span className="gw-frame__art gw-frame__art--black-flat pg-visit__map-frame">
                <iframe title="Map to Trouble Brewing Coffee House" src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </span>
            )}
            {address && <p className="pg-visit__address">{address}</p>}
            <p className="pg-visit__actions">
              {address && (
                <a className="btn btn--primary" href={`https://maps.google.com/maps?q=${q}`} target="_blank" rel="noopener noreferrer">
                  {directionsLabel}
                </a>
              )}
              {phoneLabel && phoneUrl && <a className="btn btn--ghost" href={phoneUrl}>{phoneLabel}</a>}
            </p>
          </div>
          <div className="hours-sign pg-visit__hours">
            <h3 className="hours-sign__label">{hoursHeading}</h3>
            <HoursToday showWeek />
          </div>
        </div>
      </div>
    </section>
  );
}
