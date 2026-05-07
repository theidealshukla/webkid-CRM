-- Webkid CRM — backfill any existing leads that have NULL assigned_to.
-- Sets assigned_to to whoever uploaded the lead.
-- Idempotent.

UPDATE public.leads
SET assigned_to = uploaded_by
WHERE assigned_to IS NULL
  AND uploaded_by IS NOT NULL;

-- Verify
SELECT count(*) AS still_unassigned
FROM public.leads
WHERE assigned_to IS NULL;
