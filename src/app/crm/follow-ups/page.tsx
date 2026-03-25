"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Clock, User, ChevronRight } from "lucide-react";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import Link from "next/link";

export default function FollowUpsPage() {
  const { activities, leads } = useCRM();

  const followUps = useMemo(() => {
    return activities
      .filter((a) => a.type === "follow-up")
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [activities]);

  const upcoming = useMemo(() => followUps.filter((f) => new Date(f.date) >= new Date()), [followUps]);
  const past = useMemo(() => followUps.filter((f) => new Date(f.date) < new Date()), [followUps]);

  const getLeadName = (leadId: string) => leads.find((l) => l.id === leadId)?.businessName || "Unknown";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Follow-ups</h1>
        <p className="text-sm text-gray-500 mt-1">{followUps.length} total follow-ups</p>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-400">
              No upcoming follow-ups
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((fu) => (
              <Card key={fu.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <CalendarCheck className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <Link href={`/crm/leads/${fu.leadId}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600">
                        {getLeadName(fu.leadId)}
                      </Link>
                      <p className="text-sm text-gray-500">{fu.content}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3 w-3" />
                          {new Date(fu.date).toLocaleDateString()} {new Date(fu.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <User className="h-3 w-3" />
                          {fu.user}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/crm/leads/${fu.leadId}`}>
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">
            Past ({past.length})
          </h2>
          <div className="space-y-3">
            {past.map((fu) => (
              <Card key={fu.id} className="border-red-200 bg-red-50/30">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                      <CalendarCheck className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/crm/leads/${fu.leadId}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600">
                          {getLeadName(fu.leadId)}
                        </Link>
                        <Badge variant="destructive" className="text-[10px] uppercase">Overdue</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{fu.content}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-red-500 font-medium">{formatTimeAgo(fu.date)} ago</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <User className="h-3 w-3" />
                          {fu.user}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/crm/leads/${fu.leadId}`}>
                    <Button variant="ghost" size="icon">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
