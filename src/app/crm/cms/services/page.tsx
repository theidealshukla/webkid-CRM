"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { services as api, revalidatePublic } from "@/lib/cms/queries";
import type { Service } from "@/lib/cms/types";
import { PublishToggle } from "@/components/cms/PublishToggle";

export default function ServicesPage() {
  const [rows, setRows] = useState<Service[]>([]);
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
    try {
      const created = await api.create({
        title: "New Service", features: [], display_order: (rows.at(-1)?.display_order ?? 0) + 10, published: true,
      });
      setRows((r) => [...r, created]);
    } catch (e: any) { toast.error(e?.message ?? "Add failed"); }
  }

  function update(id: string, p: Partial<Service>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setDirty((d) => new Set(d).add(id));
  }

  async function save(id: string) {
    const row = rows.find((x) => x.id === id);
    if (!row) return;
    setSaving((s) => new Set(s).add(id));
    try {
      await api.update(id, row);
      await revalidatePublic("cms:services");
      setDirty((d) => { const n = new Set(d); n.delete(id); return n; });
      toast.success("Saved — public site will refresh shortly.");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    setRows((r) => r.filter((x) => x.id !== id));
    try { await api.remove(id); await revalidatePublic("cms:services"); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); reload(); }
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Service cards shown on the homepage.</p>
        <button onClick={add} className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-3 py-1.5 rounded-md">
          <Plus className="h-4 w-4"/> Add service
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <input value={r.title} onChange={(e) => update(r.id, { title: e.target.value })} className="input font-semibold flex-1 mr-2"/>
              <button onClick={() => remove(r.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
            </div>
            <input value={r.tagline ?? ""} placeholder="Tagline" onChange={(e) => update(r.id, { tagline: e.target.value })} className="input text-sm"/>
            <textarea rows={2} value={r.description ?? ""} placeholder="Description" onChange={(e) => update(r.id, { description: e.target.value })} className="input text-sm"/>
            <input value={r.icon_name ?? ""} placeholder="Lucide icon name (e.g. Code, Palette)" onChange={(e) => update(r.id, { icon_name: e.target.value })} className="input text-xs font-mono"/>
            <FeaturesEditor value={r.features} onChange={(features) => update(r.id, { features })}/>
            <div className="flex items-center justify-between flex-wrap gap-2">
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
        {rows.length === 0 && <p className="text-sm text-gray-500">No services yet.</p>}
      </div>

      <style jsx>{`
        .input { width: 100%; padding: 0.4rem 0.6rem; border: 1px solid #e5e7eb; border-radius: 0.4rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #9ca3af; box-shadow: 0 0 0 3px rgba(156,163,175,0.15); }
      `}</style>
    </div>
  );
}

function FeaturesEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <span className="text-xs font-medium text-gray-600">Features</span>
      <div className="flex flex-wrap gap-1.5 mt-1 p-2 border border-gray-200 rounded-md min-h-[2.25rem]">
        {value.map((f, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
            {f}
            <button onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600"><X className="h-3 w-3"/></button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) { e.preventDefault(); onChange([...value, draft.trim()]); setDraft(""); } }}
          placeholder="Type and press Enter…"
          className="flex-1 min-w-[120px] text-xs outline-none"
        />
      </div>
    </div>
  );
}
