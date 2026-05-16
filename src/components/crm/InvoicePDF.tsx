"use client";

import React from "react";
import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";
import { INVOICE_OWNER } from "@/lib/invoice-config";

export interface InvoiceLineItem {
  description: string;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  issuedDate: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  projectDescription: string;
  lineItems: InvoiceLineItem[];
  projectTotal: number;       // total project value (all payments combined)
  previouslyPaid: number;     // amount paid before this invoice
  amountReceived: number;     // amount being paid with this invoice
  extraTotal?: number;
  balanceDue: number;         // outstanding after this invoice
  paymentType: string;        // "upfront" | "final" | raw from db
  paymentMethod: string;
  transactionId?: string;
  paidDate?: string;
  notes?: string;
}

const BLACK  = "#000000";
const DGRAY  = "#111111";
const MGRAY  = "#555555";
const LGRAY  = "#999999";
const BGRAY  = "#f4f4f4";
const WHITE  = "#ffffff";
const BORDER = "#e0e0e0";
const EXTRA  = "#5b21b6";
const GREEN  = "#15803d";
const AMBER  = "#b45309";

const s = StyleSheet.create({
  page: {
    backgroundColor: WHITE,
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 52,
    fontSize: 9,
    color: DGRAY,
  },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },

  logoFallbackBlock: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoMark: { width: 18, height: 18, backgroundColor: BLACK, borderRadius: 2 },
  logoName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 1.5 },
  logoTagline: { fontSize: 7, color: LGRAY, marginTop: 2, letterSpacing: 0.5 },

  invoiceBlock: { alignItems: "flex-end" },
  invoiceWord: { fontSize: 28, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 2 },
  invoiceMeta: { fontSize: 8, color: MGRAY, marginTop: 4, letterSpacing: 0.3 },
  paymentTypeBadge: { marginTop: 6, paddingVertical: 3, paddingHorizontal: 8, borderWidth: 0.5, borderColor: BORDER, borderRadius: 2, alignSelf: "flex-end" },
  paymentTypeText: { fontSize: 7, fontFamily: "Helvetica-Bold", color: MGRAY, letterSpacing: 1, textTransform: "uppercase" },

  divider: { borderBottomWidth: 0.5, borderBottomColor: BORDER, marginVertical: 20 },

  billingRow: { flexDirection: "row", backgroundColor: BGRAY, borderRadius: 4, padding: 18 },
  billingCol: { flex: 1 },
  billingColRight: { flex: 1, borderLeftWidth: 0.5, borderLeftColor: BORDER, paddingLeft: 18 },
  billingLabel: { fontSize: 7, fontFamily: "Helvetica-Bold", color: LGRAY, letterSpacing: 1.2, marginBottom: 6, textTransform: "uppercase" },
  billingName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BLACK, marginBottom: 4 },
  billingText: { fontSize: 8.5, color: MGRAY, lineHeight: 1.6 },

  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BLACK, paddingBottom: 6, marginTop: 24 },
  tableHeaderNo:     { width: 28, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 0.8 },
  tableHeaderDesc:   { flex: 1,   fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 0.8 },
  tableHeaderAmount: { width: 80, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, textAlign: "right", letterSpacing: 0.8 },

  tableRow: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: BORDER, alignItems: "flex-start" },
  tableNo:     { width: 28, fontSize: 8.5, color: LGRAY },
  tableDesc:   { flex: 1,   fontSize: 9,   color: DGRAY, lineHeight: 1.5 },
  tableAmount: { width: 80, fontSize: 9,   color: DGRAY, textAlign: "right" },

  tableDividerRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: BORDER },
  tableDividerText: { flex: 1, fontSize: 7, fontFamily: "Helvetica-Bold", color: LGRAY, letterSpacing: 1 },

  totalsSection: { flexDirection: "row", marginTop: 16, alignItems: "flex-end" },

  // Left block — big number
  totalsDueBlock: { flex: 1 },
  totalsDueLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MGRAY, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  totalsDueAmount: { fontSize: 26, fontFamily: "Helvetica-Bold", color: BLACK },
  totalsDueSubLabel: { fontSize: 7.5, color: MGRAY, marginTop: 5, letterSpacing: 0.3 },
  totalsDueSubAmount: { fontSize: 9, fontFamily: "Helvetica-Bold", color: AMBER, marginTop: 1 },
  totalsPaidInFull: { fontSize: 8, fontFamily: "Helvetica-Bold", color: GREEN, letterSpacing: 0.8, marginTop: 5 },

  // Right grid
  totalsGrid: { width: 220, alignItems: "flex-end" },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingVertical: 3 },
  totalsLabel: { fontSize: 8.5, color: MGRAY },
  totalsValue: { fontSize: 8.5, color: DGRAY },
  totalsDeductValue: { fontSize: 8.5, color: MGRAY },
  totalsExtraValue: { fontSize: 8.5, color: EXTRA, fontFamily: "Helvetica-Bold" },
  totalsOutstandingValue: { fontSize: 8.5, color: AMBER, fontFamily: "Helvetica-Bold" },
  totalsPaidValue: { fontSize: 8.5, color: GREEN, fontFamily: "Helvetica-Bold" },

  totalsGrandRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", paddingTop: 6, marginTop: 4, borderTopWidth: 1, borderTopColor: BLACK },
  totalsGrandLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 0.5 },
  totalsGrandValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },

  bottomSection: { flexDirection: "row", marginTop: 32 },
  paymentInfoBlock: { flex: 1.2 },
  termsBlock: { flex: 1, paddingLeft: 20, borderLeftWidth: 0.5, borderLeftColor: BORDER },

  sectionLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: BLACK, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 },
  paymentLine: { fontSize: 8, color: MGRAY, lineHeight: 1.9 },
  paymentKey: { fontFamily: "Helvetica-Bold", color: DGRAY },
  termsText: { fontSize: 7.5, color: MGRAY, lineHeight: 1.7 },

  txnBox: { backgroundColor: BGRAY, borderRadius: 3, padding: "6 8", marginTop: 10 },
  txnLabel: { fontSize: 7, color: LGRAY, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 },
  txnValue: { fontSize: 9, fontFamily: "Helvetica-Bold", color: BLACK },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 36, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: BORDER },
  footerLeft: { fontSize: 7.5, color: LGRAY },
  footerRight: { fontSize: 7.5, color: LGRAY },

  paidBadge: { position: "absolute", bottom: 108, right: 52, borderWidth: 2, borderColor: GREEN, borderRadius: 3, paddingVertical: 4, paddingHorizontal: 14 },
  paidText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: GREEN, letterSpacing: 2 },
  partialBadge: { position: "absolute", bottom: 108, right: 52, borderWidth: 2, borderColor: AMBER, borderRadius: 3, paddingVertical: 4, paddingHorizontal: 14 },
  partialText: { fontSize: 9, fontFamily: "Helvetica-Bold", color: AMBER, letterSpacing: 2 },
});

function fmt(amount: number): string {
  return "Rs. " + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount);
}

function paymentTypeLabel(type: string): string {
  if (type === "upfront") return "Upfront Payment";
  if (type === "final")   return "Final Payment";
  return "Payment Receipt";
}

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const {
    invoiceNumber, issuedDate, clientName, clientPhone, clientEmail,
    projectDescription, lineItems, projectTotal, previouslyPaid,
    amountReceived, extraTotal, balanceDue, paymentType,
    paymentMethod, transactionId, paidDate, notes,
  } = data;

  const isFullyPaid = balanceDue === 0;
  const hasExtra    = (extraTotal ?? 0) > 0;
  const hasPrev     = previouslyPaid > 0;

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.logoFallbackBlock}>
            <View style={s.logoMark} />
            <View>
              <Text style={s.logoName}>WEBKID</Text>
              <Text style={s.logoTagline}>{INVOICE_OWNER.website}</Text>
            </View>
          </View>

          <View style={s.invoiceBlock}>
            <Text style={s.invoiceWord}>INVOICE</Text>
            <Text style={s.invoiceMeta}>DATE. {issuedDate.toUpperCase()}</Text>
            <Text style={[s.invoiceMeta, { marginTop: 2 }]}>NO. {invoiceNumber}</Text>
            <View style={s.paymentTypeBadge}>
              <Text style={s.paymentTypeText}>{paymentTypeLabel(paymentType)}</Text>
            </View>
          </View>
        </View>

        <View style={s.divider} />

        {/* ── Billing card ── */}
        <View style={s.billingRow}>
          <View style={s.billingCol}>
            <Text style={s.billingLabel}>Invoice To</Text>
            <Text style={s.billingName}>{clientName}</Text>
            <Text style={s.billingText}>{clientPhone}</Text>
            {clientEmail ? <Text style={s.billingText}>{clientEmail}</Text> : null}
          </View>
          <View style={s.billingColRight}>
            <Text style={s.billingLabel}>Project</Text>
            <Text style={s.billingName}>{projectDescription}</Text>
            {notes ? <Text style={s.billingText}>{notes}</Text> : null}
          </View>
        </View>

        {/* ── Invoice meta ── */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
          <Text style={{ fontSize: 8, color: LGRAY }}>DATE: {issuedDate.toUpperCase()}</Text>
          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: BLACK }}>
            INVOICE NO: {invoiceNumber}
          </Text>
        </View>

        {/* ── Line items ── */}
        <View style={s.tableHeaderRow}>
          <Text style={s.tableHeaderNo}>NO</Text>
          <Text style={s.tableHeaderDesc}>ITEM DESCRIPTION</Text>
          <Text style={s.tableHeaderAmount}>AMOUNT</Text>
        </View>

        {lineItems.map((item, i) => {
          const isDivider = item.description.startsWith("— ") && item.amount === 0;
          if (isDivider) {
            return (
              <View key={i} style={s.tableDividerRow}>
                <Text style={s.tableDividerText}>ADDITIONAL WORK</Text>
              </View>
            );
          }
          return (
            <View key={i} style={s.tableRow}>
              <Text style={s.tableNo}>{i + 1}.</Text>
              <Text style={s.tableDesc}>{item.description}</Text>
              <Text style={s.tableAmount}>{item.amount > 0 ? fmt(item.amount) : "-"}</Text>
            </View>
          );
        })}

        {/* ── Totals ── */}
        <View style={s.totalsSection}>

          {/* Left — big focal number */}
          <View style={s.totalsDueBlock}>
            {isFullyPaid ? (
              <>
                <Text style={s.totalsDueLabel}>Total Project Value</Text>
                <Text style={s.totalsDueAmount}>{fmt(projectTotal)}</Text>
                <Text style={s.totalsPaidInFull}>FULLY SETTLED — NO OUTSTANDING</Text>
              </>
            ) : (
              <>
                <Text style={s.totalsDueLabel}>This Payment</Text>
                <Text style={s.totalsDueAmount}>{fmt(amountReceived)}</Text>
                <Text style={s.totalsDueSubLabel}>Outstanding after this invoice</Text>
                <Text style={s.totalsDueSubAmount}>{fmt(balanceDue)}</Text>
              </>
            )}
          </View>

          {/* Right — itemised breakdown */}
          <View style={s.totalsGrid}>
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>PROJECT TOTAL:</Text>
              <Text style={s.totalsValue}>{fmt(projectTotal)}</Text>
            </View>

            {hasPrev && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>PREVIOUSLY PAID:</Text>
                <Text style={s.totalsDeductValue}>- {fmt(previouslyPaid)}</Text>
              </View>
            )}

            {hasExtra && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>ADDITIONAL WORK:</Text>
                <Text style={s.totalsExtraValue}>+ {fmt(extraTotal!)}</Text>
              </View>
            )}

            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>TAX:</Text>
              <Text style={s.totalsValue}>0</Text>
            </View>

            {/* Show current payment line explicitly on final invoice so all three
                figures (prev paid + current + total) are visible at a glance */}
            {isFullyPaid && hasPrev && (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>CURRENT PAYMENT:</Text>
                <Text style={s.totalsValue}>{fmt(amountReceived)}</Text>
              </View>
            )}

            <View style={s.totalsGrandRow}>
              <Text style={s.totalsGrandLabel}>
                {isFullyPaid ? "TOTAL PAID:" : "THIS PAYMENT:"}
              </Text>
              <Text style={s.totalsGrandValue}>
                {fmt(isFullyPaid ? projectTotal : amountReceived)}
              </Text>
            </View>

            {isFullyPaid ? (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>OUTSTANDING:</Text>
                <Text style={s.totalsPaidValue}>NIL</Text>
              </View>
            ) : (
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>OUTSTANDING:</Text>
                <Text style={s.totalsOutstandingValue}>{fmt(balanceDue)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Bottom: Payment + Terms + QR ── */}
        <View style={[s.divider, { marginTop: 28 }]} />

        <View style={s.bottomSection}>
          <View style={s.paymentInfoBlock}>
            <Text style={s.sectionLabel}>Payment Info</Text>
            <Text style={s.paymentLine}>
              <Text style={s.paymentKey}>UPI ID:  </Text>{INVOICE_OWNER.upiId}
            </Text>
            <Text style={s.paymentLine}>
              <Text style={s.paymentKey}>Account: </Text>{INVOICE_OWNER.bank.holderName}
            </Text>
            <Text style={s.paymentLine}>
              <Text style={s.paymentKey}>A/C No:  </Text>{INVOICE_OWNER.bank.accountNo}
            </Text>
            <Text style={s.paymentLine}>
              <Text style={s.paymentKey}>Bank:    </Text>{INVOICE_OWNER.bank.name}
            </Text>
            <Text style={s.paymentLine}>
              <Text style={s.paymentKey}>IFSC:    </Text>{INVOICE_OWNER.bank.ifsc}
            </Text>

            {transactionId && (
              <View style={s.txnBox}>
                <Text style={s.txnLabel}>Transaction ID — Received via {paymentMethod}</Text>
                <Text style={s.txnValue}>{transactionId}</Text>
                {paidDate && <Text style={[s.txnLabel, { marginTop: 3 }]}>on {paidDate}</Text>}
              </View>
            )}
          </View>

          <View style={s.termsBlock}>
            <Text style={s.sectionLabel}>Terms & Conditions</Text>
            <Text style={s.termsText}>
              Payment is non-refundable once the project has commenced. Revisions are
              subject to the agreed scope. Any additional work will be quoted separately.
              {"\n\n"}
              This invoice serves as an official receipt for services rendered by Webkid.
            </Text>
          </View>

        </View>

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerLeft}>
            {INVOICE_OWNER.brandName}  ·  {INVOICE_OWNER.website}  ·  {INVOICE_OWNER.email}
          </Text>
          <Text style={s.footerRight}>Thank you for choosing Webkid!</Text>
        </View>

        {/* ── Payment status stamp ── */}
        {isFullyPaid ? (
          <View style={s.paidBadge}>
            <Text style={s.paidText}>PAID IN FULL</Text>
          </View>
        ) : (
          <View style={s.partialBadge}>
            <Text style={s.partialText}>PARTIALLY PAID</Text>
          </View>
        )}

      </Page>
    </Document>
  );
}
