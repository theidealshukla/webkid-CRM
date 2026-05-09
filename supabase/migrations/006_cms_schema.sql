-- ============================================================
-- 006_cms_schema.sql — Public website CMS
-- All tables prefixed cms_ to namespace away from CRM tables.
-- Run in Supabase SQL Editor.
-- ============================================================

-- ----- 1. Site settings (key/value singleton) ----------------
CREATE TABLE IF NOT EXISTS public.cms_site_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  value       jsonb NOT NULL,
  updated_by  uuid REFERENCES public.users(id),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ----- 2. Trusted businesses --------------------------------
CREATE TABLE IF NOT EXISTS public.cms_trusted_businesses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  city            text,
  industry        text,
  logo_url        text,
  logo_public_id  text,
  display_order   int  NOT NULL DEFAULT 0,
  published       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cms_trusted_pub_ord
  ON public.cms_trusted_businesses(published, display_order);

-- ----- 3. Projects ------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_projects (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL,
  slug             text UNIQUE NOT NULL,
  category         text NOT NULL,
  description      text NOT NULL,
  result           text NOT NULL,
  image_url        text,
  image_public_id  text,
  live_url         text,
  status           text NOT NULL DEFAULT 'Live'
                   CHECK (status IN ('Live','Coming Soon','In Progress')),
  year             text NOT NULL,
  featured         boolean NOT NULL DEFAULT false,
  homepage_span    text NOT NULL DEFAULT 'col-span-1',
  projects_span    text NOT NULL DEFAULT 'col-span-1',
  display_order    int  NOT NULL DEFAULT 0,
  published        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cms_projects_pub_feat
  ON public.cms_projects(published, featured, display_order);

-- ----- 4. Testimonials --------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_testimonials (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type                     text NOT NULL CHECK (type IN ('text','screenshot','video')),
  author_name              text NOT NULL,
  author_handle            text,
  author_avatar_url        text,
  author_avatar_public_id  text,
  quote                    text,
  screenshot_url           text,
  screenshot_public_id     text,
  video_url                text,
  video_public_id          text,
  video_poster_url         text,
  video_duration_s         int,
  link                     text,
  display_order            int NOT NULL DEFAULT 0,
  published                boolean NOT NULL DEFAULT true,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cms_testimonials_pub_ord
  ON public.cms_testimonials(published, display_order);

-- ----- 5. Services ------------------------------------------
CREATE TABLE IF NOT EXISTS public.cms_services (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  tagline         text,
  description     text,
  icon_name       text,
  features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order   int  NOT NULL DEFAULT 0,
  published       boolean NOT NULL DEFAULT true
);

-- ----- 6. Pricing plans (GLOBAL) ----------------------------
CREATE TABLE IF NOT EXISTS public.cms_pricing_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,
  name            text NOT NULL,
  tagline         text,
  price_inr       int,
  price_period    text NOT NULL DEFAULT 'one-time'
                  CHECK (price_period IN ('one-time','monthly','starting-at')),
  cta_label       text NOT NULL DEFAULT 'Get a Quote',
  cta_url         text NOT NULL DEFAULT '/contact',
  features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlighted     boolean NOT NULL DEFAULT false,
  display_order   int  NOT NULL DEFAULT 0,
  published       boolean NOT NULL DEFAULT true,
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ----- 7. Media assets (cloudinary mirror) ------------------
CREATE TABLE IF NOT EXISTS public.cms_media_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id       text UNIQUE NOT NULL,
  url             text NOT NULL,
  resource_type   text NOT NULL CHECK (resource_type IN ('image','video')),
  format          text,
  width           int,
  height          int,
  duration_s      int,
  bytes           int,
  uploaded_by     uuid REFERENCES public.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Row-Level Security
-- ============================================================

-- Helper: returns true if current auth user is admin in public.users
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = auth.uid() AND u.role = 'admin'
  );
$$;

-- Apply RLS to all CMS tables
ALTER TABLE public.cms_site_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_trusted_businesses   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_projects             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_testimonials         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_services             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_pricing_plans        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_media_assets         ENABLE ROW LEVEL SECURITY;

-- Public read: published rows only (anon + authenticated)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cms_trusted_businesses','cms_projects','cms_testimonials',
    'cms_services','cms_pricing_plans'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "%1$s_public_read" ON public.%1$s;
      CREATE POLICY "%1$s_public_read" ON public.%1$s
        FOR SELECT TO anon, authenticated
        USING (published = true);
    ', t);
  END LOOP;
END $$;

-- cms_site_settings: anyone can read (only ever a handful of public keys)
DROP POLICY IF EXISTS "cms_site_settings_public_read" ON public.cms_site_settings;
CREATE POLICY "cms_site_settings_public_read" ON public.cms_site_settings
  FOR SELECT TO anon, authenticated USING (true);

-- cms_media_assets: admin-only
DROP POLICY IF EXISTS "cms_media_assets_admin_read" ON public.cms_media_assets;
CREATE POLICY "cms_media_assets_admin_read" ON public.cms_media_assets
  FOR SELECT TO authenticated USING (public.is_admin());

-- Admin write (insert/update/delete) on every CMS table
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cms_site_settings','cms_trusted_businesses','cms_projects',
    'cms_testimonials','cms_services','cms_pricing_plans','cms_media_assets'
  ] LOOP
    EXECUTE format('
      DROP POLICY IF EXISTS "%1$s_admin_write" ON public.%1$s;
      CREATE POLICY "%1$s_admin_write" ON public.%1$s
        FOR ALL TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    ', t);
  END LOOP;
END $$;

-- ============================================================
-- Seed values (safe to re-run via ON CONFLICT DO NOTHING)
-- ============================================================

INSERT INTO public.cms_site_settings(key, value) VALUES
  ('hero.launches', '{"count": 3, "label": "businesses launched this month"}'::jsonb),
  ('hero.subtext', to_jsonb('We design and build websites that turn visitors into paying customers. Fast delivery. No templates. Built for results.'::text)),
  ('hero.cta_primary', '{"label":"Get a Free Quote","url":"/contact"}'::jsonb),
  ('hero.cta_secondary', '{"label":"See Our Work","url":"/projects"}'::jsonb),
  ('site.trust_line', to_jsonb('Trusted by clinics, solar companies, gyms & restaurants across India'::text))
ON CONFLICT (key) DO NOTHING;

-- Migrate existing 3 hardcoded projects (safe to re-run)
INSERT INTO public.cms_projects (title, slug, category, description, result, image_url, live_url, status, year, featured, display_order)
VALUES
  ('Outpulse AI', 'outpulse-ai', 'SaaS Application',
   'A modern SaaS dashboard with sleek UI and powerful analytics for sales teams.',
   '40% conversion increase', '/projects/outpulse.png', '#', 'Live', '2025', true, 1),
  ('ScaTech Solar', 'scatech-solar', 'Corporate Website',
   'Authoritative B2B website that wins enterprise solar contracts.',
   '30+ leads in first month', '/projects/sca-tech.png', '#', 'Live', '2025', true, 2),
  ('Luxestates', 'luxestates',  'Luxury Real Estate',
   'High-resolution photo-led estate showcase optimized for HNW clientele.',
   'Smooth, premium experience', '/projects/luxestate.png', '#', 'Live', '2025', true, 3)
ON CONFLICT (slug) DO NOTHING;
