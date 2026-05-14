import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, rateLimit, rateLimitKey, apiError, withErrorHandling } from "@/lib/api-utils";
import { createClient } from "@supabase/supabase-js";
import { notifyUserCreated } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
  role: z.enum(["admin", "member"]).default("member"),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Strict rate limit for account creation: 5 per 10 minutes per IP
  if (!rateLimit(rateLimitKey(req, "create-user"), 5, 10 * 60_000)) {
    return apiError("Too many requests", 429);
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((e) => e.message).join("; ");
    return apiError(msg, 422);
  }

  const { email, password, name, role } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (authError) return apiError(authError.message, 400);
  if (!authData.user) return apiError("Failed to create auth user", 500);

  const profileRow = { id: authData.user.id, email: normalizedEmail, name, role };

  const { error: profileError } = await supabase.from("users").insert([profileRow]);
  if (profileError) {
    if (profileError.code === "23505") {
      // Profile already exists (e.g. from auth trigger) — update it
      await supabase.from("users").update({ role, name }).eq("id", authData.user.id);
    } else {
      // Auth user created but profile failed — return partial success
      return NextResponse.json(
        { error: "User created in auth but profile setup failed. Contact support.", userId: authData.user.id },
        { status: 207 }
      );
    }
  }

  // Fire welcome email — non-blocking, failure does not abort user creation
  let welcomeStatus: { sent: number; skipped: number; error?: string } | null = null;
  try {
    const result = await notifyUserCreated({
      userId: authData.user.id,
      name,
      email: normalizedEmail,
      tempPassword: password,
      role,
      invitedById: auth.caller.id,
    });
    welcomeStatus = {
      sent: result.sent,
      skipped: result.skipped,
      error: "error" in result ? (result as { error?: string }).error : undefined,
    };
  } catch (mailErr) {
    console.error("[create-user] Welcome email failed:", mailErr);
    welcomeStatus = { sent: 0, skipped: 1 };
  }

  return NextResponse.json({
    success: true,
    userId: authData.user.id,
    message: `User "${name}" created as ${role}.`,
    welcome: welcomeStatus,
  });
});
