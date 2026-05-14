alter table public.upload_batches
  add column if not exists note text;
