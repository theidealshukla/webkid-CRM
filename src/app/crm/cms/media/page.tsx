"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { media as api } from "@/lib/cms/queries";
import type { MediaAsset } from "@/lib/cms/types";

export default function MediaLibrary() {
  const [rows, setRows] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    try { setRows(await api.list()); }
    catch (e: any) { toast.error(e?.message ?? "Load failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { reload(); }, []);

  async function remove(a: MediaAsset) {
    if (!confirm("Delete from Cloudinary and library?")) return;
    try {
      await fetch("/api/cms/cloudinary/delete", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: a.public_id, resource_type: a.resource_type }),
      });
      await api.remove(a.id);
      setRows((r) => r.filter((x) => x.id !== a.id));
    } catch (e: any) { toast.error(e?.message ?? "Delete failed"); }
  }

  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/>Loading…</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Everything uploaded through the CMS. Deleting here removes it from Cloudinary too.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {rows.map((a) => (
          <div key={a.id} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white">
            {a.resource_type === "image" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.url} alt="" className="w-full aspect-square object-cover"/>
            ) : (
              <video src={a.url} className="w-full aspect-square object-cover" preload="metadata"/>
            )}
            <button onClick={() => remove(a)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition shadow"><Trash2 className="h-3.5 w-3.5 text-red-600"/></button>
            <div className="px-2 py-1 text-[10px] text-gray-500 font-mono truncate">{a.public_id.split("/").at(-1)}</div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-gray-500 col-span-full">No uploads yet.</p>}
      </div>
    </div>
  );
}
