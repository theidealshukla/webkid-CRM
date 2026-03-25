"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CRMProvider } from "@/context/CRMContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/crm/login";

  useEffect(() => {
    if (!isLoading && !isAuthenticated && !isLoginPage) {
      router.replace("/crm/login");
    }
    if (!isLoading && isAuthenticated && isLoginPage) {
      router.replace("/crm");
    }
  }, [isLoading, isAuthenticated, isLoginPage, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="h-14 w-14 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/10">
            <span className="text-white font-bold text-xl">W</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-white/70 text-sm font-medium">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  // If on login page, render without AppLayout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // If not authenticated and not on login page, show nothing (redirect is happening)
  if (!isAuthenticated) {
    return null;
  }

  // Authenticated – render with full CRM layout
  return (
    <CRMProvider>
      <AppLayout>{children}</AppLayout>
    </CRMProvider>
  );
}

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthGate>{children}</AuthGate>
    </AuthProvider>
  );
}
