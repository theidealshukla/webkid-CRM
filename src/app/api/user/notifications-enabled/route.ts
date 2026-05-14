import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, rateLimit, rateLimitKey, apiError, withErrorHandling } from "@/lib/api-utils";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID"),
  enabled: z.boolean(),
});

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  if (!rateLimit(rateLimitKey(req, "notif-enabled"), 10, 60_000)) {
    return apiError("Too many requests", 429);
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid request body", 422);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error } = await supabase
    .from("users")
    .update({ notifications_enabled: parsed.data.enabled })
    .eq("id", parsed.data.userId);

  if (error) return apiError("Failed to update notification setting", 500);

  return NextResponse.json({ ok: true, userId: parsed.data.userId, enabled: parsed.data.enabled });
});
