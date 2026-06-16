-- =============================================================================
-- Trouble Brewing Coffee House — Database schema
-- Run this in the Supabase SQL editor FIRST, then seed.sql.
--
-- Security model (see docs/INTEGRATIONS.md):
--   anon (public site)   : SELECT public/published content; INSERT submissions only
--   authenticated (admin): full read/write on everything
--   service_role         : backups + Edge Functions only — never shipped to client
--
-- Governance (see docs/CMS.md §governance, build plan §5.7):
--   Editable records carry `status` ('draft'|'published') and `draft_data` jsonb.
--   The public site reads PUBLISHED rows only. Admin preview reads drafts.
-- =============================================================================

-- Needed for gen_random_uuid()
create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- Helper: keep updated_at fresh
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- Pages (fixed set, seeded)
-- =============================================================================
create table if not exists pages (
  slug text primary key,         -- 'home','menu','about','events','location','contact','community','reviews','gallery-wall','troublemakers','neighborhood'
  title text not null,
  meta_description text,
  updated_at timestamptz default now()
);
create trigger pages_updated before update on pages
  for each row execute function set_updated_at();

-- =============================================================================
-- Sections — the section-based CMS. One ordered list per page.
-- =============================================================================
create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  page_slug text references pages(slug) on delete cascade,
  type text not null,            -- see docs/CMS.md catalog
  display_order int not null default 0,
  data jsonb not null default '{}',        -- PUBLISHED content
  draft_data jsonb,                         -- in-progress edits (admin preview)
  status text not null default 'published', -- 'draft' | 'published'
  visible boolean default true,
  updated_at timestamptz default now()
);
create index if not exists sections_page_idx on sections(page_slug, display_order);
create trigger sections_updated before update on sections
  for each row execute function set_updated_at();

-- =============================================================================
-- Menu items (structured)
-- =============================================================================
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(6,2),
  category text not null,        -- 'espresso'|'specialty'|'food'|'pastry'|'seasonal'
  dietary_flags text[] default '{}',
  image_url text,
  available boolean default true,
  display_order int default 0,
  status text not null default 'published',
  draft_data jsonb,
  updated_at timestamptz default now()
);
create index if not exists menu_items_cat_idx on menu_items(category, display_order);
create trigger menu_items_updated before update on menu_items
  for each row execute function set_updated_at();

-- =============================================================================
-- Events (owner-managed)
-- =============================================================================
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_date date not null,
  event_time text,
  image_url text,
  status text not null default 'published',
  created_at timestamptz default now()
);
create index if not exists events_date_idx on events(event_date);

-- =============================================================================
-- Hours — weekly + date overrides (manual fallback / holiday source of truth)
-- =============================================================================
create table if not exists hours (
  day_of_week int primary key,   -- 0=Sun ... 6=Sat
  open_time text,                -- null = closed
  close_time text
);

create table if not exists hours_overrides (
  override_date date primary key,
  label text,                    -- 'Closed for Thanksgiving'
  open_time text,                -- null = closed all day
  close_time text
);

-- =============================================================================
-- One-off editable content blocks (key/value jsonb)
-- =============================================================================
create table if not exists content_blocks (
  key text primary key,          -- 'featured_drink','staff_picks','loyalty_copy','announcement_banner','homepage_concept'
  data jsonb not null default '{}',
  draft_data jsonb,
  status text not null default 'published',
  updated_at timestamptz default now()
);
create trigger content_blocks_updated before update on content_blocks
  for each row execute function set_updated_at();

-- =============================================================================
-- Form submissions (contact + catering)
-- =============================================================================
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  form_type text not null,       -- 'contact' | 'catering'
  name text not null,
  email text not null,
  phone text,
  message text,
  event_type text,               -- catering only
  event_date date,               -- catering only
  headcount int,                 -- catering only
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists submissions_created_idx on submissions(created_at desc);

-- =============================================================================
-- Reviews: cached Google profile + owner-curated testimonials
-- =============================================================================
create table if not exists google_profile (
  id int primary key default 1,            -- single row
  place_id text,
  rating numeric(2,1),
  review_count int,
  reviews jsonb default '[]',              -- [{author, rating, text, time, profile_photo}]
  formatted_address text,
  formatted_phone text,
  weekday_hours jsonb default '[]',        -- Google opening_hours.weekday_text
  lat numeric, lng numeric,
  maps_url text,                           -- "leave a review" / GBP url
  fetched_at timestamptz default now(),
  constraint google_profile_singleton check (id = 1)
);

create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  author text not null,                    -- 'Sarah M.'
  source text default 'Google',
  rating int,                              -- 1-5, optional
  quote text not null,
  featured boolean default false,
  display_order int default 0,
  status text not null default 'published',
  draft_data jsonb,
  created_at timestamptz default now()
);

-- =============================================================================
-- Whimsical signature pages: gallery pieces, team, local businesses
-- =============================================================================
create table if not exists gallery_pieces (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  story text,                              -- the fun backstory
  display_order int default 0,
  status text not null default 'published',
  draft_data jsonb,
  created_at timestamptz default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  bio text,
  photo_url text,
  fun_facts jsonb default '{}',            -- { favorite_local_food, favorite_movie, favorite_book, favorite_show, favorite_artist, ... } extensible
  display_order int default 0,
  active boolean default true,
  status text not null default 'published',
  draft_data jsonb,
  created_at timestamptz default now()
);

create table if not exists local_businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,                           -- 'restaurant'|'retail'|'service'|...
  blurb text,
  url text,
  photo_url text,
  display_order int default 0,
  status text not null default 'published',
  draft_data jsonb,
  created_at timestamptz default now()
);

-- =============================================================================
-- TB Timeline — owner-managed milestones (opening day, anniversaries, launches)
-- (status/draft_data added beyond the client's base DDL for governance parity.)
-- =============================================================================
create table if not exists timeline_events (
  id uuid primary key default gen_random_uuid(),
  date_label text not null,        -- "Spring 2021", "March 2023" — flexible, not strict
  sort_date date,                  -- for ordering
  title text not null,
  description text,
  image_url text,
  display_order int default 0,
  status text not null default 'published',
  draft_data jsonb,
  created_at timestamptz default now()
);
create index if not exists timeline_sort_idx on timeline_events(sort_date, display_order);

-- =============================================================================
-- Revisions — prior-state snapshots for one-click restore (governance)
-- =============================================================================
create table if not exists revisions (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,         -- text (not uuid): records are keyed by uuid, slug, or key across tables
  snapshot jsonb not null,
  edited_by text,
  created_at timestamptz default now()
);
create index if not exists revisions_record_idx on revisions(table_name, record_id, created_at desc);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table pages            enable row level security;
alter table sections         enable row level security;
alter table menu_items       enable row level security;
alter table events           enable row level security;
alter table hours            enable row level security;
alter table hours_overrides  enable row level security;
alter table content_blocks   enable row level security;
alter table submissions      enable row level security;
alter table google_profile   enable row level security;
alter table testimonials     enable row level security;
alter table gallery_pieces   enable row level security;
alter table team_members     enable row level security;
alter table local_businesses enable row level security;
alter table timeline_events  enable row level security;
alter table revisions        enable row level security;

-- ---- Public READ policies (anon + authenticated) ----------------------------
-- Simple reference tables: fully public-readable.
create policy "public read pages"            on pages            for select using (true);
create policy "public read hours"            on hours            for select using (true);
create policy "public read hours_overrides"  on hours_overrides  for select using (true);
create policy "public read google_profile"   on google_profile   for select using (true);

-- Published-only tables: anon sees published rows; admins see all (separate policy below).
create policy "public read published sections"
  on sections for select using (status = 'published' and visible = true);
create policy "public read published menu_items"
  on menu_items for select using (status = 'published');
create policy "public read published events"
  on events for select using (status = 'published');
create policy "public read published content_blocks"
  on content_blocks for select using (status = 'published');
create policy "public read published testimonials"
  on testimonials for select using (status = 'published');
create policy "public read published gallery_pieces"
  on gallery_pieces for select using (status = 'published');
create policy "public read active published team_members"
  on team_members for select using (status = 'published' and active = true);
create policy "public read published local_businesses"
  on local_businesses for select using (status = 'published');
create policy "public read published timeline_events"
  on timeline_events for select using (status = 'published');

-- ---- Public INSERT: form submissions only -----------------------------------
create policy "anon insert submissions"
  on submissions for insert with check (true);

-- ---- Authenticated (admin) FULL access on every table -----------------------
-- One ALL policy per table; `using` governs read/update/delete, `with check` insert/update.
create policy "admin all pages"            on pages            for all to authenticated using (true) with check (true);
create policy "admin all sections"         on sections         for all to authenticated using (true) with check (true);
create policy "admin all menu_items"       on menu_items       for all to authenticated using (true) with check (true);
create policy "admin all events"           on events           for all to authenticated using (true) with check (true);
create policy "admin all hours"            on hours            for all to authenticated using (true) with check (true);
create policy "admin all hours_overrides"  on hours_overrides  for all to authenticated using (true) with check (true);
create policy "admin all content_blocks"   on content_blocks   for all to authenticated using (true) with check (true);
create policy "admin all submissions"      on submissions      for all to authenticated using (true) with check (true);
create policy "admin all google_profile"   on google_profile   for all to authenticated using (true) with check (true);
create policy "admin all testimonials"     on testimonials     for all to authenticated using (true) with check (true);
create policy "admin all gallery_pieces"   on gallery_pieces   for all to authenticated using (true) with check (true);
create policy "admin all team_members"     on team_members     for all to authenticated using (true) with check (true);
create policy "admin all local_businesses" on local_businesses for all to authenticated using (true) with check (true);
create policy "admin all timeline_events"  on timeline_events  for all to authenticated using (true) with check (true);
create policy "admin all revisions"        on revisions        for all to authenticated using (true) with check (true);

-- =============================================================================
-- STORAGE: public 'media' bucket for owner image uploads (1GB free tier)
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Anyone can read media (public site); only authenticated admins can write/delete.
create policy "public read media"
  on storage.objects for select using (bucket_id = 'media');
create policy "admin write media"
  on storage.objects for insert to authenticated with check (bucket_id = 'media');
create policy "admin update media"
  on storage.objects for update to authenticated using (bucket_id = 'media');
create policy "admin delete media"
  on storage.objects for delete to authenticated using (bucket_id = 'media');
