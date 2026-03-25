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
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/crm/login") {
      router.push("/crm/login");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="h-8 w-8 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

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
