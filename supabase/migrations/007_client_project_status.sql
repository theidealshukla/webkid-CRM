-- Add project delivery status column to leads (used when is_client = true)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS project_status text DEFAULT 'in_progress';

CREATE INDEX IF NOT EXISTS idx_leads_project_status
  ON public.leads(project_status) WHERE is_client = true;
