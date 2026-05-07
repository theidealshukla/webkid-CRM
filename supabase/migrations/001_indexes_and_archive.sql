-- Webkid CRM — schema improvements
-- Run in Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Idempotent: safe to re-run.

-- ============================================================
-- 1. Archive flag on leads (CRMContext already references it)
-- ============================================================
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Indexes for common query patterns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_leads_status         ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to    ON public.leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_batch_id       ON public.leads(batch_id);
CREATE INDEX IF NOT EXISTS idx_leads_uploaded_by    ON public.leads(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_leads_is_archived    ON public.leads(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_leads_created_at     ON public.leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activities_lead_id   ON public.activities(lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_user_id   ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_reminder  ON public.activities(reminder_date) WHERE reminder_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user    ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity  ON public.activity_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_website_leads_created ON public.website_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_website_leads_unread  ON public.website_leads(is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_upload_batches_created ON public.upload_batches(created_at DESC);

-- ============================================================
-- 3. Cascade delete activities when a lead is removed
-- ============================================================
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_lead_id_fkey;
ALTER TABLE public.activities
  ADD CONSTRAINT activities_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- ============================================================
-- 4. updated_at trigger so it actually updates
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_set_updated_at ON public.leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
