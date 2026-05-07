# Webkid CRM — Improvement & Fix Plan

> Comprehensive list of all issues found in the audit and the exact code/SQL to fix them. Self-contained so it can be executed manually if needed.

---

## TL;DR — Priority Order

1. **CRITICAL SECURITY**: `/api/admin/create-user` has no auth check — anyone on the internet can create admin users. **Fix first.**
2. **BUG**: `UserManagement` uses client-side `supabase.auth.signUp()` which logs the admin out and signs in as the new user. Switch to the (now-secured) API route.
3. **PERF**: `CRMContext.loadData` does O(N×M) scan computing `lastActivity`. Replace with a single Map.
4. **PERF**: Fetches all `activity_logs` (could be huge). Cap to recent 200.
5. **DB**: Missing `is_archived` column + missing indexes on FK columns. Run migration.
6. **KEEP-ALIVE**: Add `/api/health` route + GitHub Actions cron to ping Supabase every 3 days.
7. **NICE-TO-HAVE**: Bundle audit, accessibility pass, etc.

---

## 1. CRITICAL — Lock down `/api/admin/create-user`

**File**: `src/app/api/admin/create-user/route.ts`

**Problem**: No authentication check. Any unauthenticated POST can create users (including admins). The route uses the service-role key, so it bypasses RLS.

**Replace the entire file with**:

```ts
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(
  request: NextRequest,
  adminClient: NonNullable<ReturnType<typeof getAdminSupabase>>
) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: "Unauthorized", status: 401 as const };

  const { data: userRes, error: userErr } = await adminClient.auth.getUser(token);
  if (userErr || !userRes?.user) return { error: "Invalid session", status: 401 as const };

  const { data: profile, error: profErr } = await adminClient
    .from("users")
    .select("role")
    .eq("id", userRes.user.id)
    .single();
  if (profErr || !profile) return { error: "Profile not found", status: 403 as const };
  if (profile.role !== "admin") return { error: "Admin role required", status: 403 as const };

  return { userId: userRes.user.id };
}

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = getAdminSupabase();
    if (!adminSupabase) {
      return NextResponse.json(
        { error: "Server is not configured with SUPABASE_SERVICE_ROLE_KEY." },
        { status: 503 }
      );
    }

    const auth = await requireAdmin(request, adminSupabase);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = body.role === "admin" ? "admin" : "member";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name || email.split("@")[0] },
    });

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    if (!authData.user) return NextResponse.json({ error: "Failed to create auth user." }, { status: 500 });

    const profileRow = {
      id: authData.user.id,
      email,
      name: name || email.split("@")[0],
      role,
    };

    const { error: profileError } = await adminSupabase.from("users").insert([profileRow]);

    if (profileError) {
      if (profileError.code === "23505") {
        await adminSupabase
          .from("users")
          .update({ role, name: profileRow.name })
          .eq("id", authData.user.id);
      } else {
        return NextResponse.json(
          { error: `Auth user created but profile failed: ${profileError.message}`, userId: authData.user.id },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: `User "${profileRow.name}" created as ${role}.`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("Create user API error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Why this matters**: Without the auth check, anyone running `curl -X POST https://yourapp/api/admin/create-user -d '{"email":"a@b.com","password":"x"}'` becomes an admin.

---

## 2. CRITICAL — Switch UserManagement to the API route

**File**: `src/components/settings/UserManagement.tsx`

**Problem**: Lines 134–164 call `supabase.auth.signUp(...)` from the browser, which signs the new user in and **logs the current admin out**. It also can't change other users' passwords.

**Fix `handleAddUser`** — replace the body with:

```ts
const handleAddUser = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!newEmail || !newPassword) return;
  setAddingUser(true);
  setAddStatus(null);

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setAddStatus({ type: "error", text: "Not signed in." });
      return;
    }

    const res = await fetch("/api/admin/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        name: newName,
        role: newRole,
      }),
    });

    const json = await res.json();
    if (!res.ok) {
      setAddStatus({ type: "error", text: json.error || "Failed to create user." });
      return;
    }

    setAddStatus({ type: "success", text: json.message });
    setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("member");
    setShowNewPassword(false);
    fetchUsers();
    setTimeout(() => { setShowAddForm(false); setAddStatus(null); }, 2000);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected error.";
    setAddStatus({ type: "error", text: msg });
  } finally {
    setAddingUser(false);
  }
};
```

**Optional follow-up**: Add a similar `/api/admin/update-user` route for password resets (today the UI shows a "can't reset other users' passwords" warning — fixable via service role).

---

## 3. PERF — Fix O(N×M) `lastActivity` computation in CRMContext

**File**: `src/context/CRMContext.tsx` lines ~97–114

**Problem**: For every lead, the code filters the entire activities array. With 5K leads × 20K activities, that's 100M comparisons every load.

**Replace the leads mapping block** with:

```ts
// Build lead_id → latest activity timestamp once (O(N))
const latestActivityByLead = new Map<string, string>();
(activitiesRes.data as ActivityRow[]).forEach((a) => {
  // activities are sorted DESC, so the FIRST one we see is the latest
  if (!latestActivityByLead.has(a.lead_id)) {
    latestActivityByLead.set(a.lead_id, a.created_at);
  }
});

const mappedLeads = (leadsRes.data as LeadRow[]).map((r) => {
  const lead = mapLeadRow(r, namesMap);
  const latest = latestActivityByLead.get(r.id) ?? r.created_at;
  lead.lastActivity = formatTimeAgo(latest);
  const rawRow = r as unknown as Record<string, unknown>;
  lead.isArchived = rawRow.is_archived === true;
  return lead;
});
```

---

## 4. PERF — Cap `activity_logs` fetch

**File**: `src/context/CRMContext.tsx` line ~88

**Problem**: `select("*")` fetches the entire activity_logs table forever. After a few months this is the slowest query in the app.

**Change**:

```ts
// Before
supabase.from("activity_logs").select("*").order("created_at", { ascending: false })

// After
supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200)
```

Apply similarly to `activities` if/when it grows large; for now, keep full fetch since the dashboard derives stats from it.

---

## 5. DB — Add missing column + indexes

**Run in Supabase SQL Editor**:

```sql
-- 1. Add archive flag (CRMContext already references it)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;

-- 2. Indexes for common query patterns
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

-- 3. Cascade deletes so deleting a lead cleans up activities automatically
ALTER TABLE public.activities
  DROP CONSTRAINT IF EXISTS activities_lead_id_fkey,
  ADD CONSTRAINT activities_lead_id_fkey
    FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE;

-- 4. Updated-at trigger (so updatedAt actually updates)
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
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

---

## 6. RLS — Recommended policies

**Run in Supabase SQL Editor** (audit existing policies first; only add what's missing):

```sql
-- Helper: returns true if the calling JWT belongs to an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- LEADS: any authed user reads/writes; only admin can delete
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS leads_read   ON public.leads;
DROP POLICY IF EXISTS leads_write  ON public.leads;
DROP POLICY IF EXISTS leads_update ON public.leads;
DROP POLICY IF EXISTS leads_delete ON public.leads;
CREATE POLICY leads_read   ON public.leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY leads_write  ON public.leads FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY leads_update ON public.leads FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY leads_delete ON public.leads FOR DELETE USING (public.is_admin());

-- Same pattern for activities, activity_logs, upload_batches
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activities_all ON public.activities;
CREATE POLICY activities_all ON public.activities FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS activity_logs_all ON public.activity_logs;
CREATE POLICY activity_logs_all ON public.activity_logs FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.upload_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS batches_all ON public.upload_batches;
CREATE POLICY batches_all ON public.upload_batches FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- USERS: anyone authenticated can read; only admin can insert/update/delete
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_read   ON public.users;
DROP POLICY IF EXISTS users_admin  ON public.users;
CREATE POLICY users_read  ON public.users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY users_admin ON public.users FOR ALL    USING (public.is_admin()) WITH CHECK (public.is_admin());

-- WEBSITE_LEADS: public can INSERT (form), only authed can read/update
ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS web_leads_insert ON public.website_leads;
DROP POLICY IF EXISTS web_leads_read   ON public.website_leads;
DROP POLICY IF EXISTS web_leads_update ON public.website_leads;
CREATE POLICY web_leads_insert ON public.website_leads FOR INSERT WITH CHECK (true);
CREATE POLICY web_leads_read   ON public.website_leads FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY web_leads_update ON public.website_leads FOR UPDATE USING (auth.role() = 'authenticated');
```

---

## 7. SUPABASE KEEP-ALIVE — Health endpoint + GitHub Actions cron

### 7a. Add `/api/health` route

**Create file**: `src/app/api/health/route.ts`

```ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, reason: "missing-env" }, { status: 503 });
  }

  const client = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Cheap query that touches the DB so Supabase counts as activity
  const { error } = await client
    .from("users")
    .select("id", { count: "exact", head: true })
    .limit(1);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
```

### 7b. GitHub Actions workflow

**Create file**: `.github/workflows/supabase-keepalive.yml`

```yaml
name: Supabase Keep-Alive

on:
  schedule:
    # Every 3 days at 06:00 UTC (well under Supabase's 7-day inactivity window)
    - cron: "0 6 */3 * *"
  workflow_dispatch:

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Ping health endpoint
        run: |
          set -e
          URL="${{ secrets.HEALTH_URL }}"
          if [ -z "$URL" ]; then
            echo "HEALTH_URL secret is not set"; exit 1
          fi
          response=$(curl -s -o /tmp/body -w "%{http_code}" "$URL")
          echo "HTTP $response"
          cat /tmp/body
          test "$response" = "200"
```

**Setup steps**:
1. Deploy app first so `/api/health` is reachable.
2. In GitHub repo: Settings → Secrets and variables → Actions → New secret
   - Name: `HEALTH_URL`
   - Value: `https://yourdomain.com/api/health`
3. Run the workflow once manually to verify (Actions tab → Supabase Keep-Alive → Run workflow).

**Why GitHub Actions over Supabase pg_cron**: pg_cron is not available on Supabase free tier. GitHub Actions is free, version-controlled, and doesn't need a third-party service.

**Alternative if you don't have a deployed URL yet**: Use a direct Supabase REST call in the workflow:

```yaml
      - name: Ping Supabase REST
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
        run: |
          curl -fsSL "$SUPABASE_URL/rest/v1/users?select=id&limit=1" \
            -H "apikey: $SUPABASE_KEY" \
            -H "Authorization: Bearer $SUPABASE_KEY"
```

---

## 8. Misc cleanups

### 8a. Delete stale `ts_errors.txt`
The file references files that no longer exist (`analytics/page.tsx`, `archived/page.tsx`). Misleading. Delete it.

```bash
rm "ts_errors.txt"
```

### 8b. `addLead` assignedTo handling
**File**: `src/context/CRMContext.tsx` line ~195

Current:
```ts
assigned_to: lead.assignedTo ? nameToIdMap.get(lead.assignedTo) || lead.assignedTo || null : null,
```
The type comment says `assignedTo` is a UUID, but this code treats it as a name. The modal sends `null` so it's not wrong today, but inconsistent. Recommended: `assigned_to: lead.assignedTo || null` and have the modal send a UUID.

### 8c. `deleteBatch` stale closure
**File**: `src/context/CRMContext.tsx` line ~459

`leads.filter(...)` reads the closed-over `leads` array. With React 19 + the existing rules-of-hooks deps, this works, but is fragile. Replace by computing leadIds via the most recent state — easier: use `setLeads(prev => { const ids = prev.filter(...).map(...); /* fire side-effect with ids */; return prev.filter(l => l.batchId !== batchId); })` OR move the activity delete to the SQL side via the cascade in §5.

After adding the cascade FK, you can simplify `deleteBatch` to just delete the batch row and rely on cascade.

### 8d. `archiveBatch` doesn't clear `setBatches`
After archiving all leads in a batch, the batch card still shows. Either also remove the batch (`setBatches(prev => prev.filter(b => b.id !== batchId))`) or skip — depends on desired UX.

### 8e. `lastActivity` is a frozen string
It's computed once at load and never updates as time passes ("2m ago" stays "2m ago" for hours). Acceptable, but if you want live freshness, store the raw ISO string and call `formatTimeAgo` at render time.

### 8f. `formatTimeAgo` SSR mismatch
Will produce different output on server vs client if SSR'd. Today everything is `"use client"` so safe — keep it that way.

### 8g. localStorage avatar (`useAvatar`, settings page)
Avatars stored in localStorage don't sync across devices. Move to Supabase Storage when you have time.

### 8h. Image tag without optimization
`src/app/crm/layout.tsx` and other places use `<img src=...>` instead of `next/image`. Use `<Image>` for logo/avatars to get auto-optimization.

---

## 9. FEATURE GAPS — "Pro CRM" wishlist

Tier 1 (high value, low effort):
- **Bulk actions** on leads table (select N rows → assign / change status / delete / export selection)
- **Column visibility** toggle on leads table (user picks which columns to show)
- **Saved filters** (persist filter combos per user in localStorage or a `saved_views` table)
- **Toast on copy** for phone/email click-to-copy
- **Keyboard shortcut**: `/` to focus search, `n` for new lead, `?` for shortcut help
- **Empty state CTAs** that actually do something (e.g. "Upload your first batch")
- **Lead deduplication** check on import: warn if `phone` matches existing lead
- **Notes timeline** on lead detail page (already exists via activities; verify it's pretty)

Tier 2 (medium effort):
- **Reminders / notifications** for follow-ups due today (browser notification or in-app bell)
- **Dashboard charts** — use Recharts or visx to render the existing `statusChartData`/`assigneeData` (you only show numbers today)
- **Activity log filtering** by user / entity type / date range
- **Audit trail viewer** for individual leads
- **Soft-delete & restore** (you already have `is_archived` for leads; extend to batches)
- **CSV import** (in addition to Excel)
- **Public form embed** for `website_leads` with rate limiting + reCAPTCHA
- **Per-user role-based UI hiding** (already present; audit completeness)
- **Dark mode polish** — `ThemeContext.tsx` exists; verify all components honor it

Tier 3 (larger projects):
- **Server-side pagination/search** for `leads` table (currently client-side; will choke past ~5K rows)
- **Real-time updates** via Supabase channels (when another user changes a lead, it appears live)
- **Email/SMS integration** (send follow-up via Resend / Twilio, log as activity)
- **Webhook receiver** for incoming leads from other sources
- **Reporting & exports** — weekly digest emails, monthly PDF reports
- **Search-as-you-type** on the server (Postgres `pg_trgm` or `tsvector`)
- **Two-factor auth** for admins
- **Audit log immutability** (insert-only RLS policy, no update/delete from client)

---

## 10. UX / RESPONSIVENESS — Quick wins

- Login page: add "Forgot password?" link (you already use Supabase auth — `supabase.auth.resetPasswordForEmail`)
- Loading skeletons exist in some places but not all (e.g. website-leads shows plain text "Loading…")
- Mobile: `LeadsPage` switches to `MobileLeadCard` ✅ — but other tables (website-leads, activity-log) don't. Add a mobile-friendly fallback.
- Confirm dialogs use native `confirm()` in places (e.g. delete batch). Replace with the existing Radix `Dialog` for consistency.
- Add `aria-label`s to icon-only buttons (delete trash, mark-read circle, sidebar collapse).
- `<Toaster />` position — verify it doesn't overlap the topbar on mobile.

---

## 11. PERF — Other observations

- **Bundle**: `xlsx` and `exceljs` are both 1MB+. Both are already lazy-loaded ✅. Consider keeping only one (recommend keeping `exceljs` — better API, drop `xlsx` from `package.json`).
- **`lucide-react` v1.6**: very old. Upgrade to latest for tree-shaking improvements (`npm i lucide-react@latest`).
- **`useEffect` in `AppLayout` keyed on `children`**: causes the mobile sidebar to close on every re-render of children, not just route changes. Use `usePathname()` instead:
  ```ts
  const pathname = usePathname();
  useEffect(() => { setSidebarOpen(false); }, [pathname]);
  ```
- **AuthContext**: 5-second timeout fallback that grants admin role to keep UX alive (line ~62) is dangerous. If Supabase is briefly slow you give the user admin in localStorage. Recommend removing the role fallback and showing an error UI instead. At minimum, fall back to `"member"` not `"admin"`.
- **CRMContext**: every `loadData` re-runs on `isAuthenticated`/`user` change. Wrap user dependency to `user?.id` only.

---

## 12. ENV VARS — `.env.local`

Make sure these are set both locally and in deployment (Netlify):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-only, NEVER prefix with NEXT_PUBLIC_
```

The service role key must be added to Netlify env (Site settings → Environment variables). It's required for `/api/admin/create-user` and `/api/health` (optional for health, falls back to anon).

---

## 13. EXECUTION CHECKLIST

- [ ] §1 — Replace `src/app/api/admin/create-user/route.ts` with secured version
- [ ] §2 — Update `src/components/settings/UserManagement.tsx` `handleAddUser` to call API
- [ ] §3 — Fix `lastActivity` O(N×M) in `src/context/CRMContext.tsx`
- [ ] §4 — Add `.limit(200)` to activity_logs fetch in `CRMContext`
- [ ] §5 — Run SQL migrations in Supabase SQL Editor
- [ ] §6 — Audit/apply RLS policies in Supabase SQL Editor
- [ ] §7a — Create `src/app/api/health/route.ts`
- [ ] §7b — Create `.github/workflows/supabase-keepalive.yml` + add `HEALTH_URL` secret
- [ ] §8a — `rm ts_errors.txt`
- [ ] §8b–8h — Apply at your discretion
- [ ] §11 — Fix `AppLayout` pathname dep, AuthContext role fallback
- [ ] §12 — Verify env vars in Netlify
- [ ] Final: `npx tsc --noEmit` and `npm run build` — should be clean

---

*Generated 2026-05-07.*
