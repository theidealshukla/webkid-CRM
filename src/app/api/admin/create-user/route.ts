import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Server-side Supabase client with service_role key
// This bypasses RLS and can create users without affecting the caller's session
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const adminSupabase = getAdminSupabase();

    if (!adminSupabase) {
      // Fallback: Use anon client signUp (has session-override issue)
      // This path is used when SUPABASE_SERVICE_ROLE_KEY is not configured
      return NextResponse.json(
        {
          error:
            "Server is not configured with SUPABASE_SERVICE_ROLE_KEY. Please add it to .env.local for secure user creation.",
          fallback: true,
        },
        { status: 503 }
      );
    }

    // 1. Create auth user via admin API (does NOT affect any existing session)
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm so they can login immediately
        user_metadata: { name: name || email.split("@")[0] },
      });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create auth user." },
        { status: 500 }
      );
    }

    // 2. Insert profile into public.users table
    const { error: profileError } = await adminSupabase.from("users").insert([
      {
        id: authData.user.id,
        email,
        name: name || email.split("@")[0],
        role: role || "member",
      },
    ]);

    if (profileError) {
      // If duplicate key, update instead
      if (profileError.code === "23505") {
        await adminSupabase
          .from("users")
          .update({ role: role || "member", name: name || email.split("@")[0] })
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
      message: `User "${name || email}" created successfully as ${role || "member"}.`,
    });
  } catch (e: any) {
    console.error("Create user API error:", e);
    return NextResponse.json(
      { error: e.message || "Internal server error" },
      { status: 500 }
    );
  }
}
