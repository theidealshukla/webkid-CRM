-- Project timeline columns (start date + delivery date) for client records
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS project_started_at   timestamptz,
  ADD COLUMN IF NOT EXISTS project_delivered_at timestamptz;
