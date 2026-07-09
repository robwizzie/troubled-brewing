import { useState } from 'react';
import Reveal from '../Reveal.jsx';
import { track } from '../../lib/analytics.js';

/* Mailchimp embedded signup. POSTs straight to the Mailchimp action URL (no
   server needed). Until the client provides their embed URL the section
   renders NOTHING — a public "signup is being set up" note reads as
   unfinished, and the Instagram section already covers "stay in touch".
   See docs/INTEGRATIONS.md §Mailchimp. */
export default function Newsletter({ data = {} }) {
  const { heading = 'Stay in the loop', body, mailchimp_action_url } = data;
  const [email, setEmail] = useState('');
  const configured = Boolean(mailchimp_action_url);

  if (!configured) return null;

  return (
    <Reveal as="section" className="section">
      <div className="container-narrow newsletter-card">
        <h2 style={{ marginBottom: 'var(--space-2)' }}>{heading}</h2>
        {body && <p style={{ color: 'var(--color-text-soft)' }}>{body}</p>}

        <form
          action={mailchimp_action_url}
          method="post"
          target="_blank"
          className="newsletter-form"
          onSubmit={() => track('newsletter_signup')}
        >
          <label className="sr-only" htmlFor="nl-email">Email address</label>
          <input id="nl-email" type="email" name="EMAIL" required placeholder="you@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          {/* Mailchimp bot-protection field */}
          <div aria-hidden="true" className="honeypot">
            <input type="text" name="b_honeypot" tabIndex={-1} defaultValue="" />
          </div>
          <button className="btn btn--accent" type="submit">Subscribe</button>
        </form>
      </div>
    </Reveal>
  );
}
