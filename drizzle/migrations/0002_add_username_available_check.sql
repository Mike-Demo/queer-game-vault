create or replace function public.username_available(_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select _username ~ '^[A-Za-z0-9_]{3,24}$'
     and not exists (select 1 from public.profiles where lower(username) = lower(_username))
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated, service_role;