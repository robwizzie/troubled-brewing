import { Link } from 'react-router-dom';

/* In-app help (build plan §5.8). Mirrors docs/OWNER-GUIDE.md. Drop the
   launch-day walkthrough video URL into VIDEO_URL when recorded. */
const VIDEO_URL = '';

const GUIDES = [
  { q: 'Change words or photos on any page', a: 'Open “Edit your site”. Click the part of the page you want to change — it gets a blue outline and a little label. Type in the panel on the right and watch the page update as you go. Your edits save automatically as a private draft; press Publish (top right) when you want them live.' },
  { q: 'What “draft” and “Publish” mean', a: 'While you edit, everything autosaves as a draft only you can see — the real site is untouched. The Publish button (top of the editor) pushes all your pending changes live at once. The button shows how many changes are waiting.' },
  { q: 'Add or edit a menu item', a: 'In the editor, go to the Menu page and click the menu. Press “Manage menu →” in the panel, then “+ Add item” (or click an existing one). Fill in the name, price, category, and any dietary tags. Use “Available” to temporarily hide a sold-out item.' },
  { q: 'Update your hours / add a holiday closure', a: 'Go to Settings → Hours. Change the open/close times in the weekly grid and Save. For a holiday, use “+ Add holiday”, pick the date and a label, and either set special hours or check “Closed all day”.' },
  { q: 'Add an event', a: 'In the editor, go to the Events page, click the events list, and press “Manage events →”. Add a title, date, time, description, and an optional photo. Past events drop off the site automatically.' },
  { q: 'Add a Troublemaker, gallery story, or local business', a: 'Same trick everywhere: click the section on its page (Troublemakers, Gallery Wall, or Local Love), then press the “Manage —” button in the panel. Add, edit, reorder, or remove from right there.' },
  { q: 'Feature a review', a: 'On the Reviews page, click the testimonials wall and press “Manage testimonials →”. Paste the quote, add the reviewer’s name and stars, and mark your favorites “featured”. Your live Google rating shows automatically once your Google Profile is connected.' },
  { q: 'Rearrange, hide, add, or remove sections', a: 'In the editor with nothing selected, the right panel lists every section on the page in order. Use ▲▼ to reorder, the 👁 to hide or show, 🗑 to remove, and “+ Add a section” at the bottom. These apply right away; hidden sections stay ghosted in the editor so you can bring them back.' },
  { q: 'Swap the homepage look', a: 'On the Home page, click the big hero at the top. The panel shows “Homepage look” with all four styles — pick one and the page swaps instantly. Each look has its own text and photos you can edit below.' },
  { q: 'See how it looks on a phone', a: 'Use the 📱 button in the editor’s top bar. It shows the real phone layout — same site, honest widths. Press 🖥 to go back.' },
  { q: 'Undo a mistake', a: 'Select the section (or open the item) you changed and expand “History & restore”. Pick an earlier version and click Restore. (Restoring is itself undoable.)' },
];

export default function HelpCenter() {
  return (
    <div className="help">
      <h1>Help Center</h1>
      <p className="admin__lead">Short, plain-English how-tos. You can’t break anything that History → Restore can’t fix.</p>

      <section className="admin__panel">
        <h2>Quick start</h2>
        <p>
          One idea runs the whole thing: <Link to="/admin/editor">open the editor</Link>, click the part
          of your site you want to change, and change it. The page updates while you type, nothing goes
          live until you press <strong>Publish</strong>, and every edit can be undone.
        </p>
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
