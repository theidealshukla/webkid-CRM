"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCRM } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";

export default function ManualLeadsPage() {
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
      assignedTo: user?.name || "",
      source: "manual",
      uploadedBy: user?.name,
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
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Add Lead Manually</h1>
        <p className="text-sm text-gray-500 mt-1">Enter lead information below</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label>Business Name *</Label>
                <Input value={form.businessName} onChange={(e) => updateField("businessName", e.target.value)} placeholder="Enter business name" required />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="+1-555-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp} onChange={(e) => updateField("whatsapp", e.target.value)} placeholder="WhatsApp number" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="email@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://..." />
              </div>
              <div className="space-y-1.5">
                <Label>Instagram</Label>
                <Input value={form.instagramLink} onChange={(e) => updateField("instagramLink", e.target.value)} placeholder="Instagram link" />
              </div>
              <div className="space-y-1.5">
                <Label>Google Maps Link</Label>
                <Input value={form.mapsLink} onChange={(e) => updateField("mapsLink", e.target.value)} placeholder="Maps link" />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Address" />
              </div>
              <div className="space-y-1.5">
                <Label>Niche</Label>
                <Input value={form.niche} onChange={(e) => updateField("niche", e.target.value)} placeholder="e.g. Dentist, Plumber" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.manualNotes} onChange={(e) => updateField("manualNotes", e.target.value)} placeholder="Any additional notes..." rows={3} />
            </div>
            <Button type="submit" className="gap-2">
              <PlusCircle className="h-4 w-4" /> Add Lead
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
