export type LeadStatus =
  | "new"
  | "contacted"
  | "interested"
  | "follow_up"
  | "not_interested"
  | "closed_won"
  | "closed_lost";

export type LeadSource = "manual" | "excel" | "website";

// Matches DB `leads` table (snake_case → camelCase)
export interface Lead {
  id: string;
  businessName: string;
  phone: string;
  niche: string;
  status: LeadStatus;
  assignedTo: string | null;      // UUID in DB, resolved to name in app
  assignedToName?: string;        // Resolved display name
  lastActivity: string;           // Computed from latest activity
  mapsLink: string;
  email?: string;
  website?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  uploadedBy?: string | null;     // UUID in DB
  uploadedByName?: string;        // Resolved display name
  createdAt?: string;
  updatedAt?: string;
  batchId?: string | null;
  source: LeadSource;
  instagramLink?: string;
  leadSourceDetail?: string;
  manualNotes?: string;
  whatsapp?: string;              // Not in DB, kept for UI (stored in manual_notes or ignored)
  isArchived?: boolean;
}

// Raw DB row shape for leads
export interface LeadRow {
  id: string;
  business_name: string;
  phone: string;
  email: string | null;
  website: string | null;
  niche: string | null;
  address: string | null;
  maps_link: string | null;
  instagram_link: string | null;
  rating: number | null;
  review_count: number | null;
  status: LeadStatus;
  source: LeadSource;
  lead_source_detail: string | null;
  assigned_to: string | null;
  batch_id: string | null;
  uploaded_by: string | null;
  manual_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  leadId: string;
  type: "call" | "note" | "follow-up" | "system" | "email" | "meeting";
  userId?: string | null;
  user: string;                   // Resolved display name
  date: string;
  content: string;
  outcome?: string;
  status?: string;
  reminderDate?: string;
}

// Raw DB row for activities
export interface ActivityRow {
  id: string;
  lead_id: string;
  user_id: string | null;
  type: string;
  content: string;
  outcome: string | null;
  status: string | null;
  reminder_date: string | null;
  created_at: string;
}

export interface UploadBatch {
  id: string;
  fileName: string;
  niche: string;
  location: string;
  uploadedAt: string;
  leadCount: number;
  uploadedBy: string;             // UUID in DB
  uploadedByName?: string;        // Resolved display name
}

// Raw DB row for upload_batches
export interface UploadBatchRow {
  id: string;
  file_name: string;
  niche: string | null;
  location: string | null;
  lead_count: number;
  uploaded_by: string | null;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "member";
  avatar?: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  userId?: string;
  user: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  timestamp: string;
  details?: string | Record<string, unknown>;
}

// Raw DB row for activity_logs
export interface ActivityLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface WebsiteLead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  source: string;
  isRead: boolean;
  createdAt: string;
}

// Raw DB row for website_leads
export interface WebsiteLeadRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  source: string;
  is_read: boolean;
  created_at: string;
}

// Helper: map DB lead row to app Lead
export function mapLeadRow(row: LeadRow, usersMap: Map<string, string>): Lead {
  return {
    id: row.id,
    businessName: row.business_name,
    phone: row.phone,
    email: row.email || undefined,
    website: row.website || undefined,
    niche: row.niche || "",
    address: row.address || undefined,
    mapsLink: row.maps_link || "",
    instagramLink: row.instagram_link || undefined,
    rating: row.rating || undefined,
    reviewCount: row.review_count || undefined,
    status: row.status,
    source: row.source,
    leadSourceDetail: row.lead_source_detail || undefined,
    assignedTo: row.assigned_to,
    assignedToName: row.assigned_to ? usersMap.get(row.assigned_to) || "Unknown" : "Unassigned",
    batchId: row.batch_id,
    uploadedBy: row.uploaded_by,
    uploadedByName: row.uploaded_by ? usersMap.get(row.uploaded_by) || "Unknown" : undefined,
    manualNotes: row.manual_notes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActivity: "",  // Will be computed separately
  };
}

export function mapActivityRow(row: ActivityRow, usersMap: Map<string, string>): Activity {
  return {
    id: row.id,
    leadId: row.lead_id,
    type: row.type as Activity["type"],
    userId: row.user_id,
    user: row.user_id ? usersMap.get(row.user_id) || "Unknown" : "System",
    date: row.created_at,
    content: row.content,
    outcome: row.outcome || undefined,
    status: row.status || undefined,
    reminderDate: row.reminder_date || undefined,
  };
}

export function mapBatchRow(row: UploadBatchRow, usersMap: Map<string, string>): UploadBatch {
  return {
    id: row.id,
    fileName: row.file_name,
    niche: row.niche || "",
    location: row.location || "",
    uploadedAt: row.created_at,
    leadCount: row.lead_count,
    uploadedBy: row.uploaded_by || "",
    uploadedByName: row.uploaded_by ? usersMap.get(row.uploaded_by) || "Unknown" : "Unknown",
  };
}

export function mapWebsiteLeadRow(row: WebsiteLeadRow): WebsiteLead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || undefined,
    message: row.message || undefined,
    source: row.source,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}
