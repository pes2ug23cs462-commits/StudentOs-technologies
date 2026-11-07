/* POST /api/assistant
   body: { messages: {role: "user"|"assistant", content}[], context: string, tone }
   header: Authorization: Bearer <Firebase ID token>
   Returns { reply } or { error } with a status code. */

import { NextResponse } from "next/server";
import { AiError, chat, type ChatMessage, type ContentPart } from "@/lib/server/ai";
import { takeQuota, verifyIdToken } from "@/lib/server/auth";

const TONES: Record<string, string> = {
  encouraging: "Be warm and encouraging, but honest.",
  direct: "Be brief and direct. No filler.",
  detailed: "Explain step by step with examples when it helps.",
};

function systemPrompt(context: string, tone: string) {
  return `You are StudentOS Assistant, the study helper inside StudentOS, a study planner for college students in India.
You help with: planning study weeks around college, explaining concepts from their courses, exam and placement preparation, projects, internships and resumes.
${TONES[tone] ?? TONES.encouraging}
Rules:
- Reply in the same language and script the student writes in (English, Hindi, Hinglish, Kannada or any other Indian language).
- Keep answers short and practical: usually under 180 words. Use short bullet points or numbered steps when listing.
- Use the student details below to personalise answers. Never invent their sessions, grades or deadlines; if something isn't in the details, say so or ask.
- You can't change their schedule yourself. When they want to move or add sessions, tell them what you suggest and point them to Schedule, Study Plan or the Reschedule button.
- Don't write graded assignments or exam answers for them to submit; teach and give hints instead.
- If someone seems in distress, respond kindly and suggest talking to someone they trust or a counsellor.

Student details (from their StudentOS account, may be incomplete):
${context.slice(0, 3500)}`;
}

export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const uid = await verifyIdToken(token);
  if (!uid) return NextResponse.json({ error: "signed-out" }, { status: 401 });

  let body: {
    messages?: { role: string; content: string }[];
    context?: string;
    tone?: string;
    attachments?: { name?: string; kind?: string; text?: string; dataUrl?: string; truncated?: boolean }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad-request" }, { status: 400 });
  }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, 2000) }));
  if (!history.length || history[history.length - 1].role !== "user") return NextResponse.json({ error: "bad-request" }, { status: 400 });

  const quota = takeQuota(uid);
  if (!quota.ok) return NextResponse.json({ error: quota.reason === "day" ? "daily-limit" : "slow-down" }, { status: 429 });

  // Attached files: text goes into the message, images go to a vision model.
  const files = (body.attachments ?? []).slice(0, 3);
  let budget = 16_000;
  const fileText = files
    .filter((f) => f.kind === "text" && typeof f.text === "string")
    .map((f) => {
      const t = f.text!.slice(0, Math.max(0, budget));
      budget -= t.length;
      return `\n\n--- Attached file: ${String(f.name ?? "file").slice(0, 120)}${f.truncated || t.length < f.text!.length ? " (only the first part)" : ""} ---\n${t}`;
    })
    .join("");
  const images = files
    .filter((f) => f.kind === "image" && typeof f.dataUrl === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(f.dataUrl) && f.dataUrl.length < 3_000_000)
    .map((f) => f.dataUrl!);
  const last = history[history.length - 1];
  const lastContent: string | ContentPart[] = images.length
    ? [{ type: "text", text: last.content + fileText }, ...images.map((url) => ({ type: "image_url" as const, image_url: { url } }))]
    : last.content + fileText;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(String(body.context ?? ""), String(body.tone ?? "encouraging")) },
    ...history.slice(0, -1),
    { role: "user", content: lastContent },
  ];
  try {
    const { text } = await chat(messages, { vision: images.length > 0 });
    return NextResponse.json({ reply: text, left: quota.left });
  } catch (e) {
    const code = e instanceof AiError ? e.code : "failed";
    return NextResponse.json({ error: code }, { status: code === "no-key" ? 503 : code === "busy" ? 429 : 502 });
  }
}
