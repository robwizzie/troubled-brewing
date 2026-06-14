# Content — Source of Truth for Seeding

This is the real content used to seed the database (`supabase/seed.sql`) and the bundled fallback (`src/lib/seed.js`). Items marked **(confirm)** need client sign-off but are safe, sensible defaults so the site looks complete on day one.

## Business facts

- **Name:** Trouble Brewing Coffee House
- **Address:** 514 Station Ave, Haddon Heights, NJ 08035
- **Phone:** (856) 617-6638
- **Instagram:** [@troublebrewingcoffee](https://instagram.com/troublebrewingcoffee)
- **Coffee:** La Colombe partnership (credibility signal — **no celebrity quotes**, the Gordon Ramsay quote was cut by the client)
- **Online ordering:** moving to SpotOn Order — exact hosted URL **(confirm — TODO #1)**, wired via `VITE_SPOTON_ORDER_URL`
- **Domain:** troublebrewingcoffeehouse.com

## Hours (confirm — TODO #4)

| Day | Open | Close |
|---|---|---|
| Mon | 7:30a | 7:00p |
| Tue | 7:30a | 7:00p |
| Wed | 7:30a | 7:00p |
| Thu | 7:30a | 7:00p |
| Fri | 7:30a | 5:00p |
| Sat | 7:30a | 5:00p |
| Sun | 8:00a | 3:00p |

Holiday closures handled via `hours_overrides`. Default source of truth is Google Business Profile (client asked), with these manual tables as the editable fallback.

## Parking

Street parking plus a lot behind the coffee house; entrance from White Horse Pike or Atlantic Ave.

## Seed menu (confirm full list + prices — TODO #2)

Prices below are reasonable placeholders pending the client's real numbers.

| Item | Category | Price | Notes |
|---|---|---|---|
| Cappuccino | espresso | 4.50 | |
| Iced Chai Latte | specialty | 5.50 | |
| Banana Split Coffee | specialty | 6.50 | **Signature** |
| Coffee Flight | specialty | 9.00 | tasting flight |
| Croissant | pastry | 3.75 | |
| Brioche Breakfast Sandwich | food | 7.50 | + pork roll / bacon add-on |
| Scone | pastry | 3.50 | rotating flavors |
| Buffalo Chicken Panini | food | 11.00 | spicy three-cheese, Frank's RedHot, fire-braised chicken, seeded rye |
| Cranberry Walnut Chicken Salad Panini | food | 11.00 | **Most popular** |
| BLT | food | 9.50 | on seeded rye |
| Gluten-Free Cookie | pastry | 3.25 | dietary: gluten-free |
| Vegan Cookie | pastry | 3.25 | dietary: vegan |

Categories: `espresso` | `specialty` | `food` | `pastry` | `seasonal`.

## About / story

Tom & Cat were mortgage bankers who left finance to open a neighborhood coffee shop. La Colombe coffee, fresh-made food, a genuine local gathering spot. (Full long-form copy to be refined with the client.)

## The Troublemakers (staff) — content pending (TODO #13)

Owner-managed via `team_members`. Each: photo, role, short bio, and fun facts (favorite local food spot, movie, book, TV show, music artist — extensible). Seed includes 1–2 friendly placeholders so the page renders.

## Gallery Wall pieces — content pending (TODO #12)

Owner-managed via `gallery_pieces`. Each real framed piece: photo, title, fun backstory. Seed includes a couple of placeholder pieces.

## Local businesses they support — content pending (TODO #14)

Owner-managed via `local_businesses`. Each: name, category, blurb, link, optional photo. Seed includes a few well-known Haddon Heights neighbors as placeholders to confirm.

## Reviews / testimonials

Owner-curated `testimonials` are the backbone (paste favorite quotes, attribute to first name + "Google review", optional rating). Live Google rating/count + a rotating set of Google reviews layer in via the cached Places data. Seed includes a few placeholder testimonials.

## La Colombe copy

Factual partnership mention only. "We proudly pour La Colombe." No celebrity endorsements or quotes.
