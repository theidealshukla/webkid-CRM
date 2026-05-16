import re

with open('src/components/crm/GenerateInvoiceModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. defaultItems
new_default_items = '''  const defaultItems: InvoiceLineItem[] = payment.type === "addon"
    ? [{ description: payment.notes || "Additional Services", amount: payment.amount }]
    : client.clientServices
      ? client.clientServices.split(",").map((s, i) => ({
          description: s.trim() + (payment.type === "upfront" ? " (50% Deposit)" : " (Final Payment)"),
          amount: i === 0 ? payment.amount : 0,
        }))
      : [{ description: client.businessName + " — Services", amount: payment.amount }];'''
content = re.sub(r'  const defaultItems: InvoiceLineItem\[\].*?amount: payment\.amount \}\];', new_default_items, content, flags=re.DOTALL)

# 2. remove extra state
content = re.sub(r'  // ── Extra / additional charges ──.*?(?=  const \[notes, setNotes\])', '', content, flags=re.DOTALL)

# 3. Simplify totals
new_totals = '''  // ── Totals calculation ────────────────────────────────────────────────────
  const amountRecv     = payment.amount;
  const isCurrentPaid  = payment.status === "paid";
  const totalPaid      = allPayments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalValue     = client.projectValue ?? allPayments.reduce((s, p) => s + p.amount, 0);
  const baseSubtotal   = lineItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const paidElsewhere  = Math.max(0, totalPaid - (isCurrentPaid ? amountRecv : 0));

  const effectiveAmountRecv   = amountRecv;
  const effectiveProjectTotal = totalValue;

  const grandTotal     = baseSubtotal || amountRecv;
  const previouslyPaid = paidElsewhere;
  const newBalanceDue  = Math.max(0, effectiveProjectTotal - paidElsewhere - effectiveAmountRecv);

  // ── Item helpers ──────────────────────────────────────────────────────────
  const updateBase  = (i: number, f: keyof InvoiceLineItem, v: string | number) =>
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [f]: f === "amount" ? Number(v) : v } : item));
  const removeBase  = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i));
  const addBase     = () => setLineItems(prev => [...prev, { description: "", amount: 0 }]);'''

content = re.sub(r'  // ── Totals calculation ──.*?const handleAddExtra = \(\) => \{.*?  \};', new_totals, content, flags=re.DOTALL)

# 4. Remove addPaymentExtras from handleGenerate
content = re.sub(r'      // Absorb scope additions.*?\}', '', content, flags=re.DOTALL)

# 5. Remove extraItems from allLineItems merge
content = re.sub(r'      // Merge base \+ extra items.*?const allLineItems: InvoiceLineItem\[\] = \[.*?\];', '      const allLineItems: InvoiceLineItem[] = lineItems;', content, flags=re.DOTALL)

# 6. Remove extraTotal from invoiceData
content = re.sub(r'        extraTotal:          extraTotal > 0 \? extraTotal : undefined,\n', '', content)

# 7. Remove addPaymentExtras dependency from useCallback
content = re.sub(r'extraTotal, previouslyPaid, newBalanceDue, grandTotal, addPaymentExtras, user', 'previouslyPaid, newBalanceDue, grandTotal, user', content)

# 8. Update dialog title 
content = re.sub(r'                \{extraTotal > 0 && \(.*?\)\}  ', '', content, flags=re.DOTALL)

# 9. Clean up Badge strip
content = re.sub(r'            \{extraTotal > 0 && \(.*?\{\/.*?Badge>.*?\}', '', content, flags=re.DOTALL)

# 10. Remove Extras section UI
content = re.sub(r'          \{/\* ── Extra charges section ── \*/\}.*?(?=          \{/\* ── Notes ── \*/\})', '', content, flags=re.DOTALL)

# 11. Fix paymentLabel
new_pl = '''  const paymentLabel = payment.type === "upfront" ? "Upfront (50%)" : payment.type === "final" ? "Final Payment" : payment.notes || "Add-on Payment";'''
content = re.sub(r'  const paymentLabel = .*?;', new_pl, content)

# 12. Fix "extraTotal, " from useCallback dependency array
content = re.sub(r'effectiveProjectTotal, extraTotal,', 'effectiveProjectTotal,', content)

with open('src/components/crm/GenerateInvoiceModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")
