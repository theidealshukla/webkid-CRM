"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";
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
  ArrowUpRight,
  Sparkles,
  Trash2,
} from "lucide-react";

import Link from "next/link";
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
  const { leads, batches, activities, deleteBatch, isLoadingData } = useCRM();
  const { user } = useAuth();

  const activeLeads = useMemo(() => leads.filter((l) => !l.isArchived), [leads]);

  const stats = useMemo(() => {
    const total = activeLeads.length;
    const contacted = activeLeads.filter((l) => l.status === "contacted").length;
    const followUps = activeLeads.filter((l) => l.status === "follow_up").length;
    const closedWon = activeLeads.filter((l) => l.status === "closed_won").length;
    return [
      { title: "Total Leads", value: total, icon: Users, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-100" },
      { title: "Contacted", value: contacted, icon: Phone, color: "text-indigo-600", bg: "bg-indigo-50", ring: "ring-indigo-100" },
      { title: "Follow-ups", value: followUps, icon: Calendar, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-100" },
      { title: "Closed Won", value: closedWon, icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
    ];
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



  const assigneeData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLeads.forEach((l) => {
      const name = l.assignedToName || "Unassigned";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeLeads]);

  const recentBatches = useMemo(() => batches.slice(0, 4), [batches]);
  const recentActivities = useMemo(() => activities.slice(0, 8), [activities]);

  const upcomingFollowUps = useMemo(() => {
    return activities
      .filter((a) => a.type === "follow-up" && new Date(a.reminderDate || a.date) >= new Date())
      .sort((a, b) => new Date(a.reminderDate || a.date).getTime() - new Date(b.reminderDate || b.date).getTime())
      .slice(0, 4);
  }, [activities]);

  // Get greeting based on time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  if (isLoadingData) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">
            {greeting}, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Here's your high-level overview for today.</p>
        </div>
        <Link 
          href="/crm/leads" 
           className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900 px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          View Database <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border border-gray-100 shadow-sm bg-white hover:border-gray-200 transition-colors">
              <CardContent className="p-4 flex items-center gap-4">
                <div className={`h-11 w-11 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.title}</p>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Main Content: Batches + Activity) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Recent Uploads */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="p-4 border-b border-gray-50 flex flex-row items-center justify-between bg-white/50 rounded-t-xl">
              <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
                Recent Batch Uploads
              </CardTitle>
              <Link href="/crm/leads" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentBatches.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 italic">No recent batches uploaded.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentBatches.map((batch) => {
                    const colorClass = nicheColors[batch.niche] || nicheColors.default;
                    const TextColor = colorClass.split(" ").find((c) => c.startsWith("text-"));
                    return (
                      <div key={batch.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-white border border-gray-100 shadow-sm ${TextColor}`}>
                            <FileSpreadsheet className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 truncate max-w-[200px] sm:max-w-xs">{batch.fileName}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {batch.niche && <span className="text-[10px] uppercase font-bold text-gray-400">{batch.niche}</span>}
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> {formatTimeAgo(batch.uploadedAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 text-[10px] font-bold">
                            {batch.leadCount} Leads
                          </Badge>
                          <button
                            onClick={() => {
                              if (confirm("Delete this batch permanently?")) deleteBatch(batch.id);
                            }}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity Feed */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="p-4 border-b border-gray-50 flex flex-row items-center justify-between bg-white/50 rounded-t-xl">
              <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500" />
                Team Activity
              </CardTitle>
              <Link href="/crm/follow-ups" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">View timeline</Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentActivities.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 italic">No recent activity.</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {recentActivities.slice(0, 5).map((act) => {
                    const leadName = leads.find((l) => l.id === act.leadId)?.businessName || "Unknown Lead";
                    return (
                      <div key={act.id} className="p-4 flex items-start gap-3 hover:bg-gray-50/30 transition-colors">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 bg-white border border-gray-100 shadow-sm ${activityBadgeColors[act.type] || activityBadgeColors.system}`}>
                          {activityIcons[act.type] || activityIcons.system}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 leading-snug">
                            <span className="font-semibold">{act.user}</span> <span className="text-gray-500">{act.content}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-medium text-indigo-600 truncate max-w-[200px]">{leadName}</span>
                            <span className="text-[10px] text-gray-400 uppercase tracking-widest">• {formatTimeAgo(act.date)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Column (Analytics & Workload & Reminders) */}
        <div className="space-y-6">

          {/* Upcoming Reminders */}
          <Card className="border border-indigo-100 shadow-sm bg-indigo-50/20">
            <CardHeader className="p-4 border-b border-indigo-50 bg-white/60 rounded-t-xl flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-indigo-500" />
                Active Reminders
              </CardTitle>
              <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-0 text-[10px] font-bold">
                {upcomingFollowUps.length} upcoming
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingFollowUps.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 italic">No scheduled follow-ups.</div>
              ) : (
                <div className="divide-y divide-indigo-50/50 relative">
                  {upcomingFollowUps.map((fu) => {
                    const leadName = leads.find((l) => l.id === fu.leadId)?.businessName || "Unknown Lead";
                    return (
                      <Link key={fu.id} href={`/crm/leads/${fu.leadId}`} className="p-4 flex flex-col gap-1 hover:bg-white/60 transition-colors group block">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-gray-900 truncate pr-2 group-hover:text-indigo-600 transition-colors">{leadName}</p>
                          <span className="text-[10px] uppercase font-bold text-indigo-600 truncate flex items-center shrink-0">
                            {new Date(fu.reminderDate || fu.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 truncate">{fu.content}</p>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Status Pipeline */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="p-4 border-b border-gray-50 bg-white/50 rounded-t-xl">
              <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                Lead Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-4">
                {statusChartData.sort((a,b) => b.value - a.value).slice(0, 5).map((status, i) => (
                  <div key={status.name}>
                    <div className="flex justify-between text-xs font-semibold mb-1.5">
                      <span className="text-gray-700">{status.name}</span>
                      <span className="text-gray-900">{status.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="h-1.5 rounded-full" 
                        style={{ 
                          width: `${Math.max((status.value / activeLeads.length) * 100, 2)}%`,
                          backgroundColor: CHART_COLORS[i % CHART_COLORS.length]
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Team Workload */}
          <Card className="border border-gray-100 shadow-sm">
            <CardHeader className="p-4 border-b border-gray-50 bg-white/50 rounded-t-xl">
              <CardTitle className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Team Load
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 flex flex-col gap-4">
              {assigneeData.length === 0 ? (
                <p className="text-xs text-center text-gray-400 italic">No assigned leads.</p>
              ) : (
                assigneeData.sort((a,b) => b.value - a.value).map((assignee) => (
                  <div key={assignee.name} className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                      {assignee.name === "Unassigned" ? "?" : assignee.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-gray-800 truncate">{assignee.name}</span>
                        <span className="text-gray-500">{assignee.value}</span>
                      </div>
                      <div className="w-full bg-gray-50 rounded-full h-1 overflow-hidden">
                        <div 
                          className="h-1 rounded-full bg-indigo-500" 
                          style={{ width: `${Math.max((assignee.value / activeLeads.length) * 100, 2)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
