"use client";

import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Download,
  RotateCcw,
  Plus,
  FolderOpen,
  Folder,
  Pencil,
  Trash2,
  ChevronLeft,
  Check,
  X,
  FolderInput,
  Clipboard,
  Bell,
} from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/config/supabase";
import { useDebounce } from "@/hooks/useDebounce";
import { LeadRow, MobileLeadCard } from "../leads/components/LeadRow";
import LeadTableSkeleton from "../leads/components/LeadTableSkeleton";
import EmptyState from "../leads/components/EmptyState";
import { STATUS_LABELS } from "@/lib/constants";
import type { LeadStatus, UploadBatch } from "@/types";
import { toast } from "sonner";
import { ManualLeadModal } from "@/components/crm/ManualLeadModal";
import { JsonImportModal } from "@/components/crm/JsonImportModal";

const ITEMS_PER_PAGE = 50;

function defaultFolderName() {
  return `Manual - ${new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

// ── Inline rename input ──────────────────────────────────────────
function RenameInput({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const save = () => {
    const trimmed = text.trim();
    if (trimmed) onSave(trimmed);
    else onCancel();
  };

  return (
    <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onCancel();
        }}
        className="flex-1 text-sm font-semibold bg-transparent border-b border-gray-400 dark:border-[#636366] outline-none py-0.5 text-gray-900 dark:text-[#f5f5f7] min-w-0"
      />
      <button
        onClick={save}
        className="shrink-0 text-gray-500 hover:text-gray-900 dark:hover:text-white p-0.5 rounded"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onCancel}
        className="shrink-0 text-gray-500 hover:text-gray-900 dark:hover:text-white p-0.5 rounded"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Folder card ──────────────────────────────────────────────────
function FolderCard({
  batch,
  leadCount,
  onOpen,
  onRename,
  onDelete,
  onUpdateNote,
}: {
  batch: UploadBatch;
  leadCount: number;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onUpdateNote: (note: string) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(batch.note || "");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNoteText(batch.note || "");
  }, [batch.note]);

  useEffect(() => {
    if (isEditingNote) noteRef.current?.focus();
  }, [isEditingNote]);

  const saveNote = () => {
    onUpdateNote(noteText.trim());
    setIsEditingNote(false);
  };

  const createdDate = new Date(batch.uploadedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="relative group bg-white dark:bg-[#161618] border border-gray-100 dark:border-[#2c2c2e] rounded-2xl p-5 cursor-pointer hover:shadow-md hover:border-gray-200 dark:hover:border-[#363638] transition-all duration-200 hover:-translate-y-0.5 flex flex-col gap-3"
      onClick={isRenaming || isEditingNote ? undefined : onOpen}
    >
      {/* Top row: icon + action buttons */}
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-[#252527] flex items-center justify-center shrink-0">
          <FolderOpen className="h-5 w-5 text-gray-500 dark:text-[#a1a1a3]" />
        </div>
        {/* Action buttons — visible on hover */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-[#252527] text-gray-500 dark:text-[#a1a1a3] hover:text-gray-900 dark:hover:text-white transition-colors"
            onClick={() => setIsRenaming(true)}
            title="Rename folder"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="p-1.5 rounded-lg bg-gray-100 dark:bg-[#252527] text-gray-500 dark:text-[#a1a1a3] hover:text-red-600 dark:hover:text-red-400 transition-colors"
            onClick={onDelete}
            title="Delete folder"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Folder name — editable inline */}
      <div className="flex-1 min-h-[2rem] flex flex-col justify-center">
        {isRenaming ? (
          <RenameInput
            value={batch.fileName}
            onSave={(name) => {
              onRename(name);
              setIsRenaming(false);
            }}
            onCancel={() => setIsRenaming(false)}
          />
        ) : (
          <div className="flex items-start gap-1.5 group/name">
            <p className="text-sm font-semibold text-gray-900 dark:text-[#f5f5f7] leading-snug flex-1 line-clamp-2">
              {batch.fileName}
            </p>
            <button
              className="shrink-0 mt-0.5 opacity-0 group-hover/name:opacity-60 hover:!opacity-100 text-gray-400 dark:text-[#636366] transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
              title="Rename"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Note */}
      <div onClick={(e) => e.stopPropagation()}>
        {isEditingNote ? (
          <div className="flex flex-col gap-1.5">
            <textarea
              ref={noteRef}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveNote(); }
                if (e.key === "Escape") { setNoteText(batch.note || ""); setIsEditingNote(false); }
              }}
              placeholder="Add a note..."
              rows={2}
              className="w-full text-xs bg-gray-50 dark:bg-[#1e1e20] border border-gray-200 dark:border-[#363638] rounded-lg px-2 py-1.5 outline-none resize-none text-gray-700 dark:text-[#c0c0c2] placeholder:text-gray-300 dark:placeholder:text-[#48484a]"
            />
            <div className="flex gap-1 justify-end">
              <button
                onClick={() => { setNoteText(batch.note || ""); setIsEditingNote(false); }}
                className="text-[10px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2 py-0.5 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveNote}
                className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 px-2 py-0.5 rounded"
              >
                Save
              </button>
            </div>
          </div>
        ) : batch.note ? (
          <button
            onClick={() => setIsEditingNote(true)}
            className="w-full text-left group/note"
            title="Click to edit note"
          >
            <p className="text-xs text-gray-400 dark:text-[#707072] line-clamp-2 group-hover/note:text-gray-600 dark:group-hover/note:text-[#a1a1a3] transition-colors">
              {batch.note}
            </p>
          </button>
        ) : (
          <button
            onClick={() => setIsEditingNote(true)}
            className="text-xs text-gray-300 dark:text-[#48484a] hover:text-gray-400 dark:hover:text-[#636366] transition-colors italic"
          >
            + Add note
          </button>
        )}
      </div>

      {/* Footer: date + count */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-[#2c2c2e]">
        <span className="text-xs text-gray-400 dark:text-[#707072]">{createdDate}</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-[#252527] text-gray-700 dark:text-[#c0c0c2]">
          {leadCount} {leadCount === 1 ? "lead" : "leads"}
        </span>
      </div>
    </div>
  );
}

// ── Unfiled card ─────────────────────────────────────────────────
function UnfiledCard({
  leadCount,
  onOpen,
}: {
  leadCount: number;
  onOpen: () => void;
}) {
  return (
    <div
      className="relative bg-white dark:bg-[#161618] border border-dashed border-gray-200 dark:border-[#363638] rounded-2xl p-5 cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-[#48484a] transition-all duration-200 hover:-translate-y-0.5 flex flex-col gap-3"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#1e1e20] flex items-center justify-center">
          <Folder className="h-5 w-5 text-gray-400 dark:text-[#636366]" />
        </div>
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-500 dark:text-[#a1a1a3]">Unfiled</p>
        <p className="text-xs text-gray-400 dark:text-[#636366] mt-0.5">Leads without a folder</p>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-[#2c2c2e]">
        <span className="text-xs text-gray-400 dark:text-[#636366]">No folder</span>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-[#252527] text-gray-600 dark:text-[#a1a1a3]">
          {leadCount} {leadCount === 1 ? "lead" : "leads"}
        </span>
      </div>
    </div>
  );
}

// ── Move to folder dialog ─────────────────────────────────────────
function MoveFolderDialog({
  open,
  currentBatchId,
  folders,
  onMove,
  onClose,
}: {
  open: boolean;
  currentBatchId: string | undefined | null;
  folders: UploadBatch[];
  onMove: (batchId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Move to Folder</DialogTitle>
          <DialogDescription>Select a folder to move this lead into</DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-1 max-h-72 overflow-y-auto">
          {/* Unfiled option */}
          <button
            onClick={() => onMove(null)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
              !currentBatchId
                ? "bg-gray-100 dark:bg-[#252527] text-gray-900 dark:text-[#f5f5f7] font-semibold"
                : "hover:bg-gray-50 dark:hover:bg-[#1e1e20] text-gray-700 dark:text-[#c0c0c2]"
            }`}
          >
            <Folder className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#636366]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Unfiled</p>
              <p className="text-xs text-gray-400 dark:text-[#707072]">Remove from folder</p>
            </div>
            {!currentBatchId && <Check className="h-4 w-4 text-gray-500 dark:text-[#a1a1a3] shrink-0" />}
          </button>

          {folders.length > 0 && (
            <div className="border-t border-gray-100 dark:border-[#2c2c2e] my-1" />
          )}

          {folders.map((folder) => {
            const isCurrent = folder.id === currentBatchId;
            const date = new Date(folder.uploadedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
            return (
              <button
                key={folder.id}
                onClick={() => onMove(folder.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  isCurrent
                    ? "bg-gray-100 dark:bg-[#252527] text-gray-900 dark:text-[#f5f5f7] font-semibold"
                    : "hover:bg-gray-50 dark:hover:bg-[#1e1e20] text-gray-700 dark:text-[#c0c0c2]"
                }`}
              >
                <FolderOpen className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#636366]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{folder.fileName}</p>
                  <p className="text-xs text-gray-400 dark:text-[#707072]">{date}</p>
                </div>
                {isCurrent && <Check className="h-4 w-4 text-gray-500 dark:text-[#a1a1a3] shrink-0" />}
              </button>
            );
          })}

          {folders.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-[#707072] text-center py-4">
              No folders yet. Create one first.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ────────────────────────────────────────────────────
export default function ManualLeadsPage() {
  const {
    leads,
    manualBatches,
    createManualBatch,
    renameManualBatch,
    updateBatchNote,
    updateLeadBatch,
    deleteBatch,
    updateLeadStatus,
    assignLead,
    archiveLead,
    deleteLead,
    isLoadingData,
  } = useCRM();
  const { teamMembers } = useAuth();
  const teamNames = useMemo(() => teamMembers.map((m) => m.name), [teamMembers]);

  // Navigation
  const [selectedBatch, setSelectedBatch] = useState<UploadBatch | "unfiled" | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJsonImportOpen, setIsJsonImportOpen] = useState(false);
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Selection
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Move-to-folder dialog
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);

  // Table filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nicheFilter, setNicheFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const allManualLeads = useMemo(
    () => leads.filter((l) => !l.isArchived && l.source === "manual"),
    [leads]
  );

  const batchLeadCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allManualLeads.forEach((l) => {
      if (l.batchId) counts.set(l.batchId, (counts.get(l.batchId) || 0) + 1);
    });
    return counts;
  }, [allManualLeads]);

  const unfiledLeads = useMemo(
    () => allManualLeads.filter((l) => !l.batchId),
    [allManualLeads]
  );

  const activeFolderLeads = useMemo(() => {
    if (!selectedBatch) return [];
    if (selectedBatch === "unfiled") return unfiledLeads;
    return allManualLeads.filter((l) => l.batchId === selectedBatch.id);
  }, [selectedBatch, allManualLeads, unfiledLeads]);

  const niches = useMemo(
    () => [...new Set(activeFolderLeads.map((l) => l.niche).filter(Boolean))],
    [activeFolderLeads]
  );
  const assignees = useMemo(
    () => [
      ...new Set(
        activeFolderLeads.map((l) => l.assignedToName).filter(Boolean) as string[]
      ),
    ],
    [activeFolderLeads]
  );

  const filteredLeads = useMemo(() => {
    let result = activeFolderLeads;
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
    if (statusFilter !== "all") result = result.filter((l) => l.status === statusFilter);
    if (nicheFilter !== "all") result = result.filter((l) => l.niche === nicheFilter);
    if (assigneeFilter !== "all") result = result.filter((l) => l.assignedToName === assigneeFilter);
    return result;
  }, [activeFolderLeads, debouncedSearch, statusFilter, nicheFilter, assigneeFilter]);

  const totalPages = Math.ceil(filteredLeads.length / ITEMS_PER_PAGE);
  const paginatedLeads = useMemo(
    () =>
      filteredLeads.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
      ),
    [filteredLeads, currentPage]
  );

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setNicheFilter("all");
    setAssigneeFilter("all");
    setCurrentPage(1);
    setSelectedLeads(new Set());
  };

  const handleOpenBatch = (batch: UploadBatch | "unfiled") => {
    setSelectedBatch(batch);
    resetFilters();
  };

  const handleBack = () => {
    setSelectedBatch(null);
    resetFilters();
  };

  const handleSelectChange = useCallback((id: string, checked: boolean) => {
    setSelectedLeads((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const handleCreateFolder = async () => {
    await createManualBatch(defaultFolderName());
    toast.success("Folder created");
  };

  const handleDeleteFolder = async (batchId: string) => {
    if (!confirm("Delete this folder and all its leads? This cannot be undone.")) return;
    await deleteBatch(batchId);
    if (
      selectedBatch &&
      selectedBatch !== "unfiled" &&
      selectedBatch.id === batchId
    ) {
      setSelectedBatch(null);
    }
  };

  const handleMove = useCallback(
    async (batchId: string | null) => {
      if (!movingLeadId) return;
      await updateLeadBatch(movingLeadId, batchId);
      const folderName =
        batchId === null
          ? "Unfiled"
          : manualBatches.find((b) => b.id === batchId)?.fileName || "folder";
      toast.success(`Lead moved to ${folderName}`);
      setMovingLeadId(null);
    },
    [movingLeadId, updateLeadBatch, manualBatches]
  );

  // Find the batchId of the lead being moved (for highlighting current folder)
  const movingLeadBatchId = useMemo(() => {
    if (!movingLeadId) return undefined;
    return leads.find((l) => l.id === movingLeadId)?.batchId;
  }, [movingLeadId, leads]);

  const handleNotifyTeam = async (batchId: string) => {
    setIsSendingNotif(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/api/notify/batch-ready", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ batchId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      toast.success(`Notification sent to ${json.sent} team member${json.sent !== 1 ? "s" : ""}`);
    } catch (e: any) {
      toast.error(e.message || "Failed to send notification");
    } finally {
      setIsSendingNotif(false);
    }
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
        });
      });
      ws.getRow(1).eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5E5E5" },
        };
      });
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `manual_leads_${new Date().toISOString().split("T")[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported successfully");
    } catch (e) {
      console.error("Export error:", e);
      toast.error("Failed to export");
    }
  };

  if (isLoadingData) return <LeadTableSkeleton />;

  // ── Drill-down: Folder leads table ────────────────────────────
  if (selectedBatch !== null) {
    const folderName =
      selectedBatch === "unfiled" ? "Unfiled Leads" : selectedBatch.fileName;
    const currentBatchId =
      selectedBatch === "unfiled" ? undefined : selectedBatch.id;

    return (
      <div className="space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-sm text-gray-500 dark:text-[#a1a1a3] hover:text-gray-900 dark:hover:text-white transition-colors font-medium"
            >
              <ChevronLeft className="h-4 w-4" />
              Folders
            </button>
            <span className="text-gray-300 dark:text-[#3a3a3c]">/</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-[#f5f5f7]">
                {folderName}
              </h1>
              <p className="text-xs text-gray-500 dark:text-[#707072] mt-0.5">
                {activeFolderLeads.length}{" "}
                {activeFolderLeads.length === 1 ? "lead" : "leads"} in this folder
              </p>
            </div>
          </div>
          {selectedBatch !== "unfiled" && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                onClick={() => handleNotifyTeam(selectedBatch.id)}
                disabled={isSendingNotif}
                className="gap-2 rounded-xl shadow-sm h-10 px-4 font-semibold border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
              >
                {isSendingNotif
                  ? <span className="h-4 w-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
                  : <Bell className="h-4 w-4" />
                }
                {isSendingNotif ? "Sending..." : "Notify Team"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsJsonImportOpen(true)}
                className="gap-2 rounded-xl shadow-sm h-10 px-4 font-semibold border-gray-200 dark:border-[#363638] text-gray-700 dark:text-[#d1d1d3] dark:bg-[#161618]"
              >
                <Clipboard className="h-4 w-4 text-gray-500 dark:text-[#a1a1a3]" /> Paste JSON
              </Button>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="gap-2 rounded-xl shadow-sm h-10 px-5 font-bold bg-gray-900 dark:bg-[#f5f5f7] hover:bg-black dark:hover:bg-white text-white dark:text-[#0c0c0d]"
              >
                <Plus className="h-4 w-4" /> Add Lead
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-[#161618] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-[#2c2c2e]">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 rounded-xl border-gray-200 dark:border-[#2c2c2e] bg-gray-50 dark:bg-[#1e1e20] hover:bg-white dark:hover:bg-[#252527] focus:bg-white dark:focus:bg-[#252527] transition-colors"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-36 rounded-xl border-gray-200 dark:border-[#2c2c2e]">
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

            {niches.length > 0 && (
              <Select
                value={nicheFilter}
                onValueChange={(v) => {
                  setNicheFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-36 rounded-xl border-gray-200 dark:border-[#2c2c2e]">
                  <SelectValue placeholder="Niche" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Niches</SelectItem>
                  {niches.map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {assignees.length > 0 && (
              <Select
                value={assigneeFilter}
                onValueChange={(v) => {
                  setAssigneeFilter(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-36 rounded-xl border-gray-200 dark:border-[#2c2c2e]">
                  <SelectValue placeholder="Assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {assignees.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-2 rounded-xl text-gray-700 dark:text-[#c0c0c2]"
            >
              <Download className="h-4 w-4" /> Export
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="gap-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white"
            >
              <RotateCcw className="h-4 w-4" /> Reset
            </Button>
          </div>

          {/* Table */}
          {filteredLeads.length === 0 ? (
            <EmptyState
              type={activeFolderLeads.length === 0 ? "no-leads" : "no-results"}
            />
          ) : (
            <>
              <div className="hidden md:block bg-white dark:bg-[#161618] rounded-2xl border border-gray-100 dark:border-[#2c2c2e] shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 dark:bg-[#1e1e20] border-b border-gray-100/80 dark:border-[#2c2c2e] hover:bg-gray-50/80 dark:hover:bg-[#1e1e20]">
                      <TableHead className="w-[3%]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 dark:border-[#3a3a3c] cursor-pointer"
                          checked={paginatedLeads.length > 0 && paginatedLeads.every((l) => selectedLeads.has(l.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeads((prev) => {
                                const next = new Set(prev);
                                paginatedLeads.forEach((l) => next.add(l.id));
                                return next;
                              });
                            } else {
                              setSelectedLeads((prev) => {
                                const next = new Set(prev);
                                paginatedLeads.forEach((l) => next.delete(l.id));
                                return next;
                              });
                            }
                          }}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead className="w-[3%] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#636366]">
                        #
                      </TableHead>
                      <TableHead className="w-[21%] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#636366]">
                        Business Name
                      </TableHead>
                      <TableHead className="w-[11%] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#636366]">
                        Phone
                      </TableHead>
                      <TableHead className="w-[9%] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#636366]">
                        Source
                      </TableHead>
                      <TableHead className="w-[11%] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#636366]">
                        Niche
                      </TableHead>
                      <TableHead className="w-[10%] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#636366]">
                        Status
                      </TableHead>
                      <TableHead className="w-[11%] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#636366]">
                        Assignee
                      </TableHead>
                      <TableHead className="w-[11%] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#636366]">
                        Activity
                      </TableHead>
                      <TableHead className="w-[5%] text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#636366] text-right pr-4">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLeads.map((lead, idx) => (
                      <LeadRow
                        key={lead.id}
                        lead={lead}
                        index={(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                        selected={selectedLeads.has(lead.id)}
                        onSelectChange={handleSelectChange}
                        onStatusChange={updateLeadStatus}
                        onAssign={assignLead}
                        onArchive={archiveLead}
                        onDelete={deleteLead}
                        onMove={setMovingLeadId}
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
                    onStatusChange={updateLeadStatus}
                    onAssign={assignLead}
                    onArchive={archiveLead}
                    onDelete={deleteLead}
                    onMove={setMovingLeadId}
                    teamMembers={teamNames}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-gray-500 dark:text-[#707072]">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(
                      currentPage * ITEMS_PER_PAGE,
                      filteredLeads.length
                    )}{" "}
                    of {filteredLeads.length}
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

        <ManualLeadModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          batchId={currentBatchId}
        />

        {currentBatchId && (
          <JsonImportModal
            open={isJsonImportOpen}
            onClose={() => setIsJsonImportOpen(false)}
            batchId={currentBatchId}
            folderName={folderName}
          />
        )}

        <MoveFolderDialog
          open={movingLeadId !== null}
          currentBatchId={movingLeadBatchId}
          folders={manualBatches}
          onMove={handleMove}
          onClose={() => setMovingLeadId(null)}
        />
      </div>
    );
  }

  // ── Folder grid view ──────────────────────────────────────────
  const totalManualLeads = allManualLeads.length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#f5f5f7]">
            Manual Leads
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#707072] mt-1">
            {manualBatches.length}{" "}
            {manualBatches.length === 1 ? "folder" : "folders"} ·{" "}
            {totalManualLeads} total leads
          </p>
        </div>
        <Button
          onClick={handleCreateFolder}
          className="gap-2 rounded-xl shadow-sm h-10 px-5 font-bold bg-gray-900 dark:bg-[#f5f5f7] hover:bg-black dark:hover:bg-white text-white dark:text-[#0c0c0d]"
        >
          <Plus className="h-4 w-4" /> New Folder
        </Button>
      </div>

      {/* Grid */}
      {manualBatches.length === 0 && unfiledLeads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-[#252527] flex items-center justify-center mb-4">
            <Folder className="h-7 w-7 text-gray-400 dark:text-[#636366]" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-[#f5f5f7] mb-1">
            No folders yet
          </h3>
          <p className="text-sm text-gray-500 dark:text-[#707072] mb-5 max-w-xs">
            Create a folder for each outreach session and add leads inside it.
          </p>
          <Button
            onClick={handleCreateFolder}
            className="gap-2 rounded-xl h-10 px-5 font-bold bg-gray-900 dark:bg-[#f5f5f7] hover:bg-black dark:hover:bg-white text-white dark:text-[#0c0c0d]"
          >
            <Plus className="h-4 w-4" /> Create First Folder
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {manualBatches.map((batch) => (
            <FolderCard
              key={batch.id}
              batch={batch}
              leadCount={batchLeadCounts.get(batch.id) || 0}
              onOpen={() => handleOpenBatch(batch)}
              onRename={(name) => renameManualBatch(batch.id, name)}
              onDelete={() => handleDeleteFolder(batch.id)}
              onUpdateNote={(note) => updateBatchNote(batch.id, note)}
            />
          ))}
          {unfiledLeads.length > 0 && (
            <UnfiledCard
              leadCount={unfiledLeads.length}
              onOpen={() => handleOpenBatch("unfiled")}
            />
          )}
        </div>
      )}
    </div>
  );
}
