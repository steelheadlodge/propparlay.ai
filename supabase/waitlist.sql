-- Run once in Supabase SQL Editor (TunedTV / Lovable Cloud project):
-- https://supabase.com/dashboard/project/pbjxfitpjocaooxxafri/sql/new

create table if not exists public.propparlay_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing',
  created_at timestamptz not null default now(),
  constraint propparlay_waitlist_email_unique unique (email)
);

alter table public.propparlay_waitlist enable row level security;

drop policy if exists "propparlay_waitlist_anon_insert" on public.propparlay_waitlist;
create policy "propparlay_waitlist_anon_insert"
  on public.propparlay_waitlist
  for insert
  to anon
  with check (true);

-- Public count only (no email exposure)
create or replace function public.propparlay_waitlist_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint from public.propparlay_waitlist;
$$;

revoke all on function public.propparlay_waitlist_count() from public;
grant execute on function public.propparlay_waitlist_count() to anon;
