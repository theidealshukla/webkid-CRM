"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, LogOut, User, RefreshCcw, Menu, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { useCRM } from "@/context/CRMContext";
import { useTheme } from "@/context/ThemeContext";
import { NotificationBell } from "./NotificationBell";

interface TopbarProps {
  onAddLead: () => void;
  onUploadExcel: () => void;
  onMenuToggle: () => void;
}

export function Topbar({ onAddLead, onUploadExcel, onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth();
  const { refreshData, isLoadingData } = useCRM();
  const { isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [localAvatar, setLocalAvatar] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user?.id) {
      const loadAvatar = () => {
        const saved = localStorage.getItem(`avatar_${user.id}`);
        if (saved) setLocalAvatar(saved);
      };
      loadAvatar();
      
      window.addEventListener("avatarUpdated", loadAvatar);
      return () => window.removeEventListener("avatarUpdated", loadAvatar);
    }
  }, [user?.id]);

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const handleLogout = async () => {
    await logout();
    router.replace("/crm/login");
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/70 dark:bg-[#161618]/95 backdrop-blur-xl border-b border-gray-100 dark:border-[#2c2c2e] flex items-center justify-between px-4 md:px-6">
      {/* Mobile menu button + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-xl text-gray-500 dark:text-[#a1a1a3] hover:bg-gray-50 dark:hover:bg-[#252527] transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-[#ebebed] md:hidden" style={{ fontFamily: "'Clash Display', sans-serif" }}>Webkid CRM</h2>
      </div>

      {/* Spacer for desktop */}
      <div className="hidden md:block flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="outline"
          onClick={refreshData}
          disabled={isLoadingData}
          className="hidden sm:flex rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-[#252527] border-gray-200 dark:border-[#363638] dark:bg-[#161618] dark:text-[#d1d1d3]"
        >
          <RefreshCcw className={`h-4 w-4 text-gray-500 dark:text-[#a1a1a3] ${isLoadingData ? "animate-spin" : ""}`} />
        </Button>
        <Button size="sm" variant="outline" onClick={onUploadExcel} className="hidden sm:flex gap-2 rounded-xl shadow-sm hover:bg-gray-50 dark:hover:bg-[#252527] border-gray-200 dark:border-[#363638] text-gray-700 dark:text-[#d1d1d3] dark:bg-[#161618]">
          <Upload className="h-4 w-4 text-gray-500 dark:text-[#a1a1a3]" />
          Upload Excel
        </Button>
        <Button size="sm" onClick={onAddLead} className="gap-2 rounded-xl shadow-sm bg-gray-900 dark:bg-[#f5f5f7] hover:bg-black dark:hover:bg-white text-white dark:text-[#0c0c0d] border-0 transition-colors font-semibold">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Lead</span>
        </Button>

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="flex items-center justify-center h-9 w-9 rounded-xl border border-gray-200 dark:border-[#363638] bg-white dark:bg-[#1e1e20] text-gray-500 dark:text-[#a1a1a3] hover:bg-gray-50 dark:hover:bg-[#252527] hover:text-gray-700 dark:hover:text-[#ebebed] transition-colors shadow-sm"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center h-9 w-9 rounded-full bg-white dark:bg-[#1e1e20] shadow-sm border border-gray-200 dark:border-[#363638] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-shadow hover:shadow-md ml-1 overflow-hidden relative">
              {localAvatar ? (
                <img src={localAvatar} alt={user?.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-gray-700 dark:text-[#ebebed] text-xs font-bold">{initials}</span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-gray-100 dark:border-[#363638] dark:bg-[#1e1e20]">
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-semibold text-gray-900 dark:text-[#f5f5f7] leading-none">{user?.name}</span>
                <span className="text-xs text-gray-400 dark:text-[#636366] leading-none mt-1">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100 dark:bg-[#2c2c2e]" />
            <DropdownMenuItem onClick={() => router.push("/crm/settings")} className="rounded-lg m-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252527] focus:bg-gray-50 dark:focus:bg-[#252527]">
              <User className="mr-2 h-4 w-4 text-gray-400 dark:text-[#636366]" />
              <span className="text-sm font-medium text-gray-700 dark:text-[#d1d1d3]">Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-100 dark:bg-[#2c2c2e]" />
            <DropdownMenuItem onClick={handleLogout} className="rounded-lg m-1 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 focus:bg-red-50 dark:focus:bg-red-900/20 group">
              <LogOut className="mr-2 h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
