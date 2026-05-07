import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";

// Load .env.netlify
const env = {};
for (const line of readFileSync(new URL("../.env.netlify", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !line.trim().startsWith("#")) env[m[1]] = m[2];
}

const APP_URL = env.APP_URL?.startsWith("http") && !env.APP_URL.includes("YOUR-SITE")
  ? env.APP_URL : "https://crm.webkid.in";

const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7fb;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(15,23,42,0.04),0 0 0 1px rgba(15,23,42,0.04);overflow:hidden;">
<tr><td style="padding:32px 32px 0;">
  <span style="display:inline-block;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#111827;">webkid<span style="color:#4f46e5;">.</span></span>
</td></tr>
<tr><td style="padding:24px 32px 0;">
  <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#4f46e5;">Demo · New Lead</p>
  <h1 style="margin:8px 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#111827;letter-spacing:-0.01em;">Hi Adarsh, a new lead just landed.</h1>
  <div style="font-size:15px;line-height:1.6;color:#374151;">
    <p style="margin:0;"><strong>Webkid Demo Bot</strong> added <strong>Skyline Cafe &amp; Bakery</strong> to the CRM.</p>
  </div>
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:24px 0 0;border-collapse:collapse;background:#f9fafb;border-radius:12px;">
    <tr><td style="padding:10px 16px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;width:40%;">Niche</td><td style="padding:10px 16px;font-size:14px;color:#111827;font-weight:500;text-align:right;">Restaurant</td></tr>
    <tr><td style="padding:10px 16px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Phone</td><td style="padding:10px 16px;font-size:14px;color:#111827;font-weight:500;text-align:right;">+91 98765 43210</td></tr>
    <tr><td style="padding:10px 16px;font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Email</td><td style="padding:10px 16px;font-size:14px;color:#111827;font-weight:500;text-align:right;">hello@skylinecafe.in</td></tr>
  </table>
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;border-collapse:collapse;">
    <tr><td style="border-radius:10px;background:#4f46e5;">
      <a href="${APP_URL}/crm/leads" style="display:inline-block;padding:13px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">Open lead &rarr;</a>
    </td></tr>
  </table>
</td></tr>
<tr><td style="padding:32px;">
  <hr style="border:0;border-top:1px solid #eef0f5;margin:0 0 16px;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#9ca3af;">
    This is a one-off demo email from the Webkid CRM notification system.<br>
    <a href="${APP_URL}/crm" style="color:#4f46e5;text-decoration:none;font-weight:600;">Open CRM</a>
    &nbsp;&middot;&nbsp;
    <a href="${APP_URL}/crm/settings" style="color:#6b7280;text-decoration:none;">Notification settings</a>
  </p>
</td></tr>
</table>
<p style="margin:16px 0 0;font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} Webkid · Lead Management</p>
</td></tr></table></body></html>`;

const transport = nodemailer.createTransport({
  service: "gmail",
  auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
});

const info = await transport.sendMail({
  from: env.EMAIL_FROM || `Webkid CRM <${env.GMAIL_USER}>`,
  to: env.GMAIL_USER,
  subject: "Demo · New lead: Skyline Cafe & Bakery",
  html,
});

console.log("Sent. Message ID:", info.messageId);
console.log("To:", env.GMAIL_USER);
