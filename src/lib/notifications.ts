import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendEmail } from "./email";
import {
  leadCreatedEmail,
  batchUploadedEmail,
  statusChangedEmail,
  leadAssignedEmail,
  reminderSetEmail,
  reminderDueEmail,
  clientConvertedEmail,
  websiteLeadAdminEmail,
  websiteLeadUserEmail,
  welcomeEmail,
} from "./emailTemplates";

const APP_URL = process.env.APP_URL || "https://admin.webkid.me";

let cachedClient: SupabaseClient | null = null;
function getServiceClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing.");
  cachedClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cachedClient;
}

interface TeamMember { id: string; email: string; name: string; role: string }

async function getAllTeamMembers(): Promise<TeamMember[]> {
  const { data } = await getServiceClient().from("users").select("id, email, name, role");
  return (data as TeamMember[] | null) || [];
}

async function getUsersById(ids: string[]): Promise<TeamMember[]> {
  if (ids.length === 0) return [];
  const { data } = await getServiceClient().from("users").select("id, email, name, role").in("id", ids);
  return (data as TeamMember[] | null) || [];
}

async function getUserById(id: string): Promise<TeamMember | null> {
  const { data } = await getServiceClient().from("users").select("id, email, name, role").eq("id", id).single();
  return (data as TeamMember | null) || null;
}

async function alreadySent(kind: string, entityId: string, recipient: string): Promise<boolean> {
  const { data } = await getServiceClient()
    .from("notification_log")
    .select("id")
    .eq("kind", kind)
    .eq("entity_id", entityId)
    .eq("recipient", recipient)
    .limit(1)
    .maybeSingle();
  return !!data;
}

async function logSend(opts: {
  kind: string;
  entityType: string;
  entityId: string;
  recipient: string;
  userId: string | null;
  messageId?: string;
  error?: string;
}) {
  await getServiceClient().from("notification_log").insert({
    recipient: opts.recipient,
    user_id: opts.userId,
    kind: opts.kind,
    entity_type: opts.entityType,
    entity_id: opts.entityId,
    message_id: opts.messageId || null,
    status: opts.error ? "failed" : "sent",
    error: opts.error || null,
  });
}

async function fanOut<T extends { subject: string; html: string }>(opts: {
  kind: string;
  entityType: string;
  entityId: string;
  recipients: TeamMember[];
  build: (recipient: TeamMember) => T;
}): Promise<{ sent: number; skipped: number }> {
  let sent = 0, skipped = 0;
  await Promise.all(opts.recipients.map(async (u) => {
    if (!u.email) { skipped++; return; }
    if (await alreadySent(opts.kind, opts.entityId, u.email)) { skipped++; return; }

    const { subject, html } = opts.build(u);
    const result = await sendEmail({ to: u.email, subject, html });
    await logSend({
      kind: opts.kind,
      entityType: opts.entityType,
      entityId: opts.entityId,
      recipient: u.email,
      userId: u.id,
      messageId: result.id,
      error: result.error,
    });
    if (result.error) skipped++; else sent++;
  }));
  return { sent, skipped };
}

// ── Public API ─────────────────────────────────────────────────────────

export async function notifyLeadCreated(leadId: string) {
  const supabase = getServiceClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, business_name, niche, phone, email, uploaded_by, batch_id")
    .eq("id", leadId)
    .single();
  if (!lead) return { sent: 0, skipped: 0, reason: "lead-not-found" };
  // Skip leads that are part of a batch — the batch INSERT sends a digest.
  if (lead.batch_id) return { sent: 0, skipped: 0, reason: "batch-lead" };

  const [recipients, addedBy] = await Promise.all([
    getAllTeamMembers(),
    lead.uploaded_by ? getUserById(lead.uploaded_by) : Promise.resolve(null),
  ]);

  return fanOut({
    kind: "lead_created",
    entityType: "lead",
    entityId: leadId,
    recipients,
    build: (u) => leadCreatedEmail({
      recipientName: u.name,
      leadName: lead.business_name,
      niche: lead.niche,
      phone: lead.phone,
      email: lead.email,
      addedBy: addedBy?.name || "A teammate",
      leadUrl: `${APP_URL}/crm/leads/${lead.id}`,
    }),
  });
}

export async function notifyBatchUploaded(batchId: string) {
  const supabase = getServiceClient();
  const { data: batch } = await supabase
    .from("upload_batches")
    .select("id, file_name, niche, location, lead_count, uploaded_by")
    .eq("id", batchId)
    .single();
  if (!batch) return { sent: 0, skipped: 0, reason: "batch-not-found" };

  const [recipients, uploadedBy] = await Promise.all([
    getAllTeamMembers(),
    batch.uploaded_by ? getUserById(batch.uploaded_by) : Promise.resolve(null),
  ]);

  return fanOut({
    kind: "batch_uploaded",
    entityType: "batch",
    entityId: batchId,
    recipients,
    build: (u) => batchUploadedEmail({
      recipientName: u.name,
      fileName: batch.file_name,
      niche: batch.niche,
      location: batch.location,
      leadCount: batch.lead_count || 0,
      uploadedBy: uploadedBy?.name || "A teammate",
      batchUrl: `${APP_URL}/crm/leads`,
    }),
  });
}

export async function notifyStatusChanged(leadId: string, oldStatus: string, newStatus: string, changedById: string | null) {
  // Only notify on terminal states by default.
  if (newStatus !== "closed_won" && newStatus !== "closed_lost") {
    return { sent: 0, skipped: 0, reason: "not-terminal" };
  }
  const supabase = getServiceClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, business_name")
    .eq("id", leadId)
    .single();
  if (!lead) return { sent: 0, skipped: 0, reason: "lead-not-found" };

  const [recipients, changedBy] = await Promise.all([
    getAllTeamMembers(),
    changedById ? getUserById(changedById) : Promise.resolve(null),
  ]);

  // Use a kind that includes the new status so a lead going won then lost both notify.
  const kind = `status_${newStatus}`;
  return fanOut({
    kind,
    entityType: "lead",
    entityId: leadId,
    recipients,
    build: (u) => statusChangedEmail({
      recipientName: u.name,
      leadName: lead.business_name,
      oldStatus,
      newStatus,
      changedBy: changedBy?.name || "A teammate",
      leadUrl: `${APP_URL}/crm/leads/${lead.id}`,
    }),
  });
}

export async function notifyLeadAssigned(leadId: string, assigneeId: string, assignedById: string | null) {
  const supabase = getServiceClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, business_name")
    .eq("id", leadId)
    .single();
  if (!lead) return { sent: 0, skipped: 0, reason: "lead-not-found" };

  const [assignee, assignedBy] = await Promise.all([
    getUserById(assigneeId),
    assignedById ? getUserById(assignedById) : Promise.resolve(null),
  ]);
  if (!assignee) return { sent: 0, skipped: 0, reason: "assignee-not-found" };

  // Use unique entity_id per assignment by appending assignee id.
  return fanOut({
    kind: "lead_assigned",
    entityType: "lead",
    entityId: `${leadId}:${assigneeId}`,
    recipients: [assignee],
    build: (u) => leadAssignedEmail({
      recipientName: u.name,
      leadName: lead.business_name,
      assignedBy: assignedBy?.name || "A teammate",
      leadUrl: `${APP_URL}/crm/leads/${lead.id}`,
    }),
  });
}

export async function notifyReminderSet(activityId: string) {
  const supabase = getServiceClient();
  const { data: act } = await supabase
    .from("activities")
    .select("id, lead_id, content, reminder_date, user_id, type")
    .eq("id", activityId)
    .single();
  if (!act || !act.reminder_date) return { sent: 0, skipped: 0, reason: "no-reminder" };

  const [{ data: lead }, setBy] = await Promise.all([
    supabase.from("leads").select("id, business_name").eq("id", act.lead_id).single(),
    act.user_id ? getUserById(act.user_id) : Promise.resolve(null),
  ]);
  if (!lead) return { sent: 0, skipped: 0, reason: "lead-not-found" };

  const recipients = await getAllTeamMembers();
  return fanOut({
    kind: "reminder_set",
    entityType: "activity",
    entityId: activityId,
    recipients,
    build: (u) => reminderSetEmail({
      recipientName: u.name,
      leadName: lead.business_name,
      note: act.content,
      dueDate: act.reminder_date as string,
      setBy: setBy?.name || "A teammate",
      leadUrl: `${APP_URL}/crm/leads/${act.lead_id}`,
    }),
  });
}

export async function notifyClientConverted(leadId: string, convertedById: string | null) {
  const supabase = getServiceClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("id, business_name, client_services, client_notes")
    .eq("id", leadId)
    .single();
  if (!lead) return { sent: 0, skipped: 0, reason: "lead-not-found" };

  const [recipients, convertedBy] = await Promise.all([
    getAllTeamMembers(),
    convertedById ? getUserById(convertedById) : Promise.resolve(null),
  ]);

  return fanOut({
    kind: "client_converted",
    entityType: "lead",
    entityId: leadId,
    recipients,
    build: (u) => clientConvertedEmail({
      recipientName: u.name,
      leadName: lead.business_name,
      services: lead.client_services,
      notes: lead.client_notes,
      convertedBy: convertedBy?.name || "A teammate",
      clientUrl: `${APP_URL}/crm/clients`,
    }),
  });
}

export async function notifyWebsiteLeadCreated(leadId: string) {
  const supabase = getServiceClient();
  const { data: lead } = await supabase
    .from("website_leads")
    .select("id, name, phone, email, message, created_at")
    .eq("id", leadId)
    .single();
  if (!lead) return { sent: 0, skipped: 0, reason: "lead-not-found" };

  const submittedAt = new Date(lead.created_at as string).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
  const leadUrl = `${APP_URL}/crm/website-leads`;

  // ── Admin fan-out: notify every team member ─────────────────────────
  const recipients = await getAllTeamMembers();
  const adminResult = await fanOut({
    kind: "website_lead_created",
    entityType: "website_lead",
    entityId: leadId,
    recipients,
    build: (u) => websiteLeadAdminEmail({
      recipientName: u.name,
      leadName: lead.name as string,
      phone: lead.phone as string,
      email: (lead.email as string | null) || null,
      message: (lead.message as string | null) || null,
      submittedAt,
      leadUrl,
    }),
  });

  // ── User confirmation (only if they gave us an email) ───────────────
  let userResult = { sent: 0, skipped: 0 };
  const userEmail = (lead.email as string | null)?.trim();
  if (userEmail) {
    if (!(await alreadySent("website_lead_user_confirmation", leadId, userEmail))) {
      const { subject, html } = websiteLeadUserEmail({ name: lead.name as string });
      const result = await sendEmail({ to: userEmail, subject, html });
      await logSend({
        kind: "website_lead_user_confirmation",
        entityType: "website_lead",
        entityId: leadId,
        recipient: userEmail,
        userId: null,
        messageId: result.id,
        error: result.error,
      });
      if (result.error) userResult = { sent: 0, skipped: 1 };
      else userResult = { sent: 1, skipped: 0 };
    } else {
      userResult = { sent: 0, skipped: 1 };
    }
  }

  return {
    sent: adminResult.sent + userResult.sent,
    skipped: adminResult.skipped + userResult.skipped,
  };
}

export async function notifyReminderDue(activityId: string, when: "today" | "tomorrow" | "soon") {
  const supabase = getServiceClient();
  const { data: act } = await supabase
    .from("activities")
    .select("id, lead_id, content, reminder_date")
    .eq("id", activityId)
    .single();
  if (!act || !act.reminder_date) return { sent: 0, skipped: 0, reason: "no-reminder" };

  const { data: lead } = await supabase
    .from("leads")
    .select("id, business_name, assigned_to")
    .eq("id", act.lead_id)
    .single();
  if (!lead) return { sent: 0, skipped: 0, reason: "lead-not-found" };

  // Recipients: assignee of the lead + all admins. Falls back to all team if no one assigned.
  const recipientIds = new Set<string>();
  if (lead.assigned_to) recipientIds.add(lead.assigned_to as string);
  const { data: admins } = await supabase.from("users").select("id").eq("role", "admin");
  (admins as Array<{ id: string }> | null)?.forEach(a => recipientIds.add(a.id));

  let recipients: TeamMember[];
  if (recipientIds.size === 0) {
    recipients = await getAllTeamMembers();
  } else {
    recipients = await getUsersById(Array.from(recipientIds));
  }

  const kind =
    when === "today" ? "reminder_today" :
    when === "tomorrow" ? "reminder_tomorrow" :
    "reminder_soon";
  return fanOut({
    kind,
    entityType: "activity",
    entityId: activityId,
    recipients,
    build: (u) => reminderDueEmail({
      recipientName: u.name,
      leadName: lead.business_name,
      note: act.content,
      dueDate: act.reminder_date as string,
      when,
      leadUrl: `${APP_URL}/crm/leads/${act.lead_id}`,
    }),
  });
}

export async function notifyUserCreated(opts: {
  userId: string;
  name: string;
  email: string;
  tempPassword: string;
  role: string;
  invitedById: string | null;
}) {
  const invitedBy = opts.invitedById ? await getUserById(opts.invitedById) : null;

  if (await alreadySent("user_welcome", opts.userId, opts.email)) {
    return { sent: 0, skipped: 1, reason: "already-sent" };
  }

  // Welcome email always points at the production CRM, regardless of APP_URL —
  // never want a new user to receive a localhost link from a dev-side run.
  const { subject, html } = welcomeEmail({
    recipientName: opts.name,
    email: opts.email,
    tempPassword: opts.tempPassword,
    role: opts.role,
    loginUrl: "https://admin.webkid.me/crm/login",
    invitedBy: invitedBy?.name || null,
  });

  const result = await sendEmail({ to: opts.email, subject, html });
  await logSend({
    kind: "user_welcome",
    entityType: "user",
    entityId: opts.userId,
    recipient: opts.email,
    userId: opts.userId,
    messageId: result.id,
    error: result.error,
  });
  return result.error ? { sent: 0, skipped: 1, error: result.error } : { sent: 1, skipped: 0 };
}
