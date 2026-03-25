"use client";

import React, { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  User,
  Tag,
  MessageCircle,
  Edit,
  Save,
  PhoneCall,
  MessageSquare,
  CalendarCheck,
  Activity,
  Calendar,
} from "lucide-react";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import { useAuth } from "@/context/AuthContext";
import type { LeadStatus } from "@/types";
import { toast } from "sonner";

const statusConfig: Record<LeadStatus, { bg: string; text: string; label: string }> = {
  new: { bg: "bg-gray-100", text: "text-gray-700", label: "NEW" },
  contacted: { bg: "bg-blue-100", text: "text-blue-700", label: "CONTACTED" },
  interested: { bg: "bg-green-100", text: "text-green-700", label: "INTERESTED" },
  follow_up: { bg: "bg-yellow-100", text: "text-yellow-800", label: "FOLLOW UP" },
  not_interested: { bg: "bg-red-100", text: "text-red-700", label: "NOT INTERESTED" },
  closed_won: { bg: "bg-emerald-100", text: "text-emerald-700", label: "CLOSED WON" },
  closed_lost: { bg: "bg-red-100", text: "text-red-700", label: "CLOSED LOST" },
};

const ALL_STATUSES: LeadStatus[] = [
  "new", "contacted", "interested", "follow_up", "not_interested", "closed_won", "closed_lost",
];

const activityIcons: Record<string, React.ReactNode> = {
  call: <PhoneCall className="h-4 w-4" />,
  note: <MessageSquare className="h-4 w-4" />,
  "follow-up": <CalendarCheck className="h-4 w-4" />,
  system: <Activity className="h-4 w-4" />,
  email: <MessageSquare className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
};

const activityColors: Record<string, string> = {
  call: "bg-blue-500",
  note: "bg-purple-500",
  "follow-up": "bg-yellow-500",
  system: "bg-gray-400",
  email: "bg-green-500",
  meeting: "bg-pink-500",
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params.id as string;
  const { leads, activities, updateLeadStatus, updateLeadDetails, addActivity } = useCRM();
  const { user } = useAuth();

  const lead = useMemo(() => leads.find((l) => l.id === leadId), [leads, leadId]);
  const leadActivities = useMemo(
    () => activities.filter((a) => a.leadId === leadId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [activities, leadId]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    phone: lead?.phone || "",
    email: lead?.email || "",
    website: lead?.website || "",
    address: lead?.address || "",
    niche: lead?.niche || "",
    rating: lead?.rating?.toString() || "",
  });

  const [noteContent, setNoteContent] = useState("");
  const [callOutcome, setCallOutcome] = useState("interested");
  const [callNotes, setCallNotes] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-gray-500 mb-4">Lead not found</p>
        <Button variant="outline" onClick={() => router.push("/crm/leads")}>
          Back to Leads
        </Button>
      </div>
    );
  }

  const statusStyle = statusConfig[lead.status] || statusConfig.new;

  const handleSaveEdit = () => {
    updateLeadDetails(leadId, {
      phone: editForm.phone,
      email: editForm.email,
      website: editForm.website,
      address: editForm.address,
      niche: editForm.niche,
      rating: editForm.rating ? parseFloat(editForm.rating) : undefined,
    });
    setIsEditing(false);
    toast.success("Lead updated");
  };

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addActivity({
      leadId,
      type: "note",
      user: user?.name || "Unknown",
      date: new Date().toISOString(),
      content: noteContent,
    });
    setNoteContent("");
    toast.success("Note added");
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
    setCallNotes("");
    toast.success("Call logged");
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
    setFollowUpDate("");
    setFollowUpTime("");
    setFollowUpNotes("");
    toast.success("Follow-up created");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/crm/leads")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{lead.businessName}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{lead.niche} • Added {lead.createdAt ? formatTimeAgo(lead.createdAt) : "recently"}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button>
                <Badge className={`${statusStyle.bg} ${statusStyle.text} uppercase text-[10px] tracking-wider font-semibold border-0 cursor-pointer hover:opacity-80`}>
                  {statusStyle.label}
                </Badge>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {ALL_STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => updateLeadStatus(leadId, s)}>
                  <span className={`h-2 w-2 rounded-full ${statusConfig[s].bg} mr-2`} />
                  {statusConfig[s].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div>
          {isEditing ? (
            <Button onClick={handleSaveEdit} className="gap-2">
              <Save className="h-4 w-4" /> Save
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
              <Edit className="h-4 w-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-gray-500" />
                </div>
                {isEditing ? (
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone" />
                ) : (
                  <span className="text-sm text-gray-700">{lead.phone || "—"}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Mail className="h-4 w-4 text-gray-500" />
                </div>
                {isEditing ? (
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" />
                ) : (
                  <span className="text-sm text-gray-700">{lead.email || "—"}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <Globe className="h-4 w-4 text-gray-500" />
                </div>
                {isEditing ? (
                  <Input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} placeholder="Website" />
                ) : (
                  <span className="text-sm text-gray-700">{lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{lead.website}</a> : "—"}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-gray-500" />
                </div>
                {isEditing ? (
                  <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Address" />
                ) : (
                  <span className="text-sm text-gray-700">{lead.address || "—"}</span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-2 border-t">
                {lead.website && (
                  <Button variant="outline" size="sm" asChild className="flex-1 gap-1">
                    <a href={lead.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-3.5 w-3.5" /> Website
                    </a>
                  </Button>
                )}
                {lead.phone && (
                  <Button variant="outline" size="sm" asChild className="flex-1 gap-1">
                    <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Data */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Tag className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500 w-16">Niche</span>
                {isEditing ? (
                  <Input value={editForm.niche} onChange={(e) => setEditForm({ ...editForm, niche: e.target.value })} className="flex-1" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{lead.niche || "—"}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Star className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500 w-16">Rating</span>
                {isEditing ? (
                  <Input value={editForm.rating} onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })} className="flex-1" type="number" step="0.1" min="0" max="5" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">
                    {lead.rating ? `${lead.rating} ⭐` : "—"}
                    {lead.reviewCount ? ` (${lead.reviewCount} reviews)` : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500 w-16">Assigned</span>
                <span className="text-sm font-medium text-gray-900">{lead.assignedTo || "—"}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500 w-16">Added by</span>
                <span className="text-sm font-medium text-gray-900">{lead.uploadedBy || "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Log Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Log Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="note">
                <TabsList className="w-full">
                  <TabsTrigger value="note" className="flex-1">Note</TabsTrigger>
                  <TabsTrigger value="call" className="flex-1">Log Call</TabsTrigger>
                  <TabsTrigger value="follow-up" className="flex-1">Follow Up</TabsTrigger>
                </TabsList>

                <TabsContent value="note" className="space-y-3 mt-4">
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write a note..."
                    rows={4}
                  />
                  <Button onClick={handleAddNote} disabled={!noteContent.trim()}>
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
                  <Textarea
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Call notes..."
                    rows={3}
                  />
                  <Button onClick={handleLogCall}>Save Call Log</Button>
                </TabsContent>

                <TabsContent value="follow-up" className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Date</Label>
                      <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Time</Label>
                      <Input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} />
                    </div>
                  </div>
                  <Textarea
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Follow-up details..."
                    rows={3}
                  />
                  <Button onClick={handleFollowUp}>Create Reminder</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {leadActivities.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center">No activity recorded yet</p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                  <div className="space-y-6">
                    {leadActivities.map((act) => (
                      <div key={act.id} className="relative flex items-start gap-4 pl-1">
                        <div className={`relative z-10 h-8 w-8 rounded-full flex items-center justify-center text-white flex-shrink-0 ${activityColors[act.type] || activityColors.system}`}>
                          {activityIcons[act.type] || activityIcons.system}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900 capitalize">{act.type.replace("-", " ")}</p>
                            <span className="text-xs text-gray-400">{formatTimeAgo(act.date)}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-0.5">{act.content}</p>
                          {act.outcome && (
                            <Badge variant="secondary" className="mt-1 text-[10px]">
                              Outcome: {act.outcome}
                            </Badge>
                          )}
                          <p className="text-xs text-gray-400 mt-1">by {act.user}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
