"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { Shield } from "lucide-react";

export default function SettingsPage() {
  const { user, teamMembers } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">View your profile and team</p>
      </div>

      {/* Profile Card */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">Your Profile</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16 shadow-sm border border-indigo-100">
              <AvatarFallback className="bg-indigo-50 text-indigo-700 text-xl font-bold">
                {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-bold text-gray-900">{user?.name}</p>
              <p className="text-sm font-medium text-gray-500">{user?.email}</p>
              <Badge variant="secondary" className="mt-2 capitalize font-semibold tracking-wide text-[10px] bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-0">{user?.role}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-gray-50/50 border-b border-gray-100 pb-4">
          <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-wider">Team Members</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50/80 transition-colors border border-transparent hover:border-gray-100">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 shadow-sm border border-gray-100">
                    <AvatarFallback className="bg-gray-50 text-gray-700 text-sm font-bold">
                      {member.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{member.name}</p>
                    <p className="text-xs font-medium text-gray-500">{member.email}</p>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-wider text-gray-500 border-gray-200 bg-white">{member.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
