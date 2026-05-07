"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConvertToClientModal } from "@/components/crm/ConvertToClientModal";
import { Briefcase, Search, MoreHorizontal, Pencil, RotateCcw, Phone, Mail, Calendar } from "lucide-react";

export default function ClientsPage() {
  const { leads, revertToLead, updateClientInfo, isLoadingData } = useCRM();
  const clients = useMemo(() => leads.filter(l => l.isClient && !l.isArchived), [leads]);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ open: boolean; leadId: string; services: string; notes: string }>({
    open: false, leadId: "", services: "", notes: "",
  });

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.businessName.toLowerCase().includes(q) ||
      c.niche?.toLowerCase().includes(q) ||
      c.clientServices?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return clients.filter(c => {
      if (!c.becameClientAt) return false;
      const d = new Date(c.becameClientAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [clients]);

  const handleRevert = async (id: string) => {
    if (!confirm("Move this client back to leads?")) return;
    await revertToLead([id]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-600" /> Our Clients
          </h1>
          <p className="text-sm text-gray-500 mt-1">{clients.length} active · {thisMonth} added this month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{clients.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">This Month</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{thisMonth}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Niches</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{new Set(clients.map(c => c.niche).filter(Boolean)).size}</p>
        </CardContent></Card>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients, services, niches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-gray-50 hover:bg-white focus:bg-white"
          />
        </div>
      </div>

      {isLoadingData ? (
        <p className="text-sm text-gray-500 text-center py-12">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900">No clients yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Convert leads to clients from the Leads page to track them here.
          </p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const services = (c.clientServices || "").split(",").map(s => s.trim()).filter(Boolean);
            return (
              <Card key={c.id} className="group hover:shadow-md transition-all border border-gray-100">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold">
                      {c.businessName[0]?.toUpperCase()}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing({ open: true, leadId: c.id, services: c.clientServices || "", notes: c.clientNotes || "" })}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit services
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRevert(c.id)} className="text-amber-600">
                          <RotateCcw className="h-4 w-4 mr-2" /> Move back to Leads
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Link href={`/crm/leads/${c.id}`} className="block">
                    <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700 transition-colors">{c.businessName}</h3>
                    {c.niche && <p className="text-xs text-gray-500 mt-0.5">{c.niche}</p>}
                  </Link>

                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {services.map(s => (
                        <Badge key={s} variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50/50 text-emerald-700 border-emerald-100">{s}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                    {c.phone && <div className="flex items-center gap-2 text-xs text-gray-500"><Phone className="h-3 w-3" /> {c.phone}</div>}
                    {c.email && <div className="flex items-center gap-2 text-xs text-gray-500"><Mail className="h-3 w-3" /> {c.email}</div>}
                    {c.becameClientAt && <div className="flex items-center gap-2 text-xs text-gray-500"><Calendar className="h-3 w-3" /> Client since {formatTimeAgo(c.becameClientAt)}</div>}
                    {c.assignedToName && <div className="text-xs text-gray-500">Account: <span className="font-semibold text-gray-700">{c.assignedToName}</span></div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConvertToClientModal
        open={editing.open}
        onClose={() => setEditing({ open: false, leadId: "", services: "", notes: "" })}
        count={1}
        mode="edit"
        initialServices={editing.services}
        initialNotes={editing.notes}
        onConfirm={async (services, notes) => {
          await updateClientInfo(editing.leadId, services, notes);
        }}
      />
    </div>
  );
}
