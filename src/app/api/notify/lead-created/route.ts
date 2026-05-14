import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth, rateLimit, rateLimitKey, apiError, withErrorHandling } from "@/lib/api-utils";
import { notifyLeadCreated } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  id: z.string().uuid("Lead ID must be a valid UUID"),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  // Rate limit: 30 notifications per minute per IP
  if (!rateLimit(rateLimitKey(req, "notify-lead"), 30, 60_000)) {
    return apiError("Too many requests", 429);
  }

  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  const raw = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? "Invalid request body", 422);
  }

  const result = await notifyLeadCreated(parsed.data.id);
  return NextResponse.json({ ok: true, ...result });
});
