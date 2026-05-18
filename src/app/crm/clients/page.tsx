"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddClientModal, type ProjectStatus } from "@/components/crm/AddClientModal";
import { MarkPaymentModal } from "@/components/crm/MarkPaymentModal";
import { GenerateInvoiceModal } from "@/components/crm/GenerateInvoiceModal";
import { PaymentRequestModal } from "@/components/crm/PaymentRequestModal";
import type { Lead, Payment } from "@/types";
import {
  Briefcase, Search, MoreHorizontal, Pencil, RotateCcw, Phone, Mail,
  Calendar, Globe, Plus, FileText, IndianRupee, CheckCircle2, Clock,
  AlertCircle, TrendingUp, Wallet, Banknote, Sparkles, Timer, Image as ImageIcon,
} from "lucide-react";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

function isOverdue(p: Payment) {
  return p.status === "pending" && p.dueDate && new Date(p.dueDate) < new Date();
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  in_progress: { label: "In Progress", className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800" },
  delivered:   { label: "Delivered",   className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800" },
  on_hold:     { label: "On Hold",     className: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-[#252527] dark:text-[#a0a0a2] dark:border-[#3a3a3c]" },
  revision:    { label: "Revision",    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800" },
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

type EditState = {
  open: boolean;
  leadId: string;
  businessName: string;
  phone: string;
  email: string;
  website: string;
  services: string;
  projectStatus: ProjectStatus;
  notes: string;
  becameClientAt: string;
  projectStartedAt: string;
  projectDeliveredAt: string;
};

const EMPTY_EDIT: EditState = {
  open: false, leadId: "", businessName: "", phone: "", email: "",
  website: "", services: "", projectStatus: "in_progress", notes: "",
  becameClientAt: "", projectStartedAt: "", projectDeliveredAt: "",
};

function PaymentBadge({ payment, onMark, onUnmark, onRequest }: {
  payment: Payment;
  onMark: (p: Payment) => void;
  onUnmark: (p: Payment) => void;
  onRequest: (p: Payment) => void;
}) {
  const label = payment.type === "upfront" ? "Upfront" : payment.type === "final" ? "Final" : (payment.notes || "Add-on");
  if (payment.status === "paid") {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {label} paid
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onUnmark(payment)}
            className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5 hover:border-red-300"
            title="Mark as unpaid"
          >
            Undo
          </button>
        </div>
      </div>
    );
  }
  if (isOverdue(payment)) {
    return (
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onMark(payment)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-red-600 dark:text-red-400 hover:underline"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {label} overdue · Mark paid
        </button>
        <button
          onClick={() => onRequest(payment)}
          className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5"
          title="Download payment request card"
        >
          <ImageIcon className="h-3 w-3" /> Req
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        onClick={() => onMark(payment)}
        className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 hover:underline"
      >
        <Clock className="h-3.5 w-3.5" />
        {label} pending · Mark paid
      </button>
      <button
        onClick={() => onRequest(payment)}
        className="flex items-center gap-1 text-[10px] font-medium text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5"
        title="Download payment request card"
      >
        <ImageIcon className="h-3 w-3" /> Req
      </button>
    </div>
  );
}

export default function ClientsPage() {
  const {
    leads, payments, addDirectClient, revertToLead, updateClientInfo,
    createPaymentsForClient, markPaymentPaid, markPaymentUnpaid, setProjectValue, isLoadingData,
  } = useCRM();

  const clients = useMemo(() => leads.filter(l => l.isClient && !l.isArchived), [leads]);

  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<EditState>(EMPTY_EDIT);
  const [markingPayment, setMarkingPayment] = useState<Payment | null>(null);
  const [requestPaymentModal, setRequestPaymentModal] = useState<{ client: Lead, payment: Payment } | null>(null);
  const [invoiceModal, setInvoiceModal] = useState<{ client: Lead } | null>(null);
  const [settingValueId, setSettingValueId] = useState<string | null>(null);
  const [valueInput, setValueInput] = useState("");
  const [editingValueId, setEditingValueId] = useState<string | null>(null);
  const [editValueInput, setEditValueInput] = useState("");

  // Pre-compute a map of leadId → Payment[] to avoid O(N×M) filtering
  // Automatically sorts payments by creation date
  const clientPaymentsMap = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const p of payments) {
      if (!map.has(p.leadId)) map.set(p.leadId, []);
      map.get(p.leadId)!.push(p);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return map;
  }, [payments]);

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.businessName.toLowerCase().includes(q) ||
      c.niche?.toLowerCase().includes(q) ||
      c.clientServices?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  // ── Earnings summary ────────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const clientIds = new Set(clients.map(c => c.id));
    const clientPayments = payments.filter(p => clientIds.has(p.leadId));
    const totalQuoted = clients.reduce((sum, c) => sum + (c.projectValue ?? 0), 0);
    const collected = clientPayments.filter(p => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
    const outstanding = clientPayments.filter(p => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
    const overdueCount = clientPayments.filter(p => isOverdue(p)).length;
    return { totalQuoted, collected, outstanding, overdueCount };
  }, [clients, payments]);

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

  const openEdit = (c: (typeof clients)[number]) => {
    setEditing({
      open: true,
      leadId: c.id,
      businessName: c.businessName,
      phone: c.phone,
      email: c.email || "",
      website: c.website || "",
      services: c.clientServices || "",
      projectStatus: (c.projectStatus as ProjectStatus) || "in_progress",
      notes: c.clientNotes || "",
      becameClientAt: c.becameClientAt ? toDatetimeLocal(c.becameClientAt) : toDatetimeLocal(new Date().toISOString()),
      projectStartedAt: c.projectStartedAt ? toDatetimeLocal(c.projectStartedAt) : "",
      projectDeliveredAt: c.projectDeliveredAt ? toDatetimeLocal(c.projectDeliveredAt) : "",
    });
  };

  const handleSetupPayments = async (c: (typeof clients)[number]) => {
    if (!c.projectValue) {
      setSettingValueId(c.id);
      setValueInput("");
      return;
    }
    await createPaymentsForClient(c.id, c.projectValue);
  };

  const handleSaveProjectValue = async () => {
    if (!settingValueId) return;
    const val = parseFloat(valueInput.replace(/,/g, ""));
    if (!val || val <= 0) return;
    await setProjectValue(settingValueId, val);
    await createPaymentsForClient(settingValueId, val);
    setSettingValueId(null);
    setValueInput("");
  };

  const handleSaveEditValue = async () => {
    if (!editingValueId) return;
    const val = parseFloat(editValueInput.replace(/,/g, ""));
    if (!val || val <= 0) return;
    const client = clients.find(c => c.id === editingValueId);
    let addonName = undefined;
    if (client && client.projectValue && val > client.projectValue) {
      addonName = window.prompt(`You are increasing the project value by ₹${val - client.projectValue}.\nWhat is this extra charge for? (e.g. 'CMS Add-on')`);
    }
    await setProjectValue(editingValueId, val, addonName || undefined);
    setEditingValueId(null);
    setEditValueInput("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-600" /> Our Clients
          </h1>
          <p className="text-sm text-gray-500 dark:text-[#8e8e93] mt-1">
            {clients.length} active · {thisMonth} added this month
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
          <Plus className="h-4 w-4" /> Add Client
        </Button>
      </div>

      {/* ── Earnings summary cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="dark:bg-[#1c1c1e] dark:border-[#2c2c2e]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-bold uppercase text-gray-400 dark:text-[#636366] tracking-wider">Quoted</p>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {summary.totalQuoted > 0 ? formatINR(summary.totalQuoted) : "—"}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-[#636366] mt-0.5">{clients.length} clients</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-[#1c1c1e] dark:border-[#2c2c2e]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                <Wallet className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-xs font-bold uppercase text-gray-400 dark:text-[#636366] tracking-wider">Collected</p>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {summary.collected > 0 ? formatINR(summary.collected) : "—"}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-[#636366] mt-0.5">Payments received</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-[#1c1c1e] dark:border-[#2c2c2e]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-7 w-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                <Banknote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-xs font-bold uppercase text-gray-400 dark:text-[#636366] tracking-wider">Outstanding</p>
            </div>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {summary.outstanding > 0 ? formatINR(summary.outstanding) : "—"}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-[#636366] mt-0.5">Yet to collect</p>
          </CardContent>
        </Card>

        <Card className="dark:bg-[#1c1c1e] dark:border-[#2c2c2e]">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${summary.overdueCount > 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-gray-50 dark:bg-[#252527]"}`}>
                <AlertCircle className={`h-3.5 w-3.5 ${summary.overdueCount > 0 ? "text-red-500" : "text-gray-400 dark:text-[#636366]"}`} />
              </div>
              <p className="text-xs font-bold uppercase text-gray-400 dark:text-[#636366] tracking-wider">Overdue</p>
            </div>
            <p className={`text-xl font-bold ${summary.overdueCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-400 dark:text-[#636366]"}`}>
              {summary.overdueCount}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-[#636366] mt-0.5">Payments overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1c1c1e] p-3 rounded-2xl shadow-sm border border-gray-100 dark:border-[#2c2c2e]">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients, services, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-gray-50 dark:bg-[#2c2c2e] hover:bg-white dark:hover:bg-[#3a3a3c] focus:bg-white dark:focus:bg-[#3a3a3c]"
          />
        </div>
      </div>

      {/* ── Client Grid ────────────────────────────────────────────────────── */}
      {isLoadingData ? (
        <p className="text-sm text-gray-500 text-center py-12">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="dark:bg-[#1c1c1e] dark:border-[#2c2c2e]">
          <CardContent className="p-12 text-center">
            <Briefcase className="h-10 w-10 text-gray-300 dark:text-[#3a3a3c] mx-auto mb-3" />
            <p className="font-bold text-gray-900 dark:text-white">No clients yet</p>
            <p className="text-sm text-gray-500 dark:text-[#8e8e93] mt-1">
              Add clients manually or convert leads from the Leads page.
            </p>
            <Button onClick={() => setAddOpen(true)} variant="outline" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" /> Add first client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const services = (c.clientServices || "").split(",").map(s => s.trim()).filter(Boolean);
            const status = STATUS_CONFIG[c.projectStatus || "in_progress"] ?? STATUS_CONFIG.in_progress;
            const clientPayments = clientPaymentsMap.get(c.id) || [];
            const hasPayments = clientPayments.length > 0;
            const hasProjectValue = !!c.projectValue;
            const isSettingValue = settingValueId === c.id;

            return (
              <Card key={c.id} className="group hover:shadow-md transition-all border border-gray-100 dark:bg-[#1c1c1e] dark:border-[#2c2c2e]">
                <CardContent className="p-5">
                  {/* ── Card header ── */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm shrink-0">
                      {c.businessName[0]?.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] font-semibold px-2 py-0.5 ${status.className}`}>
                        {status.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-[#2c2c2e] text-gray-400">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Pencil className="h-4 w-4 mr-2" /> Edit client
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleRevert(c.id)} className="text-amber-600">
                            <RotateCcw className="h-4 w-4 mr-2" /> Move back to Leads
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* ── Name + niche ── */}
                  <Link href={`/crm/leads/${c.id}`} className="block">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors leading-tight">
                      {c.businessName}
                    </h3>
                    {c.niche && <p className="text-xs text-gray-500 dark:text-[#8e8e93] mt-0.5">{c.niche}</p>}
                  </Link>

                  {/* ── Services ── */}
                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {services.map(s => (
                        <Badge key={s} variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* ── Payments section ── */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-[#2c2c2e]">
                    {hasPayments ? (
                      <div className="space-y-2">
                        {/* Project value display with edit */}
                        {editingValueId === c.id ? (
                          <div className="flex gap-2 items-center mb-1">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                              <Input
                                placeholder={String(c.projectValue ?? "")}
                                value={editValueInput}
                                onChange={(e) => setEditValueInput(e.target.value.replace(/[^0-9,]/g, ""))}
                                className="pl-6 h-7 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEditValue();
                                  if (e.key === "Escape") setEditingValueId(null);
                                }}
                              />
                            </div>
                            <Button size="sm" className="h-7 bg-emerald-600 hover:bg-emerald-700 px-2 text-xs" onClick={handleSaveEditValue}>Save</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-1.5 text-xs" onClick={() => setEditingValueId(null)}>✕</Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between mb-1 group/val">
                            <span className="text-[11px] text-gray-400 dark:text-[#636366] font-medium">Project value</span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12px] font-bold text-gray-700 dark:text-[#c0c0c2]">
                                {c.projectValue ? formatINR(c.projectValue) : "—"}
                              </span>
                              <button
                                onClick={() => { setEditingValueId(c.id); setEditValueInput(String(c.projectValue ?? "")); }}
                                className="opacity-0 group-hover/val:opacity-100 transition-opacity text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                              >
                                <Pencil className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        )}
                        {/* Payment status rows */}
                        {clientPayments.map(p => (
                          <PaymentBadge
                            key={p.id}
                            payment={p}
                            onMark={(payment) => setMarkingPayment(payment)}
                            onUnmark={(p) => { if (confirm("Mark this payment as unpaid? All payment details will be cleared.")) markPaymentUnpaid(p.id); }}
                            onRequest={(payment) => setRequestPaymentModal({ client: c, payment })}
                          />
                        ))}
                        {clientPayments.some(p => p.status === "paid") && (
                          <button
                            onClick={() => setInvoiceModal({ client: c })}
                            className="mt-2 w-full flex justify-center items-center gap-1.5 text-[11px] font-medium text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30 rounded py-1.5 hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                            Generate Master Invoice
                          </button>
                        )}
                      </div>
                    ) : isSettingValue ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-gray-500 dark:text-[#8e8e93]">Enter project value to set up payments</p>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">₹</span>
                            <Input
                              placeholder="50000"
                              value={valueInput}
                              onChange={(e) => setValueInput(e.target.value.replace(/[^0-9,]/g, ""))}
                              className="pl-6 h-8 text-sm"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveProjectValue();
                                if (e.key === "Escape") setSettingValueId(null);
                              }}
                            />
                          </div>
                          <Button size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 px-3" onClick={handleSaveProjectValue}>
                            Set
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => setSettingValueId(null)}>
                            ✕
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleSetupPayments(c)}
                        className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 dark:text-[#636366] hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        {hasProjectValue ? "Set up payment tracking" : "Add project value & track payments"}
                      </button>
                    )}
                  </div>

                  {/* ── Contact info ── */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#2c2c2e] space-y-1.5">
                    {c.phone && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8e8e93]">
                        <Phone className="h-3 w-3 shrink-0" /> {c.phone}
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8e8e93] min-w-0">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </div>
                    )}
                    {c.website && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8e8e93] min-w-0">
                        <Globe className="h-3 w-3 shrink-0" />
                        <a
                          href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-emerald-600 dark:text-emerald-400 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {c.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                    {c.becameClientAt && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8e8e93]">
                        <Calendar className="h-3 w-3 shrink-0" /> Client since {formatTimeAgo(c.becameClientAt)}
                      </div>
                    )}
                    {c.projectStartedAt && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8e8e93]">
                        <Timer className="h-3 w-3 shrink-0 text-emerald-500" />
                        Started {new Date(c.projectStartedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    )}
                    {c.projectStatus === "delivered" && c.projectDeliveredAt && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-[#8e8e93]">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" />
                        Delivered {new Date(c.projectDeliveredAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    )}
                  </div>

                  {/* ── Days duration badge ── */}
                  {c.projectStartedAt && (() => {
                    const endDate = c.projectStatus === "delivered" && c.projectDeliveredAt
                      ? new Date(c.projectDeliveredAt)
                      : new Date();
                    const days = Math.round(Math.abs(endDate.getTime() - new Date(c.projectStartedAt).getTime()) / 86400000);
                    return (
                      <div className={`mt-3 flex items-center gap-1.5 text-[11px] font-semibold rounded-lg px-2.5 py-1.5 w-fit ${
                        c.projectStatus === "delivered"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>
                        <Timer className="h-3 w-3" />
                        {c.projectStatus === "delivered"
                          ? `Completed in ${days} day${days !== 1 ? "s" : ""}`
                          : `${days} day${days !== 1 ? "s" : ""} in progress`}
                      </div>
                    );
                  })()}

                  {/* ── Notes ── */}
                  {c.clientNotes && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-[#2c2c2e]">
                      <div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-[#8e8e93]">
                        <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                        <p className="line-clamp-2">{c.clientNotes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <AddClientModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mode="add"
        onConfirm={async (data) => {
          await addDirectClient({
            businessName: data.businessName,
            phone: data.phone,
            email: data.email || undefined,
            website: data.website || undefined,
            services: data.services || undefined,
            notes: data.notes || undefined,
            projectStatus: data.projectStatus,
            projectValue: data.projectValue,
            becameClientAt: data.becameClientAtISO,
            projectStartedAt: data.projectStartedAtISO,
            projectDeliveredAt: data.projectDeliveredAtISO,
          });
        }}
      />

      <AddClientModal
        open={editing.open}
        onClose={() => setEditing(EMPTY_EDIT)}
        mode="edit"
        initial={{
          businessName: editing.businessName,
          phone: editing.phone,
          email: editing.email,
          website: editing.website,
          services: editing.services,
          projectStatus: editing.projectStatus,
          notes: editing.notes,
          becameClientAt: editing.becameClientAt,
          projectStartedAt: editing.projectStartedAt,
          projectDeliveredAt: editing.projectDeliveredAt,
        }}
        onConfirm={async (data) => {
          await updateClientInfo(editing.leadId, {
            businessName: data.businessName,
            phone: data.phone,
            services: data.services,
            notes: data.notes,
            projectStatus: data.projectStatus,
            website: data.website,
            becameClientAt: data.becameClientAtISO,
            projectStartedAt: data.projectStartedAtISO,
            projectDeliveredAt: data.projectDeliveredAtISO,
          });
        }}
      />

      <MarkPaymentModal
        payment={markingPayment}
        totalProjectValue={markingPayment ? clients.find(c => c.id === markingPayment.leadId)?.projectValue : undefined}
        onClose={() => setMarkingPayment(null)}
        onConfirm={async (paymentId, data) => {
          await markPaymentPaid(paymentId, data);
        }}
      />

      {invoiceModal && (
        <GenerateInvoiceModal
          open={!!invoiceModal}
          onClose={() => setInvoiceModal(null)}
          client={invoiceModal.client}
          allPayments={payments.filter(p => p.leadId === invoiceModal.client.id)}
        />
      )}

      {requestPaymentModal && (
        <PaymentRequestModal
          open={!!requestPaymentModal}
          onClose={() => setRequestPaymentModal(null)}
          client={requestPaymentModal.client}
          payment={requestPaymentModal.payment}
        />
      )}
    </div>
  );
}
