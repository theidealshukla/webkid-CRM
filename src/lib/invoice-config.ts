// Static owner details for invoice generation.
// These never change — hardcoded, not in DB.
export const INVOICE_OWNER = {
  brandName: "Webkid",
  ownerName: "Adarsh Kumar Shukla",
  email: "getstarted@webkid.me",
  website: "webkid.me",
  upiId: "adarshshukla783@ibl",
  bank: {
    name: "State Bank of India",
    accountNo: "41380501382",
    ifsc: "SBIN0000139",
    holderName: "Adarsh Kumar Shukla",
  },
} as const;

// UPI payment deep-link — amount is injected per invoice
export function buildUpiUrl(amount: number): string {
  return `upi://pay?pa=${INVOICE_OWNER.upiId}&pn=${encodeURIComponent(INVOICE_OWNER.brandName)}&am=${amount}&cu=INR`;
}
