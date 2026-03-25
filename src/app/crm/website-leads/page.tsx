"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/config/supabase";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Mail, Phone, Clock, Search, CheckCircle2, Circle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatTimeAgo } from "@/context/CRMContext";

interface WebsiteLead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string | null;
  source: string;
  is_read: boolean;
  created_at: string;
}

export default function WebsiteLeadsPage() {
  const [leads, setLeads] = useState<WebsiteLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('website_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to fetch website leads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const toggleReadStatus = async (lead: WebsiteLead) => {
    try {
      const { error } = await supabase
        .from('website_leads')
        .update({ is_read: !lead.is_read })
        .eq('id', lead.id);

      if (error) throw error;
      
      setLeads((prev) => 
        prev.map((l) => l.id === lead.id ? { ...l, is_read: !l.is_read } : l)
      );
      toast.success(`Marked as ${!lead.is_read ? 'read' : 'unread'}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const filteredLeads = leads.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.phone.includes(searchTerm) || 
    (l.email && l.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Globe className="h-6 w-6 text-indigo-600" />
          Website Leads
        </h1>
        <p className="text-sm text-gray-500 mt-1">Leads collected directly from your website contact form.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by name, email or phone..." 
            className="pl-9 bg-gray-50/50 hover:bg-white transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
          Total Leads: <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">{leads.length}</Badge>
        </div>
      </div>

      <Card className="border border-gray-100 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading leads...</div>
          ) : filteredLeads.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
              <Globe className="h-8 w-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-900 mt-2">No leads found</p>
              <p className="text-xs text-gray-500">When people contact you via your website, they'll appear here.</p>
            </div>
          ) : (
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80">
                    <TableHead className="w-[50px]"></TableHead>
                    <TableHead>Contact Detail</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className={`group ${!lead.is_read ? 'bg-indigo-50/20' : ''}`}>
                      <TableCell className="align-top pt-4">
                        <button 
                          onClick={() => toggleReadStatus(lead)}
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                          title={lead.is_read ? "Mark as unread" : "Mark as read"}
                        >
                          {lead.is_read ? (
                            <CheckCircle2 className="h-5 w-5 text-gray-300" />
                          ) : (
                            <Circle className="h-5 w-5 fill-indigo-100 text-indigo-600" />
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="font-semibold text-gray-900">{lead.name}</div>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone className="h-3 w-3" /> {lead.phone}
                          </span>
                          {lead.email && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail className="h-3 w-3" /> {lead.email}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <p className="text-sm text-gray-600 max-w-[300px] sm:max-w-[400px]">
                          {lead.message || <span className="text-gray-400 italic">No message provided</span>}
                        </p>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-gray-500 bg-gray-50">
                          {lead.source}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right align-top">
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="h-3 w-3" /> {formatTimeAgo(lead.created_at)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
