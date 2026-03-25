"use client";

import React, { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import type { Lead, LeadStatus } from "@/types";
import { ActionDialog } from "@/components/crm/ActionDialog";
import { statusConfig, sourceConfig, ALL_STATUSES } from "@/lib/constants";

interface LeadRowProps {
  lead: Lead;
  index: number;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onAssign: (leadId: string, assignee: string) => void;
  onArchive: (leadId: string) => void;
  teamMembers: string[];
}

const LeadRow = React.memo(function LeadRow({
  lead,
  index,
  onStatusChange,
  onAssign,
  onArchive,
  teamMembers,
}: LeadRowProps) {
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    tab: "note" | "call" | "follow-up";
  }>({ open: false, tab: "note" });

  const statusStyle = statusConfig[lead.status] || statusConfig.new;
  const srcStyle = sourceConfig[lead.source] || sourceConfig.manual;

  return (
    <>
      <TableRow className="group">
        {/* # */}
        <TableCell className="w-[4%] text-xs text-gray-400 font-mono">{index}</TableCell>

        {/* Business Name */}
        <TableCell className="w-[23%]">
          <Link
            href={`/crm/leads/${lead.id}`}
            className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors"
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
        <TableCell className="w-[9%]">
          <Badge
            className={`${srcStyle.bg} ${srcStyle.text} ${srcStyle.border} border uppercase text-[10px] tracking-wider font-semibold`}
          >
            {lead.source}
          </Badge>
        </TableCell>

        {/* Niche */}
        <TableCell className="w-[11%]">
          <span className="text-sm text-gray-700">{lead.niche || "—"}</span>
        </TableCell>

        {/* Status - clickable dropdown */}
        <TableCell className="w-[10%]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Badge
                  className={`${statusStyle.bg} ${statusStyle.text} uppercase text-[10px] tracking-wider font-semibold border-0 cursor-pointer hover:opacity-80 transition-opacity`}
                >
                  {statusStyle.label}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {ALL_STATUSES.map((s) => {
                const cfg = statusConfig[s];
                return (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => onStatusChange(lead.id, s)}
                    className="gap-2"
                  >
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>

        {/* Assignee - clickable dropdown */}
        <TableCell className="w-[11%]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 focus:outline-none group/assign">
                <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-semibold">
                  {(lead.assignedToName || lead.assignedTo)?.[0]?.toUpperCase() || "?"}
                </div>
                <span className="text-sm text-gray-700 group-hover/assign:text-blue-600 transition-colors">
                  {lead.assignedToName || lead.assignedTo || "Unassigned"}
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {teamMembers.map((name) => (
                <DropdownMenuItem key={name} onClick={() => onAssign(lead.id, name)}>
                  <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-semibold mr-2">
                    {name[0]?.toUpperCase()}
                  </div>
                  {name}
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
        <TableCell className="w-[5%]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100">
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
              {lead.mapsLink && (
                <DropdownMenuItem asChild className="gap-2">
                  <a href={lead.mapsLink} target="_blank" rel="noopener noreferrer">
                    <MapPin className="h-4 w-4" /> View on Maps
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onArchive(lead.id)} className="gap-2 text-red-600">
                <Archive className="h-4 w-4" /> Archive Lead
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
    prev.index === next.index
  );
});

// Mobile card version — U1 FIX: Added action dropdown + status change dropdown
const MobileLeadCard = React.memo(function MobileLeadCard({
  lead,
  onStatusChange,
  onAssign,
  onArchive,
  teamMembers,
}: Omit<LeadRowProps, "index">) {
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    tab: "note" | "call" | "follow-up";
  }>({ open: false, tab: "note" });

  const statusStyle = statusConfig[lead.status] || statusConfig.new;
  const srcStyle = sourceConfig[lead.source] || sourceConfig.manual;

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
            <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-semibold">
              {(lead.assignedToName || lead.assignedTo)?.[0]?.toUpperCase() || "?"}
            </div>
            <span className="text-xs text-gray-500">{lead.assignedToName || lead.assignedTo || "Unassigned"}</span>
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
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onArchive(lead.id)} className="gap-2 text-red-600">
                <Archive className="h-4 w-4" /> Archive Lead
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
