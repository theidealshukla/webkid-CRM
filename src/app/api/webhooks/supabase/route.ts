import { NextRequest, NextResponse } from "next/server";
import {
  notifyLeadCreated,
  notifyBatchUploaded,
  notifyStatusChanged,
  notifyLeadAssigned,
  notifyReminderSet,
  notifyClientConverted,
} from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, any> | null;
  old_record: Record<string, any> | null;
}

export async function POST(req: NextRequest) {
  // Auth: shared secret in header (configure in Supabase webhook headers)
  const secret = req.headers.get("x-webhook-secret");
  const expected = process.env.NOTIFY_WEBHOOK_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "Server not configured" }, { status: 503 });
  }
  if (secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { table, type, record, old_record } = payload;
  const results: unknown[] = [];

  try {
    if (table === "leads" && type === "INSERT" && record) {
      results.push(await notifyLeadCreated(record.id));
    } else if (table === "leads" && type === "UPDATE" && record && old_record) {
      if (record.status && record.status !== old_record.status) {
        results.push(
          await notifyStatusChanged(record.id, old_record.status, record.status, record.uploaded_by ?? null)
        );
      }
      if (record.assigned_to && record.assigned_to !== old_record.assigned_to) {
        results.push(
          await notifyLeadAssigned(record.id, record.assigned_to, record.uploaded_by ?? null)
        );
      }
      if (record.is_client === true && old_record.is_client !== true) {
        results.push(
          await notifyClientConverted(record.id, record.uploaded_by ?? null)
        );
      }
    } else if (table === "upload_batches" && type === "INSERT" && record) {
      results.push(await notifyBatchUploaded(record.id));
    } else if (table === "activities" && type === "INSERT" && record && record.reminder_date) {
      results.push(await notifyReminderSet(record.id));
    }
  } catch (e: unknown) {
    // Always return 200 so Supabase doesn't infinite-retry; log failure.
    const message = e instanceof Error ? e.message : String(e);
    console.error("Webhook handler error:", message);
    return NextResponse.json({ ok: true, error: message }, { status: 200 });
  }

  return NextResponse.json({ ok: true, results });
}
