-- Local Love: real addresses + better images (2026-10-19). NOT yet run.
--
-- Addresses: every live row's address was re-checked against the business's
-- own website and the borough directory (haddonhts.com) — all were already
-- right, so they're re-asserted here only where a row has drifted (guarded:
-- a row already holding the right value is left untouched).
--   512 Station Ave  Anthony's            anthonysonstation.com, AAA listing
--   516 Station Ave  Lula's Empanadas     lulasempanadas.com/contact
--   520 Station Ave  Ralph's Pizza        ralphspizzahaddonheights.com, haddonhts.com
--   531 Station Ave  South Jersey Special southjerseyspecial.com footer
--   602 Station Ave  Jane's Tea House     janesteahouse.com, haddonhts.com
--   603 Station Ave  Cabana Water Ice     haddonhts.com (no website → hidden)
--   620 Station Ave  April Robin Florist  aprilrobinflorist.com, Yext listing
--   622 Station Ave  John's Friendly Mkt  NJ Pen (no website → hidden)
--
-- Images (hotlinked from where each business publishes them):
--   Ralph's: their site's only image is a business card, so the photo is the
--     restaurant header photo from their own Toast online-ordering page
--     (toasttab.com/local/ralphs-pizza → toast.app/r/ralphs-pizza).
--   South Jersey Special: product photo of their Garnet collection from their
--     Shopify store (the one product image on the site); the old "photo"
--     (Logo_Sharing_Website.png, the site's share image) becomes the logo.
--   April Robin: no shop photos on their site; the photo is the product photo
--     for "Beautiful in Blue", a bouquet sold on aprilrobinflorist.com.
-- Rows without a website are hidden by the site itself (no data change).
begin;

update local_businesses set address = '512 Station Ave' where name = 'Anthony''s Creative Italian Cuisine' and address is distinct from '512 Station Ave';
update local_businesses set address = '516 Station Ave' where name = 'Lula''s Empanadas' and address is distinct from '516 Station Ave';
update local_businesses set address = '520 Station Ave' where name = 'Ralph''s Pizza' and address is distinct from '520 Station Ave';
update local_businesses set address = '531 Station Ave' where name = 'South Jersey Special' and address is distinct from '531 Station Ave';
update local_businesses set address = '602 Station Ave' where name = 'Jane''s Tea House' and address is distinct from '602 Station Ave';
update local_businesses set address = '603 Station Ave' where name = 'Cabana Water Ice Co.' and address is distinct from '603 Station Ave';
update local_businesses set address = '620 Station Ave' where name = 'April Robin Florist & Gift' and address is distinct from '620 Station Ave';
update local_businesses set address = '622 Station Ave' where name = 'John''s Friendly Market' and address is distinct from '622 Station Ave';

-- Ralph's: replace the business-card image (only if it's still the card)
update local_businesses
   set photo_url = 'https://d2s742iet3d3t1.cloudfront.net/restaurants/restaurant-20459000000000000/restaurant_list_image_1565297144.jpg?size=xl'
 where name = 'Ralph''s Pizza'
   and (photo_url is null or photo_url = '' or photo_url like '%Business%20Card%');

-- South Jersey Special: real product photo; the share image becomes the logo
update local_businesses
   set photo_url = 'https://southjerseyspecial.com/cdn/shop/files/south_jersey_special_garnet_collection-01.jpg?v=1790468286&width=1200',
       logo_url = coalesce(nullif(logo_url, ''), 'https://southjerseyspecial.com/cdn/shop/files/Logo_Sharing_Website.png?v=1768790395')
 where name = 'South Jersey Special'
   and (photo_url is null or photo_url = '' or photo_url like '%Logo_Sharing_Website%');

-- April Robin: a photo (it had only a logo)
update local_businesses
   set photo_url = 'https://assets.eflorist.com/assets/products/PHR_/T209-3A.jpg'
 where name = 'April Robin Florist & Gift'
   and (photo_url is null or photo_url = '');

commit;

select name, address, url, photo_url, logo_url from local_businesses order by display_order;
