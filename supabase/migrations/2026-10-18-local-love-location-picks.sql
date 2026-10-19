-- Local Love: real links + each business's own published images (2026-10-18).
-- Images are hotlinked from the business's own website; links verified to load.
begin;
update local_businesses set url = 'https://www.anthonysonstation.com/',
  photo_url = 'https://www.anthonysonstation.com/wp-content/uploads/2020/03/dish-02.png'
  where name = 'Anthony''s Creative Italian Cuisine';
update local_businesses set url = 'https://www.lulasempanadas.com/',
  photo_url = 'https://images.squarespace-cdn.com/content/v1/60b6a9970f75812d3a397812/1624323609595-C29NVYDNWDR44QV4FISU/FA7A1970_websize.jpg',
  logo_url = 'https://images.squarespace-cdn.com/content/v1/60b6a9970f75812d3a397812/63a9e7da-d51c-45ee-9179-7ddd2f37242c/Lulas_Empanadas-RGB_01-Full+Color.png?format=750w'
  where name = 'Lula''s Empanadas';
update local_businesses set url = 'https://ralphspizzahaddonheights.com/',
  photo_url = 'https://img1.wsimg.com/isteam/ip/ae0bfafb-1cab-4311-bbd9-07cb4c60af5d/Ralphs%20Business%20Card.png'
  where name = 'Ralph''s Pizza';
update local_businesses set url = 'https://southjerseyspecial.com/',
  photo_url = 'https://southjerseyspecial.com/cdn/shop/files/Logo_Sharing_Website.png?v=1768790395'
  where name = 'South Jersey Special';
update local_businesses set url = 'https://janesteahouse.com/',
  photo_url = 'https://janesteahouse.com/wp-content/uploads/2025/05/1.png',
  logo_url = 'https://janesteahouse.com/wp-content/uploads/2023/11/cropped-JTH-Logo-Round-270x270.png'
  where name = 'Jane''s Tea House';
update local_businesses set url = 'https://www.aprilrobinflorist.com/',
  logo_url = 'https://assets.eflorist.com/site/EF-12771/Logo/m7701151-centered%20logo%20april%20robins.png'
  where name = 'April Robin Florist & Gift';
commit;
select name, url, (photo_url is not null) as has_photo, (logo_url is not null) as has_logo from local_businesses order by display_order;

-- Location: "Find us" (the map) first, then hours, parking, call.
begin;
update sections set display_order = case type when 'map' then 0 when 'hours' then 1 when 'rich_text' then 2 when 'cta' then 3 else display_order end
 where page_slug = 'location';
update sections set data = data || '{"heading": "Find us"}'::jsonb
 where page_slug = 'location' and type = 'map' and coalesce(data->>'heading','') = '';
-- Staff picks: only real, currently-sold items (Banana Split is off the menu;
-- the panini was renamed "Cranberry Walnut Chicken Salad" — its own menu text
-- calls it "our most popular sandwich").
update content_blocks set data = '{"items": [{"label": "Flying off the menu", "value": "Cranberry Walnut Chicken Salad"}, {"label": "This week''s feature", "value": "Iced Matcha Latte"}]}'::jsonb
 where key = 'staff_picks';
commit;
select page_slug, display_order, type, data->>'heading' as heading from sections where page_slug = 'location' order by display_order;
