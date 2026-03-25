"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { name: "View Website", path: "https://webkid-ai.netlify.app/", icon: ExternalLink, external: true },
  { name: "Dashboard", path: "/crm", icon: LayoutDashboard },
  { name: "Leads", path: "/crm/leads", icon: Users },
  { name: "Follow-ups", path: "/crm/follow-ups", icon: Calendar },
  { name: "Settings", path: "/crm/settings", icon: Settings, adminOnly: true },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.replace("/crm/login");
  };

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        // Desktop: always visible, width based on collapsed
        "hidden md:flex",
        collapsed ? "w-[68px]" : "w-64",
        // Mobile: slide-in overlay when open
        mobileOpen && "!flex w-64"
      )}
    >
      {/* Logo + Mobile Close */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
            }}
          >
            <span className="text-white font-bold text-sm">W</span>
          </div>
          {(!collapsed || mobileOpen) && (
            <span className="font-bold text-lg tracking-tight text-gray-900 whitespace-nowrap" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Webkid
              <span className="text-indigo-600">.ai</span>
            </span>
          )}
        </div>
        {/* Mobile close button */}
        {mobileOpen && (
          <button
            onClick={onMobileClose}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-5 px-3 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          if (item.adminOnly && user?.role !== "admin") return null;

          const isActive = item.path === "/crm"
            ? pathname === "/crm"
            : pathname?.startsWith(item.path) && !item.external;

          const Icon = item.icon;

          if (item.external) {
            return (
              <a
                key={item.name}
                href={item.path}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  "text-gray-500 hover:bg-gray-50 hover:text-gray-900 group"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-gray-600 transition-colors" />
                {(!collapsed || mobileOpen) && <span>{item.name}</span>}
              </a>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.path}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-indigo-50/80 text-indigo-700 font-semibold"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors duration-200",
                  isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              {(!collapsed || mobileOpen) && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="border-t border-gray-100 p-3 bg-gray-50/50">
        {(!collapsed || mobileOpen) && user && (
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="h-9 w-9 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center flex-shrink-0">
              <span className="text-gray-700 text-xs font-bold">{initials}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">{user.name}</span>
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider truncate">{user.role}</span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full group",
            "text-gray-500 hover:bg-white hover:text-red-600 hover:shadow-sm hover:border-gray-200 border border-transparent"
          )}
          title="Log out"
        >
          <LogOut className="h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-red-500 transition-colors" />
          {(!collapsed || mobileOpen) && <span>Log Out</span>}
        </button>
      </div>

      {/* Collapse Button (desktop only) */}
      <div className="p-2 border-t border-gray-100 hidden md:block bg-white">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full h-8 rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
