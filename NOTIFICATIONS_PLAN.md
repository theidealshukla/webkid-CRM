# Webkid CRM — Email Notifications Plan

> Action-triggered + scheduled email notifications. Self-contained spec with code snippets so it can be executed in phases without losing context.

---

## 1. Goals

| # | Trigger | Recipients | When |
|---|---|---|---|
| 1 | Lead created (manual) | All team members | Immediately |
| 2 | Batch uploaded (Excel) | All team members | Immediately, ONE digest email per batch (not per lead) |
| 3 | Lead status changed to `closed_won` / `closed_lost` | All team members | Immediately |
| 4 | Lead assigned to someone | The assignee + (optional) all admins | Immediately |
| 5 | Follow-up reminder created | The user who created it | Immediately (confirmation) |
| 6 | Follow-up reminder due tomorrow | The user it's assigned to + all admins | Cron, 1 day before at 08:00 local |
| 7 | Follow-up reminder due today | Same as above | Cron, morning of |

Each email is personalized with the recipient's name and uses a clean Webkid-branded template.

---

## 2. Tech choices

| Concern | Choice | Why |
|---|---|---|
| Email provider | **Resend** | Free tier 3K/mo + 100/day, React Email templates, simplest API, no domain setup needed for `onboarding@resend.dev` testing |
| Templates | **`@react-email/components`** | Compose templates as React, renders to mail-client-safe HTML, hot-reload preview |
| Action triggers | **Supabase Database Webhooks** → `/api/webhooks/supabase` | Fires even if user closes browser mid-action; single source of truth; can't be bypassed |
| Scheduled reminders | **GitHub Actions cron** → `/api/cron/reminders` | Already have GitHub Actions cron infra; pg_cron not on free tier |
| Dedup / audit | New `notification_log` table | Prevents re-sending the same reminder each cron tick |
| User prefs | New `notification_preferences` table (Phase 2) | Let users mute categories |

**Why Resend over SendGrid/Postmark**: Resend is purpose-built for transactional emails from app code. Free tier is enough for this app's scale (estimated < 500/mo). React Email components are first-class.

**Free tier math** (assuming 5 team members, 50 manual leads/mo, 4 batches/mo, 30 reminders/mo):
- Manual leads: 50 × 5 = 250 emails
- Batches: 4 × 5 = 20 emails (digest, not per-lead)
- Status changes: ~30 × 5 = 150 emails
- Reminders: 30 × 2 (tomorrow + today) × ~2 recipients = 120 emails
- **Total: ~540 emails/mo** — well under 3K free tier.

If you grow past 1K emails/day, switch to Resend Pro ($20/mo for 50K).

---

## 3. Architecture

```
┌──────────────┐                ┌─────────────────────┐
│  CRM client  │ ─ writes ───►  │  Supabase Postgres  │
└──────────────┘                └──────────┬──────────┘
                                           │
                           Database Webhook (INSERT/UPDATE)
                                           │
                                           ▼
                           ┌────────────────────────────┐
                           │ /api/webhooks/supabase     │
                           │ (Next.js route on Netlify) │
                           └─────────────┬──────────────┘
                                         │
                              Resend API (fan-out per recipient)
                                         │
                                         ▼
                                    📧 Inbox

┌──────────────┐  cron 08:00 UTC daily  ┌─────────────────────┐
│ GitHub       │ ─────────────────────► │ /api/cron/reminders │
│ Actions cron │                        │  → query due → send │
└──────────────┘                        └─────────────────────┘
```

---

## 4. Database changes

```sql
-- Track every notification we send (audit + dedup for cron)
CREATE TABLE IF NOT EXISTS public.notification_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient   text NOT NULL,                -- email address
  user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL,
  kind        text NOT NULL,                -- 'lead_created' | 'batch_uploaded' | 'reminder_tomorrow' | 'reminder_today' | ...
  entity_type text,                         -- 'lead' | 'activity' | 'batch'
  entity_id   uuid,
  resend_id   text,                         -- Resend message id for tracing
  status      text NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_log_dedup
  ON public.notification_log (kind, entity_id, recipient, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_created
  ON public.notification_log (created_at DESC);

-- Phase 2: user opt-out preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id          uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  lead_created     boolean NOT NULL DEFAULT true,
  batch_uploaded   boolean NOT NULL DEFAULT true,
  status_changed   boolean NOT NULL DEFAULT true,
  lead_assigned    boolean NOT NULL DEFAULT true,
  reminders        boolean NOT NULL DEFAULT true,
  updated_at       timestamptz NOT NULL DEFAULT now()
);
```

---

## 5. Env vars

Add to Netlify (Site settings → Environment variables) and `.env.local`:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx       # from resend.com → API Keys
EMAIL_FROM=Webkid CRM <crm@yourdomain.com>   # or onboarding@resend.dev for testing
APP_URL=https://your-netlify-url.netlify.app
NOTIFY_WEBHOOK_SECRET=<random 32+ chars>     # shared secret with Supabase webhook
CRON_SECRET=<random 32+ chars>               # shared secret with GitHub Actions cron
```

Generate secrets: `openssl rand -hex 32` (or any password manager).

---

## 6. Dependencies to add

```bash
npm install resend @react-email/components
npm install -D react-email   # optional: dev preview server
```

---

## 7. File layout

```
src/
  emails/                              # React Email templates
    _layout.tsx                        # Shared header/footer/logo
    LeadCreatedEmail.tsx
    BatchUploadedEmail.tsx
    StatusChangedEmail.tsx
    LeadAssignedEmail.tsx
    ReminderEmail.tsx
  lib/
    email.ts                           # Resend client + sendEmail() helper
    notifications.ts                   # Per-event "fan out to recipients" logic
  app/api/
    webhooks/supabase/route.ts         # Receives DB webhooks, calls notifications.ts
    cron/reminders/route.ts            # Hit by GitHub Actions; sends due reminders

supabase/migrations/
  003_notification_log.sql             # Tables from §4
.github/workflows/
  reminders-cron.yml                   # Hits /api/cron/reminders daily 08:00 UTC
```

---

## 8. Email template (sample)

`src/emails/_layout.tsx`:

```tsx
import {
  Html, Head, Body, Container, Section, Img, Text, Hr, Link,
} from "@react-email/components";

export function EmailLayout({
  preview,
  children,
}: {
  preview: string;
  children: React.ReactNode;
}) {
  const appUrl = process.env.APP_URL || "https://crm.webkid.in";
  return (
    <Html>
      <Head />
      <Body style={{
        background: "#f6f7fb",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        margin: 0,
        padding: 0,
      }}>
        <span style={{ display: "none" }}>{preview}</span>
        <Container style={{
          maxWidth: 560,
          margin: "32px auto",
          background: "#fff",
          borderRadius: 16,
          padding: 32,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}>
          <Section style={{ paddingBottom: 24 }}>
            <Img
              src={`${appUrl}/webkid.svg`}
              width="120"
              alt="Webkid"
              style={{ display: "block" }}
            />
          </Section>
          {children}
          <Hr style={{ borderColor: "#eef0f5", margin: "32px 0 16px" }} />
          <Text style={{ fontSize: 12, color: "#8b91a1", margin: 0 }}>
            You're receiving this because you're on the Webkid CRM team.{" "}
            <Link href={`${appUrl}/crm/settings`} style={{ color: "#4f46e5" }}>
              Manage notifications
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

`src/emails/LeadCreatedEmail.tsx`:

```tsx
import { Section, Text, Button } from "@react-email/components";
import { EmailLayout } from "./_layout";

export default function LeadCreatedEmail({
  recipientName, leadName, niche, addedBy, leadUrl,
}: {
  recipientName: string;
  leadName: string;
  niche?: string;
  addedBy: string;
  leadUrl: string;
}) {
  return (
    <EmailLayout preview={`New lead added: ${leadName}`}>
      <Text style={{ fontSize: 13, color: "#6b7280", margin: 0, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>
        New Lead
      </Text>
      <Text style={{ fontSize: 22, color: "#111827", fontWeight: 700, margin: "4px 0 16px", lineHeight: 1.3 }}>
        Hi {recipientName.split(" ")[0]}, a new lead just landed.
      </Text>
      <Text style={{ fontSize: 15, color: "#374151", margin: "0 0 24px", lineHeight: 1.6 }}>
        <strong>{addedBy}</strong> added <strong>{leadName}</strong>{niche ? ` (${niche})` : ""} to the CRM.
      </Text>
      <Section style={{ paddingBottom: 8 }}>
        <Button
          href={leadUrl}
          style={{
            background: "#4f46e5",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            textDecoration: "none",
          }}
        >
          Open lead →
        </Button>
      </Section>
    </EmailLayout>
  );
}
```

The other templates (`BatchUploadedEmail`, `ReminderEmail`, etc.) follow the same pattern. Reminder template uses an amber accent and shows the reminder content + due date prominently.

---

## 9. Send helper

`src/lib/email.ts`:

```ts
import { Resend } from "resend";
import { render } from "@react-email/components";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(opts: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) {
  const html = await render(opts.react);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: opts.to,
    subject: opts.subject,
    html,
  });
  return { id: data?.id, error };
}
```

`src/lib/notifications.ts` (sketch — full version per kind):

```ts
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "./email";
import LeadCreatedEmail from "@/emails/LeadCreatedEmail";

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function notifyLeadCreated(leadId: string, addedById: string | null) {
  const supabase = sb();
  const [{ data: lead }, { data: users }, { data: addedBy }] = await Promise.all([
    supabase.from("leads").select("id, business_name, niche").eq("id", leadId).single(),
    supabase.from("users").select("id, email, name"),
    addedById
      ? supabase.from("users").select("name").eq("id", addedById).single()
      : Promise.resolve({ data: { name: "Someone" } }),
  ]);
  if (!lead || !users) return;

  await Promise.all(users.map(async (u) => {
    // Dedup: skip if we already sent this exact notification recently
    const { data: dup } = await supabase
      .from("notification_log")
      .select("id")
      .eq("kind", "lead_created")
      .eq("entity_id", leadId)
      .eq("recipient", u.email)
      .limit(1)
      .single();
    if (dup) return;

    const { id, error } = await sendEmail({
      to: u.email,
      subject: `New lead: ${lead.business_name}`,
      react: LeadCreatedEmail({
        recipientName: u.name,
        leadName: lead.business_name,
        niche: lead.niche || undefined,
        addedBy: addedBy?.name || "Someone",
        leadUrl: `${process.env.APP_URL}/crm/leads/${lead.id}`,
      }),
    });

    await supabase.from("notification_log").insert({
      recipient: u.email,
      user_id: u.id,
      kind: "lead_created",
      entity_type: "lead",
      entity_id: leadId,
      resend_id: id || null,
      status: error ? "failed" : "sent",
      error: error?.message || null,
    });
  }));
}
```

Same shape for `notifyBatchUploaded`, `notifyStatusChanged`, `notifyLeadAssigned`, `notifyReminder`.

---

## 10. Webhook receiver

`src/app/api/webhooks/supabase/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import {
  notifyLeadCreated,
  notifyBatchUploaded,
  notifyStatusChanged,
  notifyLeadAssigned,
  notifyReminderSet,
} from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Auth: Supabase signs the webhook with a header you configure
  const secret = req.headers.get("x-webhook-secret");
  if (secret !== process.env.NOTIFY_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const { table, type, record, old_record } = payload;

  try {
    if (table === "leads" && type === "INSERT") {
      // Skip if it's part of a batch (batch upload sends digest instead)
      if (!record.batch_id) {
        await notifyLeadCreated(record.id, record.uploaded_by);
      }
    }
    if (table === "upload_batches" && type === "INSERT") {
      await notifyBatchUploaded(record.id);
    }
    if (table === "leads" && type === "UPDATE") {
      if (record.status !== old_record.status &&
          (record.status === "closed_won" || record.status === "closed_lost")) {
        await notifyStatusChanged(record.id, record.status);
      }
      if (record.assigned_to !== old_record.assigned_to && record.assigned_to) {
        await notifyLeadAssigned(record.id, record.assigned_to);
      }
    }
    if (table === "activities" && type === "INSERT" && record.reminder_date) {
      await notifyReminderSet(record.id);
    }
  } catch (e) {
    console.error("Webhook processing error:", e);
    // Return 200 anyway — don't make Supabase retry forever
  }

  return NextResponse.json({ ok: true });
}
```

**Configure in Supabase**:
1. Dashboard → Database → Webhooks → Create a new hook
2. Table: `leads` → Events: INSERT, UPDATE → Type: HTTP Request
3. URL: `https://your-site/api/webhooks/supabase`
4. HTTP Headers: `x-webhook-secret: <NOTIFY_WEBHOOK_SECRET value>`
5. Repeat for `upload_batches` (INSERT) and `activities` (INSERT).

---

## 11. Reminders cron

`src/app/api/cron/reminders/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendEmail } from "@/lib/email";
import ReminderEmail from "@/emails/ReminderEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setUTCHours(0,0,0,0);
  const startOfTomorrow = new Date(startOfToday); startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate()+1);
  const startOfDayAfter = new Date(startOfToday); startOfDayAfter.setUTCDate(startOfDayAfter.getUTCDate()+2);

  // Due TOMORROW (warn 1 day before)
  const { data: tomorrow } = await supabase
    .from("activities")
    .select("id, lead_id, content, reminder_date, user_id, leads(business_name, assigned_to)")
    .gte("reminder_date", startOfTomorrow.toISOString())
    .lt("reminder_date", startOfDayAfter.toISOString());

  // Due TODAY
  const { data: today } = await supabase
    .from("activities")
    .select("id, lead_id, content, reminder_date, user_id, leads(business_name, assigned_to)")
    .gte("reminder_date", startOfToday.toISOString())
    .lt("reminder_date", startOfTomorrow.toISOString());

  let sent = 0;
  for (const r of tomorrow || []) sent += await sendReminder(r, "tomorrow", supabase);
  for (const r of today    || []) sent += await sendReminder(r, "today",    supabase);

  return NextResponse.json({ ok: true, sent });
}

async function sendReminder(activity: any, when: "today" | "tomorrow", supabase: any) {
  const kind = when === "today" ? "reminder_today" : "reminder_tomorrow";

  // Recipients: assignee of the lead + all admins
  const lead = activity.leads;
  const recipientIds = new Set<string>();
  if (lead?.assigned_to) recipientIds.add(lead.assigned_to);
  const { data: admins } = await supabase.from("users").select("id").eq("role", "admin");
  admins?.forEach((a: any) => recipientIds.add(a.id));

  const { data: users } = await supabase
    .from("users")
    .select("id, email, name")
    .in("id", Array.from(recipientIds));

  let count = 0;
  for (const u of users || []) {
    // Dedup: have we already sent THIS kind for THIS activity?
    const { data: dup } = await supabase
      .from("notification_log")
      .select("id")
      .eq("kind", kind)
      .eq("entity_id", activity.id)
      .eq("recipient", u.email)
      .limit(1)
      .single();
    if (dup) continue;

    const { id, error } = await sendEmail({
      to: u.email,
      subject: when === "today"
        ? `Follow up today: ${lead?.business_name || "Lead"}`
        : `Reminder tomorrow: ${lead?.business_name || "Lead"}`,
      react: ReminderEmail({
        recipientName: u.name,
        leadName: lead?.business_name || "Lead",
        note: activity.content,
        dueDate: activity.reminder_date,
        when,
        leadUrl: `${process.env.APP_URL}/crm/leads/${activity.lead_id}`,
      }),
    });

    await supabase.from("notification_log").insert({
      recipient: u.email,
      user_id: u.id,
      kind,
      entity_type: "activity",
      entity_id: activity.id,
      resend_id: id || null,
      status: error ? "failed" : "sent",
      error: error?.message || null,
    });
    if (!error) count++;
  }
  return count;
}
```

`.github/workflows/reminders-cron.yml`:

```yaml
name: Send due reminders

on:
  schedule:
    - cron: "0 8 * * *"     # daily at 08:00 UTC (~ 13:30 IST)
  workflow_dispatch:

jobs:
  run:
    runs-on: ubuntu-latest
    env:
      REMINDER_URL: ${{ secrets.REMINDER_URL }}
      CRON_SECRET: ${{ secrets.CRON_SECRET }}
    steps:
      - name: Hit reminder endpoint
        run: |
          set -e
          curl -fsSL "$REMINDER_URL" -H "x-cron-secret: $CRON_SECRET"
          echo
```

GitHub repo secrets to add:
- `REMINDER_URL` = `https://your-site/api/cron/reminders`
- `CRON_SECRET` = same value as the env var on Netlify

---

## 12. Phased rollout

### Phase 1 — Foundation (1 session)
1. SQL migration `003_notification_log.sql`
2. Resend account + add env vars (`RESEND_API_KEY`, `EMAIL_FROM`, `APP_URL`, `NOTIFY_WEBHOOK_SECRET`, `CRON_SECRET`)
3. `npm install resend @react-email/components`
4. `_layout.tsx` template + `lib/email.ts` helper
5. Single test endpoint `/api/test-email` → verify a real email arrives

### Phase 2 — Action-triggered emails (1 session)
6. `LeadCreatedEmail`, `BatchUploadedEmail`, `StatusChangedEmail`, `LeadAssignedEmail`
7. `lib/notifications.ts` with one fn per kind
8. `/api/webhooks/supabase` route
9. Configure Supabase database webhooks (3 of them: leads, upload_batches, activities)
10. Test by adding a lead → confirm all team members receive email

### Phase 3 — Reminders (1 session)
11. `ReminderEmail` template
12. `/api/cron/reminders` endpoint
13. `.github/workflows/reminders-cron.yml` + repo secrets
14. Manually trigger workflow → confirm email lands
15. Add a reminder confirmation email when reminder is created (already covered by webhook on `activities` INSERT)

### Phase 4 — Polish (later)
- `notification_preferences` table + UI in /crm/settings to toggle per category
- Unsubscribe link with signed token
- Digest mode for high-volume admins (1 daily summary instead of N alerts)
- Use a custom domain for `EMAIL_FROM` (better deliverability) — needs DNS records

---

## 13. Why webhooks (not in-app calls after each mutation)

Considered: have `addLead`/`uploadExcelLeads`/etc. call `fetch('/api/notify')` after mutating.

Rejected because:
- Easy to forget when adding new mutation paths
- Doesn't fire if user closes tab mid-mutation
- Couples client code to notification logic

Webhooks fire on the actual DB change, can't be bypassed, work even if mutations are added by tools outside the app (SQL editor, future scripts).

---

## 14. Safety / cost guardrails

- **Dedup**: every send checks `notification_log` first. Critical for the daily cron — without it, the same reminder ships every day until the date passes.
- **Bulk uploads**: webhook on `leads` INSERT skips rows with `batch_id` (the batch INSERT handles them). Prevents 500 emails per Excel upload.
- **Failure isolation**: webhook returns 200 even on internal errors so Supabase doesn't infinite-retry. Errors logged to `notification_log.status='failed'` for inspection.
- **Test mode**: while developing, set `EMAIL_FROM=onboarding@resend.dev` and override recipients to your own email in `lib/email.ts` based on `process.env.EMAIL_TEST_OVERRIDE`.

---

## 15. Open questions before building

1. **"All of them" = all team members?** Or only admins? Or only the lead's assignee + admins?
2. **Custom domain for sender?** Without it, emails come from `onboarding@resend.dev` and may land in spam. Recommend buying/using a domain (e.g. `crm@webkid.in`) — needs SPF/DKIM DNS records (Resend gives copy-paste values).
3. **Timezone**: cron runs at 08:00 UTC = 13:30 IST. Want a different time?
4. **Reminder granularity**: 1 day before + same day. Want also "1 hour before"?
5. **In-app notifications too** (bell icon)? Out of scope here but trivial to add — just write to a `in_app_notifications` table on the same triggers.

---

*Generated 2026-05-07.*
