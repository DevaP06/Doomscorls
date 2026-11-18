-- Run in Supabase: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: it never deletes real data. (It only drops the OLD pre-profiles `scores` table if it still exists.)

-- Legacy cleanup: the first version stored nicknames on `scores`. Drop that table once, if present.
do $$ begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'scores' and column_name = 'nickname') then
    drop table scores;
  end if;
end $$;

drop function if exists submit_score(uuid, text, date, int, int);

create table if not exists profiles (
  user_id    uuid primary key,
  nickname   text not null check (char_length(nickname) between 2 and 20),
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);
alter table profiles add column if not exists last_seen timestamptz not null default now();
-- one nickname per person, case-insensitive ("Sam" == "sam")
create unique index if not exists profiles_nickname_unique on profiles (lower(nickname));

create table if not exists scores (
  user_id    uuid not null references profiles(user_id) on delete cascade,
  day        date not null,
  reels      int  not null check (reels between 0 and 5000),
  secs       int  not null check (secs between 0 and 86400),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- RLS on with NO policies: the public key can't read or write tables directly,
-- only through the functions below.
alter table profiles enable row level security;
alter table scores   enable row level security;

-- Nickname rules: no invisible/control characters, no common profanity (basic leetspeak aware).
create or replace function nick_ok(n text) returns boolean language sql immutable as $$
  select n !~ ('[' || chr(1) || '-' || chr(31) || chr(8203) || '-' || chr(8207) || chr(8232) || '-' || chr(8238) || chr(8288) || chr(65279) || ']')
     and regexp_replace(translate(lower(n), '013457@$!', 'oleastasi'), '[^a-z]', '', 'g')
         !~ 'fuck|shit|bitch|cunt|nigg|fagg|rape|nazi|hitler|porn|dick|cock|pussy|slut|whore|retard';
$$;

create or replace function join_board(p_user uuid, p_nick text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not nick_ok(trim(p_nick)) then raise exception 'name_not_allowed'; end if;
  insert into profiles (user_id, nickname) values (p_user, trim(p_nick))
  on conflict (user_id) do nothing;
exception when unique_violation then
  raise exception 'nickname_taken';
end $$;

create or replace function rename_me(p_user uuid, p_nick text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not nick_ok(trim(p_nick)) then raise exception 'name_not_allowed'; end if;
  update profiles set nickname = trim(p_nick) where user_id = p_user;
exception when unique_violation then
  raise exception 'nickname_taken';
end $$;

create or replace function submit_score(p_user uuid, p_day date, p_reels int, p_secs int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if abs(p_day - current_date) > 1 then raise exception 'bad day'; end if;
  insert into scores (user_id, day, reels, secs)
  values (p_user, p_day, least(greatest(p_reels, 0), 5000), least(greatest(p_secs, 0), 86400))
  on conflict (user_id, day) do update set
    reels      = greatest(scores.reels, excluded.reels),  -- counts only go up
    secs       = greatest(scores.secs, excluded.secs),
    updated_at = now();
  update profiles set last_seen = now() where user_id = p_user;
end $$;

-- Everyone active in the last 7 days is on the board (0 reels if they haven't scrolled that day).
-- Top 20 plus the caller's own row. user_id is never returned.
create or replace function leaderboard(p_day date, p_user uuid default null)
returns table (rank bigint, nickname text, reels int, secs int, is_me boolean)
language sql security definer set search_path = public as $$
  select * from (
    select row_number() over (order by coalesce(s.reels, 0) desc, coalesce(s.secs, 0) desc, p.nickname) as rank,
           p.nickname, coalesce(s.reels, 0) as reels, coalesce(s.secs, 0) as secs,
           coalesce(p.user_id = p_user, false) as is_me
    from profiles p left join scores s on s.user_id = p.user_id and s.day = p_day
    where p.last_seen > now() - interval '7 days' or p.user_id = p_user
  ) t
  where t.rank <= 20 or t.is_me
  order by t.rank;
$$;

create or replace function delete_me(p_user uuid)
returns void language sql security definer set search_path = public as $$
  delete from profiles where user_id = p_user;  -- scores cascade
$$;

grant execute on function
  join_board(uuid, text),
  rename_me(uuid, text),
  submit_score(uuid, date, int, int),
  leaderboard(date, uuid),
  delete_me(uuid)
to anon;

-- Optional housekeeping: remove profiles unseen for 90 days. Run by hand now and then,
-- or schedule it with Supabase Cron:
--   delete from profiles where last_seen < now() - interval '90 days';
