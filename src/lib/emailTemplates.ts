// Email templates — minimal, brand-aligned, mail-client-safe HTML.
// Uses inline styles only; no <style> blocks (Gmail strips them in some contexts).

const APP_URL = process.env.APP_URL || "https://crm.webkid.in";
const BRAND = {
  primary: "#4f46e5",
  primaryDark: "#4338ca",
  accent: "#f59e0b",
  text: "#111827",
  muted: "#6b7280",
  subtle: "#9ca3af",
  border: "#eef0f5",
  bg: "#f6f7fb",
  card: "#ffffff",
};

function escape(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface LayoutOpts {
  preview: string;
  eyebrow: string;
  eyebrowColor?: string;
  heading: string;
  body: string;
  cta?: { label: string; href: string };
  meta?: Array<{ label: string; value: string }>;
}

function layout({ preview, eyebrow, eyebrowColor, heading, body, cta, meta }: LayoutOpts): string {
  const accent = eyebrowColor || BRAND.primary;
  const metaHtml = meta?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0 0;border-collapse:collapse;background:#f9fafb;border-radius:12px;">
        ${meta.map(m => `
          <tr>
            <td style="padding:10px 16px;font-size:12px;color:${BRAND.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:40%;">${escape(m.label)}</td>
            <td style="padding:10px 16px;font-size:14px;color:${BRAND.text};font-weight:500;text-align:right;">${escape(m.value)}</td>
          </tr>`).join("")}
       </table>`
    : "";

  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;border-collapse:collapse;">
         <tr><td style="border-radius:10px;background:${BRAND.primary};">
           <a href="${escape(cta.href)}" style="display:inline-block;padding:13px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escape(cta.label)} &rarr;</a>
         </td></tr>
       </table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escape(preview)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;-webkit-font-smoothing:antialiased;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escape(preview)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:${BRAND.card};border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,0.04),0 0 0 1px rgba(15,23,42,0.04);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0;">
              <a href="${APP_URL}" style="display:inline-block;text-decoration:none;">
                <span style="display:inline-block;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.text};">webkid<span style="color:${BRAND.primary};">.</span></span>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${accent};">${escape(eyebrow)}</p>
              <h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.text};letter-spacing:-0.01em;">${heading}</h1>
              <div style="font-size:15px;line-height:1.6;color:#374151;">${body}</div>
              ${metaHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <hr style="border:0;border-top:1px solid ${BRAND.border};margin:0 0 16px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.subtle};">
                You're receiving this because you're on the Webkid CRM team.<br>
                <a href="${APP_URL}/crm" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">Open CRM</a>
                &nbsp;&middot;&nbsp;
                <a href="${APP_URL}/crm/settings" style="color:${BRAND.muted};text-decoration:none;">Notification settings</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:${BRAND.subtle};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">© ${new Date().getFullYear()} Webkid &middot; Lead Management</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function firstName(name: string | null | undefined): string {
  if (!name) return "there";
  return name.split(" ")[0];
}

// ── Templates ──────────────────────────────────────────────────────────

export function leadCreatedEmail(opts: {
  recipientName: string;
  leadName: string;
  niche?: string | null;
  phone?: string | null;
  email?: string | null;
  addedBy: string;
  leadUrl: string;
}): { subject: string; html: string } {
  const html = layout({
    preview: `New lead added: ${opts.leadName}`,
    eyebrow: "New Lead",
    heading: `Hi ${escape(firstName(opts.recipientName))}, a new lead just landed.`,
    body: `<p style="margin:0;">
      <strong style="color:${BRAND.text};">${escape(opts.addedBy)}</strong> added
      <strong style="color:${BRAND.text};">${escape(opts.leadName)}</strong> to the CRM.
    </p>`,
    meta: [
      ...(opts.niche ? [{ label: "Niche", value: opts.niche }] : []),
      ...(opts.phone ? [{ label: "Phone", value: opts.phone }] : []),
      ...(opts.email ? [{ label: "Email", value: opts.email }] : []),
    ],
    cta: { label: "Open lead", href: opts.leadUrl },
  });
  return { subject: `New lead: ${opts.leadName}`, html };
}

export function batchUploadedEmail(opts: {
  recipientName: string;
  fileName: string;
  niche?: string | null;
  location?: string | null;
  leadCount: number;
  uploadedBy: string;
  batchUrl: string;
}): { subject: string; html: string } {
  const html = layout({
    preview: `${opts.leadCount} leads uploaded by ${opts.uploadedBy}`,
    eyebrow: "Batch Uploaded",
    heading: `${opts.leadCount} new leads imported.`,
    body: `<p style="margin:0;">
      <strong>${escape(opts.uploadedBy)}</strong> uploaded
      <strong>${escape(opts.fileName)}</strong> with
      <strong>${opts.leadCount}</strong> leads.
    </p>`,
    meta: [
      { label: "File", value: opts.fileName },
      ...(opts.niche ? [{ label: "Niche", value: opts.niche }] : []),
      ...(opts.location ? [{ label: "Location", value: opts.location }] : []),
      { label: "Total leads", value: String(opts.leadCount) },
    ],
    cta: { label: "View batch", href: opts.batchUrl },
  });
  return { subject: `${opts.leadCount} leads uploaded · ${opts.fileName}`, html };
}

export function statusChangedEmail(opts: {
  recipientName: string;
  leadName: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  leadUrl: string;
}): { subject: string; html: string } {
  const niceStatus = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const isWin = opts.newStatus === "closed_won";
  const accent = isWin ? "#10b981" : opts.newStatus === "closed_lost" ? "#ef4444" : BRAND.primary;
  const html = layout({
    preview: `${opts.leadName} → ${niceStatus(opts.newStatus)}`,
    eyebrow: isWin ? "Closed Won 🎉" : "Status Updated",
    eyebrowColor: accent,
    heading: `${escape(opts.leadName)} is now ${escape(niceStatus(opts.newStatus))}.`,
    body: `<p style="margin:0;">
      <strong>${escape(opts.changedBy)}</strong> moved this lead from
      <em style="color:${BRAND.muted};">${escape(niceStatus(opts.oldStatus))}</em> to
      <strong style="color:${accent};">${escape(niceStatus(opts.newStatus))}</strong>.
    </p>`,
    cta: { label: "Open lead", href: opts.leadUrl },
  });
  return { subject: `${opts.leadName} → ${niceStatus(opts.newStatus)}`, html };
}

export function leadAssignedEmail(opts: {
  recipientName: string;
  leadName: string;
  assignedBy: string;
  leadUrl: string;
}): { subject: string; html: string } {
  const html = layout({
    preview: `You've been assigned: ${opts.leadName}`,
    eyebrow: "Lead Assigned",
    heading: `Hi ${escape(firstName(opts.recipientName))}, ${escape(opts.leadName)} is now yours.`,
    body: `<p style="margin:0;">
      <strong>${escape(opts.assignedBy)}</strong> assigned this lead to you. Time to make contact.
    </p>`,
    cta: { label: "Open lead", href: opts.leadUrl },
  });
  return { subject: `Assigned to you: ${opts.leadName}`, html };
}

export function reminderSetEmail(opts: {
  recipientName: string;
  leadName: string;
  note: string;
  dueDate: string; // ISO
  setBy: string;
  leadUrl: string;
}): { subject: string; html: string } {
  const due = new Date(opts.dueDate);
  const fmt = due.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  const html = layout({
    preview: `Reminder set for ${opts.leadName} on ${fmt}`,
    eyebrow: "Reminder Set",
    eyebrowColor: BRAND.accent,
    heading: `Follow-up scheduled for ${escape(opts.leadName)}.`,
    body: `<p style="margin:0;">
      <strong>${escape(opts.setBy)}</strong> set a reminder. We'll email you a day before and on the day.
    </p>
    <blockquote style="margin:20px 0 0;padding:14px 16px;background:#fffbeb;border-left:3px solid ${BRAND.accent};border-radius:6px;font-size:14px;color:#78350f;font-style:normal;">${escape(opts.note)}</blockquote>`,
    meta: [
      { label: "Lead", value: opts.leadName },
      { label: "Due", value: fmt },
    ],
    cta: { label: "Open lead", href: opts.leadUrl },
  });
  return { subject: `Reminder set: ${opts.leadName} · ${fmt}`, html };
}

export function reminderDueEmail(opts: {
  recipientName: string;
  leadName: string;
  note: string;
  dueDate: string;
  when: "today" | "tomorrow";
  leadUrl: string;
}): { subject: string; html: string } {
  const due = new Date(opts.dueDate);
  const fmt = due.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const isToday = opts.when === "today";
  const html = layout({
    preview: isToday ? `Follow up today: ${opts.leadName}` : `Reminder tomorrow: ${opts.leadName}`,
    eyebrow: isToday ? "Due Today" : "Due Tomorrow",
    eyebrowColor: isToday ? "#ef4444" : BRAND.accent,
    heading: isToday
      ? `Hi ${escape(firstName(opts.recipientName))}, follow up with ${escape(opts.leadName)} today.`
      : `Heads up — ${escape(opts.leadName)} is on tomorrow's list.`,
    body: `<blockquote style="margin:0;padding:14px 16px;background:${isToday ? "#fef2f2" : "#fffbeb"};border-left:3px solid ${isToday ? "#ef4444" : BRAND.accent};border-radius:6px;font-size:14px;color:${isToday ? "#7f1d1d" : "#78350f"};">${escape(opts.note)}</blockquote>`,
    meta: [
      { label: "Lead", value: opts.leadName },
      { label: isToday ? "Due today" : "Due tomorrow", value: fmt },
    ],
    cta: { label: "Open lead", href: opts.leadUrl },
  });
  return {
    subject: isToday
      ? `Follow up today: ${opts.leadName}`
      : `Reminder tomorrow: ${opts.leadName}`,
    html,
  };
}

export function clientConvertedEmail(opts: {
  recipientName: string;
  leadName: string;
  services?: string | null;
  notes?: string | null;
  convertedBy: string;
  clientUrl: string;
}): { subject: string; html: string } {
  const html = layout({
    preview: `New client: ${opts.leadName}`,
    eyebrow: "New Client \u{1F389}",
    eyebrowColor: "#10b981",
    heading: `${escape(opts.leadName)} is officially a client.`,
    body: `<p style="margin:0;">
      <strong>${escape(opts.convertedBy)}</strong> just converted this lead to a client. Welcome aboard!
    </p>${opts.notes ? `<blockquote style="margin:20px 0 0;padding:14px 16px;background:#ecfdf5;border-left:3px solid #10b981;border-radius:6px;font-size:14px;color:#065f46;">${escape(opts.notes)}</blockquote>` : ""}`,
    meta: [
      { label: "Client", value: opts.leadName },
      ...(opts.services ? [{ label: "Services", value: opts.services }] : []),
    ],
    cta: { label: "View client", href: opts.clientUrl },
  });
  return { subject: `\u{1F389} New client: ${opts.leadName}`, html };
}

// ── Public layout (for emails sent to non-team recipients) ─────────────
// Same brand shell, but no "you're on the team" footer or CRM links.
function publicLayout(opts: {
  preview: string;
  eyebrow: string;
  heading: string;
  body: string;
  meta?: Array<{ label: string; value: string }>;
}): string {
  const metaHtml = opts.meta?.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0 0;border-collapse:collapse;background:#f9fafb;border-radius:12px;">
        ${opts.meta.map(m => `
          <tr>
            <td style="padding:10px 16px;font-size:12px;color:${BRAND.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:40%;">${escape(m.label)}</td>
            <td style="padding:10px 16px;font-size:14px;color:${BRAND.text};font-weight:500;text-align:right;">${escape(m.value)}</td>
          </tr>`).join("")}
       </table>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escape(opts.preview)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;-webkit-font-smoothing:antialiased;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escape(opts.preview)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:${BRAND.card};border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,0.04),0 0 0 1px rgba(15,23,42,0.04);overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 0;">
              <span style="display:inline-block;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.text};">webkid<span style="color:${BRAND.primary};">.</span></span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 0;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.primary};">${escape(opts.eyebrow)}</p>
              <h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.text};letter-spacing:-0.01em;">${opts.heading}</h1>
              <div style="font-size:15px;line-height:1.6;color:#374151;">${opts.body}</div>
              ${metaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <hr style="border:0;border-top:1px solid ${BRAND.border};margin:0 0 16px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.subtle};">
                Webkid &middot; web design &amp; development<br>
                <a href="https://www.webkid.me" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">webkid.me</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-size:11px;color:${BRAND.subtle};">© ${new Date().getFullYear()} Webkid</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Website lead templates ─────────────────────────────────────────────

export function websiteLeadAdminEmail(opts: {
  recipientName: string;
  leadName: string;
  phone: string;
  email?: string | null;
  message?: string | null;
  submittedAt: string;
  leadUrl: string;
}): { subject: string; html: string } {
  const messageBlock = opts.message
    ? `<blockquote style="margin:20px 0 0;padding:14px 16px;background:#f9fafb;border-left:3px solid ${BRAND.primary};border-radius:6px;font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap;">${escape(opts.message)}</blockquote>`
    : `<p style="margin:18px 0 0;font-size:13px;color:${BRAND.subtle};font-style:italic;">No message provided.</p>`;

  const html = layout({
    preview: `New website inquiry from ${opts.leadName}`,
    eyebrow: "Website Inquiry",
    heading: `Hi ${escape(firstName(opts.recipientName))}, a new website lead just came in.`,
    body: `<p style="margin:0;">
      <strong style="color:${BRAND.text};">${escape(opts.leadName)}</strong> just submitted the contact form on webkid.me.
    </p>${messageBlock}`,
    meta: [
      { label: "Phone", value: opts.phone },
      ...(opts.email ? [{ label: "Email", value: opts.email }] : []),
      { label: "Submitted", value: opts.submittedAt },
    ],
    cta: { label: "Open in CRM", href: opts.leadUrl },
  });
  return { subject: `New website lead: ${opts.leadName}`, html };
}

export function websiteLeadUserEmail(opts: {
  name: string;
}): { subject: string; html: string } {
  const html = publicLayout({
    preview: "We got your message — we'll be in touch soon.",
    eyebrow: "Message Received",
    heading: `Thanks for reaching out, ${escape(firstName(opts.name))}.`,
    body: `<p style="margin:0 0 14px;">We&rsquo;ve received your message and someone from our team will get back to you within <strong>24 hours</strong>.</p>
      <p style="margin:0 0 14px;">If your request is urgent, feel free to WhatsApp us directly &mdash; we&rsquo;re happy to chat.</p>
      <p style="margin:22px 0 0;">Talk soon,<br/>The Webkid team</p>`,
  });
  return { subject: `Thanks for reaching out, ${opts.name} — we'll be in touch`, html };
}

export function testEmail(opts: { recipientName: string }): { subject: string; html: string } {
  const html = layout({
    preview: "Webkid CRM email pipeline test",
    eyebrow: "Pipeline Test",
    heading: `Looks great, ${escape(firstName(opts.recipientName))}.`,
    body: `<p style="margin:0;">If you're reading this, your Gmail SMTP + Nodemailer integration is wired correctly. You're ready to enable triggers and reminders.</p>`,
    meta: [
      { label: "From", value: process.env.EMAIL_FROM || process.env.GMAIL_USER || "—" },
      { label: "Sent at", value: new Date().toLocaleString() },
    ],
    cta: { label: "Open dashboard", href: `${APP_URL}/crm` },
  });
  return { subject: "Webkid CRM · Email pipeline test", html };
}
