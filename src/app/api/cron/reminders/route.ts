import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyReminderDue } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  if (req.headers.get("x-cron-secret") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Supabase env missing" }, { status: 503 });
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Time windows in UTC. Day buckets are UTC; "soon" = next ~2.5h ahead.
  // Endpoint can be hit hourly — dedup via notification_log keeps emails one-per-kind.
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setUTCDate(startOfTomorrow.getUTCDate() + 1);
  const startOfDayAfter = new Date(startOfToday);
  startOfDayAfter.setUTCDate(startOfDayAfter.getUTCDate() + 2);

  // "Soon" window: anything coming due in the next ~2.5 hours that's still in the future.
  // Hourly cron + dedup → each activity gets exactly one "soon" email roughly 2h before.
  const soonWindowEnd = new Date(now.getTime() + 1000 * 60 * 60 * 2.5);

  const [tomorrowRes, todayRes, soonRes] = await Promise.all([
    supabase
      .from("activities")
      .select("id")
      .gte("reminder_date", startOfTomorrow.toISOString())
      .lt("reminder_date", startOfDayAfter.toISOString()),
    supabase
      .from("activities")
      .select("id")
      .gte("reminder_date", startOfToday.toISOString())
      .lt("reminder_date", startOfTomorrow.toISOString()),
    supabase
      .from("activities")
      .select("id")
      .gte("reminder_date", now.toISOString())
      .lt("reminder_date", soonWindowEnd.toISOString()),
  ]);

  const totals = {
    tomorrow: { sent: 0, skipped: 0 },
    today: { sent: 0, skipped: 0 },
    soon: { sent: 0, skipped: 0 },
  };

  for (const row of (tomorrowRes.data as Array<{ id: string }> | null) || []) {
    const r = await notifyReminderDue(row.id, "tomorrow");
    totals.tomorrow.sent += r.sent;
    totals.tomorrow.skipped += r.skipped;
  }
  for (const row of (todayRes.data as Array<{ id: string }> | null) || []) {
    const r = await notifyReminderDue(row.id, "today");
    totals.today.sent += r.sent;
    totals.today.skipped += r.skipped;
  }
  for (const row of (soonRes.data as Array<{ id: string }> | null) || []) {
    const r = await notifyReminderDue(row.id, "soon");
    totals.soon.sent += r.sent;
    totals.soon.skipped += r.skipped;
  }

  return NextResponse.json({
    ok: true,
    ranAt: new Date().toISOString(),
    counts: totals,
    candidates: {
      tomorrow: tomorrowRes.data?.length || 0,
      today: todayRes.data?.length || 0,
      soon: soonRes.data?.length || 0,
    },
  });
}
