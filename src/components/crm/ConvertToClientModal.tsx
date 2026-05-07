"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Briefcase, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  count: number;
  onConfirm: (services: string, notes: string) => Promise<void> | void;
  initialServices?: string;
  initialNotes?: string;
  mode?: "convert" | "edit";
}

export function ConvertToClientModal({
  open, onClose, count, onConfirm, initialServices = "", initialNotes = "", mode = "convert",
}: Props) {
  const [services, setServices] = useState(initialServices);
  const [notes, setNotes] = useState(initialNotes);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    if (open) {
      setServices(initialServices);
      setNotes(initialNotes);
    }
  }, [open, initialServices, initialNotes]);

  const submit = async () => {
    setSubmitting(true);
    try {
      await onConfirm(services.trim(), notes.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Briefcase className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle>
                {isEdit
                  ? "Edit client info"
                  : `Convert ${count} lead${count > 1 ? "s" : ""} to client${count > 1 ? "s" : ""}`}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isEdit
                  ? "Update services and notes for this client."
                  : "Track what services you're providing. Activity history is preserved."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="services">Services</Label>
            <Input
              id="services"
              placeholder="Website, SEO, Branding"
              value={services}
              onChange={(e) => setServices(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-gray-500">Comma-separated list of what you're delivering.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input
              id="notes"
              placeholder="Started Jan 2026 · 3-month contract"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving</> : (isEdit ? "Save changes" : "Convert")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
