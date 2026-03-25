"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CRMProvider } from "@/context/CRMContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { usePathname } from "next/navigation";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/crm/login";

  if (isLoginPage) {
    return (
      <AuthProvider>
        {children}
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CRMProvider>
        <AppLayout>{children}</AppLayout>
      </CRMProvider>
    </AuthProvider>
  );
}
