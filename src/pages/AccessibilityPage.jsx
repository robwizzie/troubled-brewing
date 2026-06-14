import SEO from '../components/SEO.jsx';
import { SITE } from '../lib/seed.js';

export default function AccessibilityPage() {
  return (
    <>
      <SEO title="Accessibility — Trouble Brewing Coffee House" description="Our commitment to an accessible website and how to reach us about accessibility." path="/accessibility" />
      <article className="section container-narrow legal">
        <h1>Accessibility Statement</h1>
        <p>We want everyone to feel welcome — online and in the shop. We aim to meet <strong>WCAG 2.1 AA</strong> on this website: semantic structure, keyboard navigation, visible focus, alt text on images, sufficient color contrast, and respect for reduced-motion preferences.</p>

        <h2>Ongoing work</h2>
        <p>Accessibility is never "done." We test as we build and fix issues as we find them. If something on this site is hard to use with assistive technology, we want to know.</p>

        <h2>In the shop</h2>
        <p>Questions about accessibility when visiting us at {SITE.address}? Give us a call at <a href={SITE.phoneHref}>{SITE.phone}</a> and we'll help however we can.</p>

        <h2>Tell us</h2>
        <p>Found a barrier? Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> with the page and what happened, and we'll address it promptly.</p>
      </article>
    </>
  );
}
