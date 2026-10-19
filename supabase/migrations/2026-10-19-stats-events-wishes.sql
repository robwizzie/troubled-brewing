-- =============================================================================
-- 2026-10-19 · Site stats: count the wish list, the fox's tricks and his
--              deep links (QR table cards)
--
-- Run once in the Supabase SQL editor, AFTER 2026-10-19-polls-and-stats.sql.
-- Safe to run twice: it only replaces two functions.
--
-- What it does, in plain English
--   The site's own cookieless counts (site_stats) only accept a fixed list of
--   events. This adds three to that list, so the admin's Site stats page can
--   show "Table card scans" and "Menu wishes":
--     wish_submitted  — someone made a menu wish   (key: drink / pastry / food / other)
--     fox_trick       — a hidden fox trick was found (key: hat_tip / late_night / anniversary)
--     fox_deeplink    — a link opened the fox, or a table card was scanned
--                       (key: '<src>:<view>', e.g. 'table:quiz', 'table:page')
--   increment_stat() and increment_stats() are recreated exactly as in
--   2026-10-19-polls-and-stats.sql, with only the event list extended, and
--   the same grants: visitors can call them; nobody can write site_stats
--   directly. Like before, no IP or personal data is read or stored.
--
--   Until this runs, those three events are simply ignored by the database;
--   every other count carries on as normal.
-- =============================================================================

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
    'directions_click', 'newsletter_signup', 'outbound_click', 'specials_click', 'rainy_order',
    'wish_submitted', 'fox_trick', 'fox_deeplink'
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
