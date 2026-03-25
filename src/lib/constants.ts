import type { LeadStatus } from "@/types";

// ─── Status Config ──────────────────────────────────────────
export const statusConfig: Record<LeadStatus, { bg: string; text: string; label: string; dot: string }> = {
  new: { bg: "bg-gray-100", text: "text-gray-700", label: "NEW", dot: "bg-gray-500" },
  contacted: { bg: "bg-blue-100", text: "text-blue-700", label: "CONTACTED", dot: "bg-blue-500" },
  interested: { bg: "bg-green-100", text: "text-green-700", label: "INTERESTED", dot: "bg-green-500" },
  follow_up: { bg: "bg-yellow-100", text: "text-yellow-800", label: "FOLLOW UP", dot: "bg-yellow-500" },
  not_interested: { bg: "bg-red-100", text: "text-red-700", label: "NOT INTERESTED", dot: "bg-red-500" },
  closed_won: { bg: "bg-emerald-100", text: "text-emerald-700", label: "CLOSED WON", dot: "bg-emerald-500" },
  closed_lost: { bg: "bg-red-100", text: "text-red-700", label: "CLOSED LOST", dot: "bg-rose-500" },
};

export const ALL_STATUSES: LeadStatus[] = [
  "new", "contacted", "interested", "follow_up", "not_interested", "closed_won", "closed_lost",
];

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  follow_up: "Follow Up",
  not_interested: "Not Interested",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
};

// ─── Source Config ──────────────────────────────────────────
export const sourceConfig: Record<string, { bg: string; text: string; border: string }> = {
  manual: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-100" },
  excel: { bg: "bg-green-50", text: "text-green-700", border: "border-green-100" },
  website: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100" },
};

// ─── Niche Colors ───────────────────────────────────────────
export const nicheColors: Record<string, string> = {
  Plumber: "bg-blue-50 border-blue-200 text-blue-800",
  Electrician: "bg-yellow-50 border-yellow-200 text-yellow-800",
  Dentist: "bg-green-50 border-green-200 text-green-800",
  Restaurant: "bg-orange-50 border-orange-200 text-orange-800",
  default: "bg-gray-50 border-gray-200 text-gray-800",
};

// ─── Activity Config ────────────────────────────────────────
export const activityColors: Record<string, string> = {
  call: "bg-blue-500",
  note: "bg-purple-500",
  "follow-up": "bg-yellow-500",
  system: "bg-gray-400",
  email: "bg-green-500",
  meeting: "bg-pink-500",
};

export const activityBadgeColors: Record<string, string> = {
  call: "bg-blue-100 text-blue-600",
  note: "bg-purple-100 text-purple-600",
  "follow-up": "bg-yellow-100 text-yellow-600",
  system: "bg-gray-100 text-gray-600",
  email: "bg-green-100 text-green-600",
  meeting: "bg-pink-100 text-pink-600",
};

// ─── Chart Colors ───────────────────────────────────────────
export const CHART_COLORS = [
  "#91c5ff", "#3a81f6", "#2563ef", "#1a4eda", "#1f3fad", "#f87171", "#34d399",
];
