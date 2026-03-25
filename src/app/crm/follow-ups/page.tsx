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
      .sort((a, b) => new Date(a.reminderDate || a.date).getTime() - new Date(b.reminderDate || b.date).getTime());
  }, [activities]);

  const upcoming = useMemo(() => followUps.filter((f) => new Date(f.reminderDate || f.date) >= new Date()), [followUps]);
  const past = useMemo(() => followUps.filter((f) => new Date(f.reminderDate || f.date) < new Date()), [followUps]);

  const getLeadName = (leadId: string) => leads.find((l) => l.id === leadId)?.businessName || "Unknown";

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Follow-ups</h1>
        <p className="text-sm text-gray-500 mt-1">{followUps.length} total follow-ups</p>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">
          Upcoming ({upcoming.length})
        </h2>
        {upcoming.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-2xl bg-white">
            <CardContent className="py-12 text-center text-sm text-gray-400 italic">
              No upcoming follow-ups
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {upcoming.map((fu) => (
              <Card key={fu.id} className="border-0 shadow-sm rounded-2xl bg-white card-hover">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 shadow-sm">
                      <CalendarCheck className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <Link href={`/crm/leads/${fu.leadId}`} className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                        {getLeadName(fu.leadId)}
                      </Link>
                      <p className="text-sm text-gray-600 mt-0.5">{fu.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                          <Clock className="h-3 w-3" />
                          {new Date(fu.reminderDate || fu.date).toLocaleDateString()} {new Date(fu.reminderDate || fu.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <User className="h-3 w-3 text-gray-400" />
                          {fu.user}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/crm/leads/${fu.leadId}`}>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-50">
                      <ChevronRight className="h-5 w-5 text-gray-400" />
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
        <div className="pt-4 border-t border-gray-100/50 mt-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 mt-4">
            Past ({past.length})
          </h2>
          <div className="space-y-4">
            {past.map((fu) => (
              <Card key={fu.id} className="border border-red-100 shadow-sm rounded-2xl bg-red-50/20 card-hover">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-5">
                    <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100 shadow-sm">
                      <CalendarCheck className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <Link href={`/crm/leads/${fu.leadId}`} className="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                          {getLeadName(fu.leadId)}
                        </Link>
                        <Badge variant="destructive" className="text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 hover:bg-red-200 border-0">Overdue</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{fu.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-md border border-red-100">{formatTimeAgo(fu.reminderDate || fu.date)} ago</span>
                        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                          <User className="h-3 w-3 text-gray-400" />
                          {fu.user}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link href={`/crm/leads/${fu.leadId}`}>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-gray-50 text-gray-400">
                      <ChevronRight className="h-5 w-5" />
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
