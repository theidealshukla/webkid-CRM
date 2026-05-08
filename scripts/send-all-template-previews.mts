// One-shot preview blast: sends one example email per template kind to TARGET.
// Run: npx tsx scripts/send-all-template-previews.mts
import { readFileSync } from "node:fs";
import nodemailer from "nodemailer";
// @ts-ignore
const tpl: any = await import("../src/lib/emailTemplates.ts");
const {
  leadCreatedEmail, batchUploadedEmail, statusChangedEmail, leadAssignedEmail,
  reminderSetEmail, reminderDueEmail, clientConvertedEmail,
  websiteLeadAdminEmail, websiteLeadUserEmail, welcomeEmail, testEmail,
} = tpl;

const TARGET = process.env.PREVIEW_TO || "adarshshuklawork@gmail.com";

// Load .env.local
const env: Record<string, string> = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^"|"$/g, "");
}
for (const k of Object.keys(env)) process.env[k] = process.env[k] ?? env[k];

const user = process.env.GMAIL_USER!;
const pass = process.env.GMAIL_APP_PASSWORD!;
const from = process.env.EMAIL_FROM || `Webkid CRM <${user}>`;
const transport = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const today = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
const soon = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

const recipientName = "Adarsh";
const leadName = "Skyline Cafe & Bakery";
const leadUrl = "https://admin.webkid.me/crm/leads/demo";

const previews: Array<{ kind: string; subject: string; html: string }> = [
  { kind: "1. website_lead_created (admin notice)", ...websiteLeadAdminEmail({
      recipientName, leadName: "Priya Mehta", phone: "+91 98765 43210",
      email: "priya@example.com",
      message: "Hi! I'd love a redesign of my bakery's site. We're a small team in Pune and would like to chat next week.",
      submittedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }),
      leadUrl: "https://admin.webkid.me/crm/website-leads",
    }) },
  { kind: "2. website_lead_user_confirmation (visitor)", ...websiteLeadUserEmail({ name: "Priya Mehta" }) },
  { kind: "3. lead_created", ...leadCreatedEmail({
      recipientName, leadName, niche: "Restaurant", phone: "+91 98765 43210",
      email: "owner@skylinecafe.in", addedBy: "Riya Kapoor", leadUrl,
    }) },
  { kind: "4. batch_uploaded", ...batchUploadedEmail({
      recipientName, fileName: "pune-restaurants-nov.xlsx",
      niche: "Restaurant", location: "Pune", leadCount: 142,
      uploadedBy: "Riya Kapoor", batchUrl: "https://admin.webkid.me/crm/leads",
    }) },
  { kind: "5a. status_closed_won", ...statusChangedEmail({
      recipientName, leadName, oldStatus: "qualified", newStatus: "closed_won",
      changedBy: "Riya Kapoor", leadUrl,
    }) },
  { kind: "5b. status_closed_lost", ...statusChangedEmail({
      recipientName, leadName, oldStatus: "qualified", newStatus: "closed_lost",
      changedBy: "Riya Kapoor", leadUrl,
    }) },
  { kind: "6. lead_assigned", ...leadAssignedEmail({
      recipientName, leadName, assignedBy: "Admin", leadUrl,
    }) },
  { kind: "7. client_converted", ...clientConvertedEmail({
      recipientName, leadName,
      services: "Website + SEO + Maintenance",
      notes: "Closed at ₹85k. Kickoff next Monday.",
      convertedBy: "Riya Kapoor", clientUrl: "https://admin.webkid.me/crm/clients",
    }) },
  { kind: "8. reminder_set", ...reminderSetEmail({
      recipientName, leadName,
      note: "Follow up about the homepage mockup feedback. They asked for 2 hero variants.",
      dueDate: tomorrow, setBy: "Riya Kapoor", leadUrl,
    }) },
  { kind: "9. reminder_tomorrow", ...reminderDueEmail({
      recipientName, leadName,
      note: "Send the contract draft for review.",
      dueDate: tomorrow, when: "tomorrow", leadUrl,
    }) },
  { kind: "10. reminder_today", ...reminderDueEmail({
      recipientName, leadName,
      note: "Call to confirm the meeting at 4 PM.",
      dueDate: today, when: "today", leadUrl,
    }) },
  { kind: "11. reminder_soon (~2h before)", ...reminderDueEmail({
      recipientName, leadName,
      note: "Discovery call on Zoom — link in calendar invite.",
      dueDate: soon, when: "soon", leadUrl,
    }) },
  { kind: "12. user_welcome", ...welcomeEmail({
      recipientName: "Riya Kapoor", email: "riya@example.com",
      tempPassword: "TempPass2026!", role: "member",
      loginUrl: "https://admin.webkid.me/login", invitedBy: "Adarsh",
    }) },
  { kind: "13. testEmail (pipeline test)", ...testEmail({ recipientName }) },
];

console.log(`Sending ${previews.length} preview emails to ${TARGET}…\n`);
let ok = 0, failed = 0;
for (const p of previews) {
  try {
    const info = await transport.sendMail({
      from,
      to: TARGET,
      subject: `[PREVIEW] ${p.kind} — ${p.subject}`,
      html: p.html,
    });
    console.log(`✓ ${p.kind}  →  ${info.messageId}`);
    ok++;
    await new Promise(r => setTimeout(r, 600)); // gentle rate-limit
  } catch (e: any) {
    console.log(`✗ ${p.kind}  →  ${e.message}`);
    failed++;
  }
}
console.log(`\nDone. ${ok} sent, ${failed} failed. Inbox: ${TARGET}`);
process.exit(failed ? 1 : 0);
