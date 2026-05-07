// Sends the two website-lead demo emails (admin + user-confirmation) to the
// admin inbox so you can preview both before configuring the live webhook.
//
// Usage (from webkid-CRM/):
//   node scripts/send-demo-website-lead.mjs
// Optional override:
//   TARGET_EMAIL=foo@bar.com node scripts/send-demo-website-lead.mjs

import { readFileSync, existsSync } from "node:fs";
import nodemailer from "nodemailer";

// ── Load env from .env.local (preferred) or .env.netlify ───────────────
const env = {};
const envFiles = [".env.local", ".env.netlify"];
for (const f of envFiles) {
  const url = new URL(`../${f}`, import.meta.url);
  if (!existsSync(url)) continue;
  for (const line of readFileSync(url, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !line.trim().startsWith("#") && !(m[1] in env)) {
      env[m[1]] = m[2];
    }
  }
}

const GMAIL_USER = env.GMAIL_USER;
const GMAIL_APP_PASSWORD = env.GMAIL_APP_PASSWORD;
const EMAIL_FROM = env.EMAIL_FROM || `Webkid CRM <${GMAIL_USER}>`;
const APP_URL = env.APP_URL?.startsWith("http") && !env.APP_URL.includes("YOUR-SITE")
  ? env.APP_URL
  : "https://crm.webkid.in";
const TARGET = process.env.TARGET_EMAIL || GMAIL_USER;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
  console.error("✗ Missing GMAIL_USER / GMAIL_APP_PASSWORD in .env.local or .env.netlify");
  process.exit(1);
}

// ── Brand tokens (mirror src/lib/emailTemplates.ts) ────────────────────
const BRAND = {
  primary: "#4f46e5",
  text: "#111827",
  muted: "#6b7280",
  subtle: "#9ca3af",
  border: "#eef0f5",
  bg: "#f6f7fb",
  card: "#ffffff",
};

const escape = (s) => (s ?? "")
  .toString()
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");

// ── Demo data ──────────────────────────────────────────────────────────
const demoLead = {
  name: "Priya Sharma",
  phone: "+91 98765 43210",
  email: "priya.sharma@example.com",
  message:
    "Hey team! I run a boutique skincare brand and I'm looking to redesign our website. We're shipping all over India and the current site converts poorly. Can we hop on a call this week to discuss a quote? Looking for something modern and conversion-focused.",
  submittedAt: new Date().toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }),
};

// ── Admin email HTML (matches websiteLeadAdminEmail) ───────────────────
const adminHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>New website inquiry from ${escape(demoLead.name)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND.bg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:${BRAND.card};border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,0.04),0 0 0 1px rgba(15,23,42,0.04);overflow:hidden;">
<tr><td style="padding:32px 32px 0;">
  <a href="${APP_URL}" style="display:inline-block;text-decoration:none;">
    <span style="display:inline-block;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.text};">webkid<span style="color:${BRAND.primary};">.</span></span>
  </a>
</td></tr>
<tr><td style="padding:24px 32px 0;">
  <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.primary};">Website Inquiry</p>
  <h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.text};letter-spacing:-0.01em;">Hi Adarsh, a new website lead just came in.</h1>
  <div style="font-size:15px;line-height:1.6;color:#374151;">
    <p style="margin:0;"><strong style="color:${BRAND.text};">${escape(demoLead.name)}</strong> just submitted the contact form on webkid.me.</p>
    <blockquote style="margin:20px 0 0;padding:14px 16px;background:#f9fafb;border-left:3px solid ${BRAND.primary};border-radius:6px;font-size:14px;line-height:1.6;color:#374151;white-space:pre-wrap;">${escape(demoLead.message)}</blockquote>
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0 0;border-collapse:collapse;background:#f9fafb;border-radius:12px;">
    <tr><td style="padding:10px 16px;font-size:12px;color:${BRAND.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:40%;">Phone</td><td style="padding:10px 16px;font-size:14px;color:${BRAND.text};font-weight:500;text-align:right;">${escape(demoLead.phone)}</td></tr>
    <tr><td style="padding:10px 16px;font-size:12px;color:${BRAND.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email</td><td style="padding:10px 16px;font-size:14px;color:${BRAND.text};font-weight:500;text-align:right;">${escape(demoLead.email)}</td></tr>
    <tr><td style="padding:10px 16px;font-size:12px;color:${BRAND.muted};font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Submitted</td><td style="padding:10px 16px;font-size:14px;color:${BRAND.text};font-weight:500;text-align:right;">${escape(demoLead.submittedAt)}</td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;border-collapse:collapse;">
    <tr><td style="border-radius:10px;background:${BRAND.primary};">
      <a href="${APP_URL}/crm/website-leads" style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Open in CRM &rarr;</a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:32px;">
  <hr style="border:0;border-top:1px solid ${BRAND.border};margin:0 0 16px;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.subtle};">
    You're receiving this because you're on the Webkid CRM team.<br>
    <a href="${APP_URL}/crm" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">Open CRM</a>
    &nbsp;&middot;&nbsp;
    <a href="${APP_URL}/crm/settings" style="color:${BRAND.muted};text-decoration:none;">Notification settings</a>
  </p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:11px;color:${BRAND.subtle};">© ${new Date().getFullYear()} Webkid &middot; Lead Management</p>
</td></tr>
</table>
</body></html>`;

// ── User confirmation HTML (matches websiteLeadUserEmail) ──────────────
const userHtml = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>We got your message</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${BRAND.bg};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:${BRAND.card};border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,0.04),0 0 0 1px rgba(15,23,42,0.04);overflow:hidden;">
<tr><td style="padding:32px 32px 0;">
  <span style="display:inline-block;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.text};">webkid<span style="color:${BRAND.primary};">.</span></span>
</td></tr>
<tr><td style="padding:24px 32px 0;">
  <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${BRAND.primary};">Message Received</p>
  <h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:${BRAND.text};letter-spacing:-0.01em;">Thanks for reaching out, ${escape(demoLead.name.split(" ")[0])}.</h1>
  <div style="font-size:15px;line-height:1.6;color:#374151;">
    <p style="margin:0 0 14px;">We&rsquo;ve received your message and someone from our team will get back to you within <strong>24 hours</strong>.</p>
    <p style="margin:0 0 14px;">If your request is urgent, feel free to WhatsApp us directly &mdash; we&rsquo;re happy to chat.</p>
    <p style="margin:22px 0 0;">Talk soon,<br/>The Webkid team</p>
  </div>
</td></tr>
<tr><td style="padding:32px;">
  <hr style="border:0;border-top:1px solid ${BRAND.border};margin:0 0 16px;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:${BRAND.subtle};">
    Webkid &middot; web design &amp; development<br>
    <a href="https://www.webkid.me" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">webkid.me</a>
  </p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:11px;color:${BRAND.subtle};">© ${new Date().getFullYear()} Webkid</p>
</td></tr>
</table>
</body></html>`;

// ── Send both ──────────────────────────────────────────────────────────
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

console.log(`→ Sending demo emails to ${TARGET} ...`);

try {
  const adminInfo = await transport.sendMail({
    from: EMAIL_FROM,
    to: TARGET,
    subject: `[DEMO] New website lead: ${demoLead.name}`,
    html: adminHtml,
  });
  console.log(`  ✓ Admin email sent     · ${adminInfo.messageId}`);
} catch (e) {
  console.error("  ✗ Admin email failed:", e.message);
  process.exit(1);
}

try {
  const userInfo = await transport.sendMail({
    from: EMAIL_FROM,
    to: TARGET,
    subject: `[DEMO] Thanks for reaching out, ${demoLead.name} — we'll be in touch`,
    html: userHtml,
  });
  console.log(`  ✓ User confirmation    · ${userInfo.messageId}`);
} catch (e) {
  console.error("  ✗ User email failed:", e.message);
  process.exit(1);
}

console.log("\n✓ Done. Check your inbox at " + TARGET);
process.exit(0);
