/* GET /api/company-logo?d=infosys.com → the company's icon (PNG), cached for a month.
   Asks Google's public favicon service for the domain, so we never fetch arbitrary
   addresses ourselves. Returns 404 when there is no real icon; the page then keeps
   the letter tile. */

import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const d = (new URL(req.url).searchParams.get("d") ?? "").toLowerCase().trim();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+){1,4}$/.test(d) || d.length > 80) return new NextResponse(null, { status: 400 });
  try {
    const res = await fetch(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d)}&sz=128`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
    const buf = await res.arrayBuffer();
    // Google's stand-in globe for unknown sites is tiny; real icons at sz=128 are bigger
    if (buf.byteLength < 400 || buf.byteLength > 300_000) return new NextResponse(null, { status: 404, headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } });
    return new NextResponse(buf, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=604800, s-maxage=2592000, immutable" } });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
