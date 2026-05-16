"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Lead, Activity, UploadBatch, LeadStatus, ActivityLog, LeadRow, ActivityRow, UploadBatchRow, ActivityLogRow, Payment, PaymentRow, PaymentMethod } from "@/types";
import { mapLeadRow, mapActivityRow, mapBatchRow, mapPaymentRow } from "@/types";
import { useAuth } from "./AuthContext";
import { supabase } from "@/config/supabase";
import { toast } from "sonner";

interface CRMContextType {
  leads: Lead[];
  activities: Activity[];
  batches: UploadBatch[];
  manualBatches: UploadBatch[];
  activityLogs: ActivityLog[];
  payments: Payment[];
  isLoadingData: boolean;
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "lastActivity">) => void;
  updateLeadStatus: (leadId: string, status: LeadStatus) => void;
  updateLeadDetails: (leadId: string, updates: Partial<Lead>) => void;
  archiveLead: (leadId: string) => void;
  restoreLead: (leadId: string) => void;
  deleteLead: (leadId: string) => void;
  assignLead: (leadId: string, assignee: string) => void;
  addActivity: (activity: Omit<Activity, "id">) => void;
  deleteActivity: (activityId: string) => Promise<void>;
  rescheduleActivity: (activityId: string, newDate: string) => Promise<void>;
  uploadExcelLeads: (leads: Omit<Lead, "id" | "createdAt" | "lastActivity">[], batch: Omit<UploadBatch, "id">) => void;
  archiveBatch: (batchId: string) => void;
  deleteBatch: (batchId: string) => void;
  createManualBatch: (name: string) => Promise<UploadBatch | null>;
  renameManualBatch: (batchId: string, name: string) => Promise<void>;
  updateBatchNote: (batchId: string, note: string) => Promise<void>;
  updateLeadBatch: (leadId: string, batchId: string | null) => Promise<void>;
  createPaymentsForClient: (leadId: string, projectValue: number) => Promise<void>;
  markPaymentPaid: (paymentId: string, data: { paidDate: string; method: PaymentMethod; reference?: string; notes?: string }) => Promise<void>;
  markPaymentUnpaid: (paymentId: string) => Promise<void>;
  updatePaymentDueDate: (paymentId: string, dueDate: string | null) => Promise<void>;
  setProjectValue: (leadId: string, value: number, addonName?: string) => Promise<void>;
  addPaymentExtras: (paymentId: string, extraAmount: number, newProjectValue: number) => Promise<void>;
  addDirectClient: (data: { businessName: string; phone: string; email?: string; website?: string; services?: string; notes?: string; projectStatus?: string; projectValue?: number; becameClientAt?: string; projectStartedAt?: string; projectDeliveredAt?: string }) => Promise<void>;
  convertToClient: (leadIds: string[], services: string, notes?: string, projectValue?: number) => Promise<void>;
  revertToLead: (leadIds: string[]) => Promise<void>;
  updateClientInfo: (leadId: string, data: { businessName?: string; phone?: string; services?: string; notes?: string; projectStatus?: string; website?: string; becameClientAt?: string; projectStartedAt?: string; projectDeliveredAt?: string }) => Promise<void>;
  bulkUpdateStatus: (leadIds: string[], status: LeadStatus) => Promise<void>;
  bulkAssign: (leadIds: string[], assigneeName: string) => Promise<void>;
  bulkArchive: (leadIds: string[]) => Promise<void>;
  bulkDelete: (leadIds: string[]) => Promise<void>;
  refreshData: () => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const { user, teamMembers, isAuthenticated } = useAuth();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [batches, setBatches] = useState<UploadBatch[]>([]);
  const [manualBatches, setManualBatches] = useState<UploadBatch[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Maps for resolving UUIDs to Names — use refs to avoid re-render loops
  const idToNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    teamMembers.forEach((m) => map.set(m.id, m.name));
    return map;
  }, [teamMembers]);

  const nameToIdMap = React.useMemo(() => {
    const map = new Map<string, string>();
    teamMembers.forEach((m) => map.set(m.name, m.id));
    return map;
  }, [teamMembers]);

  // Stable ref for the maps so loadData doesn't re-trigger on team changes
  const idToNameMapRef = React.useRef(idToNameMap);
  React.useEffect(() => { idToNameMapRef.current = idToNameMap; }, [idToNameMap]);

  // Load all data from Supabase
  const loadData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);
    const namesMap = idToNameMapRef.current;
    
    try {
      // Parallel fetch for performance
      const [leadsRes, activitiesRes, batchesRes, logsRes, paymentsRes] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("activities").select("*").order("created_at", { ascending: false }),
        supabase.from("upload_batches").select("*").order("created_at", { ascending: false }),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200),
        supabase.from("payments").select("*").order("created_at", { ascending: true }),
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (activitiesRes.error) throw activitiesRes.error;
      if (batchesRes.error) throw batchesRes.error;
      if (logsRes.error) throw logsRes.error;
      // payments table may not exist yet — ignore error gracefully

      // Build lead_id -> latest activity timestamp once (O(N+M) instead of O(N*M)).
      // Activities are already sorted DESC by created_at, so the first hit is the latest.
      const latestActivityByLead = new Map<string, string>();
      (activitiesRes.data as ActivityRow[]).forEach(a => {
        if (!latestActivityByLead.has(a.lead_id)) {
          latestActivityByLead.set(a.lead_id, a.created_at);
        }
      });

      const mappedLeads = (leadsRes.data as LeadRow[]).map(r => {
        const lead = mapLeadRow(r, namesMap);
        const latest = latestActivityByLead.get(r.id) ?? r.created_at;
        lead.lastActivity = formatTimeAgo(latest);

        // Handle is_archived gracefully — column may not exist yet
        const rawRow = r as unknown as Record<string, unknown>;
        lead.isArchived = rawRow.is_archived === true;

        return lead;
      });
      
      const mappedActivities = (activitiesRes.data as ActivityRow[]).map(r => mapActivityRow(r, namesMap));
      const allMappedBatches = (batchesRes.data as UploadBatchRow[]).map(r => mapBatchRow(r, namesMap));
      const mappedBatches = allMappedBatches.filter(b => b.location !== '__manual__');
      const mappedManualBatches = allMappedBatches.filter(b => b.location === '__manual__');

      const mappedLogs = (logsRes.data as ActivityLogRow[]).map(r => ({
        id: r.id,
        userId: r.user_id || undefined,
        user: r.user_id ? namesMap.get(r.user_id) || "Unknown" : "System",
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id || undefined,
        entityName: r.entity_name || undefined,
        timestamp: r.created_at,
        details: r.details || undefined
      }));

      const mappedPayments = paymentsRes.error ? [] : (paymentsRes.data as PaymentRow[]).map(mapPaymentRow);

      setLeads(mappedLeads);
      setActivities(mappedActivities);
      setBatches(mappedBatches);
      setManualBatches(mappedManualBatches);
      setActivityLogs(mappedLogs);
      setPayments(mappedPayments);

    } catch (e) {
      console.error("Failed to load CRM data from Supabase:", e);
      toast.error("Failed to load data from database");
    } finally {
      setIsLoadingData(false);
    }
  }, [isAuthenticated, user]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-map UUID→name in already-loaded records when teamMembers arrives after loadData.
  // On page refresh, loadData runs before fetchTeamMembers completes, so all assignee/
  // uploadedBy names appear as "Unknown". This effect patches them without a DB round-trip.
  useEffect(() => {
    if (teamMembers.length === 0) return;
    const namesMap = idToNameMap;
    setLeads(prev => prev.map(l => ({
      ...l,
      assignedToName: l.assignedTo ? namesMap.get(l.assignedTo) || "Unknown" : "Unassigned",
      uploadedByName: l.uploadedBy ? namesMap.get(l.uploadedBy) || undefined : undefined,
    })));
    setActivities(prev => prev.map(a => ({
      ...a,
      user: a.userId ? namesMap.get(a.userId) || "Unknown" : "System",
    })));
    setBatches(prev => prev.map(b => ({
      ...b,
      uploadedByName: b.uploadedBy ? namesMap.get(b.uploadedBy) || "Unknown" : "Unknown",
    })));
    setManualBatches(prev => prev.map(b => ({
      ...b,
      uploadedByName: b.uploadedBy ? namesMap.get(b.uploadedBy) || "Unknown" : "Unknown",
    })));
  }, [teamMembers, idToNameMap]);


  // Database Write Helpers
  const addLog = useCallback(async (action: string, entityType: string, entityId?: string, entityName?: string, details?: any) => {
    const logData = {
      user_id: user?.id || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_name: entityName || null,
      details: details || null
    };

    const { data, error } = await supabase.from("activity_logs").insert([logData]).select().single();
    if (!error && data) {
      setActivityLogs(prev => [{
        id: data.id,
        userId: data.user_id || undefined,
        user: data.user_id ? idToNameMap.get(data.user_id) || "Unknown" : "System",
        action: data.action,
        entityType: data.entity_type,
        entityId: data.entity_id || undefined,
        entityName: data.entity_name || undefined,
        timestamp: data.created_at,
        details: data.details || undefined
      }, ...prev]);
    }
  }, [user?.id, idToNameMap]);


  const addLead = useCallback(async (lead: Omit<Lead, "id" | "createdAt" | "lastActivity">) => {
    try {
      // Map back to DB format
      const dbLead = {
        business_name: lead.businessName,
        phone: lead.phone,
        email: lead.email || null,
        website: lead.website || null,
        niche: lead.niche || null,
        address: lead.address || null,
        maps_link: lead.mapsLink || null,
        instagram_link: lead.instagramLink || null,
        rating: lead.rating || null,
        review_count: lead.reviewCount || null,
        status: lead.status || "new",
        source: lead.source || "manual",
        lead_source_detail: lead.leadSourceDetail || null,
        // Default assignee to the creator if none specified — no "Unassigned" state.
        assigned_to: (lead.assignedTo
          ? nameToIdMap.get(lead.assignedTo) || lead.assignedTo
          : user?.id) || null,
        batch_id: lead.batchId || null,
        uploaded_by: user?.id || null,
        manual_notes: lead.manualNotes || null,
      };

      const { data, error } = await supabase.from("leads").insert([dbLead]).select().single();
      
      if (error) throw error;
      
      if (data) {
        const newAppLead = mapLeadRow(data, idToNameMap);
        newAppLead.lastActivity = "Just now";
        setLeads(prev => [newAppLead, ...prev]);
        addLog("Created Lead", "lead", data.id, newAppLead.businessName);

        // Fire-and-forget: notify all team members about the new manual lead.
        supabase.auth.getSession().then(({ data: sessionData }) => {
          const token = sessionData?.session?.access_token;
          if (token) {
            fetch('/api/notify/lead-created', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ id: data.id }),
            }).catch((err: Error) => console.error('Lead notify error:', err.message));
          }
        });

        // If manual notes exist, also create an actual Activity so it shows in timeline
        if (lead.manualNotes?.trim()) {
          const { data: actData } = await supabase.from("activities").insert([{
            lead_id: data.id,
            user_id: user?.id || null,
            type: "note",
            content: lead.manualNotes
          }]).select().single();

          if (actData) {
            setActivities(prev => [mapActivityRow(actData, idToNameMap), ...prev]);
          }
        }
      }
    } catch (e: any) {
      console.error("Add lead error:", e);
      toast.error(`Error adding lead: ${e.message}`);
    }
  }, [addLog, idToNameMap, nameToIdMap, user?.id]);


  const updateLeadStatus = useCallback(async (leadId: string, status: LeadStatus) => {
    try {
      // Optimistic upate
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status, lastActivity: "Just now" } : l));
      
      const { error } = await supabase.from("leads").update({ status, updated_at: new Date().toISOString() }).eq("id", leadId);
      if (error) throw error;
      
      addLog("Updated Status", "lead", leadId, undefined, { new_status: status });
      
      // Auto create a system activity
      const { data: actData } = await supabase.from("activities").insert([{
        lead_id: leadId,
        user_id: user?.id || null,
        type: "system",
        content: `Status changed to ${status.replace("_", " ")}`
      }]).select().single();

      if (actData) {
        setActivities(prev => [mapActivityRow(actData, idToNameMap), ...prev]);
      }
    } catch (e: any) {
      console.error("Status update error:", e);
      toast.error("Failed to update status");
      loadData(); // Revert on failure
    }
  }, [user?.id, idToNameMap, addLog, loadData]);


  const updateLeadDetails = useCallback(async (leadId: string, updates: Partial<Lead>) => {
    try {
      // Optimistic update
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, ...updates, lastActivity: "Just now" } : l));

      // Map to DB
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.businessName !== undefined) dbUpdates.business_name = updates.businessName;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.website !== undefined) dbUpdates.website = updates.website;
      if (updates.niche !== undefined) dbUpdates.niche = updates.niche;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
      if (updates.reviewCount !== undefined) dbUpdates.review_count = updates.reviewCount;
      if (updates.source !== undefined) dbUpdates.source = updates.source;

      const { error } = await supabase.from("leads").update(dbUpdates).eq("id", leadId);
      if (error) throw error;

      addLog("Updated Details", "lead", leadId);
    } catch (e: any) {
      console.error("Lead update error:", e);
      toast.error("Failed to update lead");
      loadData(); // Revert on failure
    }
  }, [loadData, addLog]);


  const archiveLead = useCallback(async (leadId: string) => {
    try {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, isArchived: true } : l));
      const { error } = await supabase.from("leads").update({ is_archived: true } as Record<string, unknown>).eq("id", leadId);
      if (error) {
        if (error.code === '42703') { // Column does not exist
          toast.error("Database schema missing 'is_archived' boolean column on 'leads' table.");
        } else throw error;
      } else {
        addLog("Archived Lead", "lead", leadId);
      }
    } catch (e) {
      console.error("Archive error:", e);
      loadData();
    }
  }, [loadData, addLog]);


  const restoreLead = useCallback(async (leadId: string) => {
    try {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, isArchived: false } : l));
      const { error } = await supabase.from("leads").update({ is_archived: false } as Record<string, unknown>).eq("id", leadId);
      if (error) throw error;
      addLog("Restored Lead", "lead", leadId);
    } catch (e) {
      console.error("Restore error:", e);
      loadData();
    }
  }, [loadData, addLog]);


  const deleteLead = useCallback(async (leadId: string) => {
    try {
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setPayments(prev => prev.filter(p => p.leadId !== leadId));

      // Delete activities + payments in parallel before the lead (FK order)
      await Promise.all([
        supabase.from("activities").delete().eq("lead_id", leadId),
        supabase.from("payments").delete().eq("lead_id", leadId),
      ]);
      const { error } = await supabase.from("leads").delete().eq("id", leadId);

      if (error) throw error;
      addLog("Deleted Lead Permanently", "lead", leadId);
    } catch (e) {
      console.error("Delete error:", e);
      toast.error("Failed to delete lead");
      loadData();
    }
  }, [loadData, addLog]);


  const assignLead = useCallback(async (leadId: string, assignee: string) => {
    try {
      const assigneeId = nameToIdMap.get(assignee) || null;
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assignedTo: assignee, assignedToName: assignee } : l));
      
      const { error } = await supabase.from("leads").update({ assigned_to: assigneeId, updated_at: new Date().toISOString() }).eq("id", leadId);
      if (error) throw error;
      
      addLog("Assigned Lead", "lead", leadId, undefined, { assigned_to: assignee });
    } catch (e) {
      console.error("Assign error:", e);
      loadData();
    }
  }, [nameToIdMap, loadData, addLog]);


  const addActivity = useCallback(async (activity: Omit<Activity, "id">) => {
    try {
      const dbAct = {
        lead_id: activity.leadId,
        user_id: user?.id || null,
        type: activity.type,
        content: activity.content,
        outcome: activity.outcome || null,
        status: activity.status || null,
        reminder_date: activity.reminderDate || null,
      };

      const { data, error } = await supabase.from("activities").insert([dbAct]).select().single();
      if (error) throw error;

      if (data) {
        setActivities(prev => [mapActivityRow(data, idToNameMap), ...prev]);
        setLeads(prev => prev.map(l => l.id === activity.leadId ? { ...l, lastActivity: "Just now" } : l));
        addLog(`Added Activity: ${activity.type}`, "activity", data.id);
      }
    } catch (e) {
      console.error("Add activity error:", e);
      toast.error("Failed to log activity");
    }
  }, [user?.id, idToNameMap, addLog]);


  const deleteActivity = useCallback(async (activityId: string) => {
    try {
      const { error } = await supabase.from("activities").delete().eq("id", activityId);
      if (error) throw error;
      setActivities(prev => prev.filter(a => a.id !== activityId));
      addLog("Deleted Activity", "activity", activityId);
    } catch (e) {
      console.error("Delete activity error:", e);
      toast.error("Failed to delete reminder");
    }
  }, [addLog]);

  const rescheduleActivity = useCallback(async (activityId: string, newDate: string) => {
    try {
      const { error } = await supabase.from("activities").update({ reminder_date: newDate }).eq("id", activityId);
      if (error) throw error;
      setActivities(prev => prev.map(a => a.id === activityId ? { ...a, reminderDate: newDate } : a));
      addLog("Rescheduled Activity", "activity", activityId);
    } catch (e) {
      console.error("Reschedule activity error:", e);
      toast.error("Failed to reschedule reminder");
    }
  }, [addLog]);

  const uploadExcelLeads = useCallback(async (newLeads: Omit<Lead, "id" | "createdAt" | "lastActivity">[], batchInfo: Omit<UploadBatch, "id">) => {
    try {
      // 1. Create Batch First
      const dbBatch = {
        file_name: batchInfo.fileName,
        niche: batchInfo.niche || null,
        location: batchInfo.location || null,
        lead_count: newLeads.length,
        uploaded_by: user?.id || null,
      };

      const { data: batchData, error: batchError } = await supabase.from("upload_batches").insert([dbBatch]).select().single();
      if (batchError) throw batchError;

      if (batchData) {
        setBatches(prev => [mapBatchRow(batchData, idToNameMap), ...prev]);

        // 2. Insert Leads
        const dbLeads = newLeads.map(lead => ({
          business_name: lead.businessName,
          phone: lead.phone,
          email: lead.email || null,
          website: lead.website || null,
          niche: lead.niche || null,
          address: lead.address || null,
          maps_link: lead.mapsLink || null,
          instagram_link: lead.instagramLink || null,
          rating: lead.rating || null,
          review_count: lead.reviewCount || null,
          status: lead.status || "new",
          source: lead.source || "excel",
          // Batch-uploaded leads are auto-assigned to the uploader. No "Unassigned" state.
          assigned_to: user?.id || (lead.assignedTo ? nameToIdMap.get(lead.assignedTo) || null : null),
          batch_id: batchData.id,
          uploaded_by: user?.id || null,
          manual_notes: lead.manualNotes || null
        }));

        // Supabase limits bulk insert sizes, so we chunk it if necessary, but typically < 1000 is fine
        const { data: insertedLeads, error: leadsError } = await supabase.from("leads").insert(dbLeads).select();
        if (leadsError) throw leadsError;

        if (insertedLeads) {
          const newAppLeads = insertedLeads.map(r => {
            const l = mapLeadRow(r, idToNameMap);
            l.lastActivity = "Just now";
            return l;
          });
          setLeads(prev => [...newAppLeads, ...prev]);
        }

        addLog("Uploaded Excel", "batch", batchData.id, batchData.file_name);
        toast.success(`Successfully uploaded ${newLeads.length} leads`);
      }
    } catch (e: any) {
      console.error("Upload error:", e);
      toast.error(`Upload failed: ${e.message}`);
    }
  }, [user?.id, nameToIdMap, idToNameMap, addLog]);


  const archiveBatch = useCallback(async (batchId: string) => {
    try {
      setLeads(prev => prev.map(l => l.batchId === batchId ? { ...l, isArchived: true } : l));
      await supabase.from("leads").update({ is_archived: true } as Record<string, unknown>).eq("batch_id", batchId);
      addLog("Archived Batch", "batch", batchId);
    } catch (e) {
      loadData();
    }
  }, [loadData, addLog]);

  const deleteBatch = useCallback(async (batchId: string) => {
    try {
      // Optimistic locally
      setBatches(prev => prev.filter(b => b.id !== batchId));
      setManualBatches(prev => prev.filter(b => b.id !== batchId));
      setLeads(prev => prev.filter(l => l.batchId !== batchId));
      
      // Delete activities of these leads first to avoid FK constraint issues
      const matchingLeads = leads.filter(l => l.batchId === batchId);
      if (matchingLeads.length > 0) {
        const leadIds = matchingLeads.map(l => l.id);
        await supabase.from("activities").delete().in("lead_id", leadIds);
      }

      // Supabase cascade should handle if setup, but manual ensures
      await supabase.from("leads").delete().eq("batch_id", batchId);
      const { error } = await supabase.from("upload_batches").delete().eq("id", batchId);
      
      if (error) throw error;
      addLog("Deleted Batch", "batch", batchId);
      toast.success("Batch and its associated leads deleted");
    } catch (e: any) {
      console.error("Delete batch error:", e);
      toast.error("Failed to delete batch");
      loadData();
    }
  }, [leads, loadData, addLog]);

  const createManualBatch = useCallback(async (name: string): Promise<UploadBatch | null> => {
    try {
      const { data, error } = await supabase.from("upload_batches").insert([{
        file_name: name,
        location: "__manual__",
        niche: null,
        lead_count: 0,
        uploaded_by: user?.id || null,
      }]).select().single();
      if (error) throw error;
      if (data) {
        const newBatch = mapBatchRow(data, idToNameMap);
        setManualBatches(prev => [newBatch, ...prev]);
        addLog("Created Manual Folder", "batch", data.id, name);
        return newBatch;
      }
      return null;
    } catch (e: any) {
      console.error("Create manual batch error:", e);
      toast.error(`Failed to create folder: ${e.message}`);
      return null;
    }
  }, [user?.id, idToNameMap, addLog]);

  const renameManualBatch = useCallback(async (batchId: string, name: string): Promise<void> => {
    try {
      setManualBatches(prev => prev.map(b => b.id === batchId ? { ...b, fileName: name } : b));
      const { error } = await supabase.from("upload_batches").update({ file_name: name }).eq("id", batchId);
      if (error) throw error;
    } catch (e: any) {
      console.error("Rename batch error:", e);
      toast.error("Failed to rename folder");
      loadData();
    }
  }, [loadData]);

  const updateBatchNote = useCallback(async (batchId: string, note: string): Promise<void> => {
    try {
      setManualBatches(prev => prev.map(b => b.id === batchId ? { ...b, note: note || undefined } : b));
      const { error } = await supabase.from("upload_batches").update({ note: note || null }).eq("id", batchId);
      if (error) throw error;
    } catch (e: any) {
      console.error("Update batch note error:", e);
      toast.error("Failed to save note");
      loadData();
    }
  }, [loadData]);

  const updateLeadBatch = useCallback(async (leadId: string, batchId: string | null): Promise<void> => {
    try {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, batchId: batchId ?? undefined } : l));
      const { error } = await supabase
        .from("leads")
        .update({ batch_id: batchId, updated_at: new Date().toISOString() })
        .eq("id", leadId);
      if (error) throw error;
      addLog("Moved Lead to Folder", "lead", leadId, undefined, { batch_id: batchId });
    } catch (e: any) {
      console.error("Move lead error:", e);
      toast.error("Failed to move lead");
      loadData();
    }
  }, [loadData, addLog]);

  // ── Payments ────────────────────────────────────────────────────
  const createPaymentsForClient = useCallback(async (leadId: string, projectValue: number): Promise<void> => {
    if (!projectValue || projectValue <= 0) return;
    // Guard: never create duplicate payment rows for the same lead
    const existing = payments.filter(p => p.leadId === leadId);
    if (existing.length > 0) return;
    const half = Math.round(projectValue / 2);
    const rows = [
      { lead_id: leadId, type: "upfront", amount: half, status: "pending" },
      { lead_id: leadId, type: "final",   amount: projectValue - half, status: "pending" },
    ];
    const { data, error } = await supabase.from("payments").insert(rows).select();
    if (error) { console.error("Create payments error:", error); return; }
    if (data) setPayments(prev => [...prev, ...(data as PaymentRow[]).map(mapPaymentRow)]);
  }, [payments]);

  const markPaymentPaid = useCallback(async (paymentId: string, data: { paidDate: string; method: PaymentMethod; reference?: string; notes?: string; amount?: number }): Promise<void> => {
    try {
      const targetPayment = payments.find(p => p.id === paymentId);
      if (!targetPayment) return;
      const leadId = targetPayment.leadId;
      const lead = leads.find(l => l.id === leadId);
      const projectValue = lead?.projectValue || 0;
      
      const newAmount = data.amount ?? targetPayment.amount;

      setPayments(prev => prev.map(p => p.id === paymentId
        ? { ...p, status: "paid", amount: newAmount, paidDate: data.paidDate, paymentMethod: data.method, reference: data.reference, notes: data.notes }
        : p));
        
      const { error } = await supabase.from("payments").update({
        status: "paid",
        amount: newAmount,
        paid_date: data.paidDate,
        payment_method: data.method || null,
        reference: data.reference || null,
        notes: data.notes || null,
      }).eq("id", paymentId);
      if (error) throw error;

      // Ledger Auto-Correction Engine: Flatten remaining pending payments based on what was actually received.
      if (projectValue > 0) {
        const updatedClientPayments = payments.filter(p => p.leadId === leadId).map(p => p.id === paymentId ? { ...p, status: "paid" as any, amount: newAmount } : p);
        const pendingPayments = updatedClientPayments.filter(p => p.status === "pending");
        
        if (pendingPayments.length > 0) {
          // Dump the difference into the LAST pending payment
          const targetPending = pendingPayments[pendingPayments.length - 1];
          const lockedTotal = updatedClientPayments.reduce((sum, p) => p.id === targetPending.id ? sum : sum + p.amount, 0);
          const nextTargetAmount = Math.max(0, projectValue - lockedTotal);

          if (nextTargetAmount !== targetPending.amount) {
            await supabase.from("payments").update({ amount: nextTargetAmount }).eq("id", targetPending.id);
            setPayments(prev => prev.map(p => p.id === targetPending.id ? { ...p, amount: nextTargetAmount } : p));
          }
        }
      }

      addLog("Payment Marked Paid", "payment", paymentId);
      toast.success("Payment recorded");
    } catch (e: any) {
      console.error("Mark payment paid error:", e);
      toast.error("Failed to update payment");
      loadData();
    }
  }, [payments, leads, loadData, addLog]);

  const markPaymentUnpaid = useCallback(async (paymentId: string): Promise<void> => {
    try {
      setPayments(prev => prev.map(p => p.id === paymentId
        ? { ...p, status: "pending", paidDate: undefined, paymentMethod: undefined, reference: undefined, notes: undefined }
        : p));
      const { error } = await supabase.from("payments").update({
        status: "pending",
        paid_date: null,
        payment_method: null,
        reference: null,
        notes: null,
      }).eq("id", paymentId);
      if (error) throw error;
      addLog("Payment Marked Unpaid", "payment", paymentId);
      toast.success("Payment marked as unpaid");
    } catch (e: any) {
      console.error("Mark payment unpaid error:", e);
      toast.error("Failed to update payment");
      loadData();
    }
  }, [loadData, addLog]);

  const updatePaymentDueDate = useCallback(async (paymentId: string, dueDate: string | null): Promise<void> => {
    try {
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, dueDate: dueDate ?? undefined } : p));
      const { error } = await supabase.from("payments").update({ due_date: dueDate }).eq("id", paymentId);
      if (error) throw error;
    } catch (e: any) {
      console.error("Update due date error:", e);
      toast.error("Failed to update due date");
      loadData();
    }
  }, [loadData]);

  const setProjectValue = useCallback(async (leadId: string, value: number, addonName?: string): Promise<void> => {
    try {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, projectValue: value } : l));
      const { error: leadErr } = await supabase.from("leads").update({ project_value: value }).eq("id", leadId);
      if (leadErr) throw leadErr;

      // Recalculate payment amounts — freeze paid payments.
      const clientPayments = payments.filter(p => p.leadId === leadId);
      if (clientPayments.length > 0) {
        const paidPayments = clientPayments.filter(p => p.status === "paid");
        const pendingPayments = clientPayments.filter(p => p.status === "pending");
        const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);

        if (pendingPayments.length === 0) {
          // All existing payments are paid. The only safe way to increase budget is to append a new 'addon' payment.
          const diff = value - totalPaid;
          if (diff > 0) {
            const { data, error: insertErr } = await supabase.from("payments").insert({
              lead_id: leadId,
              type: "addon",
              amount: diff,
              status: "pending",
              notes: addonName || "Add-on Payment"
            }).select().single();
            if (insertErr) throw insertErr;
            setPayments(prev => [...prev, mapPaymentRow(data)]);
          }
        } else {
          // We have pending payments to absorb the change.
          const upfront = clientPayments.find(p => p.type === "upfront");
          const final   = clientPayments.find(p => p.type === "final");
          
          const dbUpdates: Promise<any>[] = [];
          const nextAmounts = new Map<string, number>();

          if (upfront && final && upfront.status === "pending" && final.status === "pending" && clientPayments.length === 2) {
            // Clean 50/50 split if nothing is paid yet
            const nextUpfront = Math.round(value / 2);
            const nextFinal   = value - nextUpfront;
            if (nextUpfront !== upfront.amount) { dbUpdates.push(supabase.from("payments").update({ amount: nextUpfront }).eq("id", upfront.id) as any); nextAmounts.set(upfront.id, nextUpfront); }
            if (nextFinal !== final.amount) { dbUpdates.push(supabase.from("payments").update({ amount: nextFinal }).eq("id", final.id) as any); nextAmounts.set(final.id, nextFinal); }
          } else {
            // One or more payments are paid, or we have addons.
            // Freeze paid payments, and dump the remaining balance into the LAST pending payment.
            const targetPayment = (final && final.status === "pending") ? final : pendingPayments[pendingPayments.length - 1];
            const lockedTotal = clientPayments.reduce((sum, p) => p.id === targetPayment.id ? sum : sum + p.amount, 0);
            const nextTargetAmount = Math.max(0, value - lockedTotal);

            if (nextTargetAmount !== targetPayment.amount) {
              dbUpdates.push(supabase.from("payments").update({ amount: nextTargetAmount }).eq("id", targetPayment.id) as any);
              nextAmounts.set(targetPayment.id, nextTargetAmount);
            }
          }

          if (dbUpdates.length > 0) {
            const results = await Promise.all(dbUpdates);
            for (const res of results) if (res.error) throw res.error;
            
            setPayments(prev => prev.map(p => {
              if (nextAmounts.has(p.id)) return { ...p, amount: nextAmounts.get(p.id)! };
              return p;
            }));
          }
        }
      }

      addLog("Set Project Value", "lead", leadId, undefined, { value });
      toast.success("Project value updated");
    } catch (e: any) {
      console.error("Set project value error:", e);
      toast.error("Failed to set project value");
      loadData();
    }
  }, [payments, loadData, addLog]);

  // Absorbs additional charges (scope additions) into both the client's project
  // value and the specific payment that will collect them. Used when extras
  // are added at invoice-generation time, so the underlying accounting stays
  // consistent with the invoice PDF.
  const addPaymentExtras = useCallback(async (paymentId: string, extraAmount: number, newProjectValue: number): Promise<void> => {
    if (extraAmount <= 0) return;
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) {
      console.error("addPaymentExtras: payment not found", paymentId);
      return;
    }
    const newPaymentAmount = payment.amount + extraAmount;
    try {
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, amount: newPaymentAmount } : p));
      setLeads(prev => prev.map(l => l.id === payment.leadId ? { ...l, projectValue: newProjectValue } : l));

      const [payRes, leadRes] = await Promise.all([
        supabase.from("payments").update({ amount: newPaymentAmount }).eq("id", paymentId),
        supabase.from("leads").update({ project_value: newProjectValue }).eq("id", payment.leadId),
      ]);
      if (payRes.error) throw payRes.error;
      if (leadRes.error) throw leadRes.error;

      addLog("Added Scope Extras", "payment", paymentId, undefined, {
        extra_amount: extraAmount,
        new_payment_amount: newPaymentAmount,
        new_project_value: newProjectValue,
      });
    } catch (e: any) {
      console.error("addPaymentExtras error:", e);
      toast.error("Failed to record extras");
      loadData();
    }
  }, [payments, loadData, addLog]);

  // ── Client conversion + bulk actions ────────────────────────────
  const convertToClient = useCallback(async (leadIds: string[], services: string, notes?: string, projectValue?: number) => {
    if (leadIds.length === 0) return;
    const becameAt = new Date().toISOString();
    const dbUpdates: Record<string, unknown> = {
      is_client: true,
      became_client_at: becameAt,
      client_services: services || null,
      client_notes: notes || null,
      updated_at: becameAt,
    };
    if (projectValue && projectValue > 0) dbUpdates.project_value = projectValue;
    try {
      setLeads(prev => prev.map(l => leadIds.includes(l.id)
        ? { ...l, isClient: true, becameClientAt: becameAt, clientServices: services || undefined, clientNotes: notes || undefined, projectValue: projectValue || undefined }
        : l));
      const { error } = await supabase.from("leads").update(dbUpdates).in("id", leadIds);
      if (error) throw error;
      if (projectValue && projectValue > 0) {
        // Parallel payment creation — one set per converted lead
        await Promise.all(leadIds.map(id => createPaymentsForClient(id, projectValue)));
      }
      addLog(`Converted ${leadIds.length} lead(s) to client`, "lead", leadIds[0], undefined, { count: leadIds.length, services });
      toast.success(`${leadIds.length} lead${leadIds.length > 1 ? "s" : ""} converted to client${leadIds.length > 1 ? "s" : ""}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to convert";
      console.error("Convert to client error:", e);
      toast.error(msg);
      loadData();
    }
  }, [loadData, addLog, createPaymentsForClient]);

  const revertToLead = useCallback(async (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    try {
      setLeads(prev => prev.map(l => leadIds.includes(l.id)
        ? { ...l, isClient: false, becameClientAt: undefined }
        : l));
      // Remove orphaned payment rows immediately from local state
      setPayments(prev => prev.filter(p => !leadIds.includes(p.leadId)));

      const { error } = await supabase
        .from("leads")
        .update({ is_client: false, became_client_at: null, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .in("id", leadIds);
      if (error) throw error;

      // Delete associated payment rows so they don't ghost if the lead is re-converted
      await supabase.from("payments").delete().in("lead_id", leadIds);

      addLog(`Moved ${leadIds.length} client(s) back to leads`, "lead", leadIds[0], undefined, { count: leadIds.length });
      toast.success(`Moved ${leadIds.length} back to leads`);
    } catch (e) {
      console.error("Revert to lead error:", e);
      toast.error("Failed to move back");
      loadData();
    }
  }, [loadData, addLog]);

  const addDirectClient = useCallback(async (data: {
    businessName: string; phone: string; email?: string; website?: string;
    services?: string; notes?: string; projectStatus?: string; projectValue?: number;
    becameClientAt?: string; projectStartedAt?: string; projectDeliveredAt?: string;
  }) => {
    try {
      const becameAt = data.becameClientAt || new Date().toISOString();
      const dbLead: Record<string, unknown> = {
        business_name: data.businessName,
        phone: data.phone,
        email: data.email || null,
        website: data.website || null,
        status: "closed_won",
        source: "manual",
        is_client: true,
        became_client_at: becameAt,
        client_services: data.services || null,
        client_notes: data.notes || null,
        project_status: data.projectStatus || "in_progress",
        assigned_to: user?.id || null,
        uploaded_by: user?.id || null,
        updated_at: becameAt,
      };
      if (data.projectValue && data.projectValue > 0) dbLead.project_value = data.projectValue;
      const { data: row, error } = await supabase.from("leads").insert([dbLead]).select().single();
      if (error) throw error;
      if (row) {
        const newLead = mapLeadRow(row, idToNameMap);
        newLead.lastActivity = "Just now";
        newLead.isArchived = false;
        setLeads(prev => [newLead, ...prev]);
        addLog("Added Client Directly", "lead", row.id, data.businessName);
        if (data.projectValue && data.projectValue > 0) {
          await createPaymentsForClient(row.id, data.projectValue);
        }
        toast.success("Client added");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to add client";
      console.error("Add direct client error:", e);
      toast.error(msg);
    }
  }, [user?.id, idToNameMap, addLog, createPaymentsForClient]);

  const updateClientInfo = useCallback(async (leadId: string, data: { businessName?: string; phone?: string; services?: string; notes?: string; projectStatus?: string; website?: string; becameClientAt?: string; projectStartedAt?: string; projectDeliveredAt?: string }) => {
    try {
      // Auto-set delivered date when status switches to "delivered" without an explicit date
      const autoDeliveredAt = data.projectDeliveredAt !== undefined
        ? data.projectDeliveredAt
        : data.projectStatus === "delivered"
          ? new Date().toISOString()
          : undefined;

      setLeads(prev => prev.map(l => l.id === leadId
        ? {
            ...l,
            businessName:      data.businessName      ?? l.businessName,
            phone:             data.phone             ?? l.phone,
            clientServices:    data.services          ?? l.clientServices,
            clientNotes:       data.notes             ?? l.clientNotes,
            projectStatus:     data.projectStatus     ?? l.projectStatus,
            website:           data.website           ?? l.website,
            becameClientAt:    data.becameClientAt    ?? l.becameClientAt,
            projectStartedAt:  data.projectStartedAt  ?? l.projectStartedAt,
            projectDeliveredAt: autoDeliveredAt       ?? l.projectDeliveredAt,
          }
        : l));

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.businessName !== undefined)  updates.business_name      = data.businessName || null;
      if (data.phone !== undefined)         updates.phone              = data.phone || null;
      if (data.services !== undefined)      updates.client_services    = data.services || null;
      if (data.notes !== undefined)         updates.client_notes       = data.notes || null;
      if (data.projectStatus !== undefined) updates.project_status     = data.projectStatus || null;
      if (data.website !== undefined)       updates.website            = data.website || null;
      if (data.becameClientAt !== undefined)   updates.became_client_at   = data.becameClientAt || null;
      if (data.projectStartedAt !== undefined) updates.project_started_at = data.projectStartedAt || null;
      if (autoDeliveredAt !== undefined)    updates.project_delivered_at = autoDeliveredAt || null;

      const { error } = await supabase.from("leads").update(updates).eq("id", leadId);
      if (error) throw error;
      toast.success("Client info updated");
    } catch (e) {
      console.error("Update client info error:", e);
      toast.error("Failed to update");
      loadData();
    }
  }, [loadData]);

  const bulkUpdateStatus = useCallback(async (leadIds: string[], status: LeadStatus) => {
    if (leadIds.length === 0) return;
    try {
      setLeads(prev => prev.map(l => leadIds.includes(l.id) ? { ...l, status, lastActivity: "Just now" } : l));
      const { error } = await supabase
        .from("leads")
        .update({ status, updated_at: new Date().toISOString() })
        .in("id", leadIds);
      if (error) throw error;
      addLog(`Bulk status update to ${status}`, "lead", leadIds[0], undefined, { count: leadIds.length, status });
      toast.success(`Updated ${leadIds.length} lead${leadIds.length > 1 ? "s" : ""}`);
    } catch (e) {
      console.error("Bulk status error:", e);
      toast.error("Failed to update");
      loadData();
    }
  }, [loadData, addLog]);

  const bulkAssign = useCallback(async (leadIds: string[], assigneeName: string) => {
    if (leadIds.length === 0) return;
    const assigneeId = nameToIdMap.get(assigneeName) || null;
    try {
      setLeads(prev => prev.map(l => leadIds.includes(l.id)
        ? { ...l, assignedTo: assigneeId, assignedToName: assigneeName }
        : l));
      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: assigneeId, updated_at: new Date().toISOString() })
        .in("id", leadIds);
      if (error) throw error;
      addLog(`Bulk assign to ${assigneeName}`, "lead", leadIds[0], undefined, { count: leadIds.length, assignee: assigneeName });
      toast.success(`Assigned ${leadIds.length} to ${assigneeName}`);
    } catch (e) {
      console.error("Bulk assign error:", e);
      toast.error("Failed to assign");
      loadData();
    }
  }, [nameToIdMap, loadData, addLog]);

  const bulkArchive = useCallback(async (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    try {
      setLeads(prev => prev.map(l => leadIds.includes(l.id) ? { ...l, isArchived: true } : l));
      const { error } = await supabase.from("leads").update({ is_archived: true } as Record<string, unknown>).in("id", leadIds);
      if (error) throw error;
      addLog(`Archived ${leadIds.length} lead(s)`, "lead", leadIds[0], undefined, { count: leadIds.length });
      toast.success(`Archived ${leadIds.length}`);
    } catch (e) {
      console.error("Bulk archive error:", e);
      loadData();
    }
  }, [loadData, addLog]);

  const bulkDelete = useCallback(async (leadIds: string[]) => {
    if (leadIds.length === 0) return;
    try {
      setLeads(prev => prev.filter(l => !leadIds.includes(l.id)));
      setPayments(prev => prev.filter(p => !leadIds.includes(p.leadId)));

      // Delete activities + payments in parallel before leads (FK order)
      await Promise.all([
        supabase.from("activities").delete().in("lead_id", leadIds),
        supabase.from("payments").delete().in("lead_id", leadIds),
      ]);
      const { error } = await supabase.from("leads").delete().in("id", leadIds);
      if (error) throw error;
      addLog(`Deleted ${leadIds.length} lead(s)`, "lead", leadIds[0], undefined, { count: leadIds.length });
      toast.success(`Deleted ${leadIds.length}`);
    } catch (e) {
      console.error("Bulk delete error:", e);
      toast.error("Failed to delete");
      loadData();
    }
  }, [loadData, addLog]);

  return (
    <CRMContext.Provider
      value={{
        leads,
        activities,
        batches,
        manualBatches,
        activityLogs,
        payments,
        isLoadingData,
        addLead,
        updateLeadStatus,
        updateLeadDetails,
        archiveLead,
        restoreLead,
        deleteLead,
        assignLead,
        addActivity,
        deleteActivity,
        rescheduleActivity,
        uploadExcelLeads,
        archiveBatch,
        deleteBatch,
        createManualBatch,
        renameManualBatch,
        updateBatchNote,
        updateLeadBatch,
        createPaymentsForClient,
        markPaymentPaid,
        markPaymentUnpaid,
        updatePaymentDueDate,
        setProjectValue,
        addPaymentExtras,
        addDirectClient,
        convertToClient,
        revertToLead,
        updateClientInfo,
        bulkUpdateStatus,
        bulkAssign,
        bulkArchive,
        bulkDelete,
        refreshData: loadData,
      }}
    >
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) throw new Error("useCRM must be used within CRMProvider");
  return context;
}

export { formatTimeAgo };
