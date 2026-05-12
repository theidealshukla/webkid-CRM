"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { projects as api, revalidatePublic } from "@/lib/cms/queries";
import type { Project } from "@/lib/cms/types";
import { MediaUploader } from "@/components/cms/MediaUploader";
import { PublishToggle } from "@/components/cms/PublishToggle";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function ProjectsPage() {
  const [rows, setRows] = useState<Project[]>([]);
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
    const title = prompt("Project title?") ?? "";
    if (!title) return;
    try {
      const created = await api.create({
        title, slug: slugify(title), category: "Website",
        description: "", result: "", year: String(new Date().getFullYear()),
        status: "Live", featured: false, published: true,
        homepage_span: "col-span-1", projects_span: "col-span-1",
        display_order: (rows.at(-1)?.display_order ?? 0) + 10,
      });
      setRows((r) => [...r, created]);
    } catch (e: any) { toast.error(e?.message ?? "Add failed"); }
  }

  function update(id: string, p: Partial<Project>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setDirty((d) => new Set(d).add(id));
  }

  async function save(id: string) {
    const row = rows.find((x) => x.id === id);
    if (!row) return;
    setSaving((s) => new Set(s).add(id));
    try {
      await api.update(id, { ...row, updated_at: new Date().toISOString() });
      await revalidatePublic("cms:projects");
      setDirty((d) => { const n = new Set(d); n.delete(id); return n; });
      toast.success("Saved — public site will refresh shortly.");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this project?")) return;
    setRows((r) => r.filter((x) => x.id !== id));
    try { await api.remove(id); await revalidatePublic("cms:projects"); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); reload(); }
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Manage portfolio entries shown on the homepage and /projects.</p>
        <button onClick={add} className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-3 py-1.5 rounded-md">
          <Plus className="h-4 w-4"/> Add project
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rows.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <input value={r.title} onChange={(e) => update(r.id, { title: e.target.value })} className="input font-semibold flex-1 mr-2"/>
              <button onClick={() => remove(r.id)} className="p-1 text-gray-400 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4"/></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Slug"><input value={r.slug} onChange={(e) => update(r.id, { slug: e.target.value })} className="input"/></Field>
              <Field label="Category"><input value={r.category} onChange={(e) => update(r.id, { category: e.target.value })} className="input"/></Field>
              <Field label="Year"><input value={r.year} onChange={(e) => update(r.id, { year: e.target.value })} className="input"/></Field>
              <Field label="Status">
                <select value={r.status} onChange={(e) => update(r.id, { status: e.target.value as any })} className="input">
                  <option>Live</option><option>Coming Soon</option><option>In Progress</option>
                </select>
              </Field>
            </div>
            <Field label="Description"><textarea value={r.description} rows={2} onChange={(e) => update(r.id, { description: e.target.value })} className="input"/></Field>
            <Field label="Result line"><input value={r.result} placeholder="30+ leads in first month" onChange={(e) => update(r.id, { result: e.target.value })} className="input"/></Field>
            <Field label="Live URL"><input value={r.live_url ?? ""} onChange={(e) => update(r.id, { live_url: e.target.value })} className="input"/></Field>
            <Field label="Screenshot">
              <MediaUploader resourceType="image" folder="projects"
                value={r.image_url ? { url: r.image_url, public_id: r.image_public_id ?? "" } : null}
                onChange={(v) => update(r.id, { image_url: v?.url ?? null, image_public_id: v?.public_id ?? null })}/>
            </Field>
            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs text-gray-600">Featured <PublishToggle value={r.featured} onChange={(v) => update(r.id, { featured: v })}/></label>
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
        {rows.length === 0 && <p className="text-sm text-gray-500">No projects yet.</p>}
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
