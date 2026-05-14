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
import { Loader2, CheckCircle2 } from "lucide-react";
import type { Payment, PaymentMethod } from "@/types";

function formatINR(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

interface Props {
  payment: Payment | null;
  onClose: () => void;
  onConfirm: (paymentId: string, data: { paidDate: string; method: PaymentMethod; reference?: string; notes?: string }) => Promise<void>;
}

export function MarkPaymentModal({ payment, onClose, onConfirm }: Props) {
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (payment) {
      setPaidDate(new Date().toISOString().split("T")[0]);
      setMethod("upi");
      setReference("");
      setNotes("");
    }
  }, [payment]);

  const submit = async () => {
    if (!payment) return;
    setSubmitting(true);
    try {
      await onConfirm(payment.id, { paidDate, method, reference: reference || undefined, notes: notes || undefined });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!payment) return null;

  const label = payment.type === "upfront" ? "Upfront Payment (50%)" : "Final Payment (50%)";

  return (
    <Dialog open={!!payment} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-[#1e1e20] flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <DialogTitle>Mark Payment as Paid</DialogTitle>
              <DialogDescription className="mt-0.5">
                {label} · {formatINR(payment.amount)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mp-date">Date Received</Label>
              <Input
                id="mp-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mp-method">Payment Method</Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger id="mp-method">
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

          <div className="space-y-1.5">
            <Label htmlFor="mp-ref">
              Reference / Transaction ID{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="mp-ref"
              placeholder="UPI ref, transaction ID..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mp-notes">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="mp-notes"
              placeholder="Any additional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving</>
              : "Mark as Paid"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
