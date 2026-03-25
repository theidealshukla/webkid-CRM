"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Lead, Activity, UploadBatch, LeadStatus, ActivityLog, LeadRow, ActivityRow, UploadBatchRow, ActivityLogRow } from "@/types";
import { mapLeadRow, mapActivityRow, mapBatchRow } from "@/types";
import { useAuth } from "./AuthContext";
import { supabase } from "@/config/supabase";
import { toast } from "sonner";

interface CRMContextType {
  leads: Lead[];
  activities: Activity[];
  batches: UploadBatch[];
  activityLogs: ActivityLog[];
  isLoadingData: boolean;
  addLead: (lead: Omit<Lead, "id" | "createdAt" | "lastActivity">) => void;
  updateLeadStatus: (leadId: string, status: LeadStatus) => void;
  updateLeadDetails: (leadId: string, updates: Partial<Lead>) => void;
  archiveLead: (leadId: string) => void;
  restoreLead: (leadId: string) => void;
  deleteLead: (leadId: string) => void;
  assignLead: (leadId: string, assignee: string) => void;
  addActivity: (activity: Omit<Activity, "id">) => void;
  uploadExcelLeads: (leads: Omit<Lead, "id" | "createdAt" | "lastActivity">[], batch: Omit<UploadBatch, "id">) => void;
  archiveBatch: (batchId: string) => void;
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
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
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
      const [leadsRes, activitiesRes, batchesRes, logsRes] = await Promise.all([
        supabase.from("leads").select("*").order("created_at", { ascending: false }),
        supabase.from("activities").select("*").order("created_at", { ascending: false }),
        supabase.from("upload_batches").select("*").order("created_at", { ascending: false }),
        supabase.from("activity_logs").select("*").order("created_at", { ascending: false })
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (activitiesRes.error) throw activitiesRes.error;
      if (batchesRes.error) throw batchesRes.error;
      if (logsRes.error) throw logsRes.error;

      // Map rows to App interfaces
      const mappedLeads = (leadsRes.data as LeadRow[]).map(r => {
        const lead = mapLeadRow(r, namesMap);
        
        // Compute lastActivity directly during mapping
        const leadActivities = (activitiesRes.data as ActivityRow[]).filter(a => a.lead_id === r.id);
        if (leadActivities.length > 0) {
           const latest = leadActivities[0].created_at;
           lead.lastActivity = formatTimeAgo(latest);
        } else {
           lead.lastActivity = formatTimeAgo(r.created_at);
        }
        
        // Handle is_archived gracefully — column may not exist yet
        const rawRow = r as unknown as Record<string, unknown>;
        lead.isArchived = rawRow.is_archived === true;
        
        return lead;
      });
      
      const mappedActivities = (activitiesRes.data as ActivityRow[]).map(r => mapActivityRow(r, namesMap));
      const mappedBatches = (batchesRes.data as UploadBatchRow[]).map(r => mapBatchRow(r, namesMap));
      
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

      setLeads(mappedLeads);
      setActivities(mappedActivities);
      setBatches(mappedBatches);
      setActivityLogs(mappedLogs);

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
        assigned_to: lead.assignedTo ? nameToIdMap.get(lead.assignedTo) || lead.assignedTo || null : null,
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
      
      // We need to delete activities first due to FK constraints
      await supabase.from("activities").delete().eq("lead_id", leadId);
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
          assigned_to: lead.assignedTo ? nameToIdMap.get(lead.assignedTo) || null : null,
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

  return (
    <CRMContext.Provider
      value={{
        leads,
        activities,
        batches,
        activityLogs,
        isLoadingData,
        addLead,
        updateLeadStatus,
        updateLeadDetails,
        archiveLead,
        restoreLead,
        deleteLead,
        assignLead,
        addActivity,
        uploadExcelLeads,
        archiveBatch,
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
