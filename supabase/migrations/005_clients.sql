-- Webkid CRM — promote leads to clients (single table, flag-based)
-- Run in Supabase SQL Editor.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_client          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS became_client_at   timestamptz,
  ADD COLUMN IF NOT EXISTS client_services    text,
  ADD COLUMN IF NOT EXISTS client_notes       text;

CREATE INDEX IF NOT EXISTS idx_leads_is_client
  ON public.leads(is_client) WHERE is_client = true;

CREATE INDEX IF NOT EXISTS idx_leads_became_client_at
  ON public.leads(became_client_at DESC) WHERE became_client_at IS NOT NULL;
