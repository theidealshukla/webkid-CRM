"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home, Sparkles, Building2, FolderKanban, MessageSquare, Wrench, BadgeIndianRupee, Image as ImageIcon,
} from "lucide-react";

const tabs = [
  { href: "/crm/cms",              label: "Overview",   icon: Home },
  { href: "/crm/cms/hero",         label: "Hero",       icon: Sparkles },
  { href: "/crm/cms/trusted",      label: "Trusted",    icon: Building2 },
  { href: "/crm/cms/projects",     label: "Projects",   icon: FolderKanban },
  { href: "/crm/cms/testimonials", label: "Testimonials", icon: MessageSquare },
  { href: "/crm/cms/services",     label: "Services",   icon: Wrench },
  { href: "/crm/cms/pricing",      label: "Pricing",    icon: BadgeIndianRupee },
  { href: "/crm/cms/media",        label: "Media",      icon: ImageIcon },
];

export default function CmsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Website CMS</h1>
        <p className="text-sm text-gray-500">Edit the content shown on webkid.me</p>
      </div>

      <nav className="flex flex-wrap gap-1.5 border-b border-gray-200 -mb-px overflow-x-auto">
        {tabs.map((t) => {
          const active = t.href === "/crm/cms" ? pathname === t.href : pathname?.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-t-md border border-transparent -mb-px",
                active
                  ? "bg-white border-gray-200 border-b-white text-gray-900 font-semibold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div className="bg-white border border-gray-200 rounded-lg p-5 md:p-6">
        {children}
      </div>
    </div>
  );
}
