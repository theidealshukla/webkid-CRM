"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ExcelUploadModal } from "@/components/crm/ExcelUploadModal";
import { ManualLeadModal } from "@/components/crm/ManualLeadModal";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile overlay
  const [showAddLead, setShowAddLead] = useState(false);
  const [showUploadExcel, setShowUploadExcel] = useState(false);

  // Auto-close mobile sidebar on route change (handled by children re-render)
  useEffect(() => {
    setSidebarOpen(false);
  }, [children]);

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      <div
        className={cn(
          "transition-all duration-300",
          // Desktop: offset by sidebar width
          "md:ml-64",
          sidebarCollapsed && "md:ml-[68px]",
          // Mobile: no offset (sidebar is overlay)
          "ml-0"
        )}
      >
        <Topbar
          onAddLead={() => setShowAddLead(true)}
          onUploadExcel={() => setShowUploadExcel(true)}
          onMenuToggle={() => setSidebarOpen(true)}
        />

        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>

      <ManualLeadModal open={showAddLead} onClose={() => setShowAddLead(false)} />
      <ExcelUploadModal open={showUploadExcel} onClose={() => setShowUploadExcel(false)} />
    </div>
  );
}
