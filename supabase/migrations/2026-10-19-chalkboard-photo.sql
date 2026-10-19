-- Today's chalkboard: staff snap the shop's real chalkboard (admin -> Today's
-- chalkboard) and the Pastry Case hero shows that photo in place of its drawn,
-- live-menu board while it's fresh (src/lib/chalkboard.js).
--
-- Adds the content_blocks row, switched OFF, so nothing changes on the site
-- until someone publishes a photo. Safe to run more than once: an existing row
-- (e.g. one the admin already created by publishing) is left alone.
-- Run in Supabase -> SQL editor.
--
-- Row shape (content_blocks.data for key 'chalkboard_photo'):
--   url           public URL of the photo in the `media` bucket
--   path          its storage path, chalkboard/<timestamp>-<name>.webp (the
--                 admin deletes the previous one when a new photo is published)
--   caption       optional short line from staff
--   updated_at    ISO timestamp of the publish
--   enabled       true while published; "Remove" sets false (drawn board)
--   max_age_days  shown for this many calendar days (shop clock, upload day
--                 included), default 3; older photos are ignored automatically
--
-- STORAGE: photos go to the existing public `media` bucket under chalkboard/.
-- No new policy is needed — supabase/schema.sql already has bucket-wide
-- policies on storage.objects:
--   "public read media"   select                      bucket_id = 'media'
--   "admin write media"   insert  to authenticated    bucket_id = 'media'
--   "admin update media"  update  to authenticated    bucket_id = 'media'
--   "admin delete media"  delete  to authenticated    bucket_id = 'media'
-- and content_blocks already allows public SELECT of published rows and full
-- write for authenticated admins. Nothing else to run.

insert into content_blocks (key, data, status)
values (
  'chalkboard_photo',
  '{"url": "", "path": "", "caption": "", "updated_at": null, "enabled": false, "max_age_days": 3}'::jsonb,
  'published'
)
on conflict (key) do nothing;
