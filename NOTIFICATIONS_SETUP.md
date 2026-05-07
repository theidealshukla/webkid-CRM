# Webkid CRM — Notifications Setup Guide

Step-by-step manual setup. Code is already in place — these are the actions only you can do (Gmail, Netlify, Supabase, GitHub Settings).

---

## Step 1 — Generate a Gmail App Password

App Passwords replace your actual Gmail password for SMTP. Required because Google blocks regular-password SMTP login.

1. Make sure 2-Step Verification is enabled on your Google account: https://myaccount.google.com/security
2. Open https://myaccount.google.com/apppasswords
3. App name: `Webkid CRM` → click **Create**
4. Copy the 16-character code (spaces don't matter — they get stripped). You won't see it again.
5. Save it somewhere — you'll paste it into Netlify next.

**Daily limit reminder**: free Gmail caps at ~500 emails/day. Workspace accounts get 2,000/day. If you outgrow this, swap to Resend/SES later (only `lib/email.ts` would change).

---

## Step 2 — Generate two random secrets

These are shared secrets between Netlify and (a) Supabase webhooks, (b) GitHub Actions cron.

In any terminal:
```bash
openssl rand -hex 32
openssl rand -hex 32
```
Or use any password manager. Just two long random strings.

Call them `WEBHOOK_SECRET_VALUE` and `CRON_SECRET_VALUE` for now.

---

## Step 3 — Add env vars to Netlify

Netlify dashboard → your site → **Site configuration → Environment variables → Add a variable**:

| Key | Value |
|---|---|
| `GMAIL_USER` | your Gmail address (e.g. `you@gmail.com`) |
| `GMAIL_APP_PASSWORD` | the 16-char app password from Step 1 |
| `EMAIL_FROM` | `Webkid CRM <you@gmail.com>` (use the same Gmail address) |
| `APP_URL` | `https://your-site.netlify.app` (no trailing slash) |
| `NOTIFY_WEBHOOK_SECRET` | `WEBHOOK_SECRET_VALUE` from Step 2 |
| `CRON_SECRET` | `CRON_SECRET_VALUE` from Step 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | from Supabase → Project Settings → API → "service_role" key (you may already have this) |

Trigger a redeploy: **Deploys → Trigger deploy → Deploy site**.

---

## Step 4 — Run the SQL migration

Supabase dashboard → **SQL Editor → New query** → paste the contents of `supabase/migrations/003_notification_log.sql` → **Run**.

Verify: **Database → Tables → notification_log** should now exist.

---

## Step 5 — Smoke test the email pipeline

After redeploy completes:

1. Sign in to your CRM as an admin.
2. Open the browser DevTools **Console** and paste:
   ```js
   const { data: { session } } = await window.supabase?.auth?.getSession() ?? { data: {} };
   await fetch("/api/test-email", {
     method: "POST",
     headers: {
       "Content-Type": "application/json",
       Authorization: `Bearer ${session.access_token}`,
     },
     body: JSON.stringify({}),
   }).then(r => r.json());
   ```
   *(If `window.supabase` isn't exposed, use the network tab to grab your access token from any Supabase request and paste it manually.)*

   **Easier alternative** — use curl with your access token (copy from DevTools → Application → Local Storage → `sb-...-auth-token`):
   ```bash
   curl -X POST https://your-site.netlify.app/api/test-email \
     -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```

3. Expected response: `{"ok": true, "sentTo": "you@gmail.com", "messageId": "..."}`
4. Check your inbox — you should receive the **Webkid CRM · Email pipeline test** email within seconds.

If it lands in spam, mark "Not spam" — Gmail-from-Gmail usually delivers cleanly to other addresses but may shuffle to your own inbox folders.

---

## Step 6 — Configure Supabase database webhooks

Supabase dashboard → **Database → Webhooks → Create a new hook**.

Create **3 webhooks** with these settings — `URL` and `HTTP Headers` are the same for all three:

**Common settings**
- Name: (one of `notify-leads`, `notify-batches`, `notify-activities`)
- Type: **HTTP Request**
- HTTP method: `POST`
- URL: `https://your-site.netlify.app/api/webhooks/supabase`
- HTTP Headers (click **Add header**):
  - Key: `x-webhook-secret`
  - Value: `WEBHOOK_SECRET_VALUE` from Step 2 (must match Netlify env var exactly)

**Webhook 1 — leads**
- Table: `leads`
- Events: ✅ Insert, ✅ Update

**Webhook 2 — upload_batches**
- Table: `upload_batches`
- Events: ✅ Insert

**Webhook 3 — activities**
- Table: `activities`
- Events: ✅ Insert

Save each one.

**Test**: open your CRM, manually add a single lead. Within ~5 seconds every team member should receive a "New Lead" email. Also check Supabase **Database → Webhooks → notify-leads → Logs** to confirm a 200 response.

---

## Step 7 — GitHub Actions cron for reminders

The workflow file `.github/workflows/reminders-cron.yml` already exists in your repo.

GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**. Add **two**:

| Secret name | Value |
|---|---|
| `REMINDER_URL` | `https://your-site.netlify.app/api/cron/reminders` |
| `CRON_SECRET` | `CRON_SECRET_VALUE` from Step 2 (must match Netlify env var exactly) |

**Test it once manually**:
1. https://github.com/theidealshukla/webkid-CRM/actions/workflows/reminders-cron.yml
2. Top-right → **Run workflow** → green button.
3. Wait ~10 seconds → green check = working. Click in to see the response counts.

After the manual run succeeds, it auto-fires daily at **02:30 UTC (= 08:00 IST)**. Edit the `cron:` line in the workflow file to change.

---

## Step 8 — End-to-end verification checklist

- [ ] **Test email**: Step 5 worked → email arrived
- [ ] **Manual lead add**: in CRM, add 1 lead manually → all team members receive "New lead" email
- [ ] **Excel upload**: upload a small batch → all team members receive ONE "Batch uploaded" digest email (not N per-lead emails)
- [ ] **Status change**: move a lead to "Closed Won" → all team members receive a celebratory email
- [ ] **Lead assigned**: assign a lead to someone → that person receives an "Assigned to you" email
- [ ] **Reminder set**: add a follow-up activity with a reminder date → all team receive "Reminder set" email
- [ ] **Reminders cron**: set a reminder for tomorrow, manually run the GitHub workflow → assignee + admins receive "Due tomorrow" email
- [ ] **Reminders cron, today**: set a reminder for today (any time today), manually run → "Due today" email
- [ ] **Dedup**: re-run the workflow immediately → response shows `sent: 0, skipped: N` (notification_log dedup is working)

---

## Notification matrix (who gets what)

| Event | Recipients |
|---|---|
| Lead created (manual) | All team members |
| Excel batch uploaded | All team members (one digest, not per-lead) |
| Lead status → Closed Won | All team members |
| Lead status → Closed Lost | All team members |
| Lead assigned | The assignee only |
| Reminder set on activity | All team members |
| Reminder due tomorrow | Lead's assignee + all admins (falls back to all team if no assignee) |
| Reminder due today | Same as tomorrow |

To change this, edit `src/lib/notifications.ts` — each `notify*` function chooses its recipient set.

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| Test email returns `Server not configured` | One of the env vars on Netlify is missing or you didn't redeploy after adding them |
| Test email returns `Unauthorized` | Bearer token expired or you're not signed in as admin |
| `Invalid login: 535-5.7.8 Username and Password not accepted` | App password is wrong, or 2-Step Verification isn't enabled on Gmail. Regenerate the app password |
| Webhook test in Supabase logs shows 401 | `x-webhook-secret` header value doesn't match `NOTIFY_WEBHOOK_SECRET` on Netlify (whitespace? trailing newline?) |
| Webhook fires but no email | Check Netlify function logs (Site → Functions → click the function → Logs); the error will be there |
| Reminders cron returns `{ok:true, candidates: {today: 0, tomorrow: 0}}` | No reminders fall in the queried window — set one for tomorrow and re-run |
| Same reminder emails sent twice | Dedup uses `notification_log`. Confirm the table exists and has the index `idx_notif_log_dedup` |
| Emails landing in spam | Gmail-as-sender to a different inbox usually delivers fine. For better deliverability long-term, switch to Resend/Postmark with a custom domain (only `lib/email.ts` would change) |

---

## How to disable a category temporarily

Comment out the relevant `if` branch in `src/app/api/webhooks/supabase/route.ts` and redeploy. Or remove the matching Supabase webhook in the Supabase dashboard.

---

## What's NOT included (Phase 2 candidates)

- Per-user notification preferences UI (table is sketched in `NOTIFICATIONS_PLAN.md` §4 but not implemented)
- In-app bell / unread counter
- Unsubscribe link with signed token
- Custom domain for sender (better deliverability)
- "Hourly" reminder cadence
- Digest-mode summary email for high-volume admins

Ask when you want any of these.
