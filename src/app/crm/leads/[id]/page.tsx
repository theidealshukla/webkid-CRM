"use client";

import React, { useState, useMemo, useEffect } from "react";
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
import { statusConfig, ALL_STATUSES, activityColors } from "@/lib/constants";
import type { LeadStatus } from "@/types";
import { toast } from "sonner";

const activityIcons: Record<string, React.ReactNode> = {
  call: <PhoneCall className="h-4 w-4" />,
  note: <MessageSquare className="h-4 w-4" />,
  "follow-up": <CalendarCheck className="h-4 w-4" />,
  system: <Activity className="h-4 w-4" />,
  email: <MessageSquare className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
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
    phone: "",
    email: "",
    website: "",
    address: "",
    niche: "",
    rating: "",
  });

  // C2 FIX: Sync editForm when lead changes or when entering edit mode
  useEffect(() => {
    if (lead) {
      setEditForm({
        phone: lead.phone || "",
        email: lead.email || "",
        website: lead.website || "",
        address: lead.address || "",
        niche: lead.niche || "",
        rating: lead.rating?.toString() || "",
      });
    }
  }, [lead]);

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
      date: new Date().toISOString(),
      reminderDate: new Date(`${followUpDate}T${followUpTime || "09:00"}`).toISOString(),
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
                <div className={`inline-flex items-center px-3 py-1.5 rounded-lg ${statusStyle.bg} ${statusStyle.text} uppercase text-[10px] tracking-wider font-bold cursor-pointer hover:opacity-80 transition-opacity shadow-sm`}>
                  {statusStyle.label}
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-gray-100">
              {ALL_STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => updateLeadStatus(leadId, s)} className="rounded-lg m-1 cursor-pointer">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusConfig[s].dot} mr-3`} />
                  <span className="font-medium text-gray-700">{statusConfig[s].label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div>
          {isEditing ? (
            <Button onClick={handleSaveEdit} className="gap-2 rounded-xl shadow-sm">
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2 rounded-xl text-gray-700 hover:text-gray-900 shadow-sm bg-white">
              <Edit className="h-4 w-4" /> Edit Details
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Contact Info */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm flex-shrink-0">
                  <Phone className="h-4 w-4 text-indigo-500" />
                </div>
                {isEditing ? (
                  <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone" className="rounded-xl flex-1 bg-gray-50" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{lead.phone || "—"}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm flex-shrink-0">
                  <Mail className="h-4 w-4 text-emerald-500" />
                </div>
                {isEditing ? (
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" className="rounded-xl flex-1 bg-gray-50" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{lead.email || "—"}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm flex-shrink-0">
                  <Globe className="h-4 w-4 text-blue-500" />
                </div>
                {isEditing ? (
                  <Input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} placeholder="Website" className="rounded-xl flex-1 bg-gray-50" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{lead.website ? <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">{lead.website}</a> : "—"}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100 shadow-sm flex-shrink-0">
                  <MapPin className="h-4 w-4 text-amber-500" />
                </div>
                {isEditing ? (
                  <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Address" className="rounded-xl flex-1 bg-gray-50" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{lead.address || "—"}</span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                {lead.website && (
                  <Button variant="outline" size="sm" asChild className="flex-1 gap-2 rounded-xl text-gray-600 hover:text-gray-900 shadow-sm bg-white">
                    <a href={lead.website} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4" /> Website
                    </a>
                  </Button>
                )}
                {lead.phone && (
                  <Button variant="outline" size="sm" asChild className="flex-1 gap-2 rounded-xl text-gray-600 hover:text-gray-900 shadow-sm bg-white">
                    <a href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Additional Data */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">Additional Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center gap-4">
                <Tag className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500 w-20">Niche</span>
                {isEditing ? (
                  <Input value={editForm.niche} onChange={(e) => setEditForm({ ...editForm, niche: e.target.value })} className="flex-1 rounded-xl bg-gray-50" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">{lead.niche || "—"}</span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <Star className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500 w-20">Rating</span>
                {isEditing ? (
                  <Input value={editForm.rating} onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })} className="flex-1 rounded-xl bg-gray-50" type="number" step="0.1" min="0" max="5" />
                ) : (
                  <span className="text-sm font-medium text-gray-900">
                    {lead.rating ? `${lead.rating} ⭐` : "—"}
                    {lead.reviewCount ? ` (${lead.reviewCount} reviews)` : ""}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500 w-20">Assigned</span>
                <span className="text-sm font-medium text-gray-900">{lead.assignedToName || "Unassigned"}</span>
              </div>
              <div className="flex items-center gap-4">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500 w-20">Added by</span>
                <span className="text-sm font-medium text-gray-900">{lead.uploadedByName || "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Log Activity */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">Log Activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Tabs defaultValue="note" className="w-full">
                <TabsList className="w-full bg-gray-100/80 rounded-xl p-1">
                  <TabsTrigger value="note" className="flex-1 rounded-lg text-sm">Note</TabsTrigger>
                  <TabsTrigger value="call" className="flex-1 rounded-lg text-sm">Log Call</TabsTrigger>
                  <TabsTrigger value="follow-up" className="flex-1 rounded-lg text-sm">Follow Up</TabsTrigger>
                </TabsList>

                <TabsContent value="note" className="space-y-4 mt-6">
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write a note..."
                    rows={4}
                    className="rounded-xl bg-gray-50/50 resize-none"
                  />
                  <Button onClick={handleAddNote} disabled={!noteContent.trim()} className="w-full sm:w-auto rounded-xl shadow-sm">
                    Add Note
                  </Button>
                </TabsContent>

                <TabsContent value="call" className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Outcome</Label>
                    <Select value={callOutcome} onValueChange={setCallOutcome}>
                      <SelectTrigger className="rounded-xl bg-gray-50/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="interested" className="rounded-lg m-1">Interested</SelectItem>
                        <SelectItem value="not_interested" className="rounded-lg m-1">Not Interested</SelectItem>
                        <SelectItem value="no_answer" className="rounded-lg m-1">No Answer</SelectItem>
                        <SelectItem value="callback" className="rounded-lg m-1">Callback Requested</SelectItem>
                        <SelectItem value="voicemail" className="rounded-lg m-1">Voicemail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Textarea
                    value={callNotes}
                    onChange={(e) => setCallNotes(e.target.value)}
                    placeholder="Call notes..."
                    rows={3}
                    className="rounded-xl bg-gray-50/50 resize-none"
                  />
                  <Button onClick={handleLogCall} className="w-full sm:w-auto rounded-xl shadow-sm">Save Call Log</Button>
                </TabsContent>

                <TabsContent value="follow-up" className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Date</Label>
                      <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} className="rounded-xl bg-gray-50/50" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Time</Label>
                      <Input type="time" value={followUpTime} onChange={(e) => setFollowUpTime(e.target.value)} className="rounded-xl bg-gray-50/50" />
                    </div>
                  </div>
                  <Textarea
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Follow-up details..."
                    rows={3}
                    className="rounded-xl bg-gray-50/50 resize-none"
                  />
                  <Button onClick={handleFollowUp} className="w-full sm:w-auto rounded-xl shadow-sm">Create Reminder</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
              <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {leadActivities.length === 0 ? (
                <p className="text-sm text-gray-400 py-8 text-center italic">No activity recorded yet</p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-[2px] bg-gradient-to-b from-gray-100 via-gray-100 to-transparent" />

                  <div className="space-y-8">
                    {leadActivities.map((act) => (
                      <div key={act.id} className="relative flex items-start gap-4">
                        <div className={`relative z-10 h-10 w-10 p-0.5 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm border border-gray-50`}>
                           <div className={`h-full w-full rounded-full flex items-center justify-center text-white ${activityColors[act.type] || activityColors.system}`}>
                              {activityIcons[act.type] || activityIcons.system}
                           </div>
                        </div>
                        <div className="flex-1 min-w-0 pt-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-gray-900 capitalize">{act.type.replace("-", " ")}</p>
                            <span className="text-xs font-medium text-gray-400">{formatTimeAgo(act.date)}</span>
                          </div>
                          {act.content && (
                            <div className="mt-2 text-sm text-gray-600 bg-gray-50 rounded-xl p-3 border border-gray-100/50 leading-relaxed shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                              {act.content}
                            </div>
                          )}
                          <div className="mt-3 flex items-center gap-2">
                             <div className="h-5 w-5 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[9px] font-bold text-indigo-700">
                                {act.user?.[0]?.toUpperCase() || "?"}
                             </div>
                             <p className="text-[11px] font-medium text-gray-500">{act.user}</p>
                             {act.outcome && (
                              <Badge variant="outline" className="ml-auto text-[10px] font-semibold text-gray-600 border-gray-200 uppercase tracking-wider bg-white">
                                {act.outcome}
                              </Badge>
                             )}
                          </div>
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
