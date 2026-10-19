import { Link } from 'react-router-dom';
import { ScreenHead } from './lib/publishing.jsx';

/* In-app help (build plan §5.8). Mirrors docs/OWNER-GUIDE.md. Drop the
   launch-day walkthrough video URL into VIDEO_URL when recorded. */
const VIDEO_URL = '';

const GUIDES = [
  { q: 'Change words or photos on any page', a: 'Open “Edit your pages”. Tap the part of the page you want to change — it gets a blue outline. Type in the panel and watch the page update as you go. Only you can see it. When it looks right, press Publish in the bar at the bottom.' },
  { q: 'What “Unsaved changes”, Discard and Publish mean', a: 'Nothing you change anywhere in the admin goes on the live site by itself. While something is waiting, the bar at the bottom says “Unsaved changes”. Publish puts everything on that screen live at once and tells you the time it went up. Discard throws your changes away and puts the screen back to exactly what is on the site. If you try to leave with changes waiting, you’ll be asked first.' },
  { q: 'Add or edit a menu item', a: 'In the editor, go to the Menu page and click the menu. Press “Manage menu →” in the panel, then “+ Add item” (or click an existing one). Fill in the name, price, category, and any dietary tags. Use “Available” to temporarily hide a sold-out item.' },
  { q: 'Update your hours / add a holiday closure', a: 'Admin menu → Hours & holidays. Change the open/close times in the weekly grid. For a holiday, use “+ Add holiday”, pick the date and a label, and either set special hours or tick “Closed all day”. Press Publish at the bottom when you’re done.' },
  { q: 'Add an event', a: 'In the editor, go to the Events page, click the events list, and press “Manage events →”. Add a title, date, time, description, and an optional photo. Past events drop off the site automatically.' },
  { q: 'Add a Troublemaker, gallery piece, or local business', a: 'Same trick everywhere: tap the section on its page (Troublemakers, Gallery Wall, or Local Love), then press the “Manage —” button in the panel. Add, edit, reorder, or remove from right there — press Done on each item, then Publish at the bottom. Every field is optional — a card looks finished even if all you filled in was a name.' },
  { q: 'Credit the artists on the Gallery Wall', a: 'Manage pieces → each one has “Who made it” and “Link for the artist”. Their name shows under the title on the page and links wherever you point it. If you know who made a piece, name them — that’s the whole point of that page. You can also record what it is (“Oil on canvas”), roughly when it’s from, which frame it hangs in, and whether it’s for sale.' },
  { q: 'Add someone’s photo, drink and fun facts', a: 'Manage Troublemakers → pick them. Photo, role, pronouns (ask them first), how long they’ve been here, their go-to order, a short bio, and as many fun facts as you like. Their drink gets its own spot on the card, because “what should I get?” is the question they answer all day. Turn off “Currently on the team” when someone moves on — their card comes off the site but the record is kept.' },
  { q: 'Add a local business to Local Love', a: 'Manage Local Love → + Add. Give it a street address and the page slots it into the walk down Station Ave automatically, with a Directions link and your own door marked in the right place. Ask them for a logo — most places are glad to be featured — and fill in “What you send people for”, which is the line customers actually act on.' },
  { q: 'Choose which Google reviews show', a: 'Admin menu → Google reviews (or tap the reviews strip on the homepage and press “Manage reviews →”). Every review Google has sent us is listed there. “Minimum stars” is the quickest control — set it to 4★ and up and nothing below that appears anywhere on the site. Then per review you can Hide one, Feature it so it leads everywhere, or add the photo that came with it. Press Publish to put your choices live.' },
  { q: 'Add the photo from a review', a: 'Google doesn’t hand out review photos, so save the picture from the review on Google and upload it in Google reviews → “Add photo” on that review, then Publish. Reviews with a photo lead the homepage strip and get their own “With photos” filter on the Reviews page.' },
  { q: 'Feature a review', a: 'Two ways. In Google reviews press ☆ Feature on any real Google review and, once you Publish, it jumps to the front everywhere. Or write your own: Admin menu → Hand-picked quotes. Your live Google rating shows automatically once the Google connection is set up.' },
  { q: 'Change the drinks on the homepage', a: 'Click the “Signature sips” row on the homepage. Name the drinks you want (exactly as they appear on your menu), or leave that blank and pick a category to feature from and how many to show. They come live from your Menu, so the price, description and photo always match the Menu page.' },
  { q: 'Add a photo to a drink', a: 'Manage menu → the item → Photo. That one upload is what shows on the Menu page AND on the homepage drinks row. Once any item has a photo, the Menu page switches itself from the classic price list to photo cards — the same cards the homepage uses.' },
  { q: 'Change a photo or label on the homepage wall', a: 'Click the hero, then scroll the panel to “The frames on your wall”. Every frame on the wall is listed — swap its photo, rename its label, or point it somewhere else. Leave a box blank to keep the original, or press Reset. These are the same frames phone visitors see hung as real framed pictures.' },
  { q: 'Rearrange, hide, add, or remove sections', a: 'In the editor with nothing selected, the panel lists every section on the page in order. Use ▲▼ to reorder, the 👁 to hide or show, 🗑 to remove, and “+ Add a section” at the bottom. You see the result on the page straight away; it goes live when you press Publish. Removed sections can be brought back with Undo until then.' },
  { q: 'Swap the homepage look', a: 'On the Home page, tap the big hero at the top. The panel shows “Homepage look” with all four styles — pick one and the page swaps on your screen. Press Publish to make it the look everyone sees.' },
  { q: 'See how it looks on a phone', a: 'Use the 📱 button in the editor’s top bar. It shows the real phone layout — same site, honest widths. Press 🖥 to go back.' },
  { q: 'Edit from your phone', a: 'Everything here works on a phone. The editor stacks instead of splitting: your page on top, the fields for whatever you tapped in a sheet underneath, and the Publish bar along the bottom — same as on a laptop.' },
  { q: 'Undo a mistake', a: 'Before you publish: press Discard in the bottom bar. After you publish: select the section (or open the item) and expand “Earlier versions”, press “Use this version”, then Publish.' },
];

export default function HelpCenter() {
  return (
    <div className="help">
      <ScreenHead title="Help" help="Short, plain-English how-tos. Nothing goes on the site until you press Publish, and every published change can be undone." />

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
