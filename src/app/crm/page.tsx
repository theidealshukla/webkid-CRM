"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import {
  Users,
  Phone,
  Calendar,
  Trophy,
  TrendingUp,
  FileSpreadsheet,
  Clock,
  MessageSquare,
  PhoneCall,
  CalendarCheck,
  Activity,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import DashboardSkeleton from "./components/DashboardSkeleton";
import { nicheColors, CHART_COLORS, activityBadgeColors, STATUS_LABELS } from "@/lib/constants";

const activityIcons: Record<string, React.ReactNode> = {
  call: <PhoneCall className="h-4 w-4" />,
  note: <MessageSquare className="h-4 w-4" />,
  "follow-up": <CalendarCheck className="h-4 w-4" />,
  system: <Activity className="h-4 w-4" />,
  email: <MessageSquare className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
};

export default function DashboardPage() {
  const { leads, batches, activities, isLoadingData } = useCRM();

  const activeLeads = useMemo(() => leads.filter((l) => !l.isArchived), [leads]);

  const stats = useMemo(() => {
    const total = activeLeads.length;
    const contacted = activeLeads.filter((l) => l.status === "contacted").length;
    const followUps = activeLeads.filter((l) => l.status === "follow_up").length;
    const closedWon = activeLeads.filter((l) => l.status === "closed_won").length;
    return [
      { title: "Total Leads", value: total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
      { title: "Contacted", value: contacted, icon: Phone, color: "text-indigo-600", bg: "bg-indigo-50" },
      { title: "Follow-ups", value: followUps, icon: Calendar, color: "text-yellow-600", bg: "bg-yellow-50" },
      { title: "Closed Won", value: closedWon, icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50" },
    ];
  }, [activeLeads]);

  const nicheChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLeads.forEach((l) => {
      const key = l.niche || "Other";
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count }));
  }, [activeLeads]);

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLeads.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: STATUS_LABELS[status] || status,
      value,
    }));
  }, [activeLeads]);

  const recentBatches = useMemo(() => batches.slice(0, 4), [batches]);
  const recentActivities = useMemo(() => activities.slice(0, 8), [activities]);

  if (isLoadingData) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back. Here&#39;s what&#39;s happening with your leads.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <div className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">Active</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Uploads */}
      {recentBatches.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Recent Uploads</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentBatches.map((batch) => {
              const colorClass = nicheColors[batch.niche] || nicheColors.default;
              return (
                <Card key={batch.id} className={`border ${colorClass.split(" ").find((c) => c.startsWith("border-"))} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <FileSpreadsheet className={`h-5 w-5 ${colorClass.split(" ").find((c) => c.startsWith("text-"))}`} />
                      <Badge variant="secondary" className="text-[10px]">{batch.leadCount} leads</Badge>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1 truncate">{batch.fileName}</p>
                    <p className="text-xs text-gray-500">{batch.niche} • {batch.location}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{formatTimeAgo(batch.uploadedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
        {/* Bar Chart — Leads by Niche */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Leads by Niche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <BarChart data={nicheChartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e5e5",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" fill="#3a81f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart — Status Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusChartData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e5e5",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivities.map((act) => {
                const leadName = leads.find((l) => l.id === act.leadId)?.businessName || "Unknown";
                return (
                  <div key={act.id} className="flex items-start gap-3 animate-slide-in">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${activityBadgeColors[act.type] || activityBadgeColors.system}`}>
                      {activityIcons[act.type] || activityIcons.system}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{act.user}</span>
                        {" "}
                        <span className="text-gray-500">{act.content}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {leadName} • {formatTimeAgo(act.date)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
