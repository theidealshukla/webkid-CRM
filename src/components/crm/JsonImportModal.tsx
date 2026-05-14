"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Clipboard } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";
import type { Lead } from "@/types";
import { toast } from "sonner";

interface JsonImportModalProps {
  open: boolean;
  onClose: () => void;
  batchId: string;
  folderName: string;
}

interface LeadJson {
  businessName?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagramLink?: string;
  niche?: string;
  address?: string;
  mapsLink?: string;
  manualNotes?: string;
}

interface ImportJson {
  niche?: string;
  leads: LeadJson[];
}

export function JsonImportModal({ open, onClose, batchId, folderName }: JsonImportModalProps) {
  const [raw, setRaw] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ImportJson | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { addLead } = useCRM();
  const { user } = useAuth();

  const handleChange = (value: string) => {
    setRaw(value);
    setParseError(null);
    setParsed(null);

    if (!value.trim()) return;

    try {
      const data = JSON.parse(value);

      // Accept either { leads: [...] } or a bare array
      const rawLeads: LeadJson[] = Array.isArray(data) ? data : data.leads;

      if (!Array.isArray(rawLeads)) {
        setParseError('JSON must have a "leads" array, or be a plain array of lead objects.');
        return;
      }

      const valid = rawLeads.filter((l) => l.businessName || l.phone);

      if (valid.length === 0) {
        setParseError("No valid leads found. Each entry needs at least a businessName or phone.");
        return;
      }

      setParsed({ niche: data.niche, leads: valid });
    } catch {
      setParseError("Invalid JSON. Make sure you copied the full output from the AI agent.");
    }
  };

  const handleImport = async () => {
    if (!parsed) return;
    setIsImporting(true);

    const defaultNiche = parsed.niche || "";

    const leadsToAdd: Omit<Lead, "id" | "createdAt" | "lastActivity">[] = parsed.leads.map((l) => ({
      businessName: l.businessName || "",
      phone: l.phone || "",
      whatsapp: l.whatsapp || "",
      email: l.email || "",
      website: l.website || "",
      instagramLink: l.instagramLink || "",
      niche: l.niche || defaultNiche,
      address: l.address || "",
      mapsLink: l.mapsLink || "",
      manualNotes: l.manualNotes || "",
      status: "new" as const,
      source: "manual" as const,
      assignedTo: user?.id || null,
      uploadedBy: user?.id || null,
      batchId,
    }));

    for (const lead of leadsToAdd) {
      // addLead is async at runtime even though typed as void
      await (addLead(lead) as unknown as Promise<void>);
    }

    toast.success(`Added ${leadsToAdd.length} lead${leadsToAdd.length !== 1 ? "s" : ""} to "${folderName}"`);
    setRaw("");
    setParsed(null);
    setParseError(null);
    setIsImporting(false);
    onClose();
  };

  const handleClose = () => {
    setRaw("");
    setParsed(null);
    setParseError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Paste JSON Leads</DialogTitle>
          <DialogDescription>
            Paste your AI agent&apos;s JSON output below. Leads will be added directly into{" "}
            <span className="font-semibold text-gray-700 dark:text-[#d1d1d3]">{folderName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <textarea
            value={raw}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={`{\n  "niche": "Restaurant",\n  "leads": [\n    {\n      "businessName": "Cafe Delight",\n      "phone": "+91 98765 43210",\n      "email": "cafe@gmail.com",\n      "website": "www.cafedelight.com",\n      "instagramLink": "https://instagram.com/cafedelight",\n      "manualNotes": "10k followers, active"\n    }\n  ]\n}`}
            rows={12}
            className="w-full rounded-xl border border-gray-200 dark:border-[#363638] bg-gray-50/50 dark:bg-[#1e1e20] text-sm font-mono text-gray-800 dark:text-[#d1d1d3] p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 placeholder:text-gray-300 dark:placeholder:text-[#48484a]"
          />

          {parseError && (
            <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30 rounded-xl p-3">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {parsed && !parseError && (
            <div className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-3">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">
                  {parsed.leads.length} lead{parsed.leads.length !== 1 ? "s" : ""} ready
                </span>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-0.5">
                  {parsed.leads.slice(0, 3).map((l) => l.businessName || l.phone).join(", ")}
                  {parsed.leads.length > 3 && ` +${parsed.leads.length - 3} more`}
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1 rounded-xl border-gray-200 dark:border-[#363638] dark:bg-[#1e1e20] dark:text-[#d1d1d3]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!parsed || isImporting}
              className="flex-1 rounded-xl font-bold bg-gray-900 dark:bg-[#f5f5f7] hover:bg-black dark:hover:bg-white text-white dark:text-[#0c0c0d] border-0"
            >
              {isImporting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 dark:border-[#0c0c0d]/30 border-t-white dark:border-t-[#0c0c0d] rounded-full animate-spin" />
                  Adding...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Clipboard className="h-4 w-4" />
                  Add to Folder
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
