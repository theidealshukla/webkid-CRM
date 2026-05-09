# WebKid CMS — Context Handoff (2026-05-09)

> **For the next AI agent:** the previous session is out of context budget. This file is the single source of truth for what's done, what's left, what to read, and exactly what to do next. **Read §5 (Final Prompt) last — it's your instructions.**

---

## 1. The mission

Aryan owns webkid.me (public site) and admin.webkid.me (CRM). He wants the public site's content to be editable from the admin panel — no code changes for routine updates. Stack: **Supabase** (data) + **Cloudinary** (images/videos, direct upload from admin → URL stored in Supabase) + Next.js on both sides.

The full spec is in [`CMS_IMPLEMENTATION_PLAN.md`](./CMS_IMPLEMENTATION_PLAN.md). **Read that first.** This file is only the progress + next-action delta.

---

## 2. Repos

- `d:/freelance projects/webkid/frontend webkid/` — public site (webkid.me)
- `d:/freelance projects/webkid/webkid-CRM/` — admin panel (admin.webkid.me)

Both share **one** Supabase project. CRM is `"use client"`-heavy with `AuthProvider` / `CRMProvider` and an admin role gate via `public.users.role = 'admin'`. Public site uses Next 16, App Router, Lenis + Framer Motion + GSAP, monochrome design system in `frontend webkid/webkid-design-system.md`.

---

## 3. ✅ What is DONE

### 3.1 Documentation
- [`CMS_IMPLEMENTATION_PLAN.md`](./CMS_IMPLEMENTATION_PLAN.md) — full spec (architecture, schema, phases P0–P14, open questions §14, file map appendix). **Authoritative.**

### 3.2 Database (Supabase)
- [`supabase/migrations/006_cms_schema.sql`](./supabase/migrations/006_cms_schema.sql) — **NOT YET RUN.** Creates 7 tables + RLS + seed:
  - `cms_site_settings`, `cms_trusted_businesses`, `cms_projects`, `cms_testimonials`, `cms_services`, `cms_pricing_plans`, `cms_media_assets`
  - `public.is_admin()` SECURITY DEFINER helper
  - Public read (published rows), admin write
  - Seeds: hero settings + 3 existing projects (Outpulse / ScaTech / Luxestates)

### 3.3 CRM (admin panel) — `webkid-CRM/src/`
- `lib/cms/types.ts` — shared types
- `lib/cms/queries.ts` — generic CRUD + typed wrappers + `revalidatePublic(tag)` helper
- `components/cms/MediaUploader.tsx` — direct-to-Cloudinary unsigned upload with progress, also writes to `cms_media_assets`
- `components/cms/PublishToggle.tsx` — small reusable switch
- `app/api/cms/cloudinary/delete/route.ts` — server-signed Cloudinary delete (admin role check)
- `app/api/cms/revalidate-public/route.ts` — proxies to public site `/api/revalidate?tag=...` with `REVALIDATE_SECRET`
- `app/crm/cms/layout.tsx` — sub-nav with 8 tabs (Overview / Hero / Trusted / Projects / Testimonials / Services / Pricing / Media)
- `app/crm/cms/page.tsx` — overview cards
- `app/crm/cms/hero/page.tsx` — **fully working pilot** (counter, subtext, CTAs, trust line)
- `app/crm/cms/trusted/page.tsx` — full CRUD with logo upload
- `app/crm/cms/projects/page.tsx` — full CRUD with image upload
- `app/crm/cms/testimonials/page.tsx` — full CRUD for text/screenshot/video types
- `app/crm/cms/services/page.tsx` — full CRUD with features tag-input
- `app/crm/cms/pricing/page.tsx` — full CRUD (the global pricing system)
- `app/crm/cms/media/page.tsx` — media library viewer + delete
- `components/layout/Sidebar.tsx` — added "Website CMS" nav entry (admin-only) with Sparkles icon

### 3.4 Public site (frontend webkid) — `frontend webkid/src/`
- `lib/cms/types.ts` — type mirror

### 3.5 Hero v1 cosmetic upgrade (separate, already shipped earlier in the session)
- `sections/Hero.tsx` — cursor spotlight, magnetic CTAs, shimmer on "customers", animated metric counters, decorative floating preview cards. **Type-checks pass.** This is independent of the CMS work.

---

## 4. ❌ What is NOT done — remaining work

### 4.1 Public site — CMS reading layer (the critical gap)
Files **not yet written**:
- `frontend webkid/src/lib/cms/server.ts` — Supabase server client + cached fetchers using `unstable_cache` with tags
- `frontend webkid/src/lib/cms/hero.ts` — `getHeroSettings()`
- `frontend webkid/src/lib/cms/trusted.ts` — `getTrustedBusinesses()`
- `frontend webkid/src/lib/cms/projects.ts` — `getProjects({ featuredOnly })` (replaces `src/data/projects.ts`)
- `frontend webkid/src/lib/cms/testimonials.ts`
- `frontend webkid/src/lib/cms/services.ts`
- `frontend webkid/src/lib/cms/pricing.ts` + `formatPrice.ts`
- `frontend webkid/src/app/api/revalidate/route.ts` — accepts `?tag=` and `x-revalidate-secret` header, calls `revalidateTag()`

### 4.2 Public site — wire sections to read from DB
- `app/(website)/page.tsx` — make it async server component; fetch all CMS data; pass to `HomeClient` as props.
- `app/(website)/HomeClient.tsx` — accept props; pass each section its data.
- `sections/Hero.tsx` — accept `launches`, `subtext`, `ctaPrimary`, `ctaSecondary`, `trustLine` as props with current hardcoded values as fallbacks.
- `sections/Portfolio.tsx` — accept `projects` prop; remove import of `@/data/projects`.
- `sections/Testimonials.tsx` — accept `testimonials` prop; render 3 types (text/screenshot/video). Video lazy-load via IntersectionObserver.
- `sections/Services.tsx` — read from CMS; map `icon_name` → `lucide-react` icon dynamically.
- `data/projects.ts` — **delete after** Portfolio + `/projects` page are migrated.

### 4.3 New section: "Trusted by businesses across India"
- `frontend webkid/src/sections/TrustedBusinesses.tsx` — opposite-direction marquees, monochrome per design system. Empty-state: render nothing.
- Insert into `HomeClient.tsx` between `<Hero />` and `<Problem />`.

### 4.4 Pricing global wiring
- Wherever pricing currently appears (homepage teaser, `/pricing` page, `/contact` form) — replace with reads from `cms_pricing_plans`. Use `formatPrice(plan)` helper for consistent display rules from the plan doc §11.

### 4.5 Polish (non-blocking)
- Drag-reorder for list pages (currently uses numeric `display_order` input).
- Slug auto-generate on title change in projects/pricing.
- Better admin role gate on `/api/cms/cloudinary/delete` (currently best-effort; see comment in route).

---

## 5. 🔑 What Aryan must provide (ask him these in this order)

1. **Cloudinary account.** Cloud name, API key, API secret. (CRM env: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Both: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`. CRM browser: `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`.)
2. **Cloudinary unsigned upload preset** named `webkid_cms_unsigned`, scoped to folder `webkid/cms/`, allowed formats `jpg,png,webp,mp4,mov`, max sizes 10MB image / 100MB video.
3. **Run** `supabase/migrations/006_cms_schema.sql` in Supabase SQL Editor.
4. **Confirm his auth user has** `public.users.role = 'admin'` (RLS depends on it).
5. **Public site URL & secret:**
   - `PUBLIC_SITE_URL` (set in CRM env, e.g. `https://webkid.me` or netlify URL).
   - `REVALIDATE_SECRET` — same string in **both** repos' env.
6. **Answers to the 7 open questions** in `CMS_IMPLEMENTATION_PLAN.md` §14 (especially video length cap, avatar source policy, multi-admin scope).

Until items 1–3 are done, the CMS can't be exercised end-to-end, but the code can still be written.

---

## 6. Phase tracker (mirrors plan §13)

| Phase | Status |
|-------|--------|
| P0 Plan | ✅ |
| P1 Cloudinary provisioning | ⬜ Aryan |
| P2 Migration `006_cms_schema.sql` | ✅ written, ⬜ run by Aryan |
| P3 MediaUploader + Cloudinary helpers | ✅ |
| P4 CRM CMS layout + nav + overview | ✅ |
| P5 Hero settings page | ✅ |
| P6 **Public site reads Hero from DB** | ✅ |
| P7 Revalidate API (CRM done; public site missing) | ✅ |
| P8 Trusted businesses (admin done; public section missing) | ✅ |
| P9 Testimonials (admin done; public render upgrade missing) | 🟡 half |
| P10 Projects (admin done; public Portfolio + /projects missing) | ✅ |
| P11 Services (admin done; public read missing) | 🟡 half |
| P12 Pricing (admin done; global public wiring missing) | 🟡 half |
| P13 Media library | ✅ basic |
| P14 QA + delete `data/projects.ts` | ⬜ |

---

## 7. Supporting documents to read (in this order)

1. **`CMS_IMPLEMENTATION_PLAN.md`** (this folder) — architecture, schema, RLS rules, all design decisions, file map appendix.
2. **`webkid-design-system.md`** at `frontend webkid/webkid-design-system.md` — strict monochrome rules. **Do not introduce colors.** All CMS-driven sections must respect this.
3. **`AGENTS.md`** at `webkid-CRM/AGENTS.md` — warning that this Next.js may have breaking changes vs training data; consult `node_modules/next/dist/docs/` if unsure.
4. **`CLAUDE.md`** at `webkid-CRM/CLAUDE.md` — current Supabase schema reference for existing CRM tables (note: it does NOT show the new `cms_*` tables — those are in migration 006).
5. **Existing patterns** to mimic:
   - CRM page pattern: `webkid-CRM/src/app/crm/clients/page.tsx`
   - CRM auth/layout: `webkid-CRM/src/app/crm/layout.tsx` + `components/layout/AppLayout.tsx`
   - Public site entry: `frontend webkid/src/app/(website)/page.tsx` + `HomeClient.tsx`
   - Current hardcoded data being replaced: `frontend webkid/src/data/projects.ts`, `sections/Testimonials.tsx`, `sections/Services.tsx`

---

## 8. Architectural rules to NOT violate

- **Public site is monochrome.** No new colors. The single `#22c55e` dot is for "live" indicators only.
- **Admin writes are gated by RLS** via `public.is_admin()`. The CRM's existing `AuthProvider` already wraps `/crm/*` so users hitting CMS pages are authenticated; admin role is enforced by the database, not the UI.
- **Cloudinary uploads are direct from browser → Cloudinary.** The CRM server only signs deletes. Never proxy uploads through Next.
- **Public site reads use ISR + tag revalidation.** Default `revalidate = 60`. Use `unstable_cache` keyed per-resource with tags `cms:hero`, `cms:trusted`, `cms:projects`, `cms:testimonials`, `cms:services`, `cms:pricing`. The CRM already calls `revalidatePublic('cms:<tag>')` after each write.
- **Pricing is one table, consumed everywhere.** Don't reintroduce per-page hardcoded prices.
- **Mirror types, don't import across repos.** Public site's `lib/cms/types.ts` is a deliberate copy of CRM's; keep them in sync manually.

---

## 9. Final prompt — give this to the next AI agent verbatim

> You are continuing the WebKid CMS build. Aryan's previous session ran out of context. Read these in order before writing any code:
>
> 1. `webkid-CRM/context.md` (this file) — progress + your task list
> 2. `webkid-CRM/CMS_IMPLEMENTATION_PLAN.md` — authoritative spec
> 3. `frontend webkid/webkid-design-system.md` — strict monochrome design rules
> 4. `webkid-CRM/AGENTS.md` — Next.js version warnings
>
> **Working directory:** `d:/freelance projects/webkid/`. Two sub-repos: `webkid-CRM/` and `frontend webkid/`.
>
> **Your scope is exactly §4 of `context.md` — the public-site reading layer.** The admin (CRM) side is fully built. Do not touch CRM CMS pages unless you find a bug. Build in this order, committing each phase mentally as a logical unit:
>
> 1. **P6 / P7 public side: Hero read end-to-end.**
>    a. Create `frontend webkid/src/lib/cms/server.ts` — a server-only Supabase client using anon key (RLS handles read filtering) plus `unstable_cache` helper.
>    b. Create `frontend webkid/src/lib/cms/hero.ts` exporting `getHeroSettings()` returning `{ launches, subtext, ctaPrimary, ctaSecondary, trustLine }` with the exact fallback values currently hardcoded in `sections/Hero.tsx`.
>    c. Create `frontend webkid/src/app/api/revalidate/route.ts` accepting `POST` with `?tag=...` and validating header `x-revalidate-secret` against `process.env.REVALIDATE_SECRET`; call `revalidateTag(tag)`.
>    d. Convert `app/(website)/page.tsx` to an async server component that fetches `getHeroSettings()` and passes to `HomeClient`.
>    e. Convert `HomeClient.tsx` to accept props; pass to `<Hero />`.
>    f. Update `sections/Hero.tsx` to take props (with current hardcoded values as fallbacks). **Do not remove any of the visual upgrades** (cursor spotlight, magnetic CTAs, shimmer, counters, floating cards). Only the textual content becomes prop-driven.
>    g. Run `npx tsc --noEmit` in `frontend webkid/` and fix any errors.
>
> 2. **P8 Trusted Businesses public section.**
>    a. `lib/cms/trusted.ts` with `getTrustedBusinesses()`.
>    b. New `sections/TrustedBusinesses.tsx` — two opposite-direction marquees (reuse `.animate-marquee` from `globals.css`), monochrome, mask-edge fades, grayscale logos that color on hover, empty-state renders nothing.
>    c. Slot it into `HomeClient.tsx` between `<Hero />` and `<Problem />` (passes data from page.tsx).
>
> 3. **P10 Projects.** Replace `data/projects.ts` everywhere it's imported with `lib/cms/projects.ts` `getProjects({ featuredOnly })`. Files to update: `sections/Portfolio.tsx`, anywhere on `/projects` page that imports `data/projects.ts`. **Delete `data/projects.ts` only after** all imports are gone and tsc passes.
>
> 4. **P9 Testimonials.** Three render types: `text` keeps current marquee card; `screenshot` swaps text for `next/image` with click-to-lightbox; `video` shows poster + play overlay, plays inline with `<video preload="metadata" playsInline>`, lazy via `IntersectionObserver` so off-screen videos don't fetch.
>
> 5. **P11 Services.** Read from CMS. Map `icon_name` to `lucide-react` icons via a small lookup; default to a generic icon if missing.
>
> 6. **P12 Pricing — global.** Identify every place pricing currently shows on the public site (homepage teaser, `/pricing` page, `/contact` form prefill). Replace with reads from `cms_pricing_plans`. Build `lib/cms/formatPrice.ts` per plan doc §11 rules.
>
> 7. After all phases: `npx tsc --noEmit` clean, dev server runs, no console errors. Update §6 phase tracker in `context.md` as you go (flip ⬜ to ✅).
>
> **Constraints:**
> - Strict monochrome — see `webkid-design-system.md`.
> - No new dependencies unless unavoidable; use what's already in `package.json`.
> - All public-site fetchers must be server-side (RSC), wrapped in `unstable_cache` with appropriate tag, and have hardcoded fallbacks so the site doesn't break if Supabase is unreachable.
> - Don't run the migration yourself; Aryan does that. But ask him to confirm it's run before you test the live data path.
> - Don't push or deploy. Work locally; let Aryan verify in browser.
>
> **Before you start coding**, ask Aryan:
> 1. Has the migration `006_cms_schema.sql` been run in Supabase? (Required for Step 1g testing.)
> 2. Has Cloudinary been provisioned and env vars set in CRM `.env.local`? (Required for media uploads to work, but you can build read-side without this.)
> 3. Is `REVALIDATE_SECRET` set in **both** repos' env? (Required for live revalidation; if not, ISR fallback at 60s will still work.)
> 4. Public site URL? (Sets `PUBLIC_SITE_URL` in CRM env.)
>
> If any of those are missing, build everything anyway with hardcoded fallbacks so the site keeps working until env is configured.
>
> **When you're done with each phase**, briefly summarise what changed and ask Aryan to verify in browser before moving to the next.

---

## 10. Quick reference — env vars Aryan must set

**`webkid-CRM/.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=...           (already set)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      (already set)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=webkid_cms_unsigned
PUBLIC_SITE_URL=https://webkid.me
REVALIDATE_SECRET=<random-32-char-string>
```

**`frontend webkid/.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=...           (already set)
NEXT_PUBLIC_SUPABASE_ANON_KEY=...      (already set)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=     (same as CRM)
REVALIDATE_SECRET=<same value as CRM>
```

---

**End of handoff.** Aryan: paste §9 to the next agent. Next agent: do §4 in the order listed in §9.
