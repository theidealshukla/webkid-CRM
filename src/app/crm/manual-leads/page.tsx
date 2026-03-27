"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Search, Download, RotateCcw, Plus } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";
import { useDebounce } from "@/hooks/useDebounce";
import { LeadRow, MobileLeadCard } from "../leads/components/LeadRow";
import LeadTableSkeleton from "../leads/components/LeadTableSkeleton";
import EmptyState from "../leads/components/EmptyState";
import { STATUS_LABELS } from "@/lib/constants";
import type { LeadStatus } from "@/types";
import { toast } from "sonner";
import { ManualLeadModal } from "@/components/crm/ManualLeadModal";

const ITEMS_PER_PAGE = 50;

export default function ManualLeadsPage() {
  const { leads, updateLeadStatus, assignLead, archiveLead, deleteLead, isLoadingData } = useCRM();
  const { teamMembers } = useAuth();
  const teamNames = useMemo(() => teamMembers.map((m) => m.name), [teamMembers]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nicheFilter, setNicheFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Filter ONLY manual leads that are not archived
  const manualLeads = useMemo(
    () => leads.filter((l) => !l.isArchived && l.source === "manual"),
    [leads]
  );

  const niches = useMemo(
    () => [...new Set(manualLeads.map((l) => l.niche).filter(Boolean))],
    [manualLeads]
  );
  
  const assignees = useMemo(
    () => [...new Set(manualLeads.map((l) => l.assignedToName).filter(Boolean) as string[])],
    [manualLeads]
  );

  const filteredLeads = useMemo(() => {
    let result = manualLeads;

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
    if (nicheFilter !== "all") {
      result = result.filter((l) => l.niche === nicheFilter);
    }
    if (assigneeFilter !== "all") {
      result = result.filter((l) => l.assignedToName === assigneeFilter);
    }
    return result;
  }, [manualLeads, debouncedSearch, statusFilter, nicheFilter, assigneeFilter]);

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
    },
    [archiveLead]
  );

  const handleDelete = useCallback(
    (leadId: string) => {
      deleteLead(leadId);
    },
    [deleteLead]
  );

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setNicheFilter("all");
    setAssigneeFilter("all");
    setCurrentPage(1);
  };

  const handleExport = async () => {
    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Manual Leads");

      ws.columns = [
        { header: "Business Name", key: "businessName", width: 30 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Email", key: "email", width: 25 },
        { header: "Website", key: "website", width: 30 },
        { header: "Niche", key: "niche", width: 15 },
        { header: "Status", key: "status", width: 15 },
        { header: "Assigned To", key: "assignedTo", width: 15 },
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
      a.download = `manual_leads_export_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Manual leads exported successfully");
    } catch (e) {
      console.error("Export error:", e);
      toast.error("Failed to export leads");
    }
  };

  if (isLoadingData) return <LeadTableSkeleton />;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Manual Leads</h1>
          <p className="text-sm text-gray-500 mt-1">{manualLeads.length} manually added leads</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 rounded-xl shadow-sm h-11 px-6 font-bold bg-indigo-600 hover:bg-indigo-700 text-white">
          <Plus className="h-5 w-5" /> Add New Manual Lead
        </Button>
      </div>

      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search manual leads..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9 rounded-xl border-gray-200 bg-gray-50 hover:bg-white focus:bg-white transition-colors"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-36 rounded-xl border-gray-200">
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

          <Select value={nicheFilter} onValueChange={(v) => { setNicheFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="w-36 rounded-xl border-gray-200">
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
            <SelectTrigger className="w-36 rounded-xl border-gray-200">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {assignees.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2 rounded-xl text-gray-700">
            <Download className="h-4 w-4" /> Export
          </Button>

          <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-2 rounded-xl text-gray-500 hover:text-gray-900">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>

        {/* Desktop Table */}
        {filteredLeads.length === 0 ? (
          <EmptyState type={manualLeads.length === 0 ? "no-leads" : "no-results"} />
        ) : (
          <>
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 border-b border-gray-100/80 hover:bg-gray-50/80">
                    <TableHead className="w-[4%] text-[10px] font-bold uppercase tracking-wider text-gray-400">#</TableHead>
                    <TableHead className="w-[23%] text-[10px] font-bold uppercase tracking-wider text-gray-400">Business Name</TableHead>
                    <TableHead className="w-[11%] text-[10px] font-bold uppercase tracking-wider text-gray-400">Phone</TableHead>
                    <TableHead className="w-[9%] text-[10px] font-bold uppercase tracking-wider text-gray-400">Source</TableHead>
                    <TableHead className="w-[11%] text-[10px] font-bold uppercase tracking-wider text-gray-400">Niche</TableHead>
                    <TableHead className="w-[10%] text-[10px] font-bold uppercase tracking-wider text-gray-400">Status</TableHead>
                    <TableHead className="w-[11%] text-[10px] font-bold uppercase tracking-wider text-gray-400">Assignee</TableHead>
                    <TableHead className="w-[11%] text-[10px] font-bold uppercase tracking-wider text-gray-400">Activity</TableHead>
                    <TableHead className="w-[5%] text-[10px] font-bold uppercase tracking-wider text-gray-400 text-right pr-4">Actions</TableHead>
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
                      onDelete={handleDelete}
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
                  onDelete={handleDelete}
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

      <ManualLeadModal open={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
