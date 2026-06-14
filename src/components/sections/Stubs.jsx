import Reveal from '../Reveal.jsx';

/* FUTURE (post-launch, build plan §12.5 / §13): interactive community features.
   Built as section-type stubs so they can be enabled without rework once there's
   steady traffic. Not wired in v1 — they render a tasteful "coming soon" note. */

function ComingSoon({ heading, blurb }) {
  return (
    <Reveal as="section" className="section">
      <div className="container-narrow" style={{ textAlign: 'center' }}>
        <h2>{heading}</h2>
        <p style={{ color: 'var(--color-text-soft)' }}>{blurb}</p>
      </div>
    </Reveal>
  );
}

export function FlavorVoting({ data = {} }) {
  return (
    <ComingSoon
      heading={data.heading || 'Vote on the next flavor'}
      blurb="Coming soon — you'll get to help pick our next seasonal drink. Stay tuned!"
    />
  );
}

export function DrinkSuggestions({ data = {} }) {
  return (
    <ComingSoon
      heading={data.heading || 'Suggest a drink'}
      blurb="Coming soon — got an idea for a Trouble-worthy drink? Soon you'll be able to tell us right here."
    />
  );
}
