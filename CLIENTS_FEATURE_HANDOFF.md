# "Our Clients" Feature — Handoff / Resume Doc

> Build was interrupted partway through. This file captures **exactly** what's done, what's left, and what to manually finish so you can resume from a fresh session without re-deriving context.

---

## ✅ What's already done (committed locally, NOT pushed yet)

### 1. Database migration — DONE FILE, NOT YET APPLIED
**File**: `supabase/migrations/005_clients.sql`
**Action needed**: Run it in Supabase SQL Editor (Dashboard → SQL Editor → paste → Run).

```sql
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS is_client          boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS became_client_at   timestamptz,
  ADD COLUMN IF NOT EXISTS client_services    text,
  ADD COLUMN IF NOT EXISTS client_notes       text;
CREATE INDEX IF NOT EXISTS idx_leads_is_client ON public.leads(is_client) WHERE is_client = true;
CREATE INDEX IF NOT EXISTS idx_leads_became_client_at ON public.leads(became_client_at DESC) WHERE became_client_at IS NOT NULL;
```

### 2. Types updated
**File**: `src/types/index.ts`
- `Lead` interface: added `isClient?`, `becameClientAt?`, `clientServices?`, `clientNotes?`
- `LeadRow` interface: added `is_client?`, `became_client_at?`, `client_services?`, `client_notes?`
- `mapLeadRow()`: maps the new fields

### 3. CRMContext additions
**File**: `src/context/CRMContext.tsx`
Added context type entries + implementations:
- `convertToClient(leadIds: string[], services: string, notes?: string)`
- `revertToLead(leadIds: string[])`
- `updateClientInfo(leadId, services, notes?)`
- `bulkUpdateStatus(leadIds, status)`
- `bulkAssign(leadIds, assigneeName)`
- `bulkArchive(leadIds)`
- `bulkDelete(leadIds)`

All exported via the provider value at the bottom.

### 4. Email template + notification
**Files**:
- `src/lib/emailTemplates.ts` — added `clientConvertedEmail()` (emerald accent, 🎉 New Client header)
- `src/lib/notifications.ts` — added `notifyClientConverted(leadId, convertedById)` + import
- `src/app/api/webhooks/supabase/route.ts` — added handler branch for `is_client false→true` UPDATE → calls `notifyClientConverted`

### 5. ConvertToClientModal component
**File**: `src/components/crm/ConvertToClientModal.tsx`
Reusable dialog with `services` + `notes` text inputs. Supports both "convert" and "edit" modes.

### 6. LeadRow updates (partial — see below for what's missing)
**File**: `src/app/crm/leads/components/LeadRow.tsx`
- Added `selected`, `onSelectChange`, `onConvertToClient` props
- Added checkbox column (3% width, `<TableCell>` at start of row)
- Added "Convert to Client" item to row's actions dropdown
- Updated React.memo comparator to include `selected`

### 7. LeadsPage — partial
**File**: `src/app/crm/leads/page.tsx`
- Imports updated (added `Briefcase`, `X`, `Archive` icons, `ConvertToClientModal`, `DropdownMenu*`, `ALL_STATUSES`, `statusConfig`)
- `convertToClient` + bulk methods pulled from `useCRM()`
- `activeLeads` filter now excludes `isClient`
- `selectedIds: Set<string>` state added
- `convertModal` state added
- All bulk handler callbacks added (`toggleSelect`, `clearSelection`, `handleSingleConvert`, `handleBulkConvert`, `onConvertConfirm`, `handleBulkAssign`, `handleBulkStatus`, `handleBulkArchive`, `handleBulkDelete`)

---

## ⛔ What's NOT done yet (needs manual completion)

### A. LeadsPage table header + sticky bulk action bar
The handlers exist but aren't yet wired into the JSX. Need to add:

**A1. Header checkbox cell** — in the `<TableHead>` row near line ~440:
```tsx
<TableHead className="w-[3%]">
  <input
    type="checkbox"
    checked={paginatedLeads.length > 0 && paginatedLeads.every(l => selectedIds.has(l.id))}
    onChange={(e) => {
      const next = new Set(selectedIds);
      if (e.target.checked) paginatedLeads.forEach(l => next.add(l.id));
      else paginatedLeads.forEach(l => next.delete(l.id));
      setSelectedIds(next);
    }}
    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
  />
</TableHead>
<TableHead className="w-[3%] text-[10px] font-bold uppercase tracking-wider text-gray-400">#</TableHead>
```
(Replaces the existing `w-[4%]` `#` cell.)

**A2. Pass new props to `<LeadRow>`** in the rendering loop (~line 460):
```tsx
<LeadRow
  key={lead.id}
  lead={lead}
  index={(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
  selected={selectedIds.has(lead.id)}
  onSelectChange={toggleSelect}
  onStatusChange={handleStatusChange}
  onAssign={handleAssign}
  onArchive={handleArchive}
  onDelete={handleDelete}
  onConvertToClient={handleSingleConvert}
  teamMembers={teamNames}
/>
```

**A3. Sticky bulk-action bar** — paste this at the very end of the page JSX, right before the final closing `</div>` (or just inside the outer wrapper, after the table):
```tsx
{selectedIds.size > 0 && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
    <span className="text-sm font-semibold text-gray-900">
      {selectedIds.size} selected
    </span>
    <div className="h-6 w-px bg-gray-200" />
    <Button size="sm" variant="default" onClick={handleBulkConvert} className="bg-emerald-600 hover:bg-emerald-700 gap-2">
      <Briefcase className="h-4 w-4" /> Convert to Client
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">Assign to…</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {teamNames.map(name => (
          <DropdownMenuItem key={name} onClick={() => handleBulkAssign(name)}>{name}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline">Status…</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {ALL_STATUSES.map(s => (
          <DropdownMenuItem key={s} onClick={() => handleBulkStatus(s)}>
            <span className={`h-2 w-2 rounded-full mr-2 ${statusConfig[s].dot}`} />
            {statusConfig[s].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    <Button size="sm" variant="outline" onClick={handleBulkArchive} className="text-amber-700 gap-2">
      <Archive className="h-4 w-4" /> Archive
    </Button>
    <Button size="sm" variant="outline" onClick={handleBulkDelete} className="text-red-700 gap-2">
      <Trash2 className="h-4 w-4" /> Delete
    </Button>
    <button onClick={clearSelection} className="ml-2 text-gray-400 hover:text-gray-700" aria-label="Clear">
      <X className="h-4 w-4" />
    </button>
  </div>
)}

<ConvertToClientModal
  open={convertModal.open}
  onClose={() => setConvertModal({ open: false, ids: [] })}
  count={convertModal.ids.length}
  onConfirm={onConvertConfirm}
/>
```

### B. Create the `/crm/clients` page

**Create file**: `src/app/crm/clients/page.tsx`

```tsx
"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useCRM, formatTimeAgo } from "@/context/CRMContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConvertToClientModal } from "@/components/crm/ConvertToClientModal";
import { Briefcase, Search, MoreHorizontal, Pencil, RotateCcw, Phone, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function ClientsPage() {
  const { leads, revertToLead, updateClientInfo, isLoadingData } = useCRM();
  const clients = useMemo(() => leads.filter(l => l.isClient && !l.isArchived), [leads]);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ open: boolean; leadId: string; services: string; notes: string }>({
    open: false, leadId: "", services: "", notes: "",
  });

  const filtered = useMemo(() => {
    if (!search) return clients;
    const q = search.toLowerCase();
    return clients.filter(c =>
      c.businessName.toLowerCase().includes(q) ||
      c.niche?.toLowerCase().includes(q) ||
      c.clientServices?.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return clients.filter(c => {
      if (!c.becameClientAt) return false;
      const d = new Date(c.becameClientAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [clients]);

  const handleRevert = async (id: string) => {
    if (!confirm("Move this client back to leads?")) return;
    await revertToLead([id]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-600" /> Our Clients
          </h1>
          <p className="text-sm text-gray-500 mt-1">{clients.length} active · {thisMonth} added this month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{clients.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">This Month</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{thisMonth}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs font-bold uppercase text-gray-400 tracking-wider">Niches</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{new Set(clients.map(c => c.niche).filter(Boolean)).size}</p>
        </CardContent></Card>
      </div>

      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search clients, services, niches..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-gray-50 hover:bg-white focus:bg-white"
          />
        </div>
      </div>

      {isLoadingData ? (
        <p className="text-sm text-gray-500 text-center py-12">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-12 text-center">
          <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-900">No clients yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Convert leads to clients from the Leads page to track them here.
          </p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const services = (c.clientServices || "").split(",").map(s => s.trim()).filter(Boolean);
            return (
              <Card key={c.id} className="group hover:shadow-md transition-all border border-gray-100">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700 font-bold">
                      {c.businessName[0]?.toUpperCase()}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="h-8 w-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditing({ open: true, leadId: c.id, services: c.clientServices || "", notes: c.clientNotes || "" })}>
                          <Pencil className="h-4 w-4 mr-2" /> Edit services
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRevert(c.id)} className="text-amber-600">
                          <RotateCcw className="h-4 w-4 mr-2" /> Move back to Leads
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Link href={`/crm/leads/${c.id}`} className="block">
                    <h3 className="font-bold text-gray-900 text-base group-hover:text-emerald-700 transition-colors">{c.businessName}</h3>
                    {c.niche && <p className="text-xs text-gray-500 mt-0.5">{c.niche}</p>}
                  </Link>

                  {services.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {services.map(s => (
                        <Badge key={s} variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50/50 text-emerald-700 border-emerald-100">{s}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-gray-100 space-y-1.5">
                    {c.phone && <div className="flex items-center gap-2 text-xs text-gray-500"><Phone className="h-3 w-3" /> {c.phone}</div>}
                    {c.email && <div className="flex items-center gap-2 text-xs text-gray-500"><Mail className="h-3 w-3" /> {c.email}</div>}
                    {c.becameClientAt && <div className="flex items-center gap-2 text-xs text-gray-500"><Calendar className="h-3 w-3" /> Client since {formatTimeAgo(c.becameClientAt)}</div>}
                    {c.assignedToName && <div className="text-xs text-gray-500">Account: <span className="font-semibold text-gray-700">{c.assignedToName}</span></div>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <ConvertToClientModal
        open={editing.open}
        onClose={() => setEditing({ open: false, leadId: "", services: "", notes: "" })}
        count={1}
        mode="edit"
        initialServices={editing.services}
        initialNotes={editing.notes}
        onConfirm={async (services, notes) => {
          await updateClientInfo(editing.leadId, services, notes);
        }}
      />
    </div>
  );
}
```

### C. Add "Our Clients" to sidebar nav

**File**: `src/components/layout/Sidebar.tsx`

In the `navItems` array (around line 22), add Briefcase to the lucide imports and a new entry:

```tsx
import { ..., Briefcase } from "lucide-react";

const navItems = [
  { name: "View Website", path: "https://webkid-ai.netlify.app/", icon: ExternalLink, external: true },
  { name: "Dashboard", path: "/crm", icon: LayoutDashboard },
  { name: "Leads", path: "/crm/leads", icon: Users },
  { name: "Our Clients", path: "/crm/clients", icon: Briefcase },   // ← NEW
  { name: "Manual Leads", path: "/crm/manual-leads", icon: UserPlus },
  { name: "Website Leads", path: "/crm/website-leads", icon: Globe },
  { name: "Follow-ups", path: "/crm/follow-ups", icon: Calendar },
  { name: "Settings", path: "/crm/settings", icon: Settings, adminOnly: true },
];
```

### D. (Optional) Active Clients stat on Dashboard

**File**: `src/app/crm/page.tsx`

Find the `stats` useMemo and add a 5th item, OR add a new card. Easiest: replace the existing `closedWon` stat or extend the array:

```tsx
const stats = useMemo(() => {
  // existing total / contacted / followUps / closedWon
  const totalClients = leads.filter(l => l.isClient && !l.isArchived).length;
  return [
    // ...existing 4
    { title: "Active Clients", value: totalClients, icon: Briefcase, color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" },
  ];
}, [leads, activeLeads]);
```
Plus `import { Briefcase } from "lucide-react";` at the top.

### E. (Optional but recommended) Show Convert + Revert in mobile card
The mobile `MobileLeadCard` in `LeadRow.tsx` doesn't have the "Convert to Client" item. To match desktop, add the same dropdown item near the Archive item, gated on `onConvertToClient`. Same edit pattern as the desktop section already done.

---

## 🧪 Testing checklist (after the above is done)

1. Run SQL migration `005_clients.sql` in Supabase.
2. `npx tsc --noEmit` — should be clean.
3. Local dev: `npm run dev` → open `/crm/leads` → check a few rows → bulk bar appears at bottom.
4. Click "Convert to Client" → dialog opens → enter "Website + SEO" → Convert.
5. Visit `/crm/clients` → cards should show those leads.
6. Email check: notification arrives at all team members' inboxes (subject: "🎉 New client: …").
7. From a client card → "Move back to Leads" → reverts cleanly.
8. From a client card → "Edit services" → opens dialog in edit mode.
9. Verify the converted leads no longer appear on `/crm/leads`.

---

## 🚀 Commit + push

Once A–C are complete and typecheck passes:

```bash
git add -A
git commit -m "feat: 'Our Clients' page + bulk lead actions + convert-to-client flow

- New is_client flag on leads (migration 005)
- ConvertToClientModal (single + bulk, plus edit mode)
- Bulk select UI on leads table with sticky action bar
- Bulk: convert / assign / change status / archive / delete
- /crm/clients page: card grid, search, edit, revert
- Email notification: client_converted (emerald, 🎉)
- Sidebar: Our Clients entry
- Webhook: detects is_client false→true and notifies all team"
git push
```

---

## ❓ If anything breaks

- **Type errors after pulling** → make sure both `Lead` interface AND `mapLeadRow()` were updated.
- **Bulk bar doesn't appear** → check `selectedIds` is a `Set<string>` and the JSX checks `selectedIds.size > 0`.
- **"Convert to Client" item missing in row menu** → check that `onConvertToClient` is being passed to `<LeadRow>` from the leads page.
- **Clients page is empty after conversion** → confirm migration 005 ran. SQL: `SELECT count(*) FROM leads WHERE is_client = true;`
- **Email not sent** → check `notification_log` for `kind='client_converted'`. Webhook on `leads` UPDATE must be configured in Supabase (you should already have it from the earlier setup).

---

*Generated 2026-05-07 — context handoff.*
