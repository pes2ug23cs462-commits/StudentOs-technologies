/* GET /api/college-logo?site=pes.edu   → { logos: [{ src: dataURL, from }] }  (finds a logo on the site)
   GET /api/college-logo?img=https://…  → { logos: [{ src: dataURL, from }] }  (one image link)
   Signed-in users only. The server fetches the page / image so the browser can draw it
   (no CORS problems); the app then shrinks the chosen one to a small square and saves it.
   Only public http(s) addresses are fetched (no private or local networks), with size
   and time limits. */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";

const MAX_HTML = 1_500_000;
const MAX_IMG = 1_000_000;

function privateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const x = ip.toLowerCase();
    if (x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") || x.startsWith("fe80")) return true;
    const v4 = x.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return v4 ? privateIp(v4[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function safe(u: URL) {
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.port && u.port !== "80" && u.port !== "443") return false;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (isIP(host)) return !privateIp(host);
  try {
    const addrs = await lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !privateIp(a.address));
  } catch {
    return false;
  }
}

/** fetch with manual, checked redirects and a byte limit */
async function get(url: string, max: number, accept: string): Promise<{ buf: Buffer; type: string; url: string } | null> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  for (let hop = 0; hop < 4; hop++) {
    if (!(await safe(u))) return null;
    const res = await fetch(u, { redirect: "manual", headers: { "User-Agent": "Mozilla/5.0 (compatible; StudentOS logo finder)", Accept: accept }, signal: AbortSignal.timeout(8000), cache: "no-store" }).catch(() => null);
    if (!res) return null;
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) return null;
      u = new URL(loc, u);
      continue;
    }
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const parts: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > max) {
        await reader.cancel().catch(() => {});
        return null;
      }
      parts.push(value);
    }
    return { buf: Buffer.concat(parts), type: (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase(), url: u.href };
  }
  return null;
}

async function image(url: string) {
  const r = await get(url, MAX_IMG, "image/*");
  if (!r || !/^image\/(png|jpe?g|gif|webp|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(r.type) || r.buf.length < 100) return null;
  // .ico can't be drawn everywhere; skip it unless it's all we have (handled by the caller)
  return { src: `data:${r.type};base64,${r.buf.toString("base64")}`, type: r.type };
}

/** Logo candidates on a page, best first. */
function candidates(html: string, base: string) {
  const out: { url: string; from: string; score: number }[] = [];
  const add = (href: string | undefined, from: string, score: number) => {
    if (!href) return;
    try {
      out.push({ url: new URL(href.replace(/&amp;/g, "&"), base).href, from, score });
    } catch {
      /* bad link */
    }
  };
  const attr = (tag: string, name: string) => tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    const size = Number((attr(tag, "sizes") ?? "").split("x")[0]) || 0;
    if (rel.includes("apple-touch-icon")) add(attr(tag, "href"), "App icon", 90 + Math.min(size, 512) / 50);
    else if (/\bicon\b/.test(rel)) add(attr(tag, "href"), "Site icon", 50 + Math.min(size, 512) / 10);
  }
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const src = attr(tag, "src") ?? attr(tag, "data-src");
    const hint = `${src} ${attr(tag, "alt") ?? ""} ${attr(tag, "class") ?? ""} ${attr(tag, "id") ?? ""}`.toLowerCase();
    if (src && /logo|emblem|crest|brand/.test(hint) && !src.startsWith("data:")) add(src, "Logo on the page", 80);
  }
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (/property\s*=\s*["']og:image["']/i.test(tag)) add(attr(tag, "content"), "Share image", 30);
  }
  const seen = new Set<string>();
  return out.sort((a, b) => b.score - a.score).filter((c) => !seen.has(c.url) && seen.add(c.url));
}

export async function GET(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });
  const q = new URL(req.url).searchParams;

  const img = q.get("img");
  if (img) {
    const one = await image(img.trim());
    return one ? NextResponse.json({ logos: [{ src: one.src, from: "Your link" }] }) : NextResponse.json({ error: "not-image" }, { status: 400 });
  }

  const site = (q.get("site") ?? "").trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(site)) return NextResponse.json({ error: "bad-site" }, { status: 400 });

  let page = await get(`https://${site}/`, MAX_HTML, "text/html");
  if (!page && !site.startsWith("www.")) page = await get(`https://www.${site}/`, MAX_HTML, "text/html");
  const found = page ? candidates(page.buf.toString("utf8"), page.url) : [];
  // the site's favicon through Google, as a last resort
  found.push({ url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(site)}&sz=256`, from: "Search icon", score: 0 });

  const logos: { src: string; from: string }[] = [];
  for (const c of found.slice(0, 8)) {
    if (logos.length >= 4) break;
    const one = await image(c.url).catch(() => null);
    if (one && !/icon$/.test(one.type)) logos.push({ src: one.src, from: c.from });
  }
  return logos.length ? NextResponse.json({ logos }) : NextResponse.json({ error: "none" }, { status: 404 });
}
