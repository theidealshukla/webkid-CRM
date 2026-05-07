-- Webkid CRM — RLS policies
-- Run AFTER 001_indexes_and_archive.sql.
-- Review existing policies first; this drops + recreates a baseline.

-- Helper: is the calling user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================================
-- LEADS
-- ============================================================
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_read   ON public.leads;
DROP POLICY IF EXISTS leads_write  ON public.leads;
DROP POLICY IF EXISTS leads_update ON public.leads;
DROP POLICY IF EXISTS leads_delete ON public.leads;
CREATE POLICY leads_read   ON public.leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY leads_write  ON public.leads FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY leads_update ON public.leads FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY leads_delete ON public.leads FOR DELETE USING (public.is_admin());

-- ============================================================
-- ACTIVITIES + ACTIVITY_LOGS + UPLOAD_BATCHES
-- ============================================================
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activities_all ON public.activities;
CREATE POLICY activities_all ON public.activities
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_logs_all ON public.activity_logs;
CREATE POLICY activity_logs_all ON public.activity_logs
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS batches_all ON public.upload_batches;
CREATE POLICY batches_all ON public.upload_batches
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- USERS — read for authed; write for admin only
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_read  ON public.users;
DROP POLICY IF EXISTS users_admin ON public.users;
CREATE POLICY users_read  ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY users_admin ON public.users FOR ALL    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- WEBSITE_LEADS — public can INSERT (form), authed can read/update
-- ============================================================
ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS web_leads_insert ON public.website_leads;
DROP POLICY IF EXISTS web_leads_read   ON public.website_leads;
DROP POLICY IF EXISTS web_leads_update ON public.website_leads;
CREATE POLICY web_leads_insert ON public.website_leads FOR INSERT WITH CHECK (true);
CREATE POLICY web_leads_read   ON public.website_leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY web_leads_update ON public.website_leads FOR UPDATE USING (auth.role() = 'authenticated');
