"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, X } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";
import type { Lead } from "@/types";
import { toast } from "sonner";

interface ExcelUploadModalProps {
  open: boolean;
  onClose: () => void;
}

export function ExcelUploadModal({ open, onClose }: ExcelUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { uploadExcelLeads } = useCRM();
  const { user } = useAuth();

  const handleFile = useCallback((f: File) => {
    setFile(f);
    // Auto-fill niche and location from filename
    const name = f.name.replace(/\.(xlsx|xls|csv)$/i, "");
    const parts = name.split(/[_\-\s]+/);
    if (parts.length >= 1) setNiche(parts[0]);
    if (parts.length >= 2) setLocation(parts.slice(1).join(" "));
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f && /\.(xlsx|xls|csv)$/i.test(f.name)) {
        handleFile(f);
      } else {
        toast.error("Please upload an Excel file (.xlsx, .xls, or .csv)");
      }
    },
    [handleFile]
  );

  const columnKeywords: Record<string, string[]> = {
    businessName: ["business name", "company", "business", "name"],
    phone: ["phone number", "phone", "contact", "mobile"],
    email: ["email", "mail"],
    website: ["website", "social media", "site", "url", "domain"],
    niche: ["niche", "industry", "category"],
    address: ["address"],
    mapsLink: ["google maps", "maps link", "map link"],
    instagramLink: ["instagram"],
    rating: ["rating"],
  };

  const mapColumn = (header: string): string | null => {
    const lower = header.toLowerCase().trim();
    for (const [field, keywords] of Object.entries(columnKeywords)) {
      if (keywords.some((kw) => lower.includes(kw))) return field;
    }
    return null;
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);

    try {
      const XLSX = await import("xlsx");
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (rows.length === 0) {
        toast.error("No data found in the file");
        setIsUploading(false);
        return;
      }

      const headers = Object.keys(rows[0]);
      const mapping: Record<string, string> = {};
      headers.forEach((h) => {
        const field = mapColumn(h);
        if (field) mapping[h] = field;
      });

      const leads: Omit<Lead, "id" | "createdAt" | "lastActivity">[] = rows.map((row) => {
        const lead: Record<string, unknown> = {
          businessName: "",
          phone: "",
          niche: niche || "",
          status: "new" as const,
          assignedTo: user?.name || "",
          mapsLink: "",
          source: "excel" as const,
          uploadedBy: user?.name || "",
        };

        for (const [header, field] of Object.entries(mapping)) {
          const value = String(row[header] || "").trim();
          if (field === "rating" && value) {
            const match = value.match(/(\d+\.?\d*)/);
            if (match) lead.rating = parseFloat(match[1]);
            const reviewMatch = value.match(/\((\d+)/);
            if (reviewMatch) lead.reviewCount = parseInt(reviewMatch[1]);
          } else {
            lead[field] = value;
          }
        }

        if (!lead.businessName) {
          // Try to find any name-like column
          const nameCol = headers.find(
            (h) => !mapping[h] && (h.toLowerCase().includes("name") || h.toLowerCase().includes("business"))
          );
          if (nameCol) lead.businessName = String(row[nameCol] || "").trim();
        }

        return lead as Omit<Lead, "id" | "createdAt" | "lastActivity">;
      }).filter((l) => l.businessName || l.phone);

      if (leads.length === 0) {
        toast.error("No valid leads found in the file");
        setIsUploading(false);
        return;
      }

      uploadExcelLeads(leads, {
        fileName: file.name,
        niche: niche || "Unknown",
        location: location || "Unknown",
        uploadedAt: new Date().toISOString(),
        leadCount: leads.length,
        uploadedBy: user?.id || "Unknown",
      });

      toast.success(`Successfully imported ${leads.length} leads`);
      setFile(null);
      setNiche("");
      setLocation("");
      onClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to parse Excel file");
    }

    setIsUploading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Excel File</DialogTitle>
          <DialogDescription>Import leads from an Excel spreadsheet</DialogDescription>
        </DialogHeader>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
            dragOver ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
          }`}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3 bg-white p-3 rounded-xl border shadow-sm">
              <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{file.name}</p>
                <p className="text-xs font-medium text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="ml-2 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="mx-auto w-12 h-12 rounded-2xl bg-white border shadow-sm flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-gray-400" />
              </div>
              <p className="text-sm font-bold text-gray-700 mb-1">Drag & drop your Excel file here</p>
              <p className="text-xs font-medium text-gray-400 mb-4">or</p>
              <label className="cursor-pointer">
                <span className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all">
                  Browse Files
                </span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </label>
            </div>
          )}
        </div>

        {/* Niche & Location */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Niche</Label>
            <Input value={niche} onChange={(e) => setNiche(e.target.value)} placeholder="e.g. Plumber" className="rounded-xl bg-gray-50/50" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Downtown" className="rounded-xl bg-gray-50/50" />
          </div>
        </div>

        <Button onClick={handleUpload} disabled={!file || isUploading} className="w-full rounded-xl shadow-sm h-11 mt-2 font-bold select-none">
          {isUploading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Importing...
            </span>
          ) : (
            "Upload & Import"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
