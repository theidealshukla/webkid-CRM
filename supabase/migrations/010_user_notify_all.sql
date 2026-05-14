alter table public.users
  add column if not exists notify_all boolean not null default false;
