# WebKid CMS — Implementation Plan

**Status:** Draft v1 — 2026-05-09
**Owner:** Aryan
**Scope:** Turn the public site (webkid.me) into a CMS-driven product, controlled from the existing admin panel (admin.webkid.me).
**Stack:** Next.js (existing) · Supabase (data + auth) · Cloudinary (media) · TypeScript
**Repos affected:** `frontend webkid` (public) · `webkid-CRM` (admin)

---

## 0. Why this plan exists

The public site is currently hard-coded — every copy/image/project edit requires a code change and redeploy. Aryan needs to update content frequently (monthly business launches, new testimonials, new projects, pricing) without touching code. This document is the single source of truth for that migration.

If a future agent picks this up mid-flight, **start at §13 (Phase Tracker)** to see what's done.

---

## 1. Goals

| # | Goal | Acceptance criteria |
|---|------|---------------------|
| G1 | Editable hero "X businesses launched this month" counter | Admin can change the number + label; reflects on site within ~60s |
| G2 | New "Trusted by businesses across India" strip on homepage | Marquee/grid of business names + logos; CRUD from admin |
| G3 | Testimonials become a mix of text, screenshots, and videos | Each testimonial has type=`text|screenshot|video`; video plays optimized via Cloudinary |
| G4 | Projects section is fully dynamic (homepage + /projects page) | Replaces `src/data/projects.ts` with DB; image upload from admin |
| G5 | Services section dynamic | Service cards CRUD'd from admin |
| G6 | Pricing dynamic + **global** | One pricing table consumed by every place pricing appears (homepage, /pricing, quote forms) |
| G7 | Direct media upload (admin → Cloudinary → URL stored in Supabase) | No third-party tools; one click in admin |
| G8 | Public site stays fast | ISR or short-TTL cache so site doesn't hit DB per request |

---

## 2. Non-goals (explicit)

- Multi-tenant CMS (this is for WebKid alone).
- Rich-text WYSIWYG with arbitrary blocks. Each section has a typed schema, not a free-form page builder.
- Multi-language. Single-locale (English) for now.
- Versioning / draft & publish workflow. Edits go live immediately (with a `published` boolean per row for soft-hide).
- Replacing the design — only the data source changes. Design system in `webkid-design-system.md` is authoritative.

---

## 3. Architecture overview

```
┌─────────────────────────┐         ┌──────────────────────┐
│  admin.webkid.me        │  write  │   Supabase           │
│  (webkid-CRM)           ├────────►│   - cms_* tables     │
│  /crm/cms/*             │         │   - RLS: admin only  │
└──────────┬──────────────┘         │   - storage: NONE    │
           │                        │     (use cloudinary) │
           │ direct unsigned upload └──────────────────────┘
           ▼                                   ▲
┌─────────────────────────┐                    │
│  Cloudinary             │                    │ read
│  (folder: webkid/cms/)  │                    │ (revalidate-on-write)
│  signed delete only     │                    │
└─────────────────────────┘                    │
           ▲                                   │
           │ public URL                        │
           │                        ┌──────────┴───────────┐
           └───────────────────────►│  webkid.me           │
                                    │  (frontend webkid)   │
                                    │  Server components   │
                                    │  + ISR (60s) or      │
                                    │  on-demand revalidate│
                                    └──────────────────────┘
```

**Read path:** Public site reads via Supabase server-side in RSCs with `revalidate: 60` (or on-demand when admin saves). No client SDK exposure of writes.
**Write path:** Admin saves text → Supabase. Uploads media → Cloudinary directly (browser → Cloudinary unsigned preset) → resulting URL/public_id is then written to Supabase. After successful save, admin calls `/api/revalidate` on public site to flush ISR cache.

---

## 4. Stack decisions & rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Data store | **Supabase Postgres** (existing) | Already in use for CRM; reuse auth & RLS; free tier sufficient |
| Media store | **Cloudinary** | Per requirement; superior video transcoding/optimization/CDN |
| Upload flow | **Unsigned upload preset** scoped to `webkid/cms/` folder | No backend round-trip; signed deletes via API route to prevent abuse |
| Public site fetching | **RSC + `revalidate: 60`** + on-demand revalidate webhook | Fast, cheap, fresh-enough for static-ish content |
| Admin auth | Reuse existing CRM Supabase auth | Already has admin role gate |
| Forms | `react-hook-form` + Zod | Type-safe; matches modern Next conventions |
| Image rendering | `next/image` with Cloudinary loader | Auto-format, responsive, lazy |
| Video rendering | `<video>` with Cloudinary `f_auto,q_auto` URL + poster | Browser-native, no extra JS |

---

## 5. Database schema

All tables prefixed `cms_` to namespace away from CRM. Single migration: `006_cms_schema.sql`.

### 5.1 `cms_site_settings` — singleton row, key-value config
```sql
CREATE TABLE cms_site_settings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key             text UNIQUE NOT NULL,        -- e.g. 'hero.launches_count'
  value           jsonb NOT NULL,              -- { count: 3, label: 'businesses launched this month' }
  updated_by      uuid REFERENCES users(id),
  updated_at      timestamptz DEFAULT now()
);
```
Used for: hero counter (G1), site-wide toggles, contact info, CTA copy.

### 5.2 `cms_trusted_businesses` — the "Trusted by businesses across India" strip (G2)
```sql
CREATE TABLE cms_trusted_businesses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  city            text,
  industry        text,                        -- 'clinic' | 'gym' | 'solar' | ...
  logo_url        text,                        -- cloudinary URL (optional)
  logo_public_id  text,                        -- cloudinary public_id for delete
  display_order   int  DEFAULT 0,
  published       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
```

### 5.3 `cms_projects` — replaces `src/data/projects.ts` (G4)
```sql
CREATE TABLE cms_projects (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  slug            text UNIQUE NOT NULL,
  category        text NOT NULL,
  description     text NOT NULL,
  result          text NOT NULL,               -- "30+ leads in first month"
  image_url       text,
  image_public_id text,
  live_url        text,
  status          text NOT NULL DEFAULT 'Live' CHECK (status IN ('Live','Coming Soon','In Progress')),
  year            text NOT NULL,
  featured        boolean DEFAULT false,       -- show on homepage
  homepage_span   text DEFAULT 'col-span-1',   -- tailwind grid hint
  projects_span   text DEFAULT 'col-span-1',
  display_order   int DEFAULT 0,
  published       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

### 5.4 `cms_testimonials` (G3)
```sql
CREATE TABLE cms_testimonials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type            text NOT NULL CHECK (type IN ('text','screenshot','video')),
  -- common
  author_name     text NOT NULL,
  author_handle   text,                        -- "Clinic Manager", "Gym Owner"
  author_avatar_url text,
  author_avatar_public_id text,
  -- text type
  quote           text,
  -- screenshot type (e.g. WhatsApp/iMessage chat screenshot)
  screenshot_url  text,
  screenshot_public_id text,
  -- video type
  video_url       text,                        -- mp4 from cloudinary
  video_public_id text,
  video_poster_url text,                       -- thumbnail
  video_duration_s int,
  -- common
  link            text,                        -- optional outbound link
  display_order   int DEFAULT 0,
  published       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now()
);
```
A CHECK constraint or app-level Zod ensures the right field is filled per type.

### 5.5 `cms_services` (G5)
```sql
CREATE TABLE cms_services (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  tagline         text,
  description     text,
  icon_name       text,                        -- lucide-react icon name
  features        jsonb DEFAULT '[]'::jsonb,   -- ["Custom design", "Mobile-first", ...]
  display_order   int DEFAULT 0,
  published       boolean DEFAULT true
);
```

### 5.6 `cms_pricing_plans` — the **global** pricing system (G6)
```sql
CREATE TABLE cms_pricing_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text UNIQUE NOT NULL,        -- 'starter' | 'growth' | 'scale' | 'custom'
  name            text NOT NULL,
  tagline         text,
  price_inr       int,                         -- one-time or starting-at amount
  price_period    text DEFAULT 'one-time',     -- 'one-time' | 'monthly' | 'starting-at'
  cta_label       text DEFAULT 'Get a Quote',
  cta_url         text DEFAULT '/contact',
  features        jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlighted     boolean DEFAULT false,       -- "Most popular"
  display_order   int DEFAULT 0,
  published       boolean DEFAULT true,
  updated_at      timestamptz DEFAULT now()
);
```
Anywhere pricing is shown (homepage, /pricing, quote forms, contact CTAs) reads from this single table.

### 5.7 `cms_media_assets` — optional media library
```sql
CREATE TABLE cms_media_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id       text UNIQUE NOT NULL,
  url             text NOT NULL,
  resource_type   text NOT NULL CHECK (resource_type IN ('image','video')),
  format          text,
  width           int, height int,
  duration_s      int,
  bytes           int,
  uploaded_by     uuid REFERENCES users(id),
  created_at      timestamptz DEFAULT now()
);
```
Useful for an "asset picker" in admin so the same image can be reused.

### 5.8 RLS (Row-Level Security)
- **Public read:** `SELECT` allowed `WHERE published = true` for all `cms_*` tables (anon role).
- **Admin write:** `INSERT/UPDATE/DELETE` restricted to `users.role = 'admin'` (reuse existing pattern from `002_rls_policies.sql`).
- `cms_site_settings`: admin-only; public read of specific allowlisted keys via a SECURITY DEFINER function.

---

## 6. Cloudinary setup

1. **Account & cloud_name:** create dedicated `webkid` cloud (or use existing).
2. **Upload preset (unsigned):** `webkid_cms_unsigned`
   - Folder: `webkid/cms/`
   - Allowed formats: `jpg, png, webp, mp4, mov`
   - Max file size: 100 MB (videos), 10 MB (images)
   - Auto-tag off, eager transformations off (use `f_auto,q_auto` at delivery time).
3. **Folders:** `webkid/cms/projects`, `webkid/cms/testimonials`, `webkid/cms/logos`, `webkid/cms/avatars`.
4. **Signed delete:** Server-side API route in CRM (`/api/cms/cloudinary/delete`) with admin auth gate uses Cloudinary Node SDK + API secret (server-only env var).
5. **Transformations used at delivery:**
   - Images: `f_auto,q_auto,w_<bucket>` via responsive `next/image`.
   - Videos: `f_auto,q_auto,vc_auto` for adaptive playback. Poster: `.jpg` derived URL of the same public_id.
6. **Env vars:**
   - **CRM:** `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.
   - **Public site:** `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` only (read-only; URLs are full).

---

## 7. Admin panel UI

New nav section in CRM sidebar: **"Website CMS"** with sub-routes under `/crm/cms/`:

| Route | Page | Purpose |
|-------|------|---------|
| `/crm/cms` | Overview | Last edits, publish status, links to public site sections |
| `/crm/cms/hero` | Hero settings | Edit launches count + label, hero subtext, CTA labels |
| `/crm/cms/trusted` | Trusted businesses | CRUD list + drag-reorder; logo upload |
| `/crm/cms/projects` | Projects | CRUD; image upload; toggle `featured`; reorder |
| `/crm/cms/testimonials` | Testimonials | Tabbed by type (text/screenshot/video); upload UI varies by type |
| `/crm/cms/services` | Services | CRUD; icon picker (lucide); features as tag-input |
| `/crm/cms/pricing` | Pricing plans | CRUD; features list editor; highlight toggle |
| `/crm/cms/media` | Media library | Browse/delete past uploads (Cloudinary mirror) |

**Shared components to build:**
- `<MediaUploader type="image|video" folder="..." />` — handles direct-to-Cloudinary unsigned upload, progress bar, returns `{ url, public_id }`.
- `<DragReorderList items />` — reorder via drag, updates `display_order`.
- `<PublishToggle />` — flips `published` boolean inline.
- `<JsonArrayInput />` — edit `features: jsonb[]` as chips.

---

## 8. Public site integration

### 8.1 Data layer (`frontend webkid`)
Create `src/lib/cms/` with one file per resource:
- `getHeroSettings()` → `cms_site_settings` keys starting with `hero.*`
- `getTrustedBusinesses()` → published, ordered
- `getProjects({ featuredOnly? })`
- `getTestimonials()`
- `getServices()`
- `getPricingPlans()`

Each function uses Supabase server client and is wrapped with Next.js `unstable_cache` keyed by resource with tag `cms:<resource>`.

### 8.2 Revalidation
- Default ISR: `export const revalidate = 60` on each section's page.
- On-demand: admin save → POST to `https://webkid.me/api/revalidate?tag=cms:projects` (with shared secret in header). Tag-based cache invalidation flushes only the affected resource.

### 8.3 Section migration order (least → most risk)
1. Hero counter (`cms_site_settings`) — small, safe pilot.
2. Trusted businesses (new section, no existing code to break).
3. Testimonials (replace hardcoded array).
4. Projects (replace `src/data/projects.ts` — also fixes `/projects` page).
5. Services.
6. Pricing (touches multiple pages — do last when CMS pattern is proven).

---

## 9. The "Trusted by businesses across India" section

New component at `src/sections/TrustedBusinesses.tsx`, slotted between Hero and Portfolio.

Design (monochrome per `webkid-design-system.md`):
- Eyebrow: `TRUSTED BY BUSINESSES ACROSS INDIA` (uppercase, tracked, gray).
- Two infinite marquees in opposite directions (reuse `.animate-marquee` from `globals.css`).
- Each tile: business name + city (small) + grayscale logo if present, hover → color.
- Mask-edge fade.

Empty state (when DB empty): hide section entirely (don't render eyebrow alone).

---

## 10. Testimonials — text vs screenshot vs video

- **Text:** existing `TestimonialsSection` marquee card, no change to render.
- **Screenshot:** card swaps text for a Cloudinary image (e.g., a real WhatsApp screenshot). `next/image` with `sizes` and rounded corners; click → lightbox.
- **Video:**
  - Card shows poster image + play overlay; click to play inline.
  - `<video>` tag with `preload="metadata"`, `playsInline`, `muted` autoplay-friendly toggle.
  - Source: Cloudinary URL with `f_auto,q_auto`.
  - Aspect ratio capped at 9:16 (vertical phone clips) and 16:9 (landscape).
  - Lazy-load via `IntersectionObserver` so off-screen videos don't fetch metadata.

---

## 11. Pricing — the global system (G6)

**Single source of truth:** `cms_pricing_plans`.

**Consumers:**
- Homepage `<PricingTeaser />` — shows 3 highlighted plans.
- `/pricing` page — full table with all plans + comparison.
- `/contact` quote form — dropdown of plan slugs, prefilled if `?plan=slug` query.
- Service cards — "Starting from ₹X" pulled from a related `starter_plan_slug` field on `cms_services` (optional FK by slug).

**Why one table:** Aryan changes a price once → everywhere updates. Eliminates the classic CMS bug of stale prices on a forgotten page.

**Display rules:**
- `price_period = 'one-time'` → "₹X" (with rupee symbol).
- `price_period = 'starting-at'` → "From ₹X".
- `price_inr = NULL` → "Custom" + CTA only.
- All formatting through one helper `formatPrice(plan)` so behavior is consistent.

---

## 12. Security checklist

- [ ] Service-role Supabase key never shipped to client. Public site uses anon key with RLS-protected reads only.
- [ ] Cloudinary `API_SECRET` only on CRM server (used in API route for deletes & signed listings).
- [ ] Unsigned upload preset scoped to specific folder + size + format limits.
- [ ] CRM CMS routes protected by admin role check in `layout.tsx` (reuse existing pattern).
- [ ] On-demand revalidate endpoint protected by `REVALIDATE_SECRET` shared header.
- [ ] All admin form inputs validated with Zod; sanitize HTML if any rich-text fields ever added.
- [ ] Image/video URLs in DB are full Cloudinary URLs — never trust user-pasted external URLs (only via the uploader component).

---

## 13. Phase tracker (the source of truth for progress)

> **Future agents: update this table as you complete work.** This is the handoff anchor.

| Phase | Description | Status | Notes |
|-------|-------------|--------|-------|
| P0 | This plan document | ✅ Done | 2026-05-09 |
| P1 | Cloudinary account + unsigned preset + env vars | ⬜ Not started | Aryan to provision; needs API key/secret |
| P2 | Migration `006_cms_schema.sql` (all tables + RLS) | ⬜ Not started | |
| P3 | Shared `<MediaUploader />` component in CRM | ⬜ Not started | Direct-to-Cloudinary unsigned upload |
| P4 | CRM CMS layout + nav + `/crm/cms` overview page | ⬜ Not started | |
| P5 | Hero settings page (`cms_site_settings`) | ⬜ Not started | Pilot section |
| P6 | Public site: `getHeroSettings()` + Hero reads from DB | ⬜ Not started | |
| P7 | On-demand revalidate API + secret | ⬜ Not started | Both repos |
| P8 | Trusted businesses CRUD + new public section | ⬜ Not started | |
| P9 | Testimonials CRUD (3 types) + render upgrade | ⬜ Not started | Includes video player component |
| P10 | Projects CRUD + replace `src/data/projects.ts` | ⬜ Not started | Migrate existing 3 entries first |
| P11 | Services CRUD | ⬜ Not started | |
| P12 | Pricing CRUD + global integration | ⬜ Not started | Last — most surface area |
| P13 | Media library page | ⬜ Not started | Optional polish |
| P14 | QA pass + delete old hardcoded files | ⬜ Not started | |

---

## 14. Open questions (decide before starting)

1. **Cloudinary account:** does Aryan have one, or create new? Plan & budget.
2. **Existing 3 projects** in `src/data/projects.ts` — migrate by hand-INSERT in seed SQL, or via admin UI after P5?
3. **Avatar source for testimonials:** keep Unsplash placeholders allowed, or require uploaded image?
4. **Video length cap:** propose 60s. Confirm.
5. **Pricing display:** "From ₹X" vs exact prices — confirm Aryan's preference per plan.
6. **Domain for revalidate webhook:** is `webkid.me` already deployed and reachable? Hostname for the CRM-→public webhook.
7. **Multiple admins?** RLS uses `users.role = 'admin'` — confirm only specific users get write.

---

## 15. Handoff trigger (read this if context is running out)

If working memory is approaching limits, a separate document **`CMS_HANDOFF_<date>.md`** must be created at `webkid-CRM/` containing:

1. Snapshot of §13 (Phase tracker) with current state.
2. Files added/modified in this session (paths only).
3. Any decisions made that override this plan (with reason).
4. Next single concrete action the next agent should take.
5. Pasted: any partial code or migration SQL that wasn't committed yet.

The handoff doc is **not** this plan — this plan stays static as the spec. The handoff doc is the live progress log.

---

## Appendix A — File map (planned)

```
webkid-CRM/
  supabase/migrations/006_cms_schema.sql
  src/app/crm/cms/
    layout.tsx
    page.tsx                          # overview
    hero/page.tsx
    trusted/page.tsx
    projects/page.tsx
    testimonials/page.tsx
    services/page.tsx
    pricing/page.tsx
    media/page.tsx
  src/app/api/cms/
    cloudinary/sign/route.ts
    cloudinary/delete/route.ts
    revalidate-public/route.ts        # calls public site
  src/components/cms/
    MediaUploader.tsx
    DragReorderList.tsx
    PublishToggle.tsx
    JsonArrayInput.tsx
    IconPicker.tsx
  src/lib/cms/
    types.ts
    queries.ts                        # admin-side reads
    mutations.ts                      # admin-side writes
    cloudinary.ts                     # client + server helpers
  src/types/cms.ts

frontend webkid/
  src/lib/cms/
    server.ts                         # supabase server client (admin-anon)
    hero.ts                           # getHeroSettings
    trusted.ts
    projects.ts                       # replaces src/data/projects.ts (delete after migration)
    testimonials.ts
    services.ts
    pricing.ts
    formatPrice.ts
  src/app/api/revalidate/route.ts     # accepts tag-based revalidate
  src/sections/TrustedBusinesses.tsx  # NEW
  src/sections/*.tsx                  # converted to RSC reading from cms/*
```

---

**Next action when implementation starts:** Aryan answers §14 questions → agent starts P1 → P2.
