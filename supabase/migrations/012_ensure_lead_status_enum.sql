-- Ensure all expected lead_status enum values exist.
-- ALTER TYPE ... ADD VALUE is idempotent in PG 14+ via IF NOT EXISTS.
-- Run in Supabase SQL Editor.

DO $$
DECLARE
  missing text;
BEGIN
  FOREACH missing IN ARRAY ARRAY[
    'new', 'contacted', 'interested', 'follow_up',
    'not_interested', 'closed_won', 'closed_lost'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'public.lead_status'::regtype
        AND enumlabel = missing
    ) THEN
      EXECUTE format('ALTER TYPE public.lead_status ADD VALUE %L', missing);
    END IF;
  END LOOP;
END $$;
