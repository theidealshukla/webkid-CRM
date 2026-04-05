"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Search,
  FileSpreadsheet,
  UserPlus,
  Edit,
  Trash2,
  Archive,
  ArrowUpRight,
} from "lucide-react";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import { useDebounce } from "@/hooks/useDebounce";

const actionIcons: Record<string, React.ReactNode> = {
  "Created Lead": <UserPlus className="h-4 w-4" />,
  "Updated Status": <Edit className="h-4 w-4" />,
  "Updated Details": <Edit className="h-4 w-4" />,
  "Assigned Lead": <ArrowUpRight className="h-4 w-4" />,
  "Archived Lead": <Archive className="h-4 w-4" />,
  "Restored Lead": <Archive className="h-4 w-4" />,
  "Deleted Lead Permanently": <Trash2 className="h-4 w-4" />,
  "Uploaded Excel": <FileSpreadsheet className="h-4 w-4" />,
  "Deleted Batch": <Trash2 className="h-4 w-4" />,
  "Archived Batch": <Archive className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  "Created Lead": "text-emerald-600 bg-emerald-50",
  "Updated Status": "text-blue-600 bg-blue-50",
  "Updated Details": "text-indigo-600 bg-indigo-50",
  "Assigned Lead": "text-violet-600 bg-violet-50",
  "Archived Lead": "text-amber-600 bg-amber-50",
  "Restored Lead": "text-teal-600 bg-teal-50",
  "Deleted Lead Permanently": "text-red-600 bg-red-50",
  "Uploaded Excel": "text-cyan-600 bg-cyan-50",
  "Deleted Batch": "text-red-600 bg-red-50",
  "Archived Batch": "text-amber-600 bg-amber-50",
};

const ITEMS_PER_PAGE = 30;

export default function ActivityLogPage() {
  const { activityLogs } = useCRM();
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const actions = useMemo(
    () => [...new Set(activityLogs.map((l) => l.action))],
    [activityLogs]
  );

  const filteredLogs = useMemo(() => {
    let result = activityLogs;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.entityName?.toLowerCase().includes(q) ||
          l.user?.toLowerCase().includes(q)
      );
    }
    if (actionFilter !== "all") {
      result = result.filter((l) => l.action === actionFilter);
    }
    return result;
  }, [activityLogs, debouncedSearch, actionFilter]);

  const visibleLogs = filteredLogs.slice(0, visibleCount);

  return (
    <div className="space-y-6 animate-fade-in max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Activity className="h-6 w-6 text-indigo-600" />
          Activity Log
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {activityLogs.length} total events recorded
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setVisibleCount(ITEMS_PER_PAGE);
            }}
            className="pl-9 rounded-xl border-gray-200 bg-gray-50 hover:bg-white focus:bg-white transition-colors"
          />
        </div>

        <Select
          value={actionFilter}
          onValueChange={(v) => {
            setActionFilter(v);
            setVisibleCount(ITEMS_PER_PAGE);
          }}
        >
          <SelectTrigger className="w-48 rounded-xl border-gray-200">
            <SelectValue placeholder="Action Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {actions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge
          variant="secondary"
          className="bg-gray-100 text-gray-700 border-0 text-xs font-bold"
        >
          {filteredLogs.length} results
        </Badge>
      </div>

      {/* Log List */}
      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-2">
              <Activity className="h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-900 mt-2">
                No activity logs
              </p>
              <p className="text-xs text-gray-500">
                Actions like lead creation, status changes, and batch uploads
                appear here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {visibleLogs.map((log) => {
                const icon = actionIcons[log.action] || (
                  <Activity className="h-4 w-4" />
                );
                const colorClass =
                  actionColors[log.action] || "text-gray-600 bg-gray-50";

                return (
                  <div
                    key={log.id}
                    className="p-4 flex items-start gap-4 hover:bg-gray-50/50 transition-colors"
                  >
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}
                    >
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">
                          {log.user || "System"}
                        </span>
                        <span className="text-sm text-gray-500">
                          {log.action}
                        </span>
                        {log.entityName && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-bold text-gray-600 border-gray-200 bg-white"
                          >
                            {log.entityName}
                          </Badge>
                        )}
                      </div>
                      {log.details && (
                        <p className="text-xs text-gray-500 mt-1">
                          {typeof log.details === "object"
                            ? JSON.stringify(log.details)
                            : log.details}
                        </p>
                      )}
                      <span className="text-[11px] text-gray-400 mt-1 block">
                        {formatTimeAgo(log.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Load More */}
          {visibleCount < filteredLogs.length && (
            <div className="p-4 text-center border-t border-gray-50">
              <button
                onClick={() => setVisibleCount((p) => p + ITEMS_PER_PAGE)}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors"
              >
                Load more ({filteredLogs.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
