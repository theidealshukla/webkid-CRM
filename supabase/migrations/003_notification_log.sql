-- Webkid CRM — notification audit + dedup table
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.notification_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient   text NOT NULL,
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  kind        text NOT NULL,                -- lead_created | batch_uploaded | status_changed | lead_assigned | reminder_set | reminder_tomorrow | reminder_today
  entity_type text,                         -- lead | activity | batch
  entity_id   uuid,
  message_id  text,                         -- SMTP message id for tracing
  status      text NOT NULL DEFAULT 'sent', -- sent | failed
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Critical for cron dedup performance
CREATE INDEX IF NOT EXISTS idx_notif_log_dedup
  ON public.notification_log (kind, entity_id, recipient);
CREATE INDEX IF NOT EXISTS idx_notif_log_created
  ON public.notification_log (created_at DESC);

-- RLS: only authed users (admins use service role to write from server)
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notif_log_read ON public.notification_log;
CREATE POLICY notif_log_read ON public.notification_log
  FOR SELECT USING (auth.role() = 'authenticated');
