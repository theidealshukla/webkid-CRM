"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Plus, Upload, LogOut, User, RefreshCcw, Menu } from "lucide-react";
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

interface TopbarProps {
  onAddLead: () => void;
  onUploadExcel: () => void;
  onMenuToggle: () => void;
}

export function Topbar({ onAddLead, onUploadExcel, onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth();
  const { refreshData, isLoadingData } = useCRM();
  const router = useRouter();

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
    <header className="sticky top-0 z-30 h-16 bg-white/70 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-4 md:px-6">
      {/* Mobile menu button + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-semibold text-gray-700 md:hidden" style={{ fontFamily: "'Clash Display', sans-serif" }}>Webkid CRM</h2>
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
          className="hidden sm:flex rounded-xl shadow-sm hover:bg-gray-50 border-gray-200"
        >
          <RefreshCcw className={`h-4 w-4 text-gray-500 ${isLoadingData ? "animate-spin" : ""}`} />
        </Button>
        <Button size="sm" variant="outline" onClick={onUploadExcel} className="hidden sm:flex gap-2 rounded-xl shadow-sm hover:bg-gray-50 border-gray-200 text-gray-700">
          <Upload className="h-4 w-4 text-gray-500" />
          Upload Excel
        </Button>
        <Button size="sm" onClick={onAddLead} className="gap-2 rounded-xl shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white border-0 transition-colors">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Lead</span>
        </Button>

        {/* Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center justify-center h-9 w-9 rounded-full bg-white shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-shadow hover:shadow-md ml-1">
              <span className="text-gray-700 text-xs font-bold">{initials}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-lg border-gray-100">
            <DropdownMenuLabel className="font-normal p-3">
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-semibold text-gray-900 leading-none">{user?.name}</span>
                <span className="text-xs text-gray-400 leading-none mt-1">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem onClick={() => router.push("/crm/settings")} className="rounded-lg m-1 cursor-pointer hover:bg-gray-50 focus:bg-gray-50">
              <User className="mr-2 h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem onClick={handleLogout} className="rounded-lg m-1 cursor-pointer hover:bg-red-50 focus:bg-red-50 group">
              <LogOut className="mr-2 h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
              <span className="text-sm font-medium text-red-600">Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
