import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, rateLimit, rateLimitKey, apiError, withErrorHandling } from "@/lib/api-utils";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  notifyAll: z.boolean(),
});

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  if (!rateLimit(rateLimitKey(req, "notify-pref"), 10, 60_000)) {
    return apiError("Too many requests", 429);
  }

  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "notifyAll (boolean) is required", 422);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { error } = await supabase
    .from("users")
    .update({ notify_all: parsed.data.notifyAll })
    .eq("id", auth.caller.id);

  if (error) return apiError("Failed to update preference", 500);

  return NextResponse.json({ ok: true, notifyAll: parsed.data.notifyAll });
});
