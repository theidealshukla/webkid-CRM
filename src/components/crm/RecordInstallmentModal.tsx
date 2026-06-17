"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, IndianRupee, SplitSquareVertical } from "lucide-react";
import type { PaymentMethod } from "@/types";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

interface Props {
  open: boolean;
  onClose: () => void;
  clientName: string;
  remainingBalance: number;
  onConfirm: (data: {
    amount: number;
    paidDate: string;
    method: PaymentMethod;
    reference?: string;
    notes?: string;
  }) => Promise<void>;
}

export function RecordInstallmentModal({
  open, onClose, clientName, remainingBalance, onConfirm,
}: Props) {
  const [amountStr, setAmountStr] = useState("");
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setAmountStr(String(remainingBalance));
      setPaidDate(new Date().toISOString().split("T")[0]);
      setMethod("upi");
      setReference("");
      setNotes("");
    }
  }, [open, remainingBalance]);

  const parsedAmount = parseFloat(amountStr) || 0;
  const isPartial = parsedAmount > 0 && parsedAmount < remainingBalance;
  const willSettle = parsedAmount >= remainingBalance;
  const isValid = parsedAmount > 0 && parsedAmount <= remainingBalance;

  const submit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    try {
      await onConfirm({
        amount: parsedAmount,
        paidDate,
        method,
        reference: reference || undefined,
        notes: notes || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
              <SplitSquareVertical className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <DialogTitle>Record Installment</DialogTitle>
              <DialogDescription className="mt-0.5">
                {clientName} · Outstanding: {formatINR(remainingBalance)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="inst-amount">Amount Received (₹)</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <Input
                id="inst-amount"
                type="number"
                placeholder={String(remainingBalance)}
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="pl-6 font-medium text-violet-600 dark:text-violet-400"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && isValid && submit()}
              />
            </div>
            {parsedAmount > 0 && (
              <p className={`text-[11px] font-medium ${
                parsedAmount > remainingBalance
                  ? "text-red-500"
                  : willSettle
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-violet-600 dark:text-violet-400"
              }`}>
                {parsedAmount > remainingBalance
                  ? `Exceeds outstanding balance (${formatINR(remainingBalance)})`
                  : willSettle
                  ? "✓ This will fully settle the outstanding balance."
                  : `Partial payment. Remaining after this: ${formatINR(remainingBalance - parsedAmount)}`
                }
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="inst-date">Date Received</Label>
              <Input
                id="inst-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
            {/* Method */}
            <div className="space-y-1.5">
              <Label htmlFor="inst-method">Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger id="inst-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <Label htmlFor="inst-ref">
              UTR / Transaction ID{" "}
              {(method === "upi" || method === "bank")
                ? <span className="text-amber-500 font-normal text-xs">(required for invoice)</span>
                : <span className="text-gray-400 font-normal">(optional)</span>
              }
            </Label>
            <Input
              id="inst-ref"
              placeholder={
                method === "upi"  ? "UPI transaction ID / ref number" :
                method === "bank" ? "UTR number (12 digits)" :
                "Reference number"
              }
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className={
                (method === "upi" || method === "bank") && !reference
                  ? "border-amber-300 focus-visible:ring-amber-400"
                  : ""
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="inst-notes">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="inst-notes"
              placeholder="e.g. 2nd installment payment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Balance preview pill */}
          {isValid && (
            <div className="flex items-center gap-3 rounded-lg border border-violet-100 dark:border-violet-900 bg-violet-50/60 dark:bg-violet-950/30 px-3 py-2.5">
              <IndianRupee className="h-4 w-4 text-violet-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">
                  {willSettle ? "Balance after: Fully Settled ✓" : `Balance after: ${formatINR(remainingBalance - parsedAmount)}`}
                </p>
                <p className="text-[10px] text-violet-500 dark:text-violet-400 mt-0.5">
                  Recording {formatINR(parsedAmount)} as a paid installment
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting || !isValid}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
              : "Record Installment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
