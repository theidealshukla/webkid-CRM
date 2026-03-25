"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCRM } from "@/context/CRMContext";
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";

const COLORS = ["#91c5ff", "#3a81f6", "#2563ef", "#1a4eda", "#1f3fad", "#f87171", "#34d399"];

export default function AnalyticsPage() {
  const { leads, activities } = useCRM();

  const activeLeads = useMemo(() => leads.filter((l) => !l.isArchived), [leads]);

  const nicheData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLeads.forEach((l) => {
      counts[l.niche || "Other"] = (counts[l.niche || "Other"] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeLeads]);

  const statusData = useMemo(() => {
    const labels: Record<string, string> = {
      new: "New",
      contacted: "Contacted",
      interested: "Interested",
      follow_up: "Follow Up",
      not_interested: "Not Interested",
      closed_won: "Closed Won",
      closed_lost: "Closed Lost",
    };
    const counts: Record<string, number> = {};
    activeLeads.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value]) => ({
      name: labels[status] || status,
      value,
    }));
  }, [activeLeads]);

  const sourceData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLeads.forEach((l) => {
      counts[l.source] = (counts[l.source] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [activeLeads]);

  const assigneeData = useMemo(() => {
    const counts: Record<string, number> = {};
    activeLeads.forEach((l) => {
      counts[l.assignedTo || "Unassigned"] = (counts[l.assignedTo || "Unassigned"] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeLeads]);

  const activityByType = useMemo(() => {
    const counts: Record<string, number> = {};
    activities.forEach((a) => {
      counts[a.type] = (counts[a.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace("-", " "),
      value,
    }));
  }, [activities]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Insights into your leads and activities</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-900">{activeLeads.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total Leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-emerald-600">{activeLeads.filter((l) => l.status === "closed_won").length}</p>
            <p className="text-xs text-gray-500 mt-1">Closed Won</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{activities.length}</p>
            <p className="text-xs text-gray-500 mt-1">Activities</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{activeLeads.filter((l) => l.status === "follow_up").length}</p>
            <p className="text-xs text-gray-500 mt-1">Pending Follow-ups</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Niche */}
        <Card>
          <CardHeader><CardTitle className="text-base">Leads by Niche</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nicheData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "12px" }} />
                  <Bar dataKey="value" fill="#3a81f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader><CardTitle className="text-base">Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                    {statusData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "12px" }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Source Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Lead Sources</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
                    {sourceData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "12px" }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Assignee Workload */}
        <Card>
          <CardHeader><CardTitle className="text-base">Team Workload</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assigneeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "12px" }} />
                  <Bar dataKey="value" fill="#2563ef" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
