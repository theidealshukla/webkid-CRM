"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { media as mediaApi } from "@/lib/cms/queries";

type Props = {
  resourceType: "image" | "video";
  folder?: string;                 // appended after webkid/cms/, e.g. "projects"
  value?: { url: string; public_id: string } | null;
  onChange: (v: { url: string; public_id: string } | null) => void;
  disabled?: boolean;
  className?: string;
  maxBytes?: number;               // soft client-side check
  recordToLibrary?: boolean;       // also insert into cms_media_assets
};

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

export function MediaUploader({
  resourceType, folder = "misc", value, onChange,
  disabled, className, maxBytes, recordToLibrary = true,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  const accept = resourceType === "image" ? "image/*" : "video/*";
  const limit  = maxBytes ?? (resourceType === "image" ? 10 * 1024 * 1024 : 100 * 1024 * 1024);

  async function handleFile(file: File) {
    if (!CLOUD_NAME || !PRESET) {
      setErr("Cloudinary env vars missing — set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.");
      return;
    }
    if (file.size > limit) {
      setErr(`File too large (${(file.size/1024/1024).toFixed(1)}MB > ${(limit/1024/1024)}MB)`);
      return;
    }
    setErr(null); setBusy(true); setPct(0);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", PRESET);
    fd.append("folder", `webkid/cms/${folder}`);

    try {
      const res = await new Promise<{ secure_url: string; public_id: string; resource_type: string; format: string; width?: number; height?: number; duration?: number; bytes: number }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(e); }
          } else reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(fd);
      });

      if (recordToLibrary) {
        try {
          await mediaApi.recordUpload({
            public_id: res.public_id, url: res.secure_url,
            resource_type: resourceType, format: res.format ?? null,
            width: res.width ?? null, height: res.height ?? null,
            duration_s: res.duration ? Math.round(res.duration) : null,
            bytes: res.bytes ?? null,
          });
        } catch { /* non-fatal */ }
      }

      onChange({ url: res.secure_url, public_id: res.public_id });
    } catch (e: any) {
      setErr(e?.message ?? "Upload failed");
    } finally {
      setBusy(false); setPct(0);
    }
  }

  async function handleRemove() {
    if (!value?.public_id) { onChange(null); return; }
    try {
      await fetch("/api/cms/cloudinary/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: value.public_id, resource_type: resourceType }),
      });
    } catch { /* swallow — DB row is the source of truth */ }
    onChange(null);
  }

  return (
    <div className={cn("w-full", className)}>
      {value?.url ? (
        <div className="relative inline-block group">
          {resourceType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt="" className="h-32 w-auto rounded-lg border border-gray-200 object-cover" />
          ) : (
            <video src={value.url} className="h-32 rounded-lg border border-gray-200" controls preload="metadata" />
          )}
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="absolute -top-2 -right-2 rounded-full bg-white border border-gray-200 p-1 shadow hover:bg-red-50 hover:border-red-200"
            aria-label="Remove media"
          >
            <X className="h-3.5 w-3.5 text-gray-700" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || busy}
          className={cn(
            "flex flex-col items-center justify-center gap-2 w-full max-w-xs h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-colors text-gray-500",
            (disabled || busy) && "opacity-60 cursor-not-allowed"
          )}
        >
          {busy ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs">Uploading… {pct}%</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="text-xs font-medium">Upload {resourceType}</span>
              <span className="text-[10px] text-gray-400">max {(limit/1024/1024)}MB</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef} type="file" accept={accept} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ""; }}
      />
      {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
    </div>
  );
}
