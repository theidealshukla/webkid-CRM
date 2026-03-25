"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Download, RotateCcw, FileSpreadsheet, Clock } from "lucide-react";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { LeadRow, MobileLeadCard } from "./components/LeadRow";
import LeadTableSkeleton from "./components/LeadTableSkeleton";
import EmptyState from "./components/EmptyState";
import { nicheColors } from "@/lib/constants";
import { STATUS_LABELS } from "@/lib/constants";
import type { LeadStatus } from "@/types";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 50;

export default function LeadsPage() {
  const { leads, batches, updateLeadStatus, assignLead, archiveLead, isLoadingData } = useCRM();
  const { teamMembers } = useAuth();
  const teamNames = useMemo(() => teamMembers.map((m) => m.name), [teamMembers]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [nicheFilter, setNicheFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const activeLeads = useMemo(() => leads.filter((l) => !l.isArchived), [leads]);

  const niches = useMemo(
    () => [...new Set(activeLeads.map((l) => l.niche).filter(Boolean))],
    [activeLeads]
  );
  const assignees = useMemo(
    () => [...new Set(activeLeads.map((l) => l.assignedToName).filter(Boolean) as string[])],
    [activeLeads]
  );

  const filteredLeads = useMemo(() => {
    let result = activeLeads;

    if (batchFilter) {
      result = result.filter((l) => l.batchId === batchFilter);
    }
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (l) =>
          l.businessName.toLowerCase().includes(q) ||
          l.phone?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.niche?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      result = result.filter((l) => l.status === statusFilter);
    }
    if (sourceFilter !== "all") {
      result = result.filter((l) => l.source === sourceFilter);
    }
    if (nicheFilter !== "all") {
      result = result.filter((l) => l.niche === nicheFilter);
    }
    if (assigneeFilter !== "all") {
      result = result.filter((l) => l.assignedToName === assigneeFilter);
    }
    return result;
  }, [activeLeads, debouncedSearch, statusFilter, sourceFilter, nicheFilter, assigneeFilter, batchFilter]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = useMemo(
    () => filteredLeads.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredLeads, currentPage]
  );

  const handleStatusChange = useCallback(
    (leadId: string, status: LeadStatus) => updateLeadStatus(leadId, status),
    [updateLeadStatus]
  );

  const handleAssign = useCallback(
    (leadId: string, assignee: string) => assignLead(leadId, assignee),
    [assignLead]
  );

  const handleArchive = useCallback(
    (leadId: string) => {
      archiveLead(leadId);
      toast.success("Lead archived");
    },
    [archiveLead]
  );

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setSourceFilter("all");
    setNicheFilter("all");
    setAssigneeFilter("all");
    setBatchFilter(null);
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Leads");

      ws.columns = [
        { header: "Business Name", key: "businessName", width: 30 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 25 },
        { header: "Website", key: "website", width: 30 },
        { header: "Niche", key: "niche", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Assigned To", key: "assignedTo", width: 15 },
        { header: "Source", key: "source", width: 10 },
        { header: "Address", key: "address", width: 30 },
        { header: "Maps Link", key: "mapsLink", width: 30 },
      ];

      filteredLeads.forEach((lead) => {
        ws.addRow({
          businessName: lead.businessName,
          phone: lead.phone || "",
          email: lead.email || "",
          website: lead.website || "",
          niche: lead.niche || "",
          status: STATUS_LABELS[lead.status] || lead.status,
          assignedTo: lead.assignedToName || "Unassigned",
          source: lead.source || "",
          address: lead.address || "",
          mapsLink: lead.mapsLink || "",
        });
      });

      // Style header
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E5E5" } };
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Leads exported successfully");
    } catch (e) {
      console.error("Export error:", e);
      toast.error("Failed to export leads");
    }
  };

  if (isLoadingData) return <LeadTableSkeleton />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Leads</h1>
        <p className="text-sm text-gray-500 mt-1">{activeLeads.length} total leads</p>
      </div>

      {/* Batch Cards */}
      {batches.length > 0 && !batchFilter && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {batches.slice(0, 4).map((batch) => {
            const colorClass = nicheColors[batch.niche] || nicheColors.default;
            return (
              <button
                key={batch.id}
                onClick={() => { setBatchFilter(batch.id); setCurrentPage(1); }}
                className={`text-left border ${colorClass.split(" ").find((c) => c.startsWith("border-"))} rounded-xl p-3 hover:shadow-md transition-all ${colorClass.split(" ").find((c) => c.startsWith("bg-"))}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileSpreadsheet className={`h-4 w-4 ${colorClass.split(" ").find((c) => c.startsWith("text-"))}`} />
                  <span className="text-xs font-medium truncate">{batch.fileName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-[10px]">{batch.leadCount} leads</Badge>
                  <span className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(batch.uploadedAt)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {batchFilter && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Filtered by batch: {batches.find((b) => b.id === batchFilter)?.fileName}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => { setBatchFilter(null); setCurrentPage(1); }}>
            Clear
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="interested">Interested</SelectItem>
            <SelectItem value="follow_up">Follow Up</SelectItem>
            <SelectItem value="not_interested">Not Interested</SelectItem>
            <SelectItem value="closed_won">Closed Won</SelectItem>
            <SelectItem value="closed_lost">Closed Lost</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Source</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
            <SelectItem value="excel">Excel</SelectItem>
            <SelectItem value="website">Website</SelectItem>
          </SelectContent>
        </Select>

        <Select value={nicheFilter} onValueChange={(v) => { setNicheFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Niche" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Niches</SelectItem>
            {niches.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assigneeFilter} onValueChange={(v) => { setAssigneeFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            {assignees.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" /> Export
        </Button>

        <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>

      {/* Desktop Table */}
      {filteredLeads.length === 0 ? (
        <EmptyState type={activeLeads.length === 0 ? "no-leads" : "no-results"} />
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/50">
                  <TableHead className="w-[4%]">#</TableHead>
                  <TableHead className="w-[23%]">Business Name</TableHead>
                  <TableHead className="w-[11%]">Phone</TableHead>
                  <TableHead className="w-[9%]">Source</TableHead>
                  <TableHead className="w-[11%]">Niche</TableHead>
                  <TableHead className="w-[10%]">Status</TableHead>
                  <TableHead className="w-[11%]">Assignee</TableHead>
                  <TableHead className="w-[11%]">Activity</TableHead>
                  <TableHead className="w-[5%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((lead, idx) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    index={(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                    onStatusChange={handleStatusChange}
                    onAssign={handleAssign}
                    onArchive={handleArchive}
                    teamMembers={teamNames}
                  />
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {paginatedLeads.map((lead) => (
              <MobileLeadCard
                key={lead.id}
                lead={lead}
                onStatusChange={handleStatusChange}
                onAssign={handleAssign}
                onArchive={handleArchive}
                teamMembers={teamNames}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredLeads.length)} of{" "}
                {filteredLeads.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
