"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { Shield, Bell, BellOff } from "lucide-react";
import UserManagement from "@/components/settings/UserManagement";
import { supabase } from "@/config/supabase";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user, teamMembers } = useAuth();
  const [localAvatar, setLocalAvatar] = React.useState<string | null>(null);

  // Admin's own "receive all" preference
  const [notifyAll, setNotifyAll] = React.useState<boolean>(false);
  const [notifyAllLoading, setNotifyAllLoading] = React.useState(false);

  // Per-member notifications_enabled map: memberId → boolean
  const [memberNotif, setMemberNotif] = React.useState<Record<string, boolean>>({});
  const [memberNotifLoading, setMemberNotifLoading] = React.useState<Record<string, boolean>>({});

  const isAdmin = user?.role === "admin";

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

  // Load admin's notify_all + all members' notifications_enabled in one query
  React.useEffect(() => {
    if (!isAdmin) return;
    supabase
      .from("users")
      .select("id, notify_all, notifications_enabled")
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, boolean> = {};
        data.forEach((row: { id: string; notify_all: boolean; notifications_enabled: boolean }) => {
          map[row.id] = row.notifications_enabled !== false;
          if (row.id === user?.id) setNotifyAll(!!row.notify_all);
        });
        setMemberNotif(map);
      });
  }, [isAdmin, user?.id]);

  const getToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  };

  const handleToggleNotifyAll = async () => {
    setNotifyAllLoading(true);
    const next = !notifyAll;
    try {
      const token = await getToken();
      const res = await fetch("/api/user/notify-preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notifyAll: next }),
      });
      if (!res.ok) throw new Error("Failed");
      setNotifyAll(next);
      toast.success(next ? "You'll now receive all notifications" : "Switched to essential notifications only");
    } catch {
      toast.error("Failed to save preference");
    } finally {
      setNotifyAllLoading(false);
    }
  };

  const handleToggleMemberNotif = async (memberId: string, memberName: string) => {
    const current = memberNotif[memberId] !== false;
    const next = !current;
    setMemberNotifLoading((prev) => ({ ...prev, [memberId]: true }));
    try {
      const token = await getToken();
      const res = await fetch("/api/user/notifications-enabled", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: memberId, enabled: next }),
      });
      if (!res.ok) throw new Error("Failed");
      setMemberNotif((prev) => ({ ...prev, [memberId]: next }));
      toast.success(
        next
          ? `${memberName} will now receive notifications`
          : `${memberName} won't receive any notifications`
      );
    } catch {
      toast.error("Failed to update");
    } finally {
      setMemberNotifLoading((prev) => ({ ...prev, [memberId]: false }));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-[#f5f5f7]">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-[#707072] mt-1">Manage your profile, team, and notifications</p>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-[#161618] overflow-hidden">
        <CardHeader className="bg-gray-50/50 dark:bg-[#1e1e20] border-b border-gray-100 dark:border-[#2c2c2e] pb-4">
          <CardTitle className="text-xs font-bold text-gray-500 dark:text-[#636366] uppercase tracking-wider">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <div className="h-16 w-16 rounded-full shadow-sm border border-gray-200 dark:border-[#2c2c2e] flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-[#252527] shrink-0">
              {localAvatar ? (
                <img src={localAvatar} alt={user?.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-gray-700 dark:text-[#f5f5f7] text-xl font-bold">
                  {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U"}
                </span>
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-[#f5f5f7]">{user?.name}</p>
              <p className="text-sm font-medium text-gray-500 dark:text-[#707072]">{user?.email}</p>
              <Badge variant="secondary" className="mt-2 capitalize font-semibold tracking-wide text-[10px] bg-gray-100 dark:bg-[#2c2c2e] text-gray-600 dark:text-[#d1d1d3] hover:bg-gray-200 dark:hover:bg-[#363638] border-0">
                {user?.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members with per-member notification toggles */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-[#161618] overflow-hidden">
        <CardHeader className="bg-gray-50/50 dark:bg-[#1e1e20] border-b border-gray-100 dark:border-[#2c2c2e] pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-bold text-gray-500 dark:text-[#636366] uppercase tracking-wider">Team Members</CardTitle>
            {isAdmin && (
              <span className="text-[10px] font-semibold text-gray-400 dark:text-[#636366] uppercase tracking-wider">
                Notifications
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-2 pb-2">
          <div className="divide-y divide-gray-50 dark:divide-[#2c2c2e]">
            {teamMembers.map((member) => {
              const enabled = memberNotif[member.id] !== false;
              const loading = !!memberNotifLoading[member.id];
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between py-3.5 px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 shadow-sm border border-gray-100 dark:border-[#2c2c2e]">
                      <AvatarFallback className={`text-sm font-bold ${enabled ? "bg-gray-50 dark:bg-[#252527] text-gray-700 dark:text-[#d1d1d3]" : "bg-gray-100 dark:bg-[#1e1e20] text-gray-400 dark:text-[#48484a]"}`}>
                        {member.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className={`text-sm font-bold ${enabled ? "text-gray-900 dark:text-[#f5f5f7]" : "text-gray-400 dark:text-[#48484a]"}`}>
                        {member.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs font-medium text-gray-400 dark:text-[#636366]">{member.email}</p>
                        {!enabled && isAdmin && (
                          <span className="text-[10px] font-semibold text-red-400 dark:text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full">
                            Muted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-wider text-gray-500 dark:text-[#a1a1a3] border-gray-200 dark:border-[#2c2c2e] bg-transparent">
                      {member.role}
                    </Badge>

                    {isAdmin && (
                      <button
                        role="switch"
                        aria-checked={enabled}
                        disabled={loading}
                        onClick={() => handleToggleMemberNotif(member.id, member.name)}
                        title={enabled ? `Mute ${member.name}` : `Unmute ${member.name}`}
                        className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 ${
                          enabled ? "bg-indigo-500 dark:bg-indigo-500" : "bg-gray-200 dark:bg-[#363638]"
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            enabled ? "translate-x-[18px]" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Admin's own "receive all" preference */}
      {isAdmin && (
        <Card className="border-0 shadow-sm rounded-2xl bg-white dark:bg-[#161618] overflow-hidden">
          <CardHeader className="bg-gray-50/50 dark:bg-[#1e1e20] border-b border-gray-100 dark:border-[#2c2c2e] pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-indigo-500" />
              <CardTitle className="text-xs font-bold text-gray-500 dark:text-[#636366] uppercase tracking-wider">
                Admin — Advanced Preferences
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-5 pb-5">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${notifyAll ? "bg-indigo-50 dark:bg-indigo-900/30" : "bg-gray-100 dark:bg-[#252527]"}`}>
                  {notifyAll
                    ? <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    : <BellOff className="h-4 w-4 text-gray-400 dark:text-[#636366]" />
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-[#f5f5f7]">Receive all notifications</p>
                  <p className="text-xs text-gray-400 dark:text-[#636366] mt-0.5 max-w-sm">
                    When ON, you get every notification — including lead assignments normally sent only to the assigned member.
                  </p>
                </div>
              </div>
              <button
                role="switch"
                aria-checked={notifyAll}
                disabled={notifyAllLoading}
                onClick={handleToggleNotifyAll}
                className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50 ${
                  notifyAll ? "bg-indigo-600 dark:bg-indigo-500" : "bg-gray-200 dark:bg-[#363638]"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    notifyAll ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Management — Admin Only */}
      {isAdmin && (
        <div className="animate-fade-in">
          <UserManagement />
        </div>
      )}
    </div>
  );
}
