import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAdminSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin(request: NextRequest, adminClient: SupabaseClient) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return { error: "Unauthorized", status: 401 as const };

  const { data: userRes, error: userErr } = await adminClient.auth.getUser(token);
  if (userErr || !userRes?.user) return { error: "Invalid session", status: 401 as const };

  const { data: profile, error: profErr } = await adminClient
    .from("users")
    .select("role")
    .eq("id", userRes.user.id)
    .single();
  if (profErr || !profile) return { error: "Profile not found", status: 403 as const };
  if (profile.role !== "admin") return { error: "Admin role required", status: 403 as const };

  return { userId: userRes.user.id };
}

export async function POST(request: NextRequest) {
  try {
    const adminSupabase = getAdminSupabase();
    if (!adminSupabase) {
      return NextResponse.json(
        { error: "Server is not configured with SUPABASE_SERVICE_ROLE_KEY." },
        { status: 503 }
      );
    }

    const auth = await requireAdmin(request, adminSupabase);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const role = body.role === "admin" ? "admin" : "member";

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: name || email.split("@")[0] },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    if (!authData.user) {
      return NextResponse.json({ error: "Failed to create auth user." }, { status: 500 });
    }

    const profileRow = {
      id: authData.user.id,
      email,
      name: name || email.split("@")[0],
      role,
    };

    const { error: profileError } = await adminSupabase
      .from("users")
      .insert([profileRow]);

    if (profileError) {
      if (profileError.code === "23505") {
        await adminSupabase
          .from("users")
          .update({ role, name: profileRow.name })
          .eq("id", authData.user.id);
      } else {
        return NextResponse.json(
          {
            error: `Auth user created but profile failed: ${profileError.message}`,
            userId: authData.user.id,
          },
          { status: 207 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: `User "${profileRow.name}" created as ${role}.`,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal server error";
    console.error("Create user API error:", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
