"use client";

import React, { useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import { toast } from "sonner";

export default function ArchivedPage() {
  const { leads, restoreLead, deleteLead } = useCRM();

  const archivedLeads = useMemo(() => leads.filter((l) => l.isArchived), [leads]);

  const handleRestore = useCallback((id: string) => {
    restoreLead(id);
    toast.success("Lead restored");
  }, [restoreLead]);

  const handleDelete = useCallback((id: string) => {
    deleteLead(id);
    toast.success("Lead permanently deleted");
  }, [deleteLead]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Archived</h1>
        <p className="text-sm text-gray-500 mt-1">{archivedLeads.length} archived leads</p>
      </div>

      {archivedLeads.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Archive className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">No archived leads</h3>
            <p className="text-sm text-gray-500">Archived leads will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {archivedLeads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{lead.businessName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{lead.niche}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-400">{lead.phone}</span>
                  </div>
                  <span className="text-xs text-gray-400">{lead.createdAt ? formatTimeAgo(lead.createdAt) : ""}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleRestore(lead.id)} className="gap-1">
                    <RotateCcw className="h-3.5 w-3.5" /> Restore
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(lead.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50 gap-1">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
