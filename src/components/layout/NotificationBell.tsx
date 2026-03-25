"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Bell, Calendar, Clock, X, CheckCircle2 } from "lucide-react";
import { useCRM } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";

interface Notification {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  type: "overdue" | "today" | "upcoming";
  leadId: string;
}

export function NotificationBell() {
  const { activities, leads } = useCRM();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load dismissed notifications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("webkid-dismissed-notifs");
    if (saved) {
      try {
        setDismissed(new Set(JSON.parse(saved)));
      } catch { /* ignore */ }
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Build notifications from follow-up activities
  const notifications: Notification[] = React.useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const results: Notification[] = [];

    const followUps = activities.filter(
      (a) => a.type === "follow-up" && a.reminderDate
    );

    followUps.forEach((fu) => {
      if (dismissed.has(fu.id)) return;

      const reminderDate = new Date(fu.reminderDate!);
      const dateStr = reminderDate.toISOString().split("T")[0];
      const lead = leads.find((l) => l.id === fu.leadId);
      const leadName = lead?.businessName || "Unknown Lead";

      let type: Notification["type"] = "upcoming";
      if (dateStr < todayStr) type = "overdue";
      else if (dateStr === todayStr) type = "today";

      // Only show overdue, today, and next 3 days
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      if (reminderDate > threeDaysFromNow) return;

      const timeLabel = reminderDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      });

      results.push({
        id: fu.id,
        title: leadName,
        subtitle: fu.content,
        time: type === "today" ? "Today" : type === "overdue" ? `Overdue · ${timeLabel}` : timeLabel,
        type,
        leadId: fu.leadId,
      });
    });

    // Sort: overdue first, then today, then upcoming
    const priority = { overdue: 0, today: 1, upcoming: 2 };
    results.sort((a, b) => priority[a.type] - priority[b.type]);

    return results;
  }, [activities, leads, dismissed]);

  const overdueCount = notifications.filter((n) => n.type === "overdue").length;
  const todayCount = notifications.filter((n) => n.type === "today").length;
  const badgeCount = overdueCount + todayCount;

  const dismissNotification = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem("webkid-dismissed-notifs", JSON.stringify([...next]));
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    const allIds = notifications.map((n) => n.id);
    setDismissed((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      localStorage.setItem("webkid-dismissed-notifs", JSON.stringify([...next]));
      return next;
    });
  }, [notifications]);

  const typeStyles = {
    overdue: {
      dot: "bg-red-500",
      badge: "bg-red-50 text-red-600 border-red-100",
      icon: "text-red-500",
    },
    today: {
      dot: "bg-amber-500",
      badge: "bg-amber-50 text-amber-600 border-amber-100",
      icon: "text-amber-500",
    },
    upcoming: {
      dot: "bg-indigo-400",
      badge: "bg-indigo-50 text-indigo-600 border-indigo-100",
      icon: "text-indigo-400",
    },
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center h-9 w-9 rounded-full bg-white shadow-sm border border-gray-200 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
        title="Notifications"
      >
        <Bell className={`h-4 w-4 transition-colors ${badgeCount > 0 ? "text-gray-800" : "text-gray-400"}`} />
        
        {/* Red Badge */}
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-sm animate-fade-in">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>

      {/* Dropdown Tray */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/70">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-bold text-gray-900">Notifications</span>
              {badgeCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                  {badgeCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={dismissAll}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-sm font-semibold text-gray-900">All caught up!</p>
                <p className="text-xs text-gray-500 mt-1">No pending follow-ups right now.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notif) => {
                  const styles = typeStyles[notif.type];
                  return (
                    <div
                      key={notif.id}
                      className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors group"
                    >
                      {/* Dot Indicator */}
                      <div className={`h-2.5 w-2.5 rounded-full mt-1.5 flex-shrink-0 ${styles.dot} ${notif.type === "overdue" ? "animate-pulse" : ""}`} />
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{notif.title}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wider flex-shrink-0 ${styles.badge}`}>
                            {notif.type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{notif.subtitle}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className={`h-3 w-3 ${styles.icon}`} />
                          <span className={`text-[11px] font-medium ${styles.icon}`}>{notif.time}</span>
                        </div>
                      </div>

                      {/* Dismiss */}
                      <button
                        onClick={() => dismissNotification(notif.id)}
                        className="p-1 rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-gray-100 px-5 py-2.5 bg-gray-50/50">
              <p className="text-[10px] font-medium text-gray-400 text-center">
                Showing follow-ups for the next 3 days
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
