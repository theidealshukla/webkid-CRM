import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";

const env = {};
for (const line of readFileSync(new URL("../.env.netlify", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
}

const APP_URL = env.APP_URL?.startsWith("http") && !env.APP_URL.includes("YOUR-SITE")
  ? env.APP_URL : "https://crm.webkid.in";

const escape = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function layout({ preview, eyebrow, eyebrowColor = "#4f46e5", heading, body, meta = [], cta }) {
  const metaHtml = meta.length
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0 0;border-collapse:collapse;background:#f9fafb;border-radius:12px;">
       ${meta.map(m => `<tr>
         <td style="padding:10px 16px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:40%;">${escape(m.label)}</td>
         <td style="padding:10px 16px;font-size:14px;color:#111827;font-weight:500;text-align:right;">${escape(m.value)}</td>
       </tr>`).join("")}
       </table>` : "";
  const ctaHtml = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;border-collapse:collapse;">
         <tr><td style="border-radius:10px;background:#4f46e5;">
           <a href="${escape(cta.href)}" style="display:inline-block;padding:13px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escape(cta.label)} &rarr;</a>
         </td></tr></table>` : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escape(preview)}</span>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7fb;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,0.04),0 0 0 1px rgba(15,23,42,0.04);overflow:hidden;">
<tr><td style="padding:32px 32px 0;">
  <span style="display:inline-block;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#111827;">webkid<span style="color:#4f46e5;">.</span></span>
</td></tr>
<tr><td style="padding:24px 32px 0;">
  <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${eyebrowColor};">${escape(eyebrow)}</p>
  <h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#111827;letter-spacing:-0.01em;">${heading}</h1>
  <div style="font-size:15px;line-height:1.6;color:#374151;">${body}</div>
  ${metaHtml}
  ${ctaHtml}
</td></tr>
<tr><td style="padding:32px;">
  <hr style="border:0;border-top:1px solid #eef0f5;margin:0 0 16px;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">You're receiving this because you're on the Webkid CRM team.<br>
    <a href="${APP_URL}/crm" style="color:#4f46e5;text-decoration:none;font-weight:600;">Open CRM</a> &nbsp;&middot;&nbsp;
    <a href="${APP_URL}/crm/settings" style="color:#6b7280;text-decoration:none;">Notification settings</a>
  </p>
</td></tr></table>
<p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} Webkid · Lead Management</p>
</td></tr></table></body></html>`;
}

const tomorrow = new Date(Date.now() + 86400000);
const today = new Date();
const fmt = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
const fmtShort = (d) => d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

const emails = [
  {
    subject: "Demo · Reminder set: Skyline Cafe & Bakery",
    html: layout({
      preview: "Reminder set for Skyline Cafe & Bakery",
      eyebrow: "Demo · Reminder Set",
      eyebrowColor: "#f59e0b",
      heading: "Follow-up scheduled for Skyline Cafe & Bakery.",
      body: `<p style="margin:0;"><strong>Adarsh Shukla</strong> set a reminder. We'll email you a day before and on the day.</p>
        <blockquote style="margin:20px 0 0;padding:14px 16px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;font-size:14px;color:#78350f;">Call the owner to discuss the website redesign proposal and pricing options.</blockquote>`,
      meta: [
        { label: "Lead", value: "Skyline Cafe & Bakery" },
        { label: "Due", value: fmt(tomorrow) },
      ],
      cta: { label: "Open lead", href: `${APP_URL}/crm/leads` },
    }),
  },
  {
    subject: "Demo · Reminder tomorrow: Skyline Cafe & Bakery",
    html: layout({
      preview: "Reminder tomorrow: Skyline Cafe & Bakery",
      eyebrow: "Demo · Due Tomorrow",
      eyebrowColor: "#f59e0b",
      heading: "Heads up — Skyline Cafe & Bakery is on tomorrow's list.",
      body: `<blockquote style="margin:0;padding:14px 16px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;font-size:14px;color:#78350f;">Call the owner to discuss the website redesign proposal and pricing options.</blockquote>`,
      meta: [
        { label: "Lead", value: "Skyline Cafe & Bakery" },
        { label: "Due tomorrow", value: fmtShort(tomorrow) },
      ],
      cta: { label: "Open lead", href: `${APP_URL}/crm/leads` },
    }),
  },
  {
    subject: "Demo · Follow up today: Skyline Cafe & Bakery",
    html: layout({
      preview: "Follow up today: Skyline Cafe & Bakery",
      eyebrow: "Demo · Due Today",
      eyebrowColor: "#ef4444",
      heading: "Hi Adarsh, follow up with Skyline Cafe & Bakery today.",
      body: `<blockquote style="margin:0;padding:14px 16px;background:#fef2f2;border-left:3px solid #ef4444;border-radius:6px;font-size:14px;color:#7f1d1d;">Call the owner to discuss the website redesign proposal and pricing options.</blockquote>`,
      meta: [
        { label: "Lead", value: "Skyline Cafe & Bakery" },
        { label: "Due today", value: fmtShort(today) },
      ],
      cta: { label: "Open lead", href: `${APP_URL}/crm/leads` },
    }),
  },
];

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
});

for (const e of emails) {
  const info = await transport.sendMail({
    from: env.EMAIL_FROM || `Webkid CRM <${env.GMAIL_USER}>`,
    to: env.GMAIL_USER,
    subject: e.subject,
    html: e.html,
  });
  console.log(`Sent: ${e.subject}  ::  ${info.messageId}`);
}
