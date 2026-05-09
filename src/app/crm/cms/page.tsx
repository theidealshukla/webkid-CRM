"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

const cards = [
  { href: "/crm/cms/hero",         title: "Hero",         desc: "Headline counter, CTAs, subtext on the homepage." },
  { href: "/crm/cms/trusted",      title: "Trusted by businesses across India", desc: "Logos & names strip below the hero." },
  { href: "/crm/cms/projects",     title: "Projects",     desc: "Bento portfolio (homepage + /projects)." },
  { href: "/crm/cms/testimonials", title: "Testimonials", desc: "Text, screenshots, and videos." },
  { href: "/crm/cms/services",     title: "Services",     desc: "Service cards on the homepage." },
  { href: "/crm/cms/pricing",      title: "Pricing",      desc: "Global pricing — used everywhere prices appear." },
];

export default function CmsOverview() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-gray-600">
          Pick a section to edit. Changes are published immediately and the public site refreshes within ~60s.
        </p>
        <a
          href="https://webkid.me"
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          View live site <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group block rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-gray-900">{c.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{c.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-700 group-hover:translate-x-0.5 transition" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
