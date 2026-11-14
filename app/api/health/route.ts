/* GET /api/health — checks that every key in .env.local works (signed-in users only).
   Each check makes the smallest possible call. Keys are never returned. */

import { NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/server/auth";
import { adminConfigured, adminPing, adminPushCheck } from "@/lib/server/firestore-admin";

/** AI calls can take a while; 60 s is the most Vercel's free plan allows. */
export const maxDuration = 60;

type Check = { id: string; label: string; ok: boolean; optional?: boolean; detail: string };

const timeout = () => AbortSignal.timeout(15_000);

async function chatPing(url: string, key: string, model: string) {
  const t = Date.now();
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply with: ok" }], max_tokens: 20 }),
    signal: timeout(),
    cache: "no-store",
  });
  if (res.ok) return `Working · ${model} · ${Date.now() - t} ms`;
  if (res.status === 401) throw new Error("Key is wrong (401). Copy it again.");
  if (res.status === 429) return `Key works, but the free limit is used up right now (429)`;
  if (res.status === 404 || res.status === 400) throw new Error(`Model “${model}” not available (${res.status}). Set a different model in .env.local.`);
  throw new Error(`Error ${res.status}`);
}

async function run(id: string, label: string, fn: () => Promise<string>, optional = false): Promise<Check> {
  try {
    return { id, label, ok: true, optional, detail: await fn() };
  } catch (e) {
    return { id, label, ok: false, optional, detail: e instanceof Error ? e.message : "Failed" };
  }
}

const missing = (name: string) => {
  throw new Error(`${name} is not set in .env.local (restart npm run dev after adding it)`);
};

export async function GET(req: Request) {
  const uid = await verifyIdToken(req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });

  const groq = process.env.GROQ_API_KEY;
  const cerebras = process.env.CEREBRAS_API_KEY;
  const yt = process.env.YOUTUBE_API_KEY;
  const stt = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";

  const checks = await Promise.all([
    run("firebase", "Firebase login", async () => "Working · you are signed in"),
    run("groq", "AI assistant (Groq)", async () =>
      groq ? chatPing("https://api.groq.com/openai/v1/chat/completions", groq, process.env.GROQ_MODEL || "openai/gpt-oss-120b") : missing("GROQ_API_KEY"),
    ),
    run(
      "cerebras",
      "AI backup (Cerebras)",
      async () => (cerebras ? chatPing("https://api.cerebras.ai/v1/chat/completions", cerebras, process.env.CEREBRAS_MODEL || "gpt-oss-120b") : missing("CEREBRAS_API_KEY")),
      true,
    ),
    run("voice", "Voice input (Whisper)", async () => {
      if (!groq) return missing("GROQ_API_KEY");
      const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${groq}` }, signal: timeout(), cache: "no-store" });
      if (res.status === 401) throw new Error("Groq key is wrong (401)");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const j = (await res.json()) as { data?: { id: string }[] };
      if (!j.data?.some((m) => m.id === stt)) throw new Error(`Model “${stt}” not found on Groq. Set GROQ_STT_MODEL.`);
      return `Ready · ${stt}`;
    }),
    run("reviews", "Auto-approve reviews (Firebase service account)", async () => `Working · project ${await adminPing()}`, true),
    run("youtube", "YouTube videos", async () => {
      if (!yt) return missing("YOUTUBE_API_KEY");
      // videos.list costs 1 unit of the 10,000 free daily units.
      const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=rfscVS0vtbw&key=${encodeURIComponent(yt)}`, { signal: timeout(), cache: "no-store" });
      const j = (await res.json().catch(() => ({}))) as { items?: unknown[]; error?: { message?: string; errors?: { reason?: string }[] } };
      if (res.ok && j.items?.length) return "Working · YouTube Data API v3";
      const reason = j.error?.errors?.[0]?.reason ?? "";
      if (reason === "quotaExceeded") throw new Error("Key works, but today’s free quota is used up. Resets at midnight Pacific time.");
      if (reason.includes("accessNotConfigured") || /not been used|disabled/i.test(j.error?.message ?? "")) throw new Error("Turn on “YouTube Data API v3” for this key in Google Cloud.");
      throw new Error(j.error?.message ?? `Error ${res.status}`);
    }),
    run("email", "Placement emails (Resend)", async () => {
      const key = process.env.RESEND_API_KEY;
      if (!key) return missing("RESEND_API_KEY");
      const from = process.env.EMAIL_FROM ?? "";
      const domain = from.match(/@([^>\s]+)/)?.[1]?.toLowerCase() ?? "";
      const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` }, signal: timeout(), cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        const j = (await res.json().catch(() => ({}))) as { message?: string; name?: string };
        if (/restricted/i.test(`${j.name} ${j.message}`)) return domain ? `Key works (sending only) · sender ${from}` : "Key works, but without EMAIL_FROM emails only reach the Resend account owner. Verify a domain in Resend and set EMAIL_FROM.";
        throw new Error("Key is wrong. Copy it again from resend.com → API Keys.");
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const j = (await res.json()) as { data?: { name: string; status: string }[] };
      if (!domain) throw new Error("Key works, but EMAIL_FROM is not set: Resend only delivers to your own email until a domain is verified and EMAIL_FROM uses it.");
      const d = j.data?.find((x) => x.name.toLowerCase() === domain);
      if (!d) throw new Error(`Key works, but ${domain} is not added in Resend → Domains.`);
      if (d.status !== "verified") throw new Error(`${domain} is “${d.status}” in Resend. Add the DNS records it shows, then wait for “verified”.`);
      return `Working · sending from ${from}`;
    }, true),
    run("push", "Phone / laptop notifications", async () => {
      if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) return missing("NEXT_PUBLIC_FIREBASE_VAPID_KEY (then redeploy)");
      if (!adminConfigured()) throw new Error("Needs the Firebase service account (FIREBASE_SERVICE_ACCOUNT).");
      return adminPushCheck();
    }, true),
  ]);

  return NextResponse.json({ checks, at: new Date().toISOString() });
}
