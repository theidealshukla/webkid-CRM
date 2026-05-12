"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { pricing as api, revalidatePublic } from "@/lib/cms/queries";
import type { PricingPlan, PricePeriod } from "@/lib/cms/types";
import { PublishToggle } from "@/components/cms/PublishToggle";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function PricingPage() {
  const [rows, setRows] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());

  async function reload() {
    try { setRows(await api.list()); }
    catch (e: any) { toast.error(e?.message ?? "Load failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  async function add() {
    const name = prompt("Plan name?") ?? "";
    if (!name) return;
    try {
      const created = await api.create({
        slug: slugify(name) || `plan-${Date.now()}`,
        name, price_period: "starting-at", cta_label: "Get a Quote", cta_url: "/contact",
        features: [], highlighted: false, published: true,
        display_order: (rows.at(-1)?.display_order ?? 0) + 10,
      });
      setRows((r) => [...r, created]);
    } catch (e: any) { toast.error(e?.message ?? "Add failed"); }
  }

  function update(id: string, p: Partial<PricingPlan>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setDirty((d) => new Set(d).add(id));
  }

  async function save(id: string) {
    const row = rows.find((x) => x.id === id);
    if (!row) return;
    setSaving((s) => new Set(s).add(id));
    try {
      await api.update(id, { ...row, updated_at: new Date().toISOString() });
      await revalidatePublic("cms:pricing");
      setDirty((d) => { const n = new Set(d); n.delete(id); return n; });
      toast.success("Saved — public site will refresh shortly.");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this plan?")) return;
    setRows((r) => r.filter((x) => x.id !== id));
    try { await api.remove(id); await revalidatePublic("cms:pricing"); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); reload(); }
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600"><b>Global pricing</b> — used everywhere prices appear (homepage, /pricing, contact form).</p>
        <button onClick={add} className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-3 py-1.5 rounded-md">
          <Plus className="h-4 w-4"/> Add plan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} className="input font-semibold flex-1 mr-2"/>
              <button onClick={() => remove(r.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Slug"><input value={r.slug} onChange={(e) => update(r.id, { slug: e.target.value })} className="input text-xs font-mono"/></Field>
              <Field label="Tagline"><input value={r.tagline ?? ""} onChange={(e) => update(r.id, { tagline: e.target.value })} className="input"/></Field>
              <Field label="Price (₹)"><input type="number" value={r.price_inr ?? ""} onChange={(e) => update(r.id, { price_inr: e.target.value === "" ? null : Number(e.target.value) })} className="input"/></Field>
              <Field label="Period">
                <select value={r.price_period} onChange={(e) => update(r.id, { price_period: e.target.value as PricePeriod })} className="input">
                  <option value="one-time">one-time</option><option value="monthly">monthly</option><option value="starting-at">starting-at</option>
                </select>
              </Field>
              <Field label="CTA label"><input value={r.cta_label} onChange={(e) => update(r.id, { cta_label: e.target.value })} className="input"/></Field>
              <Field label="CTA URL"><input value={r.cta_url} onChange={(e) => update(r.id, { cta_url: e.target.value })} className="input"/></Field>
            </div>
            <FeaturesEditor value={r.features} onChange={(features) => update(r.id, { features })}/>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-600">Highlighted <PublishToggle value={r.highlighted} onChange={(v) => update(r.id, { highlighted: v })}/></label>
              <label className="flex items-center gap-2 text-xs text-gray-600">Order <input type="number" value={r.display_order} onChange={(e) => update(r.id, { display_order: Number(e.target.value) })} className="input w-20 text-xs"/></label>
              <label className="flex items-center gap-2 text-xs text-gray-600">Published <PublishToggle value={r.published} onChange={(v) => update(r.id, { published: v })}/></label>
            </div>
            <div className="pt-1 border-t border-gray-100">
              <button
                onClick={() => save(r.id)}
                disabled={saving.has(r.id) || !dirty.has(r.id)}
                className={`w-full inline-flex items-center justify-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-md transition-colors ${
                  saving.has(r.id) ? "bg-indigo-500 text-white opacity-70 cursor-not-allowed"
                  : dirty.has(r.id) ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                  : "bg-gray-100 text-gray-400 cursor-default"
                }`}
              >
                {saving.has(r.id) ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}
                {saving.has(r.id) ? "Saving…" : dirty.has(r.id) ? "Save & publish" : "All changes saved"}
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-gray-500">No pricing plans yet.</p>}
      </div>

      <style jsx>{`
        .input { width: 100%; padding: 0.4rem 0.6rem; border: 1px solid #e5e7eb; border-radius: 0.4rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #9ca3af; box-shadow: 0 0 0 3px rgba(156,163,175,0.15); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-xs font-medium text-gray-600">{label}</span>{children}</label>;
}
function FeaturesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <span className="text-xs font-medium text-gray-600">Features</span>
      <div className="flex flex-wrap gap-1.5 mt-1 p-2 border border-gray-200 rounded-md min-h-[2.25rem]">
        {value.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
            {f}<button onClick={() => onChange(value.filter((_, j) => j !== i))}><X className="h-3 w-3 text-gray-400 hover:text-red-600"/></button>
          </span>
        ))}
        <input
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { e.preventDefault(); onChange([...value, draft.trim()]); setDraft(""); } }}
          placeholder="Type and press Enter…" className="flex-1 min-w-[120px] text-xs outline-none"/>
      </div>
    </div>
  );
}
