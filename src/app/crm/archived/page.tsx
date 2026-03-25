"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCRM } from "@/context/CRMContext";
import { Archive, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { statusConfig } from "@/lib/constants";
import { toast } from "sonner";

export default function ArchivedPage() {
  const { leads, restoreLead, deleteLead } = useCRM();
  const archivedLeads = leads.filter((l) => l.isArchived);

  // C5 FIX: Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; leadId: string; leadName: string }>({
    open: false,
    leadId: "",
    leadName: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteClick = (leadId: string, leadName: string) => {
    setDeleteConfirm({ open: true, leadId, leadName });
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteLead(deleteConfirm.leadId);
      toast.success(`"${deleteConfirm.leadName}" permanently deleted`);
    } catch {
      toast.error("Failed to delete lead");
    } finally {
      setIsDeleting(false);
      setDeleteConfirm({ open: false, leadId: "", leadName: "" });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Archived Leads</h1>
        <p className="text-sm text-gray-500 mt-1">{archivedLeads.length} archived leads</p>
      </div>

      {archivedLeads.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Archive className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No archived leads</h3>
            <p className="text-sm text-gray-500">Leads you archive will appear here.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {archivedLeads.map((lead) => {
            const st = statusConfig[lead.status] || statusConfig.new;
            return (
              <Card key={lead.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lead.businessName}</p>
                      <p className="text-xs text-gray-500">{lead.niche} • {lead.phone || "No phone"}</p>
                    </div>
                    <Badge className={`${st.bg} ${st.text} text-[10px] uppercase border-0`}>
                      {st.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreLead(lead.id)}
                      className="gap-1"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Restore
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteClick(lead.id, lead.businessName)}
                      className="gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* C5 FIX: Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={(v) => !v && setDeleteConfirm({ open: false, leadId: "", leadName: "" })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete Lead
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>&quot;{deleteConfirm.leadName}&quot;</strong>?
              This action cannot be undone and all associated data will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm({ open: false, leadId: "", leadName: "" })}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="gap-1"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deleting...
                </span>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
