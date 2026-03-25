"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Globe } from "lucide-react";

export default function WebsiteLeadsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Website Leads</h1>
        <p className="text-sm text-gray-500 mt-1">Leads from your website contact form</p>
      </div>

      <Card>
        <CardContent className="py-16 text-center">
          <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Globe className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">No website leads yet</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Connect your website contact form to start receiving leads here automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
