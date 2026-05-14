import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Server not configured" }, { status: 503 });

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: userRes, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userRes?.user) return NextResponse.json({ error: "Invalid session" }, { status: 401 });

  // Only admins can set this preference
  const { data: userRow } = await supabase
    .from("users")
    .select("role")
    .eq("id", userRes.user.id)
    .single();
  if (userRow?.role !== "admin") return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const { notifyAll } = body as { notifyAll?: boolean };
  if (typeof notifyAll !== "boolean") return NextResponse.json({ error: "notifyAll (boolean) required" }, { status: 400 });

  const { error } = await supabase
    .from("users")
    .update({ notify_all: notifyAll })
    .eq("id", userRes.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, notifyAll });
}
