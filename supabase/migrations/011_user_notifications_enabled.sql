alter table public.users
  add column if not exists notifications_enabled boolean not null default true;
