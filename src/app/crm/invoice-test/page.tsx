"use client";

import React, { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Loader2, Download, CheckCircle2, Clock } from "lucide-react";
import { InvoicePDF, type InvoiceData } from "@/components/crm/InvoicePDF";

// ── Test scenarios ────────────────────────────────────────────────────────────

const SCENARIOS: { label: string; tag: string; tagColor: string; description: string; data: InvoiceData }[] = [
  {
    // Advance invoice: line items show the current payment (5,000), not the full 10,000.
    // Financial summary shows full project value + outstanding balance.
    label: "Upfront Payment",
    tag: "50% upfront · partially paid",
    tagColor: "bg-blue-100 text-blue-700",
    description: "Total project: Rs. 10,000. Client pays Rs. 5,000 upfront. Rs. 5,000 still outstanding.",
    data: {
      invoiceNumber:      "WK-2026-001",
      issuedDate:         "16 May 2026",
      clientName:         "Test Client Pvt Ltd",
      clientPhone:        "+91 98765 43210",
      clientEmail:        "client@example.com",
      projectDescription: "Website Design & Development",
      lineItems: [
        { description: "Website Design & Development — Advance Payment (50%)", amount: 5000 },
      ],
      projectTotal:    10000,
      previouslyPaid:  0,
      amountReceived:  5000,
      balanceDue:      5000,
      paymentType:     "upfront",
      transactions: [
        { method: "UPI", reference: "UPI123456789", date: "16 May 2026", amount: 5000, label: "Upfront" }
      ],
      notes:           "Includes 2 revision rounds. Delivery in 30 days.",
    },
  },
  {
    // Final invoice: line items show only the final payment (5,000).
    // Summary shows full 10,000 project value, 5,000 previously paid, 5,000 current, NIL outstanding.
    label: "Final Settlement",
    tag: "fully settled",
    tagColor: "bg-green-100 text-green-700",
    description: "Upfront Rs. 5,000 paid earlier. Client now pays final Rs. 5,000. Project fully settled.",
    data: {
      invoiceNumber:      "WK-2026-002",
      issuedDate:         "16 May 2026",
      clientName:         "Test Client Pvt Ltd",
      clientPhone:        "+91 98765 43210",
      clientEmail:        "client@example.com",
      projectDescription: "Website Design & Development",
      lineItems: [
        { description: "Website Design & Development — Final Settlement (50%)", amount: 5000 },
      ],
      projectTotal:    10000,
      previouslyPaid:  5000,
      amountReceived:  5000,
      balanceDue:      0,
      paymentType:     "final",
      transactions: [
        { method: "Bank Transfer", reference: "SBIN00099887766", date: "16 May 2026", amount: 5000, label: "Final" }
      ],
      notes:           "Project delivered and approved.",
    },
  },
  {
    // Final with extras: base project Rs. 10,000 + Rs. 2,000 extras.
    // Line items show only this invoice's transactions. projectTotal = 10,000 + 2,000 = 12,000.
    label: "Final Settlement + Extra Work",
    tag: "extras included",
    tagColor: "bg-violet-100 text-violet-700",
    description: "Project Rs. 10,000 + Rs. 2,000 extras. Upfront Rs. 5,000 paid. Final bill: Rs. 7,000.",
    data: {
      invoiceNumber:      "WK-2026-003",
      issuedDate:         "16 May 2026",
      clientName:         "Test Client Pvt Ltd",
      clientPhone:        "+91 98765 43210",
      clientEmail:        "client@example.com",
      projectDescription: "Website Design & Development",
      lineItems: [
        { description: "Website Design & Development — Final Settlement (50%)", amount: 5000 },
        { description: "— Additional Work —", amount: 0 },
        { description: "WhatsApp Chat Integration", amount: 1500 },
        { description: "Extra Landing Page", amount: 500 },
      ],
      projectTotal:    12000,
      previouslyPaid:  5000,
      amountReceived:  7000,
      balanceDue:      0,
      paymentType:     "final",
      transactions: [
        { method: "UPI", reference: "UPI987654321", date: "16 May 2026", amount: 7000, label: "Final + Extras" }
      ],
      notes:           "Includes additional WhatsApp integration and landing page.",
    },
  },
  {
    label: "Upfront — No Email",
    tag: "minimal data",
    tagColor: "bg-gray-100 text-gray-600",
    description: "Edge case: client has no email, no notes, no transaction ID. Project Rs. 15,000, advance Rs. 7,500.",
    data: {
      invoiceNumber:      "WK-2026-004",
      issuedDate:         "16 May 2026",
      clientName:         "Walk-in Client",
      clientPhone:        "+91 99999 00000",
      projectDescription: "SEO Services",
      lineItems: [
        { description: "3-Month SEO Package — Advance Payment (50%)", amount: 7500 },
      ],
      projectTotal:    15000,
      previouslyPaid:  0,
      amountReceived:  7500,
      balanceDue:      7500,
      paymentType:     "upfront",
      paymentMethod:   "Cash",
    },
  },
];

// ── Per-card state ────────────────────────────────────────────────────────────

function ScenarioCard({ scenario }: { scenario: typeof SCENARIOS[0] }) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  const generate = async () => {
    setState("loading");
    try {
      const blob = await pdf(<InvoicePDF data={scenario.data} />).toBlob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${scenario.data.invoiceNumber}-test.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setState("done");
      setTimeout(() => setState("idle"), 3000);
    } catch (e: any) {
      console.error("Test PDF error:", e);
      setState("idle");
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{scenario.label}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${scenario.tagColor}`}>
              {scenario.tag}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{scenario.description}</p>
        </div>
      </div>

      {/* Numbers */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2.5">
          <p className="text-gray-400 mb-0.5">Project total</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            Rs. {scenario.data.projectTotal.toLocaleString("en-IN")}
          </p>
        </div>
        {scenario.data.previouslyPaid > 0 && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-800 p-2.5">
            <p className="text-gray-400 mb-0.5">Previously paid</p>
            <p className="font-semibold text-gray-500">
              Rs. {scenario.data.previouslyPaid.toLocaleString("en-IN")}
            </p>
          </div>
        )}

        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5">
          <p className="text-emerald-600/70 mb-0.5">This payment</p>
          <p className="font-semibold text-emerald-700 dark:text-emerald-400">
            Rs. {scenario.data.amountReceived.toLocaleString("en-IN")}
          </p>
        </div>
        <div className={`rounded-lg p-2.5 ${scenario.data.balanceDue === 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-amber-50 dark:bg-amber-950/30"}`}>
          <p className={`mb-0.5 ${scenario.data.balanceDue === 0 ? "text-green-600/70" : "text-amber-600/70"}`}>Outstanding</p>
          <p className={`font-semibold ${scenario.data.balanceDue === 0 ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-400"}`}>
            {scenario.data.balanceDue === 0 ? "NIL — Fully settled" : `Rs. ${scenario.data.balanceDue.toLocaleString("en-IN")}`}
          </p>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={generate}
        disabled={state === "loading"}
        className={`w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors
          ${state === "done"
            ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
            : state === "loading"
            ? "bg-gray-100 text-gray-400 dark:bg-gray-800 cursor-not-allowed"
            : "bg-gray-900 text-white hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
          }`}
      >
        {state === "loading" ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</>
        ) : state === "done" ? (
          <><CheckCircle2 className="h-4 w-4" /> Downloaded</>
        ) : (
          <><Download className="h-4 w-4" /> Generate PDF</>
        )}
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function InvoiceTestPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full">
            Dev test page — remove before going live
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-2">Invoice PDF Test</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate test PDFs for each payment scenario. No database writes — purely for layout verification.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SCENARIOS.map((s) => (
          <ScenarioCard key={s.label} scenario={s} />
        ))}
      </div>
    </div>
  );
}
