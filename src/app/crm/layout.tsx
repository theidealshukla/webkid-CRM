"use client";

import { AuthProvider } from "@/context/AuthContext";
import { CRMProvider } from "@/context/CRMContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-5 animate-fade-in p-8 text-center max-w-sm">
          <div className="h-24 w-64 flex items-center justify-center mb-[-0.5rem] overflow-visible">
            <img src="/webkid.svg" alt="Webkid Logo" className="w-full h-full object-contain scale-[1.8] drop-shadow-sm" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gray-900 tracking-tight">Starting your dashboard</h2>
            <p className="text-sm font-medium text-gray-500">Loading Webkid CRM... please wait a few seconds.</p>
          </div>
          <div className="mt-4 flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm">
            <div className="h-4 w-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Authenticating</span>
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
    <ErrorBoundary>
      <AuthProvider>
        <AuthGate>{children}</AuthGate>
      </AuthProvider>
    </ErrorBoundary>
  );
}
