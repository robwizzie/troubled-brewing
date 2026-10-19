-- Local Love: the neighbors' real logos as their shop signs (2026-10-19). NOT yet run.
--
-- The owner sent logo files for Anthony's, Ralph's, South Jersey Special,
-- Jane's Tea House and April Robin. They're self-hosted (trimmed, with WebP
-- twins) in public/images/neighbors/ and logo_url now holds a site-relative
-- path; the site resolves it under the deploy base (mediaUrl() in
-- src/lib/config.js), and the Station Ave strip paints each one as the
-- storefront's sign board in the logo's own ground colour.
--
-- Lula's Empanadas is left as is (still hotlinked from their Squarespace site).
--
-- Guarded: only rows with no logo, or the old hotlinked one, are changed, so an
-- owner who has since uploaded a different logo in the admin keeps theirs.
begin;

update local_businesses set logo_url = '/images/neighbors/anthonys.png'
 where name = 'Anthony''s Creative Italian Cuisine'
   and (logo_url is null or logo_url = '');

update local_businesses set logo_url = '/images/neighbors/ralphs.jpg'
 where name = 'Ralph''s Pizza'
   and (logo_url is null or logo_url = '');

update local_businesses set logo_url = '/images/neighbors/south-jersey-special.png'
 where name = 'South Jersey Special'
   and (logo_url is null or logo_url = '' or logo_url like '%southjerseyspecial.com%');

update local_businesses set logo_url = '/images/neighbors/janes-tea-house.png'
 where name = 'Jane''s Tea House'
   and (logo_url is null or logo_url = '' or logo_url like '%janesteahouse.com%');

update local_businesses set logo_url = '/images/neighbors/april-robin.png'
 where name = 'April Robin Florist & Gift'
   and (logo_url is null or logo_url = '' or logo_url like '%eflorist.com%');

commit;

select name, address, logo_url from local_businesses order by display_order;
