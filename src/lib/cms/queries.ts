// Generic CMS CRUD helpers used by admin pages.
// All calls go through the existing browser supabase client (auth + RLS already enforced).

import { supabase } from "@/config/supabase";
import type {
  SiteSetting, TrustedBusiness, Project, Testimonial, Service, PricingPlan, MediaAsset
} from "./types";

// ─── Site settings (key/value) ──────────────────────────────
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from("cms_site_settings").select("value").eq("key", key).maybeSingle();
  if (error) throw error;
  return (data?.value as T) ?? null;
}

export async function getAllSettings(): Promise<SiteSetting[]> {
  const { data, error } = await supabase
    .from("cms_site_settings").select("*").order("key");
  if (error) throw error;
  return (data ?? []) as SiteSetting[];
}

export async function upsertSetting(key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("cms_site_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
}

// ─── Generic ordered-list helpers ──────────────────────────
export async function listAll<T>(
  table: string,
  orders: { column: string; ascending?: boolean }[] = [
    { column: "display_order", ascending: true },
    { column: "created_at", ascending: false }
  ]
): Promise<T[]> {
  let query = supabase.from(table).select("*");
  for (const o of orders) {
    query = query.order(o.column, { ascending: o.ascending ?? true });
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function insertRow<T>(table: string, row: Partial<T>): Promise<T> {
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) throw error;
  return data as T;
}

export async function updateRow<T>(table: string, id: string, patch: Partial<T>): Promise<T> {
  const { data, error } = await supabase.from(table).update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as T;
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

// ─── Typed convenience wrappers ────────────────────────────
export const trustedBusinesses = {
  list: () => listAll<TrustedBusiness>("cms_trusted_businesses"),
  create: (r: Partial<TrustedBusiness>) => insertRow<TrustedBusiness>("cms_trusted_businesses", r),
  update: (id: string, r: Partial<TrustedBusiness>) => updateRow<TrustedBusiness>("cms_trusted_businesses", id, r),
  remove: (id: string) => deleteRow("cms_trusted_businesses", id),
};
export const projects = {
  list: () => listAll<Project>("cms_projects"),
  create: (r: Partial<Project>) => insertRow<Project>("cms_projects", r),
  update: (id: string, r: Partial<Project>) => updateRow<Project>("cms_projects", id, r),
  remove: (id: string) => deleteRow("cms_projects", id),
};
export const testimonials = {
  list: () => listAll<Testimonial>("cms_testimonials"),
  create: (r: Partial<Testimonial>) => insertRow<Testimonial>("cms_testimonials", r),
  update: (id: string, r: Partial<Testimonial>) => updateRow<Testimonial>("cms_testimonials", id, r),
  remove: (id: string) => deleteRow("cms_testimonials", id),
};
export const services = {
  list: () => listAll<Service>("cms_services", [{ column: "display_order" }]),
  create: (r: Partial<Service>) => insertRow<Service>("cms_services", r),
  update: (id: string, r: Partial<Service>) => updateRow<Service>("cms_services", id, r),
  remove: (id: string) => deleteRow("cms_services", id),
};
export const pricing = {
  list: () => listAll<PricingPlan>("cms_pricing_plans", [{ column: "display_order" }, { column: "updated_at", ascending: false }]),
  create: (r: Partial<PricingPlan>) => insertRow<PricingPlan>("cms_pricing_plans", r),
  update: (id: string, r: Partial<PricingPlan>) => updateRow<PricingPlan>("cms_pricing_plans", id, r),
  remove: (id: string) => deleteRow("cms_pricing_plans", id),
};
export const media = {
  list: () => listAll<MediaAsset>("cms_media_assets", [{ column: "created_at", ascending: false }]),
  recordUpload: (a: Partial<MediaAsset>) => insertRow<MediaAsset>("cms_media_assets", a),
  remove: (id: string) => deleteRow("cms_media_assets", id),
};

// ─── Trigger public-site revalidation after a write ────────
export async function revalidatePublic(tag: string): Promise<void> {
  try {
    await fetch("/api/cms/revalidate-public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
  } catch (e) {
    // Non-fatal — ISR will eventually refresh.
    console.warn("revalidatePublic failed:", e);
  }
}
