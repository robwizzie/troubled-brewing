import { Link } from 'react-router-dom';

/* In-app help (build plan §5.8). Mirrors docs/OWNER-GUIDE.md. Drop the
   launch-day walkthrough video URL into VIDEO_URL when recorded. */
const VIDEO_URL = '';

const GUIDES = [
  { q: 'Add or edit a menu item', a: 'Go to Menu → “+ Add item” (or click an existing one). Fill in the name, price, category, and any dietary tags. Add a photo if you like. Use “Available” to temporarily hide a sold-out item. Save & publish.' },
  { q: 'Update your hours / add a holiday closure', a: 'Go to Hours. Change the open/close times in the weekly grid and Save. For a holiday, use “+ Add holiday”, pick the date and a label, and either set special hours or check “Closed all day”.' },
  { q: 'Add an event', a: 'Go to Events → “+ Add event”. Add a title, date, time, description, and an optional photo. Past events drop off the site automatically.' },
  { q: 'Add a Troublemaker', a: 'Go to Troublemakers → “+ Add Troublemaker”. Add a photo, name, role, short bio, and fun facts. You can add your own fun-fact rows too. Mark someone inactive when they move on (it keeps their record).' },
  { q: 'Add a Gallery Wall story', a: 'Go to Gallery Wall → “+ Add piece”. Upload a photo of the framed art, give it a title, and tell its story.' },
  { q: 'Add a local business', a: 'Go to Local Love → “+ Add business”. Add their name, a sentence about them, and a link. Tip: ask them to link back to you — it helps you both on Google.' },
  { q: 'Feature a review', a: 'Go to Testimonials → “+ Add testimonial”. Paste the quote, add the reviewer’s name and stars, and mark your favorites “featured”. Your live Google rating shows automatically once your Google Profile is connected.' },
  { q: 'Change a page’s layout', a: 'Go to Pages → pick a page. You’ll see its sections in order. Edit any section, use the ▲▼ arrows to reorder, Hide/Show to toggle, or “+ Add a section”. Use Preview to check it, then Publish.' },
  { q: 'Publish your changes (Draft vs Published)', a: 'Edits can be saved as a Draft (only you see them) or Published (live to everyone). Use Preview to see drafts in context. “Publish all” on a page pushes every pending change at once.' },
  { q: 'Undo a mistake', a: 'Open the item you changed and expand “History & restore”. Pick an earlier version and click Restore. (Restoring is itself undoable.)' },
  { q: 'Swap the homepage look', a: 'Go to Quick Blocks → Homepage look. Choose Gallery Wall, Warm Storefront, or Cozy Editorial, and Save.' },
];

export default function HelpCenter() {
  return (
    <div className="help">
      <h1>Help Center</h1>
      <p className="admin__lead">Short, plain-English how-tos. You can’t break anything that History → Restore can’t fix.</p>

      <section className="admin__panel">
        <h2>Quick start</h2>
        <p>New here? Work through the checklist on your <Link to="/admin">Dashboard</Link>: confirm hours, review the menu, add your team, add an event, connect Google, and pick your homepage look.</p>
      </section>

      {VIDEO_URL ? (
        <section className="admin__panel">
          <h2>Watch the 5-minute tour</h2>
          <div className="help-video"><iframe src={VIDEO_URL} title="Admin walkthrough" allowFullScreen /></div>
        </section>
      ) : (
        <section className="admin__panel">
          <h2>Walkthrough video</h2>
          <p className="field__hint">A short screen-recorded tour will be embedded here at launch.</p>
        </section>
      )}

      <section className="admin__panel">
        <h2>How-to guides</h2>
        <div className="help-guides">
          {GUIDES.map((g) => (
            <details key={g.q} className="help-guide">
              <summary>{g.q}</summary>
              <p>{g.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="admin__panel">
        <h2>Still stuck?</h2>
        <p>Reach out to your developer any time. Your content is backed up weekly, and every edit is reversible.</p>
      </section>
    </div>
  );
}
