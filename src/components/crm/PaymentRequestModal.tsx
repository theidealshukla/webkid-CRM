"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { INVOICE_OWNER, buildUpiUrl } from "@/lib/invoice-config";
import QRCode from "qrcode";
import { toPng } from "html-to-image";

interface Props {
  open: boolean;
  onClose: () => void;
  client: { businessName: string };
  payment: { amount: number; type: string; notes?: string };
}

function formatINR(amount: number) {
  return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

export function PaymentRequestModal({ open, onClose, client, payment }: Props) {
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const upiUri = buildUpiUrl(payment.amount);
    QRCode.toDataURL(upiUri, {
      margin: 1,
      color: { dark: "#000000", light: "#ffffff" },
      width: 256,
    }).then(setQrCodeData).catch(console.error);
  }, [open, payment.amount]);

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      // Small timeout to ensure fonts/layout are fully rendered
      await new Promise(r => setTimeout(r, 100));
      
      const dataUrl = await toPng(cardRef.current, { 
        cacheBust: true,
        pixelRatio: 3, // High resolution
        style: {
          transform: "scale(1)", // Avoid zooming issues
          margin: "0",
        }
      });
      
      const link = document.createElement("a");
      link.download = `Payment_Request_${client.businessName.replace(/\s+/g, '_')}_${payment.type}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Payment request card downloaded!");
    } catch (e: any) {
      toast.error("Failed to generate image: " + e.message);
    } finally {
      setGenerating(false);
      onClose();
    }
  }, [client.businessName, payment.type, onClose]);

  if (!open) return null;

  const paymentLabel = payment.type === "upfront" ? "Advance Payment" 
                     : payment.type === "final" ? "Final Payment" 
                     : payment.notes || "Add-on Payment";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Payment Request Card</DialogTitle>
          <DialogDescription>
            Download a high-quality image to send via WhatsApp or Email.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center p-4 bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden relative group">
          {/* ── CARD TO EXPORT ── */}
          <div 
            ref={cardRef} 
            className="w-[400px] bg-white rounded-2xl shadow-xl overflow-hidden relative flex flex-col items-center"
            style={{ 
              background: "linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)",
              boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
              padding: "40px 32px 32px"
            }}
          >
            {/* Top decorative bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-gray-900 to-gray-700" />
            
            <h2 className="text-gray-500 text-xs uppercase tracking-[0.2em] font-medium mb-2 text-center">
              Payment Request
            </h2>
            <h1 className="text-gray-900 text-2xl font-bold text-center tracking-tight leading-tight mb-8">
              {client.businessName}
            </h1>

            <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-6 flex flex-col items-center mb-8 relative">
              <span className="text-gray-500 text-sm font-medium mb-1">{paymentLabel}</span>
              <span className="text-5xl font-extrabold tracking-tighter text-gray-900">
                {formatINR(payment.amount)}
              </span>
              
              <div className="mt-8 p-3 bg-white rounded-xl shadow-sm border border-gray-100">
                {qrCodeData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrCodeData} alt="UPI QR" className="w-32 h-32 rounded-lg" />
                ) : (
                  <div className="w-32 h-32 bg-gray-100 animate-pulse rounded-lg" />
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 font-medium tracking-wide uppercase">Scan to Pay via UPI</p>
            </div>

            <div className="w-full flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-gray-500 font-medium">UPI ID</span>
                <span className="text-gray-900 font-bold font-mono tracking-tight">{INVOICE_OWNER.upiId}</span>
              </div>
              
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Bank Transfer</span>
                  <span className="text-gray-900 font-bold">{INVOICE_OWNER.bank.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Account Name</span>
                  <span className="text-gray-900 font-medium">{INVOICE_OWNER.bank.holderName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Account Number</span>
                  <span className="text-gray-900 font-mono font-bold tracking-tight">{INVOICE_OWNER.bank.accountNo}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">IFSC Code</span>
                  <span className="text-gray-900 font-mono font-bold tracking-tight">{INVOICE_OWNER.bank.ifsc}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 mb-2 w-full flex justify-center items-center gap-2">
              <div className="w-4 h-4 bg-gray-900 rounded-sm" />
              <span className="text-gray-900 font-bold tracking-[0.15em] text-xs">WEBKID</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={generating}>Cancel</Button>
          <Button 
            onClick={handleDownload} 
            disabled={generating}
            className="gap-2 bg-gray-900 hover:bg-gray-800 text-white"
          >
            {generating 
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Rendering Image...</>
              : <><Download className="h-4 w-4" /> Download PNG Card</>
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
