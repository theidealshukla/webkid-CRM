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
    <header className="sticky top-0 z-30 h-16 bg-white/80 backdrop-blur-sm border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      {/* Mobile menu button + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-sm font-semibold text-gray-700 md:hidden">Webkid CRM</h2>
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
          className="hidden sm:flex"
        >
          <RefreshCcw className={`h-4 w-4 ${isLoadingData ? "animate-spin" : ""}`} />
        </Button>
        <Button size="sm" variant="outline" onClick={onUploadExcel} className="hidden sm:flex gap-2">
          <Upload className="h-4 w-4" />
          Upload Excel
        </Button>
        <Button size="sm" onClick={onAddLead} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Lead</span>
        </Button>

        {/* Avatar Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user?.name}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/crm/settings")}>
              <User className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
