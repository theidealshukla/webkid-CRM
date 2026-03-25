"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCRM } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

interface ActionDialogProps {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  defaultTab?: "note" | "call" | "follow-up";
}

export function ActionDialog({ open, onClose, leadId, leadName, defaultTab = "note" }: ActionDialogProps) {
  const { addActivity } = useCRM();
  const { user } = useAuth();
  const [noteContent, setNoteContent] = useState("");
  const [callOutcome, setCallOutcome] = useState("interested");
  const [callNotes, setCallNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addActivity({
      leadId,
      type: "note",
      user: user?.name || "Unknown",
      date: new Date().toISOString(),
      content: noteContent,
    });
    toast.success("Note added");
    setNoteContent("");
    onClose();
  };

  const handleLogCall = () => {
    addActivity({
      leadId,
      type: "call",
      user: user?.name || "Unknown",
      date: new Date().toISOString(),
      content: callNotes || "Phone call logged",
      outcome: callOutcome,
    });
    toast.success("Call logged");
    setCallNotes("");
    setCallOutcome("interested");
    onClose();
  };

  const handleFollowUp = () => {
    if (!followUpDate) {
      toast.error("Please select a date");
      return;
    }
    addActivity({
      leadId,
      type: "follow-up",
      user: user?.name || "Unknown",
      date: new Date(`${followUpDate}T${followUpTime || "09:00"}`).toISOString(),
      content: followUpNotes || "Follow-up scheduled",
    });
    toast.success("Follow-up created");
    setFollowUpDate("");
    setFollowUpTime("");
    setFollowUpNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{leadName}</DialogTitle>
          <DialogDescription>Log an activity for this lead</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="w-full">
            <TabsTrigger value="note" className="flex-1">Note</TabsTrigger>
            <TabsTrigger value="call" className="flex-1">Log Call</TabsTrigger>
            <TabsTrigger value="follow-up" className="flex-1">Follow Up</TabsTrigger>
          </TabsList>

          <TabsContent value="note" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Write a note..."
                rows={4}
              />
            </div>
            <Button onClick={handleAddNote} className="w-full" disabled={!noteContent.trim()}>
              Add Note
            </Button>
          </TabsContent>

          <TabsContent value="call" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label>Outcome</Label>
              <Select value={callOutcome} onValueChange={setCallOutcome}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interested">Interested</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="callback">Callback Requested</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={callNotes}
                onChange={(e) => setCallNotes(e.target.value)}
                placeholder="Call notes..."
                rows={3}
              />
            </div>
            <Button onClick={handleLogCall} className="w-full">
              Save Call Log
            </Button>
          </TabsContent>

          <TabsContent value="follow-up" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Follow-up details..."
                rows={3}
              />
            </div>
            <Button onClick={handleFollowUp} className="w-full">
              Create Reminder
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
