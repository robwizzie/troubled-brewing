-- Owner requests from Cat & Katie (2026-10-23). NOT yet run.
-- Safe to run more than once.
--
-- 1. Events: an optional end date for multi-day events (admin → Events →
--    "End date"). The site keeps a multi-day event up until its last day.
-- 2. Hours → Google: google_profile.hours_pushed_at, stamped by the new
--    google-hours Edge Function when admin sends hours to the Business
--    Profile; the daily google-profile refresh keeps those hours (rather than
--    Places' possibly-lagging copy) for 3 days afterwards.
-- 3. Local Love: Michael's Jewelers and Gemologist (519 Station Ave) and
--    Doc's Finds Records (606 Station Ave). Logos + photos are hosted by the
--    site (public/images/neighbors/), from each shop's own website
--    (michaelsnj.com, docsfindsrecords.com). Note: the michaelsjewels.com
--    domain in old directory listings is no longer Michael's — don't use it.
--    Inserted only if a row with that name doesn't exist yet; the page lays
--    neighbors out by street number, so display_order only matters if the
--    section is switched to manual order (they go to the end of the list).
begin;

alter table events add column if not exists end_date date;
alter table google_profile add column if not exists hours_pushed_at timestamptz;

insert into local_businesses (name, category, address, blurb, url, logo_url, photo_url, display_order)
select 'Michael''s Jewelers and Gemologist', 'retail', '519 Station Ave',
       'Custom, one-of-a-kind jewelry designed and made right in the shop by Michael Bartorelli, a GIA graduate gemologist who started out on Philadelphia’s Jewelers Row at thirteen. Repairs, too — just across the street from us.',
       'https://michaelsnj.com/',
       '/images/neighbors/michaels-jewelers.png', '/images/neighbors/michaels-ring.jpg',
       coalesce((select max(display_order) + 1 from local_businesses), 0)
 where not exists (select 1 from local_businesses where name ilike 'Michael%Jewel%');

insert into local_businesses (name, category, address, blurb, url, logo_url, photo_url, display_order)
select 'Doc''s Finds Records', 'retail', '606 Station Ave',
       'Records, new and hard to find — fresh releases and original pressings of classic rock, jazz, blues and more, with new stock in the bins every week. An online shop that put down roots on Station Ave in 2022, and the reason for the occasional sidewalk sale with a live band.',
       'https://docsfindsrecords.com/',
       '/images/neighbors/docs-finds.png', '/images/neighbors/docs-finds-bins.jpg',
       coalesce((select max(display_order) + 1 from local_businesses), 0)
 where not exists (select 1 from local_businesses where name ilike 'Doc%Finds%');

commit;

select name, address, url from local_businesses order by display_order;
