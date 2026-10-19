-- Homepage look: the real counter photo with the live SpotOn chalkboard
-- (replaces the AI-generated immersive-gallery scene as the default).
insert into content_blocks (key, data) values ('homepage_concept', '{"concept":"pastry_case"}'::jsonb)
on conflict (key) do update set data = excluded.data;
