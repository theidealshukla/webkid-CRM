// Proxy from admin → public site to revalidate ISR by tag.
// CRM never holds the public site's secret in client JS; this server route does.

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_BASE = process.env.PUBLIC_SITE_URL ?? "https://webkid.me";
const SECRET = process.env.REVALIDATE_SECRET;

export async function POST(req: NextRequest) {
  if (!SECRET) {
    // Misconfigured — make it visible during dev but don't crash.
    return NextResponse.json({ skipped: true, reason: "REVALIDATE_SECRET unset" }, { status: 200 });
  }
  const { tag } = await req.json().catch(() => ({}));
  if (!tag) return NextResponse.json({ error: "tag required" }, { status: 400 });

  try {
    const r = await fetch(`${PUBLIC_BASE}/api/revalidate?tag=${encodeURIComponent(tag)}`, {
      method: "POST",
      headers: { "x-revalidate-secret": SECRET },
      cache: "no-store",
    });
    const j = await r.json().catch(() => ({}));
    return NextResponse.json({ ok: r.ok, response: j }, { status: r.ok ? 200 : 502 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "fetch failed" }, { status: 502 });
  }
}
