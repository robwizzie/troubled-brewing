-- =============================================================================
-- 2026-10-19 · "This or that" polls in the fox, and privacy-friendly site stats
--
-- NOT RUN YET. The owner must OK it first. Then run it once in the Supabase SQL
-- editor (Dashboard → SQL → New query → paste → Run). Every statement is
-- guarded, so running it twice is safe.
--
-- What it does, in plain English
--
--   1. Polls. The fox can ask a one-tap question like "Iced or hot today?".
--      `polls` holds the questions the owner writes in the admin;
--      `poll_votes` holds one row per vote: which poll, 'a' or 'b', when, and a
--      random id the visitor's browser made up (so one browser can't vote
--      twice). No IP address, no name, nothing personal.
--      Visitors can see only polls that are published and running today. They
--      can add a vote only to such a poll, and they can never read the votes
--      themselves: only the totals, through poll_results(poll_id).
--
--   2. Site stats. A tiny, cookieless visit counter. `site_stats` holds one
--      number per (day, event, key), e.g. (2026-10-19, 'page_view', '/menu') = 41.
--      That is all: no IP, no browser details, no visitor id, no cookies. The
--      site adds to those numbers through increment_stat() / increment_stats();
--      visitors can't read them. Only signed-in admins can, on the
--      "Site stats" admin page.
--
--   Until this runs, the site works exactly as before: the poll card stays
--   hidden, the stats calls fail quietly, and both admin pages say "not set up
--   yet" instead of erroring.
--
-- Admins: like every other admin table here (see supabase/schema.sql),
-- "admin" means the `authenticated` role. Only the owners have accounts.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Polls
-- ---------------------------------------------------------------------------

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  option_a text not null,
  option_b text not null,
  icon_a text,                         -- optional icon key from a small set (src/lib/polls.js · POLL_ICONS)
  icon_b text,
  starts_on date,                      -- empty = from the moment it's published
  ends_on date,                        -- empty = until the owner ends it
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  constraint polls_status_check check (status in ('draft', 'published', 'ended', 'archived')),
  constraint polls_question_len check (char_length(btrim(question)) between 1 and 120),
  constraint polls_option_a_len check (char_length(btrim(option_a)) between 1 and 40),
  constraint polls_option_b_len check (char_length(btrim(option_b)) between 1 and 40),
  constraint polls_icon_a_check check (icon_a is null or icon_a ~ '^[a-z]{1,20}$'),
  constraint polls_icon_b_check check (icon_b is null or icon_b ~ '^[a-z]{1,20}$'),
  constraint polls_dates_check check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

comment on table public.polls is
  'The fox''s "This or that" questions, written in the admin. Visitors see only published polls running today.';

create table if not exists public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  choice text not null,
  created_at timestamptz not null default now(),
  voter_hash text not null,            -- a random id the browser made up; never an IP or anything personal
  constraint poll_votes_choice_check check (choice in ('a', 'b')),
  -- a random id, nothing else: letters, digits, - and _, 16 to 64 long
  constraint poll_votes_voter_hash_check check (voter_hash ~ '^[A-Za-z0-9_-]{16,64}$'),
  -- one vote per browser per poll
  constraint poll_votes_one_per_voter unique (poll_id, voter_hash)
);

comment on table public.poll_votes is
  'One row per poll vote. voter_hash is a random browser-made id used only to stop double votes; no personal data.';

create index if not exists poll_votes_poll_idx on public.poll_votes (poll_id);

-- "Today" on the shop's clock (Haddon Heights, NJ), not UTC: a poll scheduled
-- for Saturday should still be up at 9 PM Saturday.
create or replace function public.shop_today()
returns date
language sql
stable
set search_path = public
as $$
  select (now() at time zone 'America/New_York')::date;
$$;

-- Is this poll published and running today? SECURITY DEFINER so the vote
-- policy below can ask even though visitors can't read every poll.
create or replace function public.poll_is_open(p_poll_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.polls p
    where p.id = p_poll_id
      and p.status = 'published'
      and (p.starts_on is null or p.starts_on <= public.shop_today())
      and (p.ends_on is null or p.ends_on >= public.shop_today())
  );
$$;

-- The totals for one poll, never the vote rows. Visitors get totals for polls
-- they could see (published or ended); admins get any poll's.
create or replace function public.poll_results(p_poll_id uuid)
returns table (a integer, b integer, total integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where v.choice = 'a')::integer as a,
    count(*) filter (where v.choice = 'b')::integer as b,
    count(*)::integer as total
  from public.poll_votes v
  where v.poll_id = p_poll_id
    and (
      auth.role() = 'authenticated'
      or exists (select 1 from public.polls p where p.id = p_poll_id and p.status in ('published', 'ended'))
    );
$$;

comment on function public.poll_results(uuid) is
  'Vote totals (a, b, total) for one poll. The only way visitors can see poll results: counts, never rows.';

alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

-- Visitors: read only published polls that are running today.
drop policy if exists "public read open polls" on public.polls;
create policy "public read open polls"
  on public.polls for select
  using (
    status = 'published'
    and (starts_on is null or starts_on <= public.shop_today())
    and (ends_on is null or ends_on >= public.shop_today())
  );

-- Admins: everything, like every other admin table.
drop policy if exists "admin all polls" on public.polls;
create policy "admin all polls"
  on public.polls for all to authenticated using (true) with check (true);

-- Visitors: add a vote, only to an open poll, only 'a' or 'b'. (The unique
-- constraint above turns a second vote from the same browser away.) There is
-- deliberately NO public select policy on poll_votes.
drop policy if exists "anon vote on open polls" on public.poll_votes;
create policy "anon vote on open polls"
  on public.poll_votes for insert to anon, authenticated
  with check (choice in ('a', 'b') and public.poll_is_open(poll_id));

-- Admins: read and tidy votes (e.g. delete a test vote).
drop policy if exists "admin read poll_votes" on public.poll_votes;
create policy "admin read poll_votes"
  on public.poll_votes for select to authenticated using (true);
drop policy if exists "admin delete poll_votes" on public.poll_votes;
create policy "admin delete poll_votes"
  on public.poll_votes for delete to authenticated using (true);

revoke all on function public.poll_is_open(uuid) from public;
revoke all on function public.poll_results(uuid) from public;
grant execute on function public.shop_today() to anon, authenticated;
grant execute on function public.poll_is_open(uuid) to anon, authenticated;
grant execute on function public.poll_results(uuid) to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 2. Site stats (cookieless, aggregate-only)
-- ---------------------------------------------------------------------------

create table if not exists public.site_stats (
  day date not null,
  event text not null,
  key text not null default '',
  count integer not null default 0,
  primary key (day, event, key),
  constraint site_stats_count_check check (count >= 0)
);

comment on table public.site_stats is
  'Daily counts only: (day, event, key) → count. No IP, no user agent, no visitor id, no cookies. Read by admins on the Site stats page.';

alter table public.site_stats enable row level security;

-- Admins read. No insert/update/delete policy for anyone: the only way in is
-- increment_stat() below. Visitors can't read a thing.
drop policy if exists "admin read site_stats" on public.site_stats;
create policy "admin read site_stats"
  on public.site_stats for select to authenticated using (true);
revoke insert, update, delete on public.site_stats from anon, authenticated;

-- Add n (1–20) to one daily count. Validates everything: the event must be on
-- the list below (the same list as src/lib/siteStats.js · STAT_EVENTS), the key
-- is trimmed to plain characters and at most 80 long, and the day must be
-- today give or take one (time zones), so nobody can backfill history.
create or replace function public.increment_stat(p_day date, p_event text, p_key text default '', p_n integer default 1)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  k text := coalesce(btrim(p_key), '');
  n integer := least(greatest(coalesce(p_n, 1), 1), 20);
begin
  if p_day is null or p_day < public.shop_today() - 1 or p_day > public.shop_today() + 1 then
    return;
  end if;
  if p_event is null or p_event not in (
    'page_view', 'order_now_click', 'fox_open', 'fox_question', 'fox_quiz_done', 'fox_surprise_again',
    'poll_vote', 'gift_card_click', 'add_to_calendar', 'share_event', 'menu_view', 'form_submit',
    'directions_click', 'newsletter_signup', 'outbound_click', 'specials_click', 'rainy_order'
  ) then
    return;
  end if;
  if char_length(k) > 80 or k !~ '^[A-Za-z0-9/_.:-]*$' then
    k := 'other';
  end if;
  insert into public.site_stats as s (day, event, key, count)
  values (p_day, p_event, k, n)
  on conflict (day, event, key) do update set count = s.count + excluded.count;
end;
$$;

comment on function public.increment_stat(date, text, text, integer) is
  'Adds to one daily count in site_stats. Whitelisted events only; key ≤ 80 plain characters; day = today ± 1.';

-- The site sends a few seconds' worth of counts at once, and on leaving the
-- page through navigator.sendBeacon, which can't set headers or JSON content
-- types. So this takes ONE unnamed text argument: PostgREST passes a
-- text/plain request body straight in. The body is a JSON array (at most 50
-- entries) of {"d": day, "e": event, "k": key, "n": count}; bad entries are
-- skipped, never an error.
create or replace function public.increment_stats(text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  rows jsonb;
  r jsonb;
begin
  if $1 is null or char_length($1) > 20000 then
    return;
  end if;
  begin
    rows := $1::jsonb;
  exception when others then
    return;
  end;
  if jsonb_typeof(rows) <> 'array' then
    return;
  end if;
  for r in select value from jsonb_array_elements(rows) limit 50 loop
    begin
      perform public.increment_stat((r->>'d')::date, r->>'e', coalesce(r->>'k', ''), coalesce((r->>'n')::integer, 1));
    exception when others then
      null; -- skip a malformed entry
    end;
  end loop;
end;
$$;

comment on function public.increment_stats(text) is
  'Batch form of increment_stat for the site (text/plain JSON array, ≤ 50 entries). Callable by sendBeacon.';

revoke all on function public.increment_stat(date, text, text, integer) from public;
revoke all on function public.increment_stats(text) from public;
grant execute on function public.increment_stat(date, text, text, integer) to anon, authenticated;
grant execute on function public.increment_stats(text) to anon, authenticated;
