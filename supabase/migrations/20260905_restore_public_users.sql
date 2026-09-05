-- Restores public.users, which was mistakenly dropped as apparent
-- unrelated schema clutter during a codebase cleanup pass - it turned out
-- to be load-bearing: the on_auth_user_created trigger (handle_new_user())
-- inserts into it on every signup, and the "Admins can manage all
-- products" RLS policy on public.products calls is_admin(), which reads
-- from it. Dropping it broke new-user signup outright (every INSERT into
-- auth.users failed because the AFTER INSERT trigger errored).
--
-- Recreated with the same shape the existing handle_new_user() trigger
-- function already inserts into (id, email, full_name, role) - see
-- "select pg_get_functiondef(oid) from pg_proc where proname =
-- 'handle_new_user'" for that function's body, which was never touched.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null default 'cashier',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view their own profile row"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update their own profile row"
  on public.users for update
  using (auth.uid() = id);

-- Backfill rows for every existing account that signed up while this
-- table was missing, so is_admin() and any future admin tooling see a
-- consistent picture instead of holes for a handful of accounts.
insert into public.users (id, email, full_name, role)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', 'User'), 'cashier'
from auth.users u
where not exists (select 1 from public.users pu where pu.id = u.id)
on conflict (id) do nothing;
