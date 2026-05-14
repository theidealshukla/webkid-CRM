"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Briefcase, IndianRupee, Loader2, Calendar, Timer, CheckCircle2 } from "lucide-react";

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

function daysBetween(a: string, b: string): number {
  return Math.round(Math.abs(new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export type ProjectStatus = "in_progress" | "delivered" | "on_hold" | "revision";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  in_progress: "In Progress",
  delivered: "Delivered",
  on_hold: "On Hold",
  revision: "Revision",
};

interface ClientFormData {
  businessName: string;
  phone: string;
  email: string;
  website: string;
  services: string;
  projectStatus: ProjectStatus;
  notes: string;
  projectValueStr: string;
  becameClientAt: string;
  projectStartedAt: string;
  projectDeliveredAt: string;
}

function now(): string {
  return toDatetimeLocal(new Date().toISOString());
}

const EMPTY: ClientFormData = {
  businessName: "", phone: "", email: "", website: "",
  services: "", projectStatus: "in_progress", notes: "", projectValueStr: "",
  becameClientAt: "", projectStartedAt: "", projectDeliveredAt: "",
};

export interface ClientConfirmData extends ClientFormData {
  projectValue?: number;
  becameClientAtISO: string;
  projectStartedAtISO?: string;
  projectDeliveredAtISO?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mode?: "add" | "edit";
  initial?: Partial<ClientFormData>;
  onConfirm: (data: ClientConfirmData) => Promise<void>;
}

export function AddClientModal({ open, onClose, mode = "add", initial, onConfirm }: Props) {
  const [form, setForm] = useState<ClientFormData>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...EMPTY, becameClientAt: now(), projectStartedAt: now(), ...initial });
  }, [open, initial]);

  const set = (k: keyof ClientFormData, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  // Live days count preview
  const daysCount = useMemo(() => {
    if (!form.projectStartedAt) return null;
    const end = (form.projectStatus === "delivered" && form.projectDeliveredAt)
      ? form.projectDeliveredAt
      : toDatetimeLocal(new Date().toISOString());
    return daysBetween(form.projectStartedAt, end);
  }, [form.projectStartedAt, form.projectDeliveredAt, form.projectStatus]);

  const submit = async () => {
    if (!form.businessName.trim() || !form.phone.trim()) return;
    setSubmitting(true);
    try {
      const pv = form.projectValueStr ? parseFloat(form.projectValueStr.replace(/,/g, "")) : undefined;
      await onConfirm({
        ...form,
        projectValue: pv && pv > 0 ? pv : undefined,
        becameClientAtISO: form.becameClientAt ? new Date(form.becameClientAt).toISOString() : new Date().toISOString(),
        projectStartedAtISO: form.projectStartedAt ? new Date(form.projectStartedAt).toISOString() : undefined,
        projectDeliveredAtISO: (form.projectStatus === "delivered" && form.projectDeliveredAt)
          ? new Date(form.projectDeliveredAt).toISOString()
          : undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle>{isEdit ? "Edit client" : "Add client"}</DialogTitle>
              <DialogDescription className="mt-0.5">
                {isEdit ? "Update client details." : "Manually add a client to your CRM."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Row 1 — Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ac-name">Business / Client Name <span className="text-red-400">*</span></Label>
              <Input
                id="ac-name"
                placeholder="Raj Traders"
                value={form.businessName}
                onChange={(e) => set("businessName", e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-phone">Phone <span className="text-red-400">*</span></Label>
              <Input
                id="ac-phone"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
              />
            </div>
          </div>

          {/* Row 2 — Email + Website */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ac-email">Email</Label>
              <Input
                id="ac-email"
                type="email"
                placeholder="client@email.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-website">Website link</Label>
              <Input
                id="ac-website"
                placeholder="https://clientsite.com"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
              />
            </div>
          </div>

          {/* Row 3 — Services + Project Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ac-services">Work done / Services</Label>
              <Input
                id="ac-services"
                placeholder="Website, SEO, Branding"
                value={form.services}
                onChange={(e) => set("services", e.target.value)}
              />
              <p className="text-[11px] text-gray-400">Comma-separated list</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ac-status">Project status</Label>
              <Select value={form.projectStatus} onValueChange={(v) => set("projectStatus", v as ProjectStatus)}>
                <SelectTrigger id="ac-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="revision">Revision</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project Value — add mode only */}
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="ac-value" className="flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 text-emerald-600" />
                Project Value <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">₹</span>
                <Input
                  id="ac-value"
                  placeholder="50000"
                  value={form.projectValueStr}
                  onChange={(e) => set("projectValueStr", e.target.value.replace(/[^0-9,]/g, ""))}
                  className="pl-7"
                />
              </div>
              <p className="text-[11px] text-gray-400">Two payments (50% upfront, 50% on delivery) will be set up automatically.</p>
            </div>
          )}

          {/* ── Timeline section ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Timer className="h-3.5 w-3.5" /> Project Timeline
            </p>

            {/* Client since */}
            <div className="space-y-1.5">
              <Label htmlFor="ac-became" className="text-xs">
                <Calendar className="h-3 w-3 inline mr-1 text-gray-400" />
                Client since
              </Label>
              <Input
                id="ac-became"
                type="datetime-local"
                value={form.becameClientAt}
                onChange={(e) => set("becameClientAt", e.target.value)}
              />
            </div>

            {/* Project started */}
            <div className="space-y-1.5">
              <Label htmlFor="ac-start" className="text-xs">
                <Calendar className="h-3 w-3 inline mr-1 text-emerald-500" />
                Project started
              </Label>
              <Input
                id="ac-start"
                type="datetime-local"
                value={form.projectStartedAt}
                onChange={(e) => set("projectStartedAt", e.target.value)}
              />
            </div>

            {/* Project delivered — only when status = delivered */}
            {form.projectStatus === "delivered" && (
              <div className="space-y-1.5">
                <Label htmlFor="ac-delivered" className="text-xs">
                  <CheckCircle2 className="h-3 w-3 inline mr-1 text-emerald-600" />
                  Project delivered
                </Label>
                <Input
                  id="ac-delivered"
                  type="datetime-local"
                  value={form.projectDeliveredAt}
                  onChange={(e) => set("projectDeliveredAt", e.target.value)}
                />
              </div>
            )}

            {/* Live days count */}
            {daysCount !== null && (
              <div className={`flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2 ${
                form.projectStatus === "delivered"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}>
                <Timer className="h-3.5 w-3.5 shrink-0" />
                {form.projectStatus === "delivered"
                  ? `Delivered in ${daysCount} day${daysCount !== 1 ? "s" : ""}`
                  : `${daysCount} day${daysCount !== 1 ? "s" : ""} in progress so far`}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="ac-notes">Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Textarea
              id="ac-notes"
              placeholder="e.g. 3-month contract, started Jan 2026. Payment: advance received..."
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={submitting || !form.businessName.trim() || !form.phone.trim()}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</>
              : isEdit ? "Save changes" : "Add client"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
