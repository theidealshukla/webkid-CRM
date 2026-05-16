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
import { Loader2, FileText, Download, Plus, Trash2, Sparkles, ArrowRight } from "lucide-react";
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
  payment: Payment;
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

export function GenerateInvoiceModal({ open, onClose, client, payment, allPayments }: Props) {
  const { user } = useAuth();
  const { addPaymentExtras } = useCRM();

  // ── Base line items (original scope) ─────────────────────────────────────
  // Line items represent the current payment transaction (not the full project value).
  // The full project value appears separately in the financial summary.
  const defaultItems: InvoiceLineItem[] = client.clientServices
    ? client.clientServices.split(",").map((s, i) => ({
        description: s.trim(),
        amount: i === 0 ? payment.amount : 0,
      }))
    : [{ description: client.businessName + " — Services", amount: payment.amount }];

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(defaultItems);

  // ── Extra / additional charges ────────────────────────────────────────────
  const [extraItems, setExtraItems] = useState<InvoiceLineItem[]>([]);
  const [showExtras, setShowExtras] = useState(false);

  const [notes, setNotes] = useState(client.clientNotes || "");
  const [generating, setGenerating] = useState(false);

  // Pre-fetch invoice number as soon as the modal opens
  const prewarm = useRef<{ invoiceNumber?: string }>({});
  useEffect(() => {
    if (!open) { prewarm.current = {}; return; }
    fetchInvoiceNumber().then(n => { prewarm.current.invoiceNumber = n; });
  }, [open]);

  // ── Totals calculation ────────────────────────────────────────────────────
  // The invoice shows three distinct figures: the full project value, what's
  // been paid on OTHER payments, and what this specific invoice is collecting.
  // When `extraTotal > 0`, the user is adding scope to the project — those
  // extras get absorbed into the project value AND this payment's amount when
  // the invoice is generated, so "effective" figures reflect the post-save state.
  const amountRecv     = payment.amount;
  const isCurrentPaid  = payment.status === "paid";
  const totalPaid      = allPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalValue     = client.projectValue ?? allPayments.reduce((s, p) => s + p.amount, 0);
  const baseSubtotal   = lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const extraTotal     = extraItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  // Paid on other (non-current) payments. Correct whether current is paid or pending.
  const paidElsewhere  = Math.max(0, totalPaid - (isCurrentPaid ? amountRecv : 0));

  // Effective (post-absorption) figures — what the PDF actually displays.
  const effectiveAmountRecv   = amountRecv + extraTotal;
  const effectiveProjectTotal = totalValue + extraTotal;

  // grandTotal = sum of line items + extras for this specific invoice.
  // Falls back to the effective payment amount if user clears line item amounts.
  const grandTotal     = (baseSubtotal || amountRecv) + extraTotal;
  const previouslyPaid = paidElsewhere;
  const newBalanceDue  = Math.max(0, effectiveProjectTotal - paidElsewhere - effectiveAmountRecv);

  // ── Item helpers ──────────────────────────────────────────────────────────
  const updateBase  = (i: number, f: keyof InvoiceLineItem, v: string | number) =>
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [f]: f === "amount" ? Number(v) : v } : item));
  const removeBase  = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const addBase     = () => setLineItems(prev => [...prev, { description: "", amount: 0 }]);

  const updateExtra = (i: number, f: keyof InvoiceLineItem, v: string | number) =>
    setExtraItems(prev => prev.map((item, idx) => idx === i ? { ...item, [f]: f === "amount" ? Number(v) : v } : item));
  const removeExtra = (i: number) => {
    const next = extraItems.filter((_, idx) => idx !== i);
    setExtraItems(next);
    if (next.length === 0) setShowExtras(false);
  };
  const addExtra    = () => setExtraItems(prev => [...prev, { description: "", amount: 0 }]);

  const handleAddExtra = () => {
    setShowExtras(true);
    setExtraItems([{ description: "", amount: 0 }]);
  };

  // ── PDF generation ────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const invoiceNumber = prewarm.current.invoiceNumber ?? await fetchInvoiceNumber();

      // Absorb scope additions into the data model BEFORE generating the PDF,
      // so the project value and this payment's amount stay consistent with
      // what the invoice claims is being collected. (See addPaymentExtras.)
      if (extraTotal > 0) {
        await addPaymentExtras(payment.id, extraTotal, effectiveProjectTotal);
      }

      // Merge base + extra items for the PDF (extras marked with a note)
      const allLineItems: InvoiceLineItem[] = [
        ...lineItems,
        ...(extraItems.length > 0 ? [{ description: "— Additional Work —", amount: 0 } as InvoiceLineItem] : []),
        ...extraItems,
      ];

      const invoiceData: InvoiceData = {
        invoiceNumber,
        issuedDate:          formatDate(new Date().toISOString()),
        clientName:          client.businessName,
        clientPhone:         client.phone,
        clientEmail:         client.email,
        projectDescription:  client.clientServices || "Digital Services",
        lineItems:           allLineItems,
        projectTotal:        effectiveProjectTotal,
        previouslyPaid,
        amountReceived:      effectiveAmountRecv,
        extraTotal:          extraTotal > 0 ? extraTotal : undefined,
        balanceDue:          newBalanceDue,
        paymentType:         payment.type || "payment",
        paymentMethod:       payment.paymentMethod === "upi"  ? "UPI"
                           : payment.paymentMethod === "bank" ? "Bank Transfer"
                           : payment.paymentMethod
                             ? payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1)
                             : "UPI",
        transactionId:       payment.reference || undefined,
        paidDate:            payment.paidDate ? formatDate(payment.paidDate) : undefined,
        notes:               notes || undefined,
      };

      const blob = await pdf(<InvoicePDF data={invoiceData} />).toBlob();

      // Fire-and-forget — user gets the download immediately, DB write happens in background
      supabase.from("invoices").insert([{
        invoice_number:  invoiceNumber,
        lead_id:         client.id,
        payment_id:      payment.id,
        issued_date:     new Date().toISOString().split("T")[0],
        line_items:      allLineItems,
        subtotal:        grandTotal,
        total:           grandTotal,
        amount_received: effectiveAmountRecv,
        balance_due:     newBalanceDue,
        status:          newBalanceDue === 0 ? "paid" : "partial",
        payment_method:  payment.paymentMethod || "upi",
        transaction_id:  payment.reference || null,
        paid_date:       payment.paidDate ? payment.paidDate.split("T")[0] : null,
        notes:           notes || null,
        created_by:      user?.id || null,
      }]);

      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a");
      a.href    = url;
      a.download = `${invoiceNumber}-${client.businessName.replace(/\s+/g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`Invoice ${invoiceNumber} downloaded`);
      onClose();
    } catch (e: any) {
      console.error("Invoice generation error:", e);
      toast.error("Failed to generate invoice: " + e.message);
    } finally {
      setGenerating(false);
    }
  }, [lineItems, extraItems, notes, client, payment, effectiveAmountRecv, effectiveProjectTotal, extraTotal, previouslyPaid, newBalanceDue, grandTotal, addPaymentExtras, user?.id, onClose]);

  if (!open) return null;

  const paymentLabel = payment.type === "upfront" ? "Upfront (50%)" : "Final Payment";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-900 dark:bg-gray-100 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-white dark:text-gray-900" />
            </div>
            <div>
              <DialogTitle>Generate Invoice</DialogTitle>
              <DialogDescription className="mt-0.5">
                {client.businessName} · {paymentLabel} · {formatINR(effectiveAmountRecv)}
                {extraTotal > 0 && (
                  <span className="text-violet-600 dark:text-violet-400">
                    {" "}({formatINR(amountRecv)} + {formatINR(extraTotal)} extras)
                  </span>
                )}
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
            {previouslyPaid > 0 && (
              <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">
                Previously paid: {formatINR(previouslyPaid)}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800">
              This payment: {formatINR(effectiveAmountRecv)}
            </Badge>
            {extraTotal > 0 && (
              <Badge variant="outline" className="text-xs text-violet-600 border-violet-200 bg-violet-50 dark:bg-violet-950/30 dark:border-violet-800">
                incl. extra: {formatINR(extraTotal)}
              </Badge>
            )}
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
            <Label className="text-sm font-medium">Services / Scope</Label>
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

          {/* ── Extra charges section ── */}
          {!showExtras ? (
            <button
              onClick={handleAddExtra}
              className="w-full flex items-center gap-2 rounded-lg border border-dashed border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20 p-3 text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="font-medium">Add extra charges</span>
              <span className="text-xs text-violet-400 dark:text-violet-500 ml-1">
                — client requested additional features, scope changes, etc.
              </span>
            </button>
          ) : (
            <div className="rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50/30 dark:bg-violet-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <Label className="text-sm font-medium text-violet-700 dark:text-violet-400">
                    Additional Charges
                  </Label>
                </div>
                {extraTotal > 0 && (
                  <div className="flex items-center gap-1.5 text-sm font-bold text-violet-700 dark:text-violet-400">
                    <ArrowRight className="h-3.5 w-3.5" />
                    {formatINR(extraTotal)} extra
                  </div>
                )}
              </div>
              <div className="space-y-2">
                {extraItems.map((item, idx) => (
                  <ItemRow key={idx} item={item} idx={idx} onUpdate={updateExtra} onRemove={removeExtra}
                    canRemove={true} placeholder="e.g. WhatsApp chat feature, extra page design…" />
                ))}
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-violet-500 gap-1.5" onClick={addExtra}>
                <Plus className="h-3.5 w-3.5" /> Add another
              </Button>

              {/* Live calculation preview — shows the user exactly what will change */}
              {extraTotal > 0 && (
                <div className="mt-2 rounded-md bg-white dark:bg-gray-900 border border-violet-100 dark:border-violet-900 p-3 space-y-1 text-xs">
                  <div className="flex justify-between text-gray-500">
                    <span>Project value</span>
                    <span>{formatINR(totalValue)} → <span className="font-semibold text-gray-900 dark:text-white">{formatINR(effectiveProjectTotal)}</span></span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>This payment</span>
                    <span>{formatINR(amountRecv)} → <span className="font-semibold text-gray-900 dark:text-white">{formatINR(effectiveAmountRecv)}</span></span>
                  </div>
                  <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t border-gray-100 dark:border-gray-800 pt-1 mt-1">
                    <span>Outstanding after invoice</span>
                    <span className={newBalanceDue === 0 ? "text-emerald-600" : "text-amber-600"}>
                      {newBalanceDue === 0 ? "NIL" : formatINR(newBalanceDue)}
                    </span>
                  </div>
                  <p className="text-[10px] text-violet-500 dark:text-violet-400 pt-1.5 leading-snug">
                    Generating will permanently update the project value and this payment&apos;s amount to reflect the new scope.
                  </p>
                </div>
              )}
            </div>
          )}

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
          {payment.reference ? (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3">
              <p className="text-xs text-gray-500 mb-1">Transaction ID on invoice</p>
              <p className="text-sm font-mono font-medium">{payment.reference}</p>
              <p className="text-xs text-gray-400 mt-0.5">via {payment.paymentMethod?.toUpperCase() || "UPI"}</p>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
              <p className="text-xs text-amber-700 dark:text-amber-400">
                No transaction ID for this payment. Add it via &ldquo;Mark Paid&rdquo; before generating so it appears on the invoice.
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
