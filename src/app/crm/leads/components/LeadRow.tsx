"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Eye,
  FileText,
  PhoneCall,
  CalendarPlus,
  MapPin,
  Archive,
  Globe,
  MessageCircle,
  Trash2,
  Briefcase,
  FolderOpen,
  StickyNote,
} from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import type { Lead, LeadStatus } from "@/types";
import { ActionDialog } from "@/components/crm/ActionDialog";
import { statusConfig, sourceConfig, ALL_STATUSES } from "@/lib/constants";

interface LeadRowProps {
  lead: Lead;
  index: number;
  selected?: boolean;
  onSelectChange?: (id: string, checked: boolean) => void;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onAssign: (leadId: string, assignee: string) => void;
  onArchive: (leadId: string) => void;
  onDelete: (leadId: string) => void;
  onConvertToClient?: (leadId: string) => void;
  onMove?: (leadId: string) => void;
  teamMembers: string[];
}

const LeadRow = React.memo(function LeadRow({
  lead,
  index,
  selected = false,
  onSelectChange,
  onStatusChange,
  onAssign,
  onArchive,
  onDelete,
  onConvertToClient,
  onMove,
  teamMembers,
}: LeadRowProps) {
  const { user } = useAuth();
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    tab: "note" | "call" | "follow-up";
  }>({ open: false, tab: "note" });

  const statusStyle = statusConfig[lead.status] || statusConfig.new;
  const srcStyle = sourceConfig[lead.source] || sourceConfig.manual;

  const assigneeDisplay = lead.assignedToName || (user?.name ?? "—");
  const assigneeInitial = (lead.assignedToName || user?.name || "?")[0]?.toUpperCase();

  return (
    <>
      <TableRow className={`group ${selected ? "bg-indigo-50/40" : ""}`}>
        {/* select */}
        <TableCell className="w-[3%] py-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelectChange?.(lead.id, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            aria-label={`Select ${lead.businessName}`}
          />
        </TableCell>
        {/* # */}
        <TableCell className="w-[3%] text-xs text-gray-400 font-mono">{index}</TableCell>

        {/* Business Name */}
        <TableCell className="w-[23%] py-3">
          <Link
            href={`/crm/leads/${lead.id}`}
            className="text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
          >
            {lead.businessName}
          </Link>
        </TableCell>

        {/* Phone */}
        <TableCell className="w-[11%]">
          <div>
            <span className="text-sm text-gray-700">{lead.phone || "—"}</span>
            <div className="flex items-center gap-2 mt-1">
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-500 transition-colors"
                  title="Visit website"
                >
                  <Globe className="h-3.5 w-3.5" />
                </a>
              )}
              {lead.phone && (
                <a
                  href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-green-500 transition-colors"
                  title="WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        </TableCell>

        {/* Source */}
        <TableCell className="w-[9%] py-3">
          <Badge
            variant="outline"
            className={`${srcStyle.bg} ${srcStyle.text} border-transparent uppercase text-[10px] tracking-wider font-bold`}
          >
            {lead.source}
          </Badge>
        </TableCell>

        {/* Niche */}
        <TableCell className="w-[11%]">
          <span className="text-sm text-gray-700">{lead.niche || "—"}</span>
        </TableCell>

        {/* Status - clickable dropdown */}
        <TableCell className="w-[10%] py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <div
                  className={`inline-flex items-center px-2 py-1 rounded-md ${statusStyle.bg} ${statusStyle.text} uppercase text-[10px] tracking-wider font-bold cursor-pointer hover:opacity-80 transition-opacity`}
                >
                  {statusStyle.label}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 rounded-xl shadow-lg border-gray-100">
              {ALL_STATUSES.map((s) => {
                const cfg = statusConfig[s];
                return (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => onStatusChange(lead.id, s)}
                    className="gap-2 rounded-lg m-1 cursor-pointer"
                  >
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    <span className="font-medium text-gray-700">{cfg.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>

        {/* Assignee - clickable dropdown */}
        <TableCell className="w-[11%] py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 focus:outline-none group/assign hover:bg-gray-50 p-1.5 -ml-1.5 rounded-lg transition-colors">
                <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-[#252527] border border-gray-200 dark:border-[#3a3a3c] text-gray-600 dark:text-[#c0c0c2] flex items-center justify-center text-[10px] font-bold">
                  {assigneeInitial}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-[#c0c0c2] group-hover/assign:text-gray-900 dark:group-hover/assign:text-white transition-colors">
                  {assigneeDisplay}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 rounded-xl shadow-lg border-gray-100 dark:border-[#2c2c2e]">
              {teamMembers.map((name) => (
                <DropdownMenuItem key={name} onClick={() => onAssign(lead.id, name)} className="rounded-lg m-1 cursor-pointer">
                  <div className="h-5 w-5 rounded-full bg-gray-100 dark:bg-[#252527] border border-gray-200 dark:border-[#3a3a3c] text-gray-600 dark:text-[#c0c0c2] flex items-center justify-center text-[10px] font-bold mr-2">
                    {name[0]?.toUpperCase()}
                  </div>
                  <span className="font-medium text-gray-700 dark:text-[#c0c0c2]">{name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>

        {/* Activity */}
        <TableCell className="w-[11%]">
          <span className="text-xs text-gray-400">{lead.lastActivity}</span>
        </TableCell>

        {/* Actions */}
        <TableCell className="w-[5%] py-3 text-right pr-4">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => setActionDialog({ open: true, tab: "note" })}
              title={lead.manualNotes ? "View / edit note" : "Add note"}
              className={`h-8 w-8 inline-flex items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${
                lead.manualNotes
                  ? "text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 opacity-100"
                  : "text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30"
              }`}
            >
              <StickyNote className="h-4 w-4" />
            </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors text-gray-400">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-gray-100">
              <DropdownMenuItem asChild className="rounded-lg m-1 cursor-pointer">
                <Link href={`/crm/leads/${lead.id}`} className="gap-2.5 font-medium text-gray-700">
                  <Eye className="h-4 w-4 text-gray-400" /> View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActionDialog({ open: true, tab: "note" })} className="gap-2.5 rounded-lg m-1 cursor-pointer font-medium text-gray-700">
                <FileText className="h-4 w-4 text-gray-400" /> Add Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActionDialog({ open: true, tab: "call" })} className="gap-2.5 rounded-lg m-1 cursor-pointer font-medium text-gray-700">
                <PhoneCall className="h-4 w-4 text-gray-400" /> Log Call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActionDialog({ open: true, tab: "follow-up" })} className="gap-2.5 rounded-lg m-1 cursor-pointer font-medium text-gray-700">
                <CalendarPlus className="h-4 w-4 text-gray-400" /> Set Follow-up
              </DropdownMenuItem>
              {onMove && (
                <DropdownMenuItem onClick={() => onMove(lead.id)} className="gap-2.5 rounded-lg m-1 cursor-pointer font-medium text-gray-700">
                  <FolderOpen className="h-4 w-4 text-gray-400" /> Move to Folder
                </DropdownMenuItem>
              )}
              {lead.mapsLink && (
                <DropdownMenuItem asChild className="gap-2.5 rounded-lg m-1 cursor-pointer font-medium text-gray-700">
                  <a href={lead.mapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4 text-gray-400" /> View on Maps
                  </a>
                </DropdownMenuItem>
              )}
              {onConvertToClient && (
                <DropdownMenuItem onClick={() => onConvertToClient(lead.id)} className="gap-2.5 rounded-lg m-1 cursor-pointer font-semibold text-emerald-600 hover:bg-emerald-50 focus:bg-emerald-50 group">
                  <Briefcase className="h-4 w-4 text-emerald-500 group-hover:text-emerald-600 transition-colors" /> Convert to Client
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem onClick={() => onArchive(lead.id)} className="gap-2.5 rounded-lg m-1 cursor-pointer font-semibold text-amber-600 hover:bg-amber-50 focus:bg-amber-50 group">
                <Archive className="h-4 w-4 text-amber-500 group-hover:text-amber-600 transition-colors" /> Archive Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { if (confirm("Are you sure you want to delete this lead?")) onDelete(lead.id); }} className="gap-2.5 rounded-lg m-1 cursor-pointer font-semibold text-red-600 hover:bg-red-50 focus:bg-red-50 group">
                <Trash2 className="h-4 w-4 text-red-500 group-hover:text-red-600 transition-colors" /> Delete Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </TableCell>
      </TableRow>

      <ActionDialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, tab: "note" })}
        leadId={lead.id}
        leadName={lead.businessName}
        defaultTab={actionDialog.tab}
      />
    </>
  );
}, (prev, next) => {
  return (
    prev.lead.id === next.lead.id &&
    prev.lead.status === next.lead.status &&
    prev.lead.assignedTo === next.lead.assignedTo &&
    prev.lead.assignedToName === next.lead.assignedToName &&
    prev.lead.lastActivity === next.lead.lastActivity &&
    !!prev.lead.manualNotes === !!next.lead.manualNotes &&
    prev.index === next.index &&
    prev.selected === next.selected
  );
});

// Mobile card version — U1 FIX: Added action dropdown + status change dropdown
const MobileLeadCard = React.memo(function MobileLeadCard({
  lead,
  onStatusChange,
  onAssign,
  onArchive,
  onDelete,
  onConvertToClient,
  onMove,
  teamMembers,
}: Omit<LeadRowProps, "index">) {
  const { user } = useAuth();
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    tab: "note" | "call" | "follow-up";
  }>({ open: false, tab: "note" });

  const statusStyle = statusConfig[lead.status] || statusConfig.new;
  const srcStyle = sourceConfig[lead.source] || sourceConfig.manual;

  const assigneeDisplay = lead.assignedToName || (user?.name ?? "—");
  const assigneeInitial = (lead.assignedToName || user?.name || "?")[0]?.toUpperCase();

  return (
    <>
      <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <Link
              href={`/crm/leads/${lead.id}`}
              className="text-sm font-semibold text-gray-900 hover:text-blue-600"
            >
              {lead.businessName}
            </Link>
            <p className="text-xs text-gray-500 mt-0.5">{lead.niche}</p>
          </div>

          {/* Status dropdown — now interactive on mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none ml-2">
                <Badge className={`${statusStyle.bg} ${statusStyle.text} uppercase text-[10px] tracking-wider font-semibold border-0 cursor-pointer`}>
                  {statusStyle.label}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {ALL_STATUSES.map((s) => {
                const cfg = statusConfig[s];
                return (
                  <DropdownMenuItem key={s} onClick={() => onStatusChange(lead.id, s)} className="gap-2">
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600">
          {lead.phone && <span>{lead.phone}</span>}
          <Badge className={`${srcStyle.bg} ${srcStyle.text} ${srcStyle.border} border uppercase text-[10px]`}>
            {lead.source}
          </Badge>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-gray-100 dark:bg-[#252527] border border-gray-200 dark:border-[#3a3a3c] text-gray-600 dark:text-[#c0c0c2] flex items-center justify-center text-[10px] font-semibold">
              {assigneeInitial}
            </div>
            <span className="text-xs text-gray-500 dark:text-[#a1a1a3]">{assigneeDisplay}</span>
          </div>

          {/* Actions dropdown — U1 FIX */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors">
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href={`/crm/leads/${lead.id}`} className="gap-2">
                  <Eye className="h-4 w-4" /> View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActionDialog({ open: true, tab: "note" })} className="gap-2">
                <FileText className="h-4 w-4" /> Add Note
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActionDialog({ open: true, tab: "call" })} className="gap-2">
                <PhoneCall className="h-4 w-4" /> Log Call
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActionDialog({ open: true, tab: "follow-up" })} className="gap-2">
                <CalendarPlus className="h-4 w-4" /> Set Follow-up
              </DropdownMenuItem>
              {onMove && (
                <DropdownMenuItem onClick={() => onMove(lead.id)} className="gap-2 font-medium text-gray-700">
                  <FolderOpen className="h-4 w-4" /> Move to Folder
                </DropdownMenuItem>
              )}
              {onConvertToClient && (
                <DropdownMenuItem onClick={() => onConvertToClient(lead.id)} className="gap-2 text-emerald-600">
                  <Briefcase className="h-4 w-4" /> Convert to Client
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onArchive(lead.id)} className="gap-2 text-amber-600">
                <Archive className="h-4 w-4" /> Archive Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { if (confirm("Are you sure you want to delete this lead?")) onDelete(lead.id); }} className="gap-2 text-red-600">
                <Trash2 className="h-4 w-4" /> Delete Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ActionDialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, tab: "note" })}
        leadId={lead.id}
        leadName={lead.businessName}
        defaultTab={actionDialog.tab}
      />
    </>
  );
});

export { LeadRow, MobileLeadCard };
