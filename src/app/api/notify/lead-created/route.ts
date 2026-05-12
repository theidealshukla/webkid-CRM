import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { notifyLeadCreated } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Server not configured" }, { status: 503 });

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userRes, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userRes?.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { id } = body as { id?: string };
  if (!id) return NextResponse.json({ error: "Lead ID required" }, { status: 400 });

  const result = await notifyLeadCreated(id);
  return NextResponse.json({ ok: true, ...result });
}
