"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { ExcelUploadModal } from "@/components/crm/ExcelUploadModal";
import { ManualLeadModal } from "@/components/crm/ManualLeadModal";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showUploadExcel, setShowUploadExcel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  return (
    <div className="min-h-screen bg-gray-50/30">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-[68px]" : "ml-64"
        )}
      >
        <Topbar
          onAddLead={() => setShowAddLead(true)}
          onUploadExcel={() => setShowUploadExcel(true)}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <main className="p-4 md:p-6">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<{ searchTerm?: string }>, { searchTerm });
            }
            return child;
          })}
        </main>
      </div>

      <ManualLeadModal open={showAddLead} onClose={() => setShowAddLead(false)} />
      <ExcelUploadModal open={showUploadExcel} onClose={() => setShowUploadExcel(false)} />
    </div>
  );
}
