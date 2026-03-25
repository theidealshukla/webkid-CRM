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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCRM } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface ManualLeadModalProps {
  open: boolean;
  onClose: () => void;
}

export function ManualLeadModal({ open, onClose }: ManualLeadModalProps) {
  const { addLead } = useCRM();
  const { user } = useAuth();
  const [form, setForm] = useState({
    businessName: "",
    phone: "",
    whatsapp: "",
    email: "",
    website: "",
    instagramLink: "",
    mapsLink: "",
    address: "",
    niche: "",
    manualNotes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    addLead({
      ...form,
      status: "new",
      assignedTo: null,
      source: "manual",
      uploadedBy: user?.id,
    });

    toast.success(`Lead "${form.businessName}" added successfully`);
    setForm({
      businessName: "",
      phone: "",
      whatsapp: "",
      email: "",
      website: "",
      instagramLink: "",
      mapsLink: "",
      address: "",
      niche: "",
      manualNotes: "",
    });
    onClose();
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
          <DialogDescription>Enter lead information manually</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>Business Name *</Label>
              <Input
                value={form.businessName}
                onChange={(e) => updateField("businessName", e.target.value)}
                placeholder="Enter business name"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="+1-555-0000"
              />
            </div>

            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) => updateField("whatsapp", e.target.value)}
                placeholder="WhatsApp number"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input
                value={form.instagramLink}
                onChange={(e) => updateField("instagramLink", e.target.value)}
                placeholder="Instagram link"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Google Maps Link</Label>
              <Input
                value={form.mapsLink}
                onChange={(e) => updateField("mapsLink", e.target.value)}
                placeholder="Maps link"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Address"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Niche</Label>
              <Input
                value={form.niche}
                onChange={(e) => updateField("niche", e.target.value)}
                placeholder="e.g. Dentist, Plumber"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.manualNotes}
              onChange={(e) => updateField("manualNotes", e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Add Lead</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
