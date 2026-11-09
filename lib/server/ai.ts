/* Server-only AI client. Tries free providers in order and falls back when one
   is rate-limited or down. All of them speak the OpenAI chat-completions format.
   Keys live in .env.local and never reach the browser:
     GROQ_API_KEY      (console.groq.com)           main
     CEREBRAS_API_KEY  (cloud.cerebras.ai)          backup, optional
   Model ids change often; override with GROQ_MODEL / GROQ_FAST_MODEL / CEREBRAS_MODEL. */


export type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ContentPart[] };

interface Provider {
  name: string;
  url: string;
  key: string;
  model: string;
}

function providers(vision = false): Provider[] {
  const list: Provider[] = [];
  if (vision) {
    // Image questions need a model that can see. Groq’s vision models (preview, free tier).
    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      list.push({ name: "groq-vision", url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: process.env.GROQ_VISION_MODEL || "qwen/qwen3.8-27b" });
      list.push({ name: "groq-vision-2", url: "https://api.groq.com/openai/v1/chat/completions", key: groqKey, model: process.env.GROQ_VISION_MODEL_2 || "qwen/qwen3.6-27b" });
    }
    return list;
  }
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    list.push({ name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: groq, model: process.env.GROQ_MODEL || "openai/gpt-oss-120b" });
    list.push({ name: "groq-fast", url: "https://api.groq.com/openai/v1/chat/completions", key: groq, model: process.env.GROQ_FAST_MODEL || "llama-3.1-8b-instant" });
  }
  const cerebras = process.env.CEREBRAS_API_KEY;
  if (cerebras) list.push({ name: "cerebras", url: "https://api.cerebras.ai/v1/chat/completions", key: cerebras, model: process.env.CEREBRAS_MODEL || "gpt-oss-120b" });
  return list;
}

export const aiConfigured = () => providers().length > 0;

export class AiError extends Error {
  constructor(public code: "no-key" | "busy" | "failed") {
    super(code);
  }
}

/** Sends the chat to the first provider that answers. */
export async function chat(messages: ChatMessage[], opts: { maxTokens?: number; temperature?: number; vision?: boolean } = {}): Promise<{ text: string; provider: string }> {
  const list = providers(opts.vision);
  if (!list.length) throw new AiError("no-key");
  let busy = false;
  for (const p of list) {
    try {
      const res = await fetch(p.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
        body: JSON.stringify({ model: p.model, messages, max_tokens: opts.maxTokens ?? 900, temperature: opts.temperature ?? 0.5 }),
        signal: AbortSignal.timeout(30_000),
        cache: "no-store",
      });
      if (res.status === 429) {
        busy = true;
        continue;
      }
      if (!res.ok) {
        console.error(`[ai] ${p.name} ${p.model} -> ${res.status}`, (await res.text()).slice(0, 300));
        continue;
      }
      const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = (j.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (text) return { text, provider: p.name };
    } catch (e) {
      console.error(`[ai] ${p.name} error`, e instanceof Error ? e.message : e);
    }
  }
  throw new AiError(busy ? "busy" : "failed");
}
