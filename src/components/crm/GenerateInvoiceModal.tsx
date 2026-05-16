"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { pdf } from "@react-pdf/renderer";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Download, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/config/supabase";
import { useAuth } from "@/context/AuthContext";
import { useCRM } from "@/context/CRMContext";
import { InvoicePDF, type InvoiceData, type InvoiceLineItem } from "./InvoicePDF";
import type { Lead, Payment } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  client: Lead;
  allPayments: Payment[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
}

function formatINR(n: number): string {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

async function fetchInvoiceNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("next_invoice_number");
  if (error || !data) {
    const now = new Date();
    return `WK-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  }
  return data as string;
}

function ItemRow({
  item, idx, onUpdate, onRemove, canRemove, placeholder,
}: {
  item: InvoiceLineItem; idx: number;
  onUpdate: (idx: number, field: keyof InvoiceLineItem, val: string | number) => void;
  onRemove: (idx: number) => void;
  canRemove: boolean;
  placeholder: string;
}) {
  return (
    <div className="flex gap-2 items-center">
      <Input
        className="flex-1 text-sm"
        placeholder={placeholder}
        value={item.description}
        onChange={(e) => onUpdate(idx, "description", e.target.value)}
      />
      <div className="relative w-32 shrink-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
        <Input
          className="pl-6 text-sm"
          type="number"
          placeholder="0"
          value={item.amount || ""}
          onChange={(e) => onUpdate(idx, "amount", e.target.value)}
        />
      </div>
      {canRemove && (
        <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-red-500 shrink-0" onClick={() => onRemove(idx)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function GenerateInvoiceModal({ open, onClose, client, allPayments }: Props) {
  const { user } = useAuth();

  const addonPayments = allPayments.filter(p => p.type === "addon");
  const totalProjectValue = client.projectValue ?? allPayments.reduce((s, p) => s + p.amount, 0);
  const addonsTotal = addonPayments.reduce((s, p) => s + p.amount, 0);
  const baseValue = Math.max(0, totalProjectValue - addonsTotal);

  // ── Base line items (Master Invoice) ─────────────────────────────────────
  const baseItems: InvoiceLineItem[] = [
    { 
      description: client.clientServices 
        ? `${client.businessName} — ${client.clientServices}` 
        : `${client.businessName} — Base Services`, 
      amount: baseValue
    }
  ];

  const addonItems: InvoiceLineItem[] = addonPayments.map(addon => ({
    description: addon.notes || "Additional Feature / Add-on",
    amount: addon.amount
  }));

  const defaultItems = [...baseItems, ...addonItems];

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`invoice_items_${client.id}`);
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return defaultItems;
  });

  const [notes, setNotes] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`invoice_notes_${client.id}`);
        if (saved) return saved;
      } catch (e) {}
    }
    return client.clientNotes || "";
  });

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      localStorage.setItem(`invoice_items_${client.id}`, JSON.stringify(lineItems));
      localStorage.setItem(`invoice_notes_${client.id}`, notes);
    }
  }, [lineItems, notes, client.id, open]);

  const [generating, setGenerating] = useState(false);

  // Pre-fetch invoice number as soon as the modal opens
  const prewarm = useRef<{ invoiceNumber?: string }>({});
  useEffect(() => {
    if (!open) { prewarm.current = {}; return; }
    fetchInvoiceNumber().then(n => { prewarm.current.invoiceNumber = n; });
  }, [open]);

  // ── Totals calculation ────────────────────────────────────────────────────
  const paidPayments   = allPayments.filter(p => p.status === "paid");
  const totalPaid      = paidPayments.reduce((s, p) => s + p.amount, 0);
  const totalValue     = client.projectValue ?? allPayments.reduce((s, p) => s + p.amount, 0);
  const baseSubtotal   = lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  // Effective figures — what the PDF actually displays.
  const effectiveProjectTotal = totalValue;
  const newBalanceDue  = Math.max(0, effectiveProjectTotal - totalPaid);

  // ── Item helpers ──────────────────────────────────────────────────────────
  const updateBase  = (i: number, f: keyof InvoiceLineItem, v: string | number) =>
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [f]: f === "amount" ? Number(v) : v } : item));
  const removeBase  = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const addBase     = () => setLineItems(prev => [...prev, { description: "", amount: 0 }]);

  // ── PDF generation ────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const invoiceNumber = prewarm.current.invoiceNumber ?? await fetchInvoiceNumber();

      const allLineItems: InvoiceLineItem[] = lineItems;

      // Bug 4 fix: compute from allPayments inside the callback so it's never stale
      const currentPaidPayments = allPayments.filter(p => p.status === "paid");
      const currentTotalPaid    = currentPaidPayments.reduce((s, p) => s + p.amount, 0);
      const currentBalanceDue   = Math.max(0, (client.projectValue ?? allPayments.reduce((s, p) => s + p.amount, 0)) - currentTotalPaid);

      const transactions = currentPaidPayments.map(p => ({
        amount: p.amount,
        method: p.paymentMethod === "upi" ? "UPI" : p.paymentMethod === "bank" ? "Bank Transfer" : p.paymentMethod ? p.paymentMethod.charAt(0).toUpperCase() + p.paymentMethod.slice(1) : "UPI",
        reference: p.reference || "N/A",
        date: p.paidDate ? formatDate(p.paidDate) : "Unknown",
        label: p.type === "upfront" ? "Upfront" : p.type === "final" ? "Final" : (p.notes || "Add-on")
      }));

      const invoiceData: InvoiceData = {
        invoiceNumber,
        issuedDate:          formatDate(new Date().toISOString()),
        clientName:          client.businessName,
        clientPhone:         client.phone,
        clientEmail:         client.email,
        projectDescription:  client.clientServices || "Digital Services",
        lineItems:           allLineItems,
        projectTotal:        effectiveProjectTotal,
        previouslyPaid:      0,
        amountReceived:      currentTotalPaid,
        balanceDue:          currentBalanceDue,
        paymentType:         "master",
        notes:               notes || undefined,
        transactions,
      };

      // Bug 1 fix: race against a 30s timeout so the spinner can never hang forever
      const blob = await Promise.race([
        pdf(<InvoicePDF data={invoiceData} />).toBlob(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("PDF generation timed out. Please try again.")), 30000)
        ),
      ]);

      // Bug 2 fix: await the insert so the unique invoice_number constraint is committed
      // before next_invoice_number() can be called again
      const { error: insertError } = await supabase.from("invoices").insert([{
        invoice_number:  invoiceNumber,
        lead_id:         client.id,
        payment_id:      null,
        issued_date:     new Date().toISOString().split("T")[0],
        line_items:      allLineItems,
        subtotal:        baseSubtotal,
        total:           baseSubtotal,
        amount_received: currentTotalPaid,
        balance_due:     currentBalanceDue,
        status:          currentBalanceDue === 0 ? "paid" : "partial",
        payment_method:  "multiple",
        transaction_id:  "master",
        paid_date:       new Date().toISOString().split("T")[0],
        notes:           notes || null,
        created_by:      user?.id || null,
      }]);
      if (insertError) console.error("Invoice DB save failed:", insertError);

      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href    = url;
      a.download = `${invoiceNumber}-${client.businessName.replace(/\s+/g, "-")}.pdf`;
      a.click();
      // Bug 3 fix: delay revoke so the browser has time to read the blob for download
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      toast.success(`Invoice ${invoiceNumber} downloaded`);
      onClose();
    } catch (e: any) {
      console.error("Invoice generation error:", e);
      toast.error("Failed to generate invoice: " + e.message);
    } finally {
      setGenerating(false);
    }
  }, [lineItems, notes, client, allPayments, effectiveProjectTotal, baseSubtotal, user?.id, onClose]);

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-900 dark:bg-gray-100 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-white dark:text-gray-900" />
            </div>
            <div>
              <DialogTitle>Generate Master Invoice</DialogTitle>
              <DialogDescription className="mt-0.5">
                {client.businessName} · Master Invoice · {formatINR(totalPaid)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">

          {/* ── Summary strip ── */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              Project total: {formatINR(effectiveProjectTotal)}
            </Badge>
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800">
              Total Paid: {formatINR(totalPaid)}
            </Badge>
            {newBalanceDue > 0 ? (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                Balance after: {formatINR(newBalanceDue)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
                Fully settled ✓
              </Badge>
            )}
          </div>

          {/* ── Base line items ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Services / Scope</Label>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[10px] text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
                onClick={() => {
                  setLineItems(defaultItems);
                  setNotes(client.clientNotes || "");
                }}
              >
                Reset to default
              </Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <ItemRow key={idx} item={item} idx={idx} onUpdate={updateBase} onRemove={removeBase}
                  canRemove={lineItems.length > 1} placeholder="Service description" />
              ))}
            </div>
            <Button variant="ghost" size="sm" className="text-xs text-gray-500 gap-1.5" onClick={addBase}>
              <Plus className="h-3.5 w-3.5" /> Add service
            </Button>
          </div>



          {/* ── Notes ── */}
          <div className="space-y-1.5">
            <Label htmlFor="inv-notes" className="text-sm font-medium">
              Notes <span className="text-gray-400 font-normal">(optional — appears on invoice)</span>
            </Label>
            <Textarea
              id="inv-notes"
              className="text-sm resize-none"
              rows={2}
              placeholder="e.g. Includes 2 revision rounds. Delivery by 30 May."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* ── Transaction ID ── */}
          {paidPayments.length > 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-xs text-gray-500 mb-1">Transactions on invoice</p>
              <p className="text-sm font-medium">{paidPayments.length} payment(s) mapped</p>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                No paid payments found. Mark payments as paid first.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generating}>Cancel</Button>
          <Button
            onClick={handleGenerate}
            disabled={generating || lineItems.every(i => !i.description)}
            className="gap-2 bg-gray-900 hover:bg-gray-800 text-white dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {generating
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating PDF…</>
              : <><Download className="h-4 w-4" /> Download Invoice</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
