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
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { name: "View Website", path: "https://webkid-ai.netlify.app/", icon: ExternalLink, external: true },
  { name: "Dashboard", path: "/crm", icon: LayoutDashboard },
  { name: "Leads", path: "/crm/leads", icon: Users },
  { name: "Website Leads", path: "/crm/website-leads", icon: Globe },
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

  const [localAvatar, setLocalAvatar] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (user?.id) {
      const saved = localStorage.getItem(`avatar_${user.id}`);
      if (saved) setLocalAvatar(saved);
    }
  }, [user?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 120; // Maintain tiny file size for localStorage
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setLocalAvatar(dataUrl);
        if (user?.id) {
          localStorage.setItem(`avatar_${user.id}`, dataUrl);
          window.dispatchEvent(new Event("avatarUpdated"));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset input so the same file could be selected again if needed
    e.target.value = "";
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
        "hidden md:flex",
        collapsed ? "w-[68px]" : "w-64",
        mobileOpen && "!flex w-64"
      )}
    >
      {/* Logo + Mobile Close */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-gray-100 bg-white">
        <div className="flex items-center w-full min-w-0 justify-center pr-2">
          <div className={`flex items-center justify-center transition-all duration-300 overflow-visible ${(!collapsed || mobileOpen) ? "h-10 w-40" : "h-10 w-full"}`}>
            <img src="/webkid.svg" alt="Webkid Logo" className={`w-full h-full object-contain drop-shadow-sm ${(!collapsed || mobileOpen) ? "scale-[1.8]" : "scale-[2.5]"}`} />
          </div>
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
          <div className="flex items-center gap-3 px-2 py-2 mb-2 group relative">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="h-10 w-10 rounded-full bg-white shadow-sm border border-gray-200 flex items-center justify-center flex-shrink-0 cursor-pointer overflow-hidden relative transition-colors hover:border-indigo-400 group/avatar"
              title="Click to upload avatar"
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
              {localAvatar ? (
                <img src={localAvatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-gray-700 text-xs font-bold">{initials}</span>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 hidden group-hover/avatar:flex items-center justify-center transition-all">
                <span className="text-[9px] text-white font-bold uppercase tracking-widest">Edit</span>
              </div>
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
