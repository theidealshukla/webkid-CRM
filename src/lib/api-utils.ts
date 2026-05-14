/**
 * api-utils.ts
 *
 * Centralised helpers for all Next.js API routes:
 *   - requireAuth()       — validate Bearer token & return caller profile
 *   - requireAdmin()      — same, but also asserts admin role
 *   - rateLimit()         — simple in-memory IP-based rate limiter
 *   - apiError()          — uniform error response (never leaks raw DB errors)
 *   - withErrorHandling() — wraps a handler so uncaught errors always return 500
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// ── Supabase admin client (singleton) ────────────────────────────────────────

let _adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (_adminClient) return _adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase service env vars missing.");
  _adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _adminClient;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CallerProfile {
  id: string;
  email: string;
  role: "admin" | "member";
  name: string;
}

type AuthResult =
  | { ok: true; caller: CallerProfile }
  | { ok: false; response: NextResponse };

// ── Auth helpers ──────────────────────────────────────────────────────────────

/**
 * Validate the Bearer token and return the caller's DB profile.
 * Returns a ready-to-send NextResponse on failure.
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return { ok: false, response: apiError("Unauthorized", 401) };
  }

  const supabase = getAdminClient();
  const { data: userRes, error: authErr } = await supabase.auth.getUser(token);

  if (authErr || !userRes?.user) {
    return { ok: false, response: apiError("Invalid or expired session", 401) };
  }

  const { data: profile, error: profErr } = await supabase
    .from("users")
    .select("id, email, name, role")
    .eq("id", userRes.user.id)
    .single();

  if (profErr || !profile) {
    return { ok: false, response: apiError("User profile not found", 403) };
  }

  return { ok: true, caller: profile as CallerProfile };
}

/**
 * Same as requireAuth but also enforces admin role.
 */
export async function requireAdmin(req: NextRequest): Promise<AuthResult> {
  const result = await requireAuth(req);
  if (!result.ok) return result;
  if (result.caller.role !== "admin") {
    return { ok: false, response: apiError("Admin role required", 403) };
  }
  return result;
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const _store = new Map<string, RateLimitEntry>();

/**
 * Simple in-process sliding-window rate limiter.
 *
 * @param key      Unique key (e.g. IP + route)
 * @param limit    Max requests per window (default 20)
 * @param windowMs Window duration in ms (default 60 000 = 1 min)
 * @returns true if the request is within limits, false if it should be rejected
 */
export function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = _store.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    _store.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count += 1;
  if (entry.count > limit) return false;
  return true;
}

/**
 * Derive a rate-limit key from the request: prefer CF-Connecting-IP /
 * X-Forwarded-For headers, fall back to a static sentinel.
 */
export function rateLimitKey(req: NextRequest, suffix = ""): string {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  return `${ip}${suffix ? `:${suffix}` : ""}`;
}

// ── Error helper ──────────────────────────────────────────────────────────────

/**
 * Return a sanitised JSON error response — never exposes raw DB messages.
 */
export function apiError(
  message: string,
  status: 400 | 401 | 403 | 404 | 422 | 429 | 500 | 503
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

// ── Handler wrapper ───────────────────────────────────────────────────────────

type RouteHandler = (req: NextRequest) => Promise<NextResponse>;

/**
 * Wraps an API handler so that any uncaught error becomes a generic 500.
 * Prevents raw stack traces / DB errors from reaching the client.
 */
export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (req) => {
    try {
      return await handler(req);
    } catch (err) {
      console.error("[API Error]", req.url, err);
      return apiError("Internal server error", 500);
    }
  };
}
