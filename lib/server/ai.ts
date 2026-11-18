/* Server-only AI client. Tries providers in order and falls back when one is
   rate-limited or down. All of them speak the OpenAI chat-completions format.
   Keys live in Vercel env vars (or .env.local) and never reach the browser.

   Strong providers (same model, gpt-oss-120b, so answers and scores stay consistent):
     GROQ_API_KEY                                  console.groq.com
     CEREBRAS_API_KEY                              cloud.cerebras.ai
     CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_AI_TOKEN   dash.cloudflare.com → Workers AI
     CUSTOM_AI_URL + CUSTOM_AI_KEY + CUSTOM_AI_MODEL  any other OpenAI-compatible
                                                   provider (set CUSTOM_AI_STRONG=1
                                                   only if it runs a gpt-oss-120b-class model)
   Chat-only backups (a different model; never used for scoring):
     ZAI_API_KEY                                   z.ai (GLM flash, free)
     groq-fast                                     openai/gpt-oss-20b on the Groq key

   AI_ORDER (optional) picks and orders providers by name, e.g.
     AI_ORDER=groq,cerebras,cloudflare,zai,groq-fast
   Leave a name out to switch that provider off without touching code.
   Model ids change often; override with GROQ_MODEL / GROQ_FAST_MODEL / CEREBRAS_MODEL /
   CLOUDFLARE_MODEL / ZAI_MODEL.

   When a provider says "limit reached" (429) or keeps failing, it is skipped for a
   while (cool-down) so the next requests go straight to the next provider. */

export type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ContentPart[] };

export interface Provider {
  name: string;
  url: string;
  key: string;
  model: string;
  /** Runs a gpt-oss-120b-class model: allowed for scoring and reports. */
  strong: boolean;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Every configured text provider in the default order. */
export function allProviders(): Provider[] {
  const e = process.env;
  const list: Provider[] = [];
  if (e.GROQ_API_KEY) list.push({ name: "groq", url: GROQ_URL, key: e.GROQ_API_KEY, model: e.GROQ_MODEL || "openai/gpt-oss-120b", strong: true });
  if (e.CEREBRAS_API_KEY) list.push({ name: "cerebras", url: "https://api.cerebras.ai/v1/chat/completions", key: e.CEREBRAS_API_KEY, model: e.CEREBRAS_MODEL || "gpt-oss-120b", strong: true });
  if (e.CLOUDFLARE_ACCOUNT_ID && e.CLOUDFLARE_AI_TOKEN)
    list.push({
      name: "cloudflare",
      url: `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(e.CLOUDFLARE_ACCOUNT_ID)}/ai/v1/chat/completions`,
      key: e.CLOUDFLARE_AI_TOKEN,
      model: e.CLOUDFLARE_MODEL || "@cf/openai/gpt-oss-120b",
      strong: true,
    });
  if (e.CUSTOM_AI_URL && e.CUSTOM_AI_KEY && e.CUSTOM_AI_MODEL)
    list.push({ name: "custom", url: e.CUSTOM_AI_URL, key: e.CUSTOM_AI_KEY, model: e.CUSTOM_AI_MODEL, strong: e.CUSTOM_AI_STRONG === "1" });
  if (e.ZAI_API_KEY) list.push({ name: "zai", url: "https://api.z.ai/api/paas/v4/chat/completions", key: e.ZAI_API_KEY, model: e.ZAI_MODEL || "glm-4.7-flash", strong: false });
  if (e.GROQ_API_KEY) list.push({ name: "groq-fast", url: GROQ_URL, key: e.GROQ_API_KEY, model: e.GROQ_FAST_MODEL || "openai/gpt-oss-20b", strong: false });

  const order = (e.AI_ORDER ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (!order.length) return list;
  return order.map((n) => list.find((p) => p.name === n)).filter((p): p is Provider => !!p);
}

function visionProviders(): Provider[] {
  // Image questions need a model that can see. Groq’s vision models (preview, free tier).
  const key = process.env.GROQ_API_KEY;
  if (!key) return [];
  return [
    { name: "groq-vision", url: GROQ_URL, key, model: process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b", strong: false },
    { name: "groq-vision-2", url: GROQ_URL, key, model: process.env.GROQ_VISION_MODEL_2 || "qwen/qwen3.6-27b", strong: false },
  ];
}

export const aiConfigured = () => allProviders().length > 0;

/* ---------- cool-down ----------
   Kept in memory per server instance. Good enough: each instance learns within one
   request that a provider is out and stops wasting time on it. */
const coolUntil = new Map<string, number>();
const coolKey = (p: Provider) => `${p.name}|${p.model}`;
const cooling = (p: Provider, now = Date.now()) => (coolUntil.get(coolKey(p)) ?? 0) > now;
function coolDown(p: Provider, ms: number) {
  coolUntil.set(coolKey(p), Date.now() + Math.min(ms, 15 * 60_000));
}
/** Retry-After in seconds, or a reset like "7.66s" / "2m59.56s" that Groq sends. */
function waitMs(res: Response): number {
  const ra = Number(res.headers.get("retry-after"));
  if (ra > 0) return ra * 1000;
  const reset = res.headers.get("x-ratelimit-reset-requests") || res.headers.get("x-ratelimit-reset-tokens") || "";
  const m = reset.match(/(?:(\d+)m)?([\d.]+)s/);
  if (m) return (Number(m[1] ?? 0) * 60 + Number(m[2])) * 1000;
  return 60_000;
}

export class AiError extends Error {
  constructor(public code: "no-key" | "busy" | "failed") {
    super(code);
  }
}

/* gpt-oss and GLM "think" before they answer, and that thinking counts against
   max_tokens. With a short limit (a 200-token reply) the thinking used it all up and
   the answer came back empty, so Asha went quiet. So: think briefly, and leave room. */
const THINKS = /gpt-oss|glm/i;
function requestBody(p: Provider, messages: ChatMessage[], maxTokens: number, temperature: number) {
  const body: Record<string, unknown> = { model: p.model, messages, temperature, max_tokens: maxTokens };
  if (THINKS.test(p.model)) {
    body.max_tokens = maxTokens + 700;
    // Groq and Cerebras take reasoning_effort for gpt-oss; Cloudflare gets the extra room only.
    if (/gpt-oss/i.test(p.model) && (p.name.startsWith("groq") || p.name === "cerebras")) body.reasoning_effort = "low";
    if (p.name === "zai") body.thinking = { type: "disabled" };
  }
  return body;
}

/** Sends the chat to the first provider that answers.
    strong: only gpt-oss-120b-class providers (use for scores and reports, so every
    student is judged by the same model). */
export async function chat(
  messages: ChatMessage[],
  opts: { maxTokens?: number; temperature?: number; vision?: boolean; strong?: boolean } = {},
): Promise<{ text: string; provider: string }> {
  let list = opts.vision ? visionProviders() : allProviders();
  if (opts.strong) list = list.filter((p) => p.strong);
  if (!list.length) throw new AiError("no-key");

  // Providers in cool-down go last: still tried if everything else fails.
  const now = Date.now();
  const ordered = [...list.filter((p) => !cooling(p, now)), ...list.filter((p) => cooling(p, now))];

  let busy = false;
  for (const p of ordered) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
        body: JSON.stringify(requestBody(p, messages, opts.maxTokens ?? 900, opts.temperature ?? 0.5)),
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });
      if (res.status === 429) {
        busy = true;
        coolDown(p, waitMs(res));
        console.warn(`[ai] ${p.name} limit reached, skipping it for a while`);
        continue;
      }
      if (!res.ok) {
        console.error(`[ai] ${p.name} ${p.model} -> ${res.status}`, (await res.text()).slice(0, 300));
        // Wrong key or model: skip for 10 min. Server trouble: 30 s.
        coolDown(p, [400, 401, 403, 404].includes(res.status) ? 10 * 60_000 : 30_000);
        continue;
      }
      const j = (await res.json()) as { choices?: { message?: { content?: string | null }; finish_reason?: string }[] };
      const text = (j.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (text) return { text, provider: p.name };
      console.warn(`[ai] ${p.name} ${p.model} gave an empty answer (${j.choices?.[0]?.finish_reason ?? "?"})`);
    } catch (e) {
      coolDown(p, 30_000);
      console.error(`[ai] ${p.name} error`, e instanceof Error ? e.message : e);
    }
  }
  throw new AiError(busy ? "busy" : "failed");
}
