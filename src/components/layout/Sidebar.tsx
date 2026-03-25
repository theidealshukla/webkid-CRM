"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  PlusCircle,
  Calendar,
  Archive,
  BarChart3,
  Settings,
  ExternalLink,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { name: "View Website", path: "https://webkid.ai", icon: ExternalLink, external: true },
  { name: "Dashboard", path: "/crm", icon: LayoutDashboard },
  { name: "Website Leads", path: "/crm/website-leads", icon: Globe },
  { name: "Leads", path: "/crm/leads", icon: Users },
  { name: "Manual Leads", path: "/crm/leads/manual", icon: PlusCircle },
  { name: "Follow-ups", path: "/crm/follow-ups", icon: Calendar },
  { name: "Archived", path: "/crm/archived", icon: Archive },
  { name: "Analytics", path: "/crm/analytics", icon: BarChart3 },
  { name: "Settings", path: "/crm/settings", icon: Settings, adminOnly: true },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-indigo-950 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">W</span>
          </div>
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight text-gray-900 whitespace-nowrap" style={{ fontFamily: "'Clash Display', sans-serif" }}>
              Webkid.ai
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </a>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-indigo-950 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  isActive ? "text-indigo-200" : ""
                )}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Button */}
      <div className="p-2 border-t border-gray-200">
        <button
          onClick={onToggle}
          className="flex items-center justify-center w-full h-9 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
