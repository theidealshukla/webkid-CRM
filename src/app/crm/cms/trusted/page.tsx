"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { trustedBusinesses, revalidatePublic } from "@/lib/cms/queries";
import type { TrustedBusiness } from "@/lib/cms/types";
import { MediaUploader } from "@/components/cms/MediaUploader";
import { PublishToggle } from "@/components/cms/PublishToggle";

export default function TrustedPage() {
  const [rows, setRows] = useState<TrustedBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());

  async function reload() {
    try { setRows(await trustedBusinesses.list()); }
    catch (e: any) { toast.error(e?.message ?? "Load failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  async function add() {
    try {
      const created = await trustedBusinesses.create({
        name: "New Business", display_order: (rows.at(-1)?.display_order ?? 0) + 10, published: true,
      });
      setRows((r) => [...r, created]);
    } catch (e: any) { toast.error(e?.message ?? "Add failed"); }
  }

  function update(id: string, p: Partial<TrustedBusiness>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setDirty((d) => new Set(d).add(id));
  }

  async function save(id: string) {
    const row = rows.find((x) => x.id === id);
    if (!row) return;
    setSaving((s) => new Set(s).add(id));
    try {
      await trustedBusinesses.update(id, row);
      await revalidatePublic("cms:trusted");
      setDirty((d) => { const n = new Set(d); n.delete(id); return n; });
      toast.success("Saved — public site will refresh shortly.");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    setRows((r) => r.filter((x) => x.id !== id));
    try { await trustedBusinesses.remove(id); await revalidatePublic("cms:trusted"); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); reload(); }
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Logos and names shown in the marquee strip.</p>
        <button onClick={add} className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-3 py-1.5 rounded-md">
          <Plus className="h-4 w-4"/> Add business
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-lg p-3 space-y-2 bg-white">
            <div className="flex items-start justify-between gap-2">
              <input value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} className="input font-semibold"/>
              <button onClick={() => remove(r.id)} className="p-1 text-gray-400 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4"/></button>
            </div>
            <input value={r.city ?? ""} placeholder="City"     onChange={(e) => update(r.id, { city: e.target.value })} className="input text-sm"/>
            <input value={r.industry ?? ""} placeholder="Industry" onChange={(e) => update(r.id, { industry: e.target.value })} className="input text-sm"/>
            <MediaUploader resourceType="image" folder="logos"
              value={r.logo_url ? { url: r.logo_url, public_id: r.logo_public_id ?? "" } : null}
              onChange={(v) => update(r.id, { logo_url: v?.url ?? null, logo_public_id: v?.public_id ?? null })}/>
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <span>Order</span>
                <input type="number" value={r.display_order} onChange={(e) => update(r.id, { display_order: Number(e.target.value) })} className="input w-20 text-xs"/>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                Published <PublishToggle value={r.published} onChange={(v) => update(r.id, { published: v })}/>
              </label>
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
        {rows.length === 0 && <p className="text-sm text-gray-500">No businesses yet. Click "Add business".</p>}
      </div>

      <style jsx>{`
        .input { width: 100%; padding: 0.4rem 0.6rem; border: 1px solid #e5e7eb; border-radius: 0.4rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: #9ca3af; box-shadow: 0 0 0 3px rgba(156,163,175,0.15); }
      `}</style>
    </div>
  );
}
