-- =============================================================================
-- 2026-10-19 · The fox's wish list ("Make a wish for the menu")
--
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → paste →
-- Run). Guarded throughout, so it is safe to run twice.
--
-- What it does, in plain English
--   1. Adds a `wishes` table: the drink / pastry / food ideas visitors drop
--      into the fox's top hat. Each wish is a category, up to 80 characters,
--      an optional "why" (140) and an optional first name (30). There is NO
--      email, phone or IP address anywhere: the only other thing kept is a
--      scrambled (hashed) random browser id, used purely to stop one browser
--      flooding the hat.
--   2. Visitors can't read, change or delete wishes. The only thing the
--      public can do is call submit_wish(), which checks everything again on
--      the server: the category list, the lengths, no links or emails, at
--      most 3 wishes per browser per day, at most 200 wishes a day in total,
--      and the same wish from the same browser only once.
--   3. Logged-in admins can read wishes and change their status
--      (new → considering → added / not now / hidden) and private note, in
--      the admin's Wish list screen. Those changes save straight away; this
--      is admin data, not website content, so there is nothing to Publish.
--
--   Until this runs, the website still works: the hat takes the wish and the
--   fox says thanks, it just isn't stored, and the admin Wish list says the
--   wish list isn't switched on yet.
-- =============================================================================

create table if not exists public.wishes (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('drink', 'pastry', 'food', 'other')),
  text        text not null check (char_length(text) between 2 and 80),
  why         text check (why is null or char_length(why) <= 140),
  first_name  text check (first_name is null or char_length(first_name) <= 30),
  token_hash  text not null,
  status      text not null default 'new'
              check (status in ('new', 'considering', 'added', 'not_now', 'hidden')),
  admin_note  text check (admin_note is null or char_length(admin_note) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.wishes is
  'Menu wishes from the fox on the website. No contact details or IPs; token_hash is a hashed random browser id used only for rate limits.';

create index if not exists wishes_created_at_idx on public.wishes (created_at desc);
create index if not exists wishes_token_day_idx on public.wishes (token_hash, created_at desc);

-- keep updated_at fresh (set_updated_at() comes from supabase/schema.sql;
-- recreated here so this file also stands on its own)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists wishes_updated_at on public.wishes;
create trigger wishes_updated_at before update on public.wishes
  for each row execute function public.set_updated_at();

-- ---- Row Level Security -----------------------------------------------------
-- Same admin rule as every other table in schema.sql: signed-in = admin.
-- Anon gets no policy at all, so it can't select, insert, update or delete.
alter table public.wishes enable row level security;

revoke all on table public.wishes from anon;
grant select, update on table public.wishes to authenticated;

drop policy if exists "admin read wishes" on public.wishes;
create policy "admin read wishes" on public.wishes
  for select to authenticated using (true);

drop policy if exists "admin update wishes" on public.wishes;
create policy "admin update wishes" on public.wishes
  for update to authenticated using (true) with check (true);

-- ---- submit_wish(): the ONLY public way in ---------------------------------
-- Returns 'ok', 'duplicate' (already have it; nothing stored), 'limited'
-- (too many today) or 'invalid'. The site thanks the visitor whatever it
-- says, so a spammer learns nothing.
create or replace function public.submit_wish(
  p_category   text,
  p_text       text,
  p_why        text default null,
  p_first_name text default null,
  p_token      text default null
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category text := lower(trim(coalesce(p_category, '')));
  v_text     text := regexp_replace(trim(coalesce(p_text, '')), '\s+', ' ', 'g');
  v_why      text := nullif(regexp_replace(trim(coalesce(p_why, '')), '\s+', ' ', 'g'), '');
  v_name     text := nullif(regexp_replace(trim(coalesce(p_first_name, '')), '\s+', ' ', 'g'), '');
  v_token    text := trim(coalesce(p_token, ''));
  v_hash     text;
  v_link     text := '(https?:|www\.|[a-z0-9-]+\.(com|net|org|io|co|xyz|ru|info|biz|me|ly|app|shop|site|online|top|us|uk|gg|tv|link|click)([^a-z]|$)|@)';
begin
  -- the shape of it
  if v_category not in ('drink', 'pastry', 'food', 'other') then return 'invalid'; end if;
  if char_length(v_text) < 2 or char_length(v_text) > 80 then return 'invalid'; end if;
  if v_why is not null and char_length(v_why) > 140 then return 'invalid'; end if;
  if v_name is not null and char_length(v_name) > 30 then return 'invalid'; end if;
  if char_length(v_token) < 16 or char_length(v_token) > 64 then return 'invalid'; end if;

  -- no links or emails in any field, and no phone-number-length digit runs
  if v_text ~* v_link or coalesce(v_why, '') ~* v_link or coalesce(v_name, '') ~* v_link then return 'invalid'; end if;
  if regexp_replace(v_text || ' ' || coalesce(v_why, ''), '[^0-9]', '', 'g') ~ '[0-9]{7,}'
     and (v_text || ' ' || coalesce(v_why, '')) ~ '[0-9][0-9 ().-]{5,}[0-9]' then return 'invalid'; end if;
  if v_text ~ '(.)\1{5,}' then return 'invalid'; end if;

  -- a coarse, salted hash of the browser's random id: enough to rate-limit,
  -- useless for identifying anyone
  v_hash := md5('tb-wish:' || v_token);

  -- the same wish from the same browser: keep the first one only
  if exists (
    select 1 from public.wishes
    where token_hash = v_hash
      and lower(regexp_replace(text, '[^a-zA-Z0-9]+', '', 'g')) = lower(regexp_replace(v_text, '[^a-zA-Z0-9]+', '', 'g'))
  ) then return 'duplicate'; end if;

  -- per browser: 3 a day; everyone together: 200 a day
  if (select count(*) from public.wishes where token_hash = v_hash and created_at > now() - interval '1 day') >= 3 then
    return 'limited';
  end if;
  if (select count(*) from public.wishes where created_at > now() - interval '1 day') >= 200 then
    return 'limited';
  end if;

  insert into public.wishes (category, text, why, first_name, token_hash, status)
  values (v_category, v_text, v_why, v_name, v_hash, 'new');
  return 'ok';
end;
$$;

revoke all on function public.submit_wish(text, text, text, text, text) from public;
grant execute on function public.submit_wish(text, text, text, text, text) to anon, authenticated;
