import SEO from '../components/SEO.jsx';
import { SITE } from '../lib/seed.js';

/* Plain-language privacy policy covering forms, newsletter, and analytics (§5.12).
   A reputable baseline tailored to the shop; have counsel review before launch. */
export default function PrivacyPage() {
  return (
    <>
      <SEO title="Privacy Policy — Trouble Brewing Coffee House" description="How Trouble Brewing Coffee House collects and uses information from our website." path="/privacy" />
      <article className="section container-narrow legal">
        <h1>Privacy Policy</h1>
        <p><em>Last updated: {new Date().getFullYear()}</em></p>

        <h2>The short version</h2>
        <p>We run a coffee shop, not a data business. We only collect what we need to reply to you and to understand what's useful on this site. We don't sell your information.</p>

        <h2>What we collect</h2>
        <ul>
          <li><strong>Contact & catering forms:</strong> your name, email, phone (if you provide it), and your message — so we can respond.</li>
          <li><strong>Newsletter:</strong> your email address, only if you choose to subscribe (handled by Mailchimp).</li>
          <li><strong>Analytics:</strong> with your consent, privacy-friendly Google Analytics gives us anonymous, aggregated usage data (pages visited, general location, device type). We turn on IP anonymization.</li>
        </ul>

        <h2>How we use it</h2>
        <p>To reply to inquiries, fulfill catering requests, send the newsletter you asked for, and improve the website. That's it.</p>

        <h2>Cookies & analytics consent</h2>
        <p>Analytics only loads after you accept the consent banner. Decline and we won't load it. You can clear your browser's site data to reset your choice.</p>

        <h2>Who we share with</h2>
        <p>Only the service providers that make the site work — our hosting (GitHub Pages), our database (Supabase), email/newsletter tools (Mailchimp / Resend), and Google Analytics — each acting on our behalf.</p>

        <h2>Your choices</h2>
        <p>Want to see, correct, or delete information we hold about you, or unsubscribe? Email us at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or call <a href={SITE.phoneHref}>{SITE.phone}</a> and we'll take care of it.</p>

        <h2>Contact</h2>
        <p>{SITE.name}, {SITE.address}. <a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
      </article>
    </>
  );
}
