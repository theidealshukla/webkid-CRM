import type { Lead } from "@/types";
import { STATUS_LABELS } from "@/lib/constants";
import { toast } from "sonner";

/**
 * Export leads to an Excel file.
 * Shared between Leads and Manual Leads pages to eliminate duplication.
 */
export async function exportLeadsToExcel(
  leads: Lead[],
  filename: string = "leads_export"
) {
  try {
    const ExcelJS = await import("exceljs");
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Leads");

    ws.columns = [
      { header: "Business Name", key: "businessName", width: 30 },
      { header: "Phone", key: "phone", width: 18 },
      { header: "Email", key: "email", width: 25 },
      { header: "Website", key: "website", width: 30 },
      { header: "Niche", key: "niche", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Assigned To", key: "assignedTo", width: 15 },
      { header: "Source", key: "source", width: 10 },
      { header: "Address", key: "address", width: 30 },
      { header: "Maps Link", key: "mapsLink", width: 30 },
    ];

    leads.forEach((lead) => {
      ws.addRow({
        businessName: lead.businessName,
        phone: lead.phone || "",
        email: lead.email || "",
        website: lead.website || "",
        niche: lead.niche || "",
        status: STATUS_LABELS[lead.status] || lead.status,
        assignedTo: lead.assignedToName || "Unassigned",
        source: lead.source || "",
        address: lead.address || "",
        mapsLink: lead.mapsLink || "",
      });
    });

    // Style header
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE5E5E5" },
      };
    });

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Leads exported successfully");
  } catch (e) {
    console.error("Export error:", e);
    toast.error("Failed to export leads");
  }
}
