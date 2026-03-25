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
import { Search, Download, RotateCcw, FileSpreadsheet, Clock, Trash2, Users, ArrowRight } from "lucide-react";
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
  const { leads, batches, updateLeadStatus, assignLead, archiveLead, deleteLead, deleteBatch, isLoadingData } = useCRM();
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

    if (batchFilter && batchFilter !== "all_leads") {
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

  const handleDelete = useCallback(
    (leadId: string) => {
      deleteLead(leadId);
      toast.success("Lead deleted");
    },
    [deleteLead]
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

      {/* Batch Cards Grid (Default View) */}
      {!batchFilter && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
          {/* All Leads Card */}
          <Card 
            className="group cursor-pointer hover:border-indigo-500 hover:shadow-md transition-all border-dashed border-2 border-indigo-200 bg-indigo-50/20" 
            onClick={() => { setBatchFilter("all_leads"); setCurrentPage(1); }}
          >
            <CardContent className="p-5 flex flex-col h-full justify-between">
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 shadow-sm flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              
              <div>
                <h3 className="text-base font-bold text-indigo-900 mb-1">All Leads Database</h3>
                <p className="text-xs text-indigo-600/70 line-clamp-2 leading-relaxed">View, search, and manage all leads across every batch, including manual uploads.</p>
              </div>

              <div className="mt-5 pt-4 border-t border-indigo-100/50 flex items-center justify-between">
                <Badge className="bg-white text-indigo-700 hover:bg-white border-indigo-200 shadow-sm font-semibold">{activeLeads.length} Total</Badge>
                <div className="flex items-center text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                  View Full List <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual Batch Cards */}
          {batches.map((batch) => {
            const colorClass = nicheColors[batch.niche] || nicheColors.default;
            const TextColor = colorClass.split(" ").find((c) => c.startsWith("text-"));
            
            return (
              <Card 
                key={batch.id} 
                className={`group cursor-pointer hover:shadow-md transition-all border shadow-sm ${colorClass.split(" ").find((c) => c.startsWith("border-"))} ${colorClass.split(" ").find((c) => c.startsWith("bg-"))}`}
                onClick={() => { setBatchFilter(batch.id); setCurrentPage(1); }}
              >
                <CardContent className="p-5 flex flex-col h-full justify-between relative">
                  
                  {/* Header Row: Icon + Delete button */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-black/5 ${TextColor} group-hover:scale-110 transition-transform`}>
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Are you sure you want to delete this batch and ALL its leads permanently?")) {
                          deleteBatch(batch.id);
                        }
                      }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 focus:outline-none transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete batch"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Title & Info */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 pr-2 leading-tight" title={batch.fileName}>
                      {batch.fileName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                       {batch.niche && <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-white/50">{batch.niche}</Badge>}
                       <Badge variant="secondary" className="text-[10px] bg-white opacity-80 border-transparent">{batch.leadCount} leads</Badge>
                    </div>
                  </div>

                  {/* Footer Row */}
                  <div className="mt-5 pt-4 border-t border-black/5 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {formatTimeAgo(batch.uploadedAt)}
                    </div>
                    <div className={`flex items-center text-xs font-bold ${TextColor} group-hover:translate-x-1 transition-all`}>
                      Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </div>
                  </div>

                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Table View Header and Toolbar (Only shown when a batch is selected) */}
      {batchFilter && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => { setBatchFilter(null); setCurrentPage(1); }} className="rounded-xl shadow-sm hover:bg-gray-50">
                ← Back to Batches
              </Button>
              <Badge variant="secondary" className="rounded-lg px-3 py-1 bg-white border shadow-sm">
                Viewing: {batchFilter === "all_leads" ? "All Leads" : batches.find((b) => b.id === batchFilter)?.fileName || "Unknown Batch"}
              </Badge>
            </div>
          </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search leads..."
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

        <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-32 rounded-xl border-gray-200">
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
        <EmptyState type={activeLeads.length === 0 ? "no-leads" : "no-results"} />
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
      )}
    </div>
  );
}
