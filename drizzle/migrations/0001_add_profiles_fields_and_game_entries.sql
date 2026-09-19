-- 1. Additive profile fields -------------------------------------------------
alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists profile_visibility text not null default 'public',
  add column if not exists theme_preference text not null default 'system',
  add column if not exists high_contrast boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles
  drop constraint if exists profiles_visibility_check,
  drop constraint if exists profiles_theme_check,
  drop constraint if exists profiles_username_format;

alter table public.profiles
  add constraint profiles_visibility_check check (profile_visibility in ('public', 'private')),
  add constraint profiles_theme_check check (theme_preference in ('light', 'dark', 'system')),
  add constraint profiles_username_format check (username is null or username ~ '^[A-Za-z0-9_]{3,24}$');

create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

-- 2. Unique username generator ----------------------------------------------
create or replace function public.generate_username(_seed text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  candidate text;
  suffix integer := 0;
begin
  base := regexp_replace(lower(coalesce(_seed, '')), '[^a-z0-9_]', '', 'g');
  if length(base) < 3 then
    base := 'player' || base;
  end if;
  base := left(base, 20);
  candidate := base;

  while exists (select 1 from public.profiles where lower(username) = candidate) loop
    suffix := suffix + 1;
    candidate := left(base, 20) || suffix::text;
  end loop;

  return candidate;
end;
$$;

-- Backfill usernames for accounts created before this change.
do $$
declare
  row_record record;
begin
  for row_record in select id, email, display_name from public.profiles where username is null loop
    update public.profiles
      set username = public.generate_username(coalesce(row_record.display_name, split_part(row_record.email, '@', 1)))
      where id = row_record.id;
  end loop;
end;
$$;

-- 3. Sign-up trigger now also assigns a username -----------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count integer;
  wanted_username text;
begin
  wanted_username := public.generate_username(
    coalesce(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'display_name',
      split_part(new.email, '@', 1)
    )
  );

  insert into public.profiles (id, email, display_name, username)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    wanted_username
  );

  select count(*) into existing_count from public.user_roles;

  if existing_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user');
  end if;

  return new;
end;
$$;

-- 4. Personal game tracking --------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'game_entry_status') then
    create type public.game_entry_status as enum ('playing', 'completed', 'wishlist', 'dropped');
  end if;
end;
$$;

create table if not exists public.game_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  igdb_id integer not null,
  game_slug text not null,
  title text not null,
  cover_url text,
  status public.game_entry_status not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, igdb_id)
);

create index if not exists game_entries_user_status_idx on public.game_entries (user_id, status);

grant select, insert, update, delete on public.game_entries to authenticated;
grant all on public.game_entries to service_role;

alter table public.game_entries enable row level security;

drop policy if exists "Users can view their own game entries" on public.game_entries;
drop policy if exists "Users can insert their own game entries" on public.game_entries;
drop policy if exists "Users can update their own game entries" on public.game_entries;
drop policy if exists "Users can delete their own game entries" on public.game_entries;

create policy "Users can view their own game entries"
  on public.game_entries for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own game entries"
  on public.game_entries for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own game entries"
  on public.game_entries for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users can delete their own game entries"
  on public.game_entries for delete to authenticated
  using (auth.uid() = user_id);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists game_entries_touch_updated_at on public.game_entries;
create trigger game_entries_touch_updated_at
  before update on public.game_entries
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- 5. Public profile reads expose only safe columns, and only when public -----
create or replace function public.get_public_profile(_username text)
returns table (
  id uuid,
  username text,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.username, p.display_name, p.bio, p.avatar_url, p.created_at
  from public.profiles p
  where lower(p.username) = lower(_username)
    and p.profile_visibility = 'public'
  limit 1
$$;

create or replace function public.get_public_game_entries(_username text)
returns table (
  igdb_id integer,
  game_slug text,
  title text,
  cover_url text,
  status public.game_entry_status,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select e.igdb_id, e.game_slug, e.title, e.cover_url, e.status, e.updated_at
  from public.game_entries e
  join public.profiles p on p.id = e.user_id
  where lower(p.username) = lower(_username)
    and p.profile_visibility = 'public'
  order by e.updated_at desc
$$;

revoke all on function public.get_public_profile(text) from public;
revoke all on function public.get_public_game_entries(text) from public;
grant execute on function public.get_public_profile(text) to anon, authenticated, service_role;
grant execute on function public.get_public_game_entries(text) to anon, authenticated, service_role;