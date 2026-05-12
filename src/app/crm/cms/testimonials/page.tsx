"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { testimonials as api, revalidatePublic } from "@/lib/cms/queries";
import type { Testimonial, TestimonialType } from "@/lib/cms/types";
import { MediaUploader } from "@/components/cms/MediaUploader";
import { PublishToggle } from "@/components/cms/PublishToggle";

export default function TestimonialsPage() {
  const [rows, setRows] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());

  async function reload() {
    try { setRows(await api.list()); }
    catch (e: any) { toast.error(e?.message ?? "Load failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  async function add(type: TestimonialType) {
    try {
      const created = await api.create({
        type, author_name: "New", display_order: (rows.at(-1)?.display_order ?? 0) + 10, published: true,
      });
      setRows((r) => [...r, created]);
    } catch (e: any) { toast.error(e?.message ?? "Add failed"); }
  }

  function update(id: string, p: Partial<Testimonial>) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setDirty((d) => new Set(d).add(id));
  }

  async function save(id: string) {
    const row = rows.find((x) => x.id === id);
    if (!row) return;
    setSaving((s) => new Set(s).add(id));
    try {
      await api.update(id, row);
      await revalidatePublic("cms:testimonials");
      setDirty((d) => { const n = new Set(d); n.delete(id); return n; });
      toast.success("Saved — public site will refresh shortly.");
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving((s) => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this testimonial?")) return;
    setRows((r) => r.filter((x) => x.id !== id));
    try { await api.remove(id); await revalidatePublic("cms:testimonials"); }
    catch (e: any) { toast.error(e?.message ?? "Delete failed"); reload(); }
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">Mix of text quotes, screenshots (e.g. WhatsApp chats), and videos.</p>
        <div className="flex gap-1.5">
          {(["text","screenshot","video"] as TestimonialType[]).map(t => (
            <button key={t} onClick={() => add(t)} className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md">
              <Plus className="h-3.5 w-3.5"/> {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {rows.map((r) => (
          <div key={r.id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-semibold uppercase tracking-wider text-gray-600">{r.type}</span>
              <button onClick={() => remove(r.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4"/></button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Author"><input value={r.author_name} onChange={(e) => update(r.id, { author_name: e.target.value })} className="input"/></Field>
              <Field label="Handle/Role"><input value={r.author_handle ?? ""} onChange={(e) => update(r.id, { author_handle: e.target.value })} className="input"/></Field>
            </div>
            <Field label="Avatar (optional)">
              <MediaUploader resourceType="image" folder="avatars"
                value={r.author_avatar_url ? { url: r.author_avatar_url, public_id: r.author_avatar_public_id ?? "" } : null}
                onChange={(v) => update(r.id, { author_avatar_url: v?.url ?? null, author_avatar_public_id: v?.public_id ?? null })}/>
            </Field>

            {r.type === "text" && (
              <Field label="Quote"><textarea rows={3} value={r.quote ?? ""} onChange={(e) => update(r.id, { quote: e.target.value })} className="input"/></Field>
            )}
            {r.type === "screenshot" && (
              <Field label="Screenshot">
                <MediaUploader resourceType="image" folder="testimonials"
                  value={r.screenshot_url ? { url: r.screenshot_url, public_id: r.screenshot_public_id ?? "" } : null}
                  onChange={(v) => update(r.id, { screenshot_url: v?.url ?? null, screenshot_public_id: v?.public_id ?? null })}/>
              </Field>
            )}
            {r.type === "video" && (
              <>
                <Field label="Video">
                  <MediaUploader resourceType="video" folder="testimonials"
                    value={r.video_url ? { url: r.video_url, public_id: r.video_public_id ?? "" } : null}
                    onChange={(v) => update(r.id, { video_url: v?.url ?? null, video_public_id: v?.public_id ?? null })}/>
                </Field>
                <Field label="Poster (optional)">
                  <MediaUploader resourceType="image" folder="testimonials"
                    value={r.video_poster_url ? { url: r.video_poster_url, public_id: "" } : null}
                    onChange={(v) => update(r.id, { video_poster_url: v?.url ?? null })}/>
                </Field>
              </>
            )}

            <Field label="Outbound link (optional)"><input value={r.link ?? ""} onChange={(e) => update(r.id, { link: e.target.value })} className="input"/></Field>
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
        {rows.length === 0 && <p className="text-sm text-gray-500">No testimonials yet.</p>}
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
