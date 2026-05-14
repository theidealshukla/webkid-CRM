"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CalendarCheck, Clock, User, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import Link from "next/link";
import { toast } from "sonner";
import type { Activity } from "@/types";

export default function FollowUpsPage() {
  const { activities, leads, deleteActivity, rescheduleActivity } = useCRM();

  const [rescheduleTarget, setRescheduleTarget] = useState<Activity | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleTime, setRescheduleTime] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null);
  const [saving, setSaving] = useState(false);

  const followUps = useMemo(() => {
    return activities
      .filter((a) => a.type === "follow-up")
      .sort((a, b) => new Date(a.reminderDate || a.date).getTime() - new Date(b.reminderDate || b.date).getTime());
  }, [activities]);

  const upcoming = useMemo(() => followUps.filter((f) => new Date(f.reminderDate || f.date) >= new Date()), [followUps]);
  const past = useMemo(() => followUps.filter((f) => new Date(f.reminderDate || f.date) < new Date()), [followUps]);

  const getLeadName = (leadId: string) => leads.find((l) => l.id === leadId)?.businessName || "Unknown";

  function openReschedule(fu: Activity) {
    const d = new Date(fu.reminderDate || fu.date);
    setRescheduleDate(d.toISOString().slice(0, 10));
    setRescheduleTime(d.toTimeString().slice(0, 5));
    setRescheduleTarget(fu);
  }

  async function handleReschedule() {
    if (!rescheduleTarget || !rescheduleDate) return;
    setSaving(true);
    const newDate = new Date(`${rescheduleDate}T${rescheduleTime || "09:00"}`).toISOString();
    await rescheduleActivity(rescheduleTarget.id, newDate);
    toast.success("Reminder rescheduled");
    setRescheduleTarget(null);
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteActivity(deleteTarget.id);
    toast.success("Reminder deleted");
    setDeleteTarget(null);
  }

  function FollowUpCard({ fu, overdue = false }: { fu: Activity; overdue?: boolean }) {
    const due = new Date(fu.reminderDate || fu.date);
    return (
      <Card className={overdue
        ? "border border-red-100 dark:border-red-900/30 shadow-sm rounded-2xl bg-red-50/20 dark:bg-red-900/10"
        : "border-0 shadow-sm rounded-2xl bg-white card-hover"
      }>
        <CardContent className="p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-5 min-w-0">
            <div className={`h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center border shadow-sm ${overdue ? "bg-red-50 border-red-100" : "bg-amber-50 border-amber-100"}`}>
              <CalendarCheck className={`h-5 w-5 ${overdue ? "text-red-500" : "text-amber-500"}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Link href={`/crm/leads/${fu.leadId}`} className="text-sm font-bold text-gray-900 hover:text-gray-700 dark:hover:text-white transition-colors truncate">
                  {getLeadName(fu.leadId)}
                </Link>
                {overdue && <Badge variant="destructive" className="text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 hover:bg-red-200 border-0 shrink-0">Overdue</Badge>}
              </div>
              <p className="text-sm text-gray-600 mt-0.5 truncate">{fu.content}</p>
              <div className="flex items-center gap-4 mt-2">
                {overdue ? (
                  <span className="text-xs text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-md border border-red-100">
                    {formatTimeAgo(fu.reminderDate || fu.date)} ago
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                    <Clock className="h-3 w-3" />
                    {due.toLocaleDateString()} {due.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                  <User className="h-3 w-3 text-gray-400" />
                  {fu.user}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-amber-50 text-amber-500"
              onClick={() => openReschedule(fu)}
              title="Reschedule"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-400"
              onClick={() => setDeleteTarget(fu)}
              title="Delete reminder"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Link href={`/crm/leads/${fu.leadId}`}>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-gray-50 text-gray-400">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            {upcoming.map((fu) => <FollowUpCard key={fu.id} fu={fu} />)}
          </div>
        )}
      </div>

      {/* Past / Overdue */}
      {past.length > 0 && (
        <div className="pt-4 border-t border-gray-100/50 mt-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 mt-4">
            Past ({past.length})
          </h2>
          <div className="space-y-4">
            {past.map((fu) => <FollowUpCard key={fu.id} fu={fu} overdue />)}
          </div>
        </div>
      )}

      {/* Reschedule dialog */}
      <Dialog open={!!rescheduleTarget} onOpenChange={(v) => !v && setRescheduleTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reschedule Reminder</DialogTitle>
            <DialogDescription>
              {rescheduleTarget ? getLeadName(rescheduleTarget.leadId) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</Label>
              <Input
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
                className="rounded-xl bg-gray-50/50"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Time</Label>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
                className="rounded-xl bg-gray-50/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setRescheduleTarget(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl" onClick={handleReschedule} disabled={!rescheduleDate || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this reminder?</DialogTitle>
            <DialogDescription>
              The follow-up for <strong>{deleteTarget ? getLeadName(deleteTarget.leadId) : ""}</strong> will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button className="rounded-xl bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
